import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  metadata: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),

  venues: defineTable({
    name: v.string(),
    isJazzFest: v.boolean(),
    order: v.number(),
  }).index("by_order", ["order"]),

  events: defineTable({
    venueId: v.id("venues"),
    date: v.string(), // Format: "2025-04-23"
    // Main title (e.g., "AXIAL TILT - A GRATEFUL DEAD CELEBRATION")
    title: v.optional(v.string()),
    // Primary artist (or solo act if no title)
    artist: v.string(),
    // Featured artists (when show has "featuring" members)
    featuring: v.optional(v.array(v.string())),
    // Show time
    time: v.optional(v.string()),
    // Doors open time
    doors: v.optional(v.string()),
    // Ticket price (e.g., "$40.00" or "starting at $70.00")
    price: v.optional(v.string()),
    // Is this a headliner? (for Jazz Fest filtering)
    isHeadliner: v.optional(v.boolean()),
    // Has this event been approved? (false for user submissions until reviewed)
    approved: v.optional(v.boolean()),
  })
    .index("by_venue", ["venueId"])
    .index("by_date", ["date"])
    .index("by_venue_and_date", ["venueId", "date"]),
});
