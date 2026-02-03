import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getVenues = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("venues").withIndex("by_order").collect();
  },
});

export const getEvents = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("events").collect();
  },
});

export const getPendingEventsCount = query({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db.query("events").collect();
    return events.filter((e) => e.approved === false).length;
  },
});

export const getLastUpdated = query({
  args: {},
  handler: async (ctx) => {
    const metadata = await ctx.db
      .query("metadata")
      .withIndex("by_key", (q) => q.eq("key", "lastScraperRun"))
      .first();
    return metadata?.value || null;
  },
});

// One-time migration: mark all existing events as not new
export const backfillFirstSeenAt = mutation({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db.query("events").collect();
    let updated = 0;
    for (const event of events) {
      if (event.firstSeenAt === undefined) {
        await ctx.db.patch(event._id, { firstSeenAt: 0 });
        updated++;
      }
    }
    return { updated };
  },
});

export const setLastUpdated = internalMutation({
  args: { timestamp: v.string() },
  handler: async (ctx, { timestamp }) => {
    const existing = await ctx.db
      .query("metadata")
      .withIndex("by_key", (q) => q.eq("key", "lastScraperRun"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { value: timestamp });
    } else {
      await ctx.db.insert("metadata", { key: "lastScraperRun", value: timestamp });
    }
  },
});

export interface EventData {
  title?: string;
  artist: string;
  featuring?: string[];
  time?: string;
  doors?: string;
  price?: string;
  isHeadliner?: boolean;
  createdAt?: number;
}

export const getCalendarData = query({
  args: {},
  handler: async (ctx) => {
    const venues = await ctx.db.query("venues").withIndex("by_order").collect();
    const allEvents = await ctx.db.query("events").collect();

    // Filter out unapproved events (approved === false)
    // Events with approved: true or approved: undefined (legacy) are shown
    const events = allEvents.filter((e) => e.approved !== false);

    // Group events by venue and date
    const eventMap: Record<string, Record<string, EventData[]>> = {};

    for (const event of events) {
      if (!eventMap[event.venueId]) {
        eventMap[event.venueId] = {};
      }
      if (!eventMap[event.venueId][event.date]) {
        eventMap[event.venueId][event.date] = [];
      }
      eventMap[event.venueId][event.date].push({
        title: event.title,
        artist: event.artist,
        featuring: event.featuring,
        time: event.time,
        doors: event.doors,
        price: event.price,
        isHeadliner: event.isHeadliner,
        createdAt: event.firstSeenAt ?? event._creationTime,
      });
    }

    return { venues, eventMap };
  },
});

export const addVenue = mutation({
  args: {
    name: v.string(),
    isJazzFest: v.boolean(),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("venues", args);
  },
});

// Create a new venue with auto-generated order
export const createVenue = mutation({
  args: {
    name: v.string(),
    isJazzFest: v.boolean(),
  },
  handler: async (ctx, args) => {
    const venues = await ctx.db.query("venues").collect();
    const maxOrder = venues.reduce((max, v) => Math.max(max, v.order), -1);
    return await ctx.db.insert("venues", {
      ...args,
      order: maxOrder + 1,
    });
  },
});

export const addEvent = mutation({
  args: {
    venueId: v.id("venues"),
    date: v.string(),
    title: v.optional(v.string()),
    artist: v.string(),
    featuring: v.optional(v.array(v.string())),
    time: v.optional(v.string()),
    doors: v.optional(v.string()),
    price: v.optional(v.string()),
    isHeadliner: v.optional(v.boolean()),
    approved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Default to unapproved for user submissions, but allow approved to be set for seeding
    return await ctx.db.insert("events", {
      ...args,
      approved: args.approved ?? false,
      firstSeenAt: Date.now(),
    });
  },
});

