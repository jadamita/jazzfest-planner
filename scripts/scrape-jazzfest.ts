import "dotenv/config";
import * as cheerio from "cheerio";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

import { config } from "dotenv";
config({ path: ".env.local" });

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $gig: cheerio.Cheerio<any>,
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $show: cheerio.Cheerio<any>,
  venue: string,
  date: string,
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
      const gigInfo = parseGigPad($, $gig);
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

  // Direct children show_time elements (not inside gig_pads)
  $show.children(".show_time, .small_pad").each((_, timeEl) => {
    if (!$(timeEl).hasClass("show_time")) {
      // Check if it's a div with show_time class
      const $time = $(timeEl);
      if ($time.hasClass("show_time")) {
        const timeText = cleanText($time.text());
        if (timeText.toLowerCase().startsWith("doors:")) {
          sharedDoors = timeText.replace(/^doors:\s*/i, "");
        } else if (timeText.toLowerCase().startsWith("show:")) {
          sharedTime = timeText.replace(/^show:\s*/i, "");
        }
      }
      return;
    }
    const timeText = cleanText($(timeEl).text());
    if (timeText.toLowerCase().startsWith("doors:")) {
      sharedDoors = timeText.replace(/^doors:\s*/i, "");
    } else if (timeText.toLowerCase().startsWith("show:")) {
      sharedTime = timeText.replace(/^show:\s*/i, "");
    }
  });

  // Also look for show_time with small_pad class at show_div level
  $show.find("> .show_time").each((_, timeEl) => {
    const timeText = cleanText($(timeEl).text());
    if (timeText.toLowerCase().startsWith("doors:")) {
      sharedDoors = timeText.replace(/^doors:\s*/i, "");
    } else if (timeText.toLowerCase().startsWith("show:")) {
      sharedTime = timeText.replace(/^show:\s*/i, "");
    }
  });

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
  console.log(`Fetching ${url}...`);
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  const shows: Show[] = [];

  // Get date columns from the header row
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

  console.log(`  Found dates: ${dates.join(", ")}`);

  // Process each venue row
  $("tr")
    .has(".venue_cell")
    .each((_, row) => {
      const $row = $(row);

      // Get venue name
      const venueLink = $row.find(".venue_cell a.base_link b").first();
      const venue = cleanText(venueLink.text());
      if (!venue) return;

      // Get shows for each date column
      $row.find(".show_cell").each((colIndex, cell) => {
        const $cell = $(cell);
        const date = dates[colIndex];
        if (!date) return;

        // Each show_div may contain one or more shows
        $cell.find(".show_div").each((_, showDiv) => {
          const $show = $(showDiv);
          const parsedShows = parseShowDiv($, $show, venue, date);
          shows.push(...parsedShows);
        });
      });
    });

  console.log(`  Found ${shows.length} shows`);
  return shows;
}

async function main() {
  const allShows: Show[] = [];

  for (const url of URLS) {
    const shows = await scrapePage(url);
    allShows.push(...shows);
  }

  console.log(`\nTotal shows scraped: ${allShows.length}`);

  // Get unique venues
  const venues = [...new Set(allShows.map((s) => s.venue))];
  console.log(`Unique venues: ${venues.length}`);

  // Show some examples with featuring
  console.log("\nSample shows with featuring:");
  const samplesWithFeaturing = allShows.filter((s) => s.featuring?.length);
  samplesWithFeaturing.slice(0, 5).forEach((s) => {
    console.log(`  ${s.artist}`);
    console.log(`    with: ${s.featuring?.join(", ")}`);
    console.log(`    Time: ${s.time}, Doors: ${s.doors}, Price: ${s.price}`);
  });

  // Show GARAJ MAHAL specifically
  const garaj = allShows.find((s) => s.artist.toUpperCase().includes("GARAJ"));
  if (garaj) {
    console.log("\nGARAJ MAHAL show:");
    console.log(`  Artist: ${garaj.artist}`);
    console.log(`  Featuring: ${garaj.featuring?.join(", ") || "none"}`);
  }

  // Show Melvin Seals specifically
  const melvin = allShows.filter((s) => s.artist.includes("Melvin Seals"));
  console.log(`\nMelvin Seals shows: ${melvin.length}`);
  melvin.forEach((s) => {
    console.log(`  ${s.date}: ${s.artist}`);
    console.log(`    with: ${s.featuring?.join(", ") || "none"}`);
    console.log(`    Time: ${s.time}`);
  });

  // Check for CONVEX_URL
  const convexUrl = process.env.VITE_CONVEX_URL;
  if (!convexUrl) {
    console.log("\nNo VITE_CONVEX_URL found. Skipping import.");
    return;
  }

  // Import to Convex
  console.log(`\nImporting to Convex at ${convexUrl}...`);
  const client = new ConvexHttpClient(convexUrl);

  // Clear existing scraped data (preserves pending submissions and JazzFest headliners)
  console.log("Clearing existing scraped data...");
  const clearResult = await client.mutation(api.events.clearData);
  console.log(`  Deleted ${clearResult.deletedEvents} events, ${clearResult.deletedVenues} venues`);
  if (clearResult.preservedPendingEvents > 0) {
    console.log(`  Preserved ${clearResult.preservedPendingEvents} pending event(s)`);
  }
  if (clearResult.preservedJazzFestEvents > 0) {
    console.log(`  Preserved ${clearResult.preservedJazzFestEvents} JazzFest headliner event(s)`);
  }

  // Get existing venues (some may have been preserved due to pending events)
  const existingVenues = await client.query(api.events.getVenues);
  const existingVenuesByName: Record<string, string> = {};
  for (const v of existingVenues) {
    existingVenuesByName[v.name] = v._id;
  }

  // Create venues (skip if already exists)
  console.log("Creating venues...");
  const venueIds: Record<string, string> = {};
  let venuesCreated = 0;

  for (let i = 0; i < venues.length; i++) {
    const venueName = venues[i];
    // Check if venue already exists
    if (existingVenuesByName[venueName]) {
      venueIds[venueName] = existingVenuesByName[venueName];
    } else {
      const id = await client.mutation(api.events.addVenue, {
        name: venueName,
        isJazzFest: false,
        order: existingVenues.length + venuesCreated,
      });
      venueIds[venueName] = id;
      venuesCreated++;
    }
  }
  console.log(
    `  Created ${venuesCreated} new venues, reused ${venues.length - venuesCreated} existing`,
  );

  // Add events
  console.log("Adding events...");
  for (const show of allShows) {
    const venueId = venueIds[show.venue];
    if (!venueId) continue;

    await client.mutation(api.events.addEvent, {
      venueId: venueId as any,
      date: show.date,
      title: show.title,
      artist: show.artist,
      featuring: show.featuring,
      time: show.time,
      doors: show.doors,
      price: show.price,
      approved: true,
    });
  }

  console.log("Done!");
}

main().catch(console.error);
