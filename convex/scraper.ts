"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import * as cheerio from "cheerio";
import type { Element } from "domhandler";

const URLS = [
  "http://www.jazzfestgrids.com/first_weekend/",
  "http://www.jazzfestgrids.com/daze_between/",
  "http://www.jazzfestgrids.com/second_weekend/",
];

interface Show {
  venue: string;
  date: string;
  title?: string;
  artist: string;
  featuring?: string[];
  time?: string;
  doors?: string;
  price?: string;
}

function parseDateHeader(header: string): string | null {
  const match = header.match(/(\d+)-(\d+)/);
  if (!match) return null;
  const month = match[1].padStart(2, "0");
  const day = match[2].padStart(2, "0");
  return `2026-${month}-${day}`;
}

function cleanText(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPrice(text: string): string | null {
  const match = text.match(/\$[\d,]+(?:\.\d{2})?/);
  return match ? match[0] : null;
}

// Parse a single gig element (gig_pad or std_pad with artist inside)
interface GigInfo {
  artist: string;
  time?: string;
  hasFeaturingAfter: boolean;
  hasWithAfter: boolean;
  hasSpecialGuestAfter: boolean;
}

function parseGigPad(
  $: cheerio.CheerioAPI,
  $gig: cheerio.Cheerio<Element>
): GigInfo | null {
  const artistEl = $gig.find(".show_artist b").first();
  if (!artistEl.length) return null;

  const artist = cleanText(artistEl.text());
  if (!artist) return null;

  // Check if time is inside this gig_pad
  let time: string | undefined;
  $gig.find(".show_time").each((_, timeEl) => {
    const timeText = cleanText($(timeEl).text());
    if (
      !timeText.toLowerCase().startsWith("doors:") &&
      !timeText.toLowerCase().startsWith("show:")
    ) {
      time = timeText;
    }
  });

  // Check for relationship indicators after this artist
  let hasFeaturingAfter = false;
  let hasWithAfter = false;
  let hasSpecialGuestAfter = false;

  $gig.find(".show_info").each((_, el) => {
    const text = cleanText($(el).text()).toLowerCase();
    if (text === "featuring" || text.startsWith("featuring")) {
      hasFeaturingAfter = true;
    }
    if (text === "with") {
      hasWithAfter = true;
    }
    if (text.includes("special guest")) {
      hasSpecialGuestAfter = true;
    }
  });

  return { artist, time, hasFeaturingAfter, hasWithAfter, hasSpecialGuestAfter };
}

// Parse a single show_div element into Show object(s)
// Returns multiple shows if gig_pads have individual times
function parseShowDiv(
  $: cheerio.CheerioAPI,
  $show: cheerio.Cheerio<Element>,
  venue: string,
  date: string
): Show[] {
  const shows: Show[] = [];

  // Get the title if present (like "AXIAL TILT - A GRATEFUL DEAD CELEBRATION")
  const titleEl = $show.find(".show_title b").first();
  const title = titleEl.length ? cleanText(titleEl.text()) : undefined;

  // Parse all gig_pad and std_pad elements that contain artists
  const gigs: GigInfo[] = [];
  $show.find(".gig_pad, .std_pad").each((_, el) => {
    const $gig = $(el);
    // Only process if it has an artist
    if ($gig.find(".show_artist").length) {
      const gigInfo = parseGigPad($, $gig as cheerio.Cheerio<Element>);
      if (gigInfo) {
        gigs.push(gigInfo);
      }
    }
  });

  if (gigs.length === 0) return shows;

  // Extract shared time/doors/price from end of show_div (outside gig_pads)
  let sharedTime: string | undefined;
  let sharedDoors: string | undefined;
  let sharedPrice: string | undefined;

  // Look for times that are direct text of show_div (after gig_pads)
  $show.find(".show_time.small_pad").each((_, timeEl) => {
    const timeText = cleanText($(timeEl).text());
    if (timeText.toLowerCase().startsWith("doors:")) {
      sharedDoors = timeText.replace(/^doors:\s*/i, "");
    } else if (timeText.toLowerCase().startsWith("show:")) {
      sharedTime = timeText.replace(/^show:\s*/i, "");
    }
  });

  // Extract price
  $show.find(".ticket_link").each((_, infoEl) => {
    if (sharedPrice) return;
    const text = cleanText($(infoEl).text());
    const extractedPrice = extractPrice(text);
    if (extractedPrice) {
      sharedPrice = text.toLowerCase().includes("starting at")
        ? `from ${extractedPrice}`
        : extractedPrice;
    }
  });

  // Also check show_info for price
  if (!sharedPrice) {
    $show.find(".show_info").each((_, infoEl) => {
      if (sharedPrice) return;
      const text = cleanText($(infoEl).text());
      if (text.includes("$")) {
        const extractedPrice = extractPrice(text);
        if (extractedPrice) {
          sharedPrice = text.toLowerCase().includes("starting at")
            ? `from ${extractedPrice}`
            : extractedPrice;
        }
      }
    });
  }

  // Check for inline featuring in show_info
  let inlineFeaturing: string[] = [];
  $show.find(".show_info").each((_, el) => {
    const text = cleanText($(el).text());
    if (text.toLowerCase().startsWith("featuring ") && text.length > 15) {
      const featuringText = text.substring(10);
      inlineFeaturing = featuringText
        .split(/,\s*/)
        .map((n) => n.trim())
        .filter(Boolean);
    }
  });

  // Determine if gigs have individual times or share time
  const gigsWithTimes = gigs.filter((g) => g.time);
  const hasIndividualTimes = gigsWithTimes.length > 0;

  if (hasIndividualTimes && !sharedTime) {
    // Each gig with a time is a separate show
    // Group gigs: a gig with "featuring" after it groups with the next gig(s)
    let i = 0;
    while (i < gigs.length) {
      const gig = gigs[i];

      if (gig.hasFeaturingAfter || gig.hasWithAfter || gig.hasSpecialGuestAfter) {
        // This gig has featuring artists after it
        const featuringArtists: string[] = [];
        let j = i + 1;
        while (j < gigs.length && !gigs[j].time) {
          const featArtist = gigs[j].artist;
          if (gig.hasSpecialGuestAfter && j === i + 1) {
            featuringArtists.push(`${featArtist} (special guest)`);
          } else {
            featuringArtists.push(featArtist);
          }
          j++;
        }

        shows.push({
          venue,
          date,
          title,
          artist: title || gig.artist,
          featuring: featuringArtists.length > 0 ? featuringArtists : undefined,
          time: gig.time,
          doors: undefined,
          price: undefined,
        });
        i = j;
      } else if (gig.time) {
        // Standalone show with its own time
        shows.push({
          venue,
          date,
          artist: gig.artist,
          time: gig.time,
        });
        i++;
      } else {
        // Skip gigs without time that aren't part of a featuring group
        i++;
      }
    }
  } else {
    // All gigs share the same time - this is a grouped show
    const mainArtist = gigs[0].artist;
    let featuringArtists: string[] = [];

    // Check if first gig has featuring/with indicator
    const hasRelationship =
      gigs[0].hasFeaturingAfter ||
      gigs[0].hasWithAfter ||
      gigs[0].hasSpecialGuestAfter;

    if (title) {
      // If there's a title, all artists are featuring
      featuringArtists = gigs.map((g) => g.artist);
    } else if (hasRelationship && gigs.length > 1) {
      featuringArtists = gigs.slice(1).map((g, idx) => {
        if (gigs[0].hasSpecialGuestAfter && idx === 0) {
          return `${g.artist} (special guest)`;
        }
        return g.artist;
      });
    } else if (inlineFeaturing.length > 0) {
      featuringArtists = inlineFeaturing;
    }

    shows.push({
      venue,
      date,
      title,
      artist: title || mainArtist,
      featuring: featuringArtists.length > 0 ? featuringArtists : undefined,
      time: sharedTime || gigs[0].time,
      doors: sharedDoors,
      price: sharedPrice,
    });
  }

  return shows;
}

async function scrapePage(url: string): Promise<Show[]> {
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  const shows: Show[] = [];

  const dates: string[] = [];
  $("tr")
    .has(".column_header")
    .first()
    .find(".column_header")
    .each((i, el) => {
      const text = cleanText($(el).text());
      if (i === 0) return;
      const date = parseDateHeader(text);
      if (date) dates.push(date);
    });

  $("tr")
    .has(".venue_cell")
    .each((_, row) => {
      const $row = $(row);

      const venueLink = $row.find(".venue_cell a.base_link b").first();
      const venue = cleanText(venueLink.text());
      if (!venue) return;

      $row.find(".show_cell").each((colIndex, cell) => {
        const $cell = $(cell);
        const date = dates[colIndex];
        if (!date) return;

        $cell.find(".show_div").each((_, showDiv) => {
          const $show = $(showDiv);
          const parsedShows = parseShowDiv($, $show as cheerio.Cheerio<Element>, venue, date);
          shows.push(...parsedShows);
        });
      });
    });

  return shows;
}

// Action to scrape and import data
export const scrapeAndImport = internalAction({
  args: {},
  handler: async (ctx): Promise<{ venuesCreated: number; eventsCreated: number }> => {
    console.log("Starting scrape...");

    const allShows: Show[] = [];

    for (const url of URLS) {
      console.log(`Fetching ${url}...`);
      const shows = await scrapePage(url);
      console.log(`  Found ${shows.length} shows`);
      allShows.push(...shows);
    }

    console.log(`Total shows scraped: ${allShows.length}`);

    // Import to database using the mutation in events.ts
    const result: { venuesCreated: number; eventsCreated: number } = await ctx.runMutation(internal.events.importScrapedData, {
      shows: allShows,
    });

    // Record the timestamp of this scraper run
    await ctx.runMutation(internal.events.setLastUpdated, {
      timestamp: new Date().toISOString(),
    });

    console.log(
      `Imported ${result.eventsCreated} events from ${result.venuesCreated} venues`
    );

    return result;
  },
});