export const clearData = mutation({
  args: {},
  handler: async (ctx) => {
    const venues = await ctx.db.query("venues").collect();
    const events = await ctx.db.query("events").collect();

    // Identify venues and events to preserve
    const jazzFestVenueIds = new Set(
      venues.filter((v) => v.isJazzFest).map((v) => v._id),
    );
    const pendingEvents = events.filter((e) => e.approved === false);
    const venuesWithPendingEvents = new Set(pendingEvents.map((e) => e.venueId));

    let deletedEvents = 0;
    for (const event of events) {
      // Skip unapproved events (user submissions waiting for approval)
      if (event.approved === false) continue;
      // Skip JazzFest headliner events
      if (jazzFestVenueIds.has(event.venueId)) continue;
      await ctx.db.delete(event._id);
      deletedEvents++;
    }

    let deletedVenues = 0;
    for (const venue of venues) {
      // Skip JazzFest venues (headliners)
      if (venue.isJazzFest) continue;
      // Skip venues that have pending events
      if (venuesWithPendingEvents.has(venue._id)) continue;
      await ctx.db.delete(venue._id);
      deletedVenues++;
    }

    const jazzFestEvents = events.filter((e) => jazzFestVenueIds.has(e.venueId));

    return {
      message: "Data cleared",
      deletedEvents,
      deletedVenues,
      preservedPendingEvents: pendingEvents.length,
      preservedJazzFestEvents: jazzFestEvents.length,
    };
  },
});

// Internal mutation for scraper to import data
export const importScrapedData = internalMutation({
  args: {
    shows: v.array(
      v.object({
        venue: v.string(),
        date: v.string(),
        title: v.optional(v.string()),
        artist: v.string(),
        featuring: v.optional(v.array(v.string())),
        time: v.optional(v.string()),
        doors: v.optional(v.string()),
        price: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { shows }) => {
    const now = Date.now();

    // Get all venues
    const existingVenues = await ctx.db.query("venues").collect();
    const jazzFestVenueIds = new Set(
      existingVenues.filter((v) => v.isJazzFest).map((v) => v._id)
    );

    // Build venue ID -> name map before deletion
    const venueIdToName: Record<string, string> = {};
    for (const venue of existingVenues) {
      venueIdToName[venue._id] = venue.name;
    }

    // Build a lookup of existing firstSeenAt by venue_name+date+artist
    const events = await ctx.db.query("events").collect();
    const firstSeenMap: Record<string, number> = {};
    for (const event of events) {
      if (!jazzFestVenueIds.has(event.venueId)) {
        const venueName = venueIdToName[event.venueId];
        if (venueName) {
          const key = `${venueName}|${event.date}|${event.artist}`;
          firstSeenMap[key] = event.firstSeenAt ?? event._creationTime;
        }
      }
    }

    // Delete non-JazzFest events
    for (const event of events) {
      if (!jazzFestVenueIds.has(event.venueId)) {
        await ctx.db.delete(event._id);
      }
    }

    // Delete non-JazzFest venues
    for (const venue of existingVenues) {
      if (!venue.isJazzFest) {
        await ctx.db.delete(venue._id);
      }
    }

    // Get unique venues from scraped data
    const venueNames = [...new Set(shows.map((s) => s.venue))];

    // Find the highest order among existing venues
    const maxOrder = existingVenues.reduce(
      (max, v) => Math.max(max, v.order),
      -1
    );

    // Create new venues
    const venueIds: Record<string, string> = {};
    for (let i = 0; i < venueNames.length; i++) {
      const venueName = venueNames[i];
      const id = await ctx.db.insert("venues", {
        name: venueName,
        isJazzFest: false,
        order: maxOrder + 1 + i,
      });
      venueIds[venueName] = id;
    }

    // Add events
    for (const show of shows) {
      const venueId = venueIds[show.venue];
      if (!venueId) continue;

      const key = `${show.venue}|${show.date}|${show.artist}`;
      const firstSeenAt = firstSeenMap[key] ?? now;

      await ctx.db.insert("events", {
        venueId: venueId as any,
        date: show.date,
        title: show.title,
        artist: show.artist,
        featuring: show.featuring,
        time: show.time,
        doors: show.doors,
        price: show.price,
        approved: true,
        firstSeenAt,
      });
    }

    return { venuesCreated: venueNames.length, eventsCreated: shows.length };
  },
});
