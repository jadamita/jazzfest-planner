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

export interface EventData {
  title?: string;
  artist: string;
  featuring?: string[];
  time?: string;
  doors?: string;
  price?: string;
  isHeadliner?: boolean;
}

export const getCalendarData = query({
  args: {},
  handler: async (ctx) => {
    const venues = await ctx.db.query("venues").withIndex("by_order").collect();
    const events = await ctx.db.query("events").collect();

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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("events", args);
  },
});

export const clearData = mutation({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db.query("events").collect();
    for (const event of events) {
      await ctx.db.delete(event._id);
    }

    const venues = await ctx.db.query("venues").collect();
    for (const venue of venues) {
      await ctx.db.delete(venue._id);
    }

    return { message: "Data cleared" };
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
    // Get all venues
    const existingVenues = await ctx.db.query("venues").collect();
    const jazzFestVenueIds = new Set(
      existingVenues.filter((v) => v.isJazzFest).map((v) => v._id)
    );

    // Delete non-JazzFest events
    const events = await ctx.db.query("events").collect();
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

      await ctx.db.insert("events", {
        venueId: venueId as any,
        date: show.date,
        title: show.title,
        artist: show.artist,
        featuring: show.featuring,
        time: show.time,
        doors: show.doors,
        price: show.price,
      });
    }

    return { venuesCreated: venueNames.length, eventsCreated: shows.length };
  },
});
