import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Scrape jazzfestgrids.com every 15 minutes
crons.interval(
  "scrape jazzfestgrids",
  { minutes: 15 },
  internal.scraper.scrapeAndImport
);

export default crons;
