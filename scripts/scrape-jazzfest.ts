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
  return `2025-${month}-${day}`;
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

// Parse a single show_div element into a Show object
function parseShowDiv(
  $: cheerio.CheerioAPI,
  $show: cheerio.Cheerio<cheerio.Element>,
  venue: string,
  date: string
): Show | null {
  // Get the title if present (like "AXIAL TILT - A GRATEFUL DEAD CELEBRATION")
  const titleEl = $show.find(".show_title b").first();
  const title = titleEl.length ? cleanText(titleEl.text()) : undefined;

  // Get all show_info elements to understand relationships
  const infoTexts: string[] = [];
  $show.find(".show_info").each((_, el) => {
    const text = cleanText($(el).text()).toLowerCase();
    if (text && !text.includes("ticket") && !text.includes("$")) {
      infoTexts.push(text);
    }
  });

  // Check for inline featuring in show_info (e.g., "featuring Kai Eckhardt, Fareed Haque...")
  let inlineFeaturing: string[] = [];
  $show.find(".show_info").each((_, el) => {
    const text = cleanText($(el).text());
    if (text.toLowerCase().startsWith("featuring ")) {
      const featuringText = text.substring(10); // Remove "featuring "
      inlineFeaturing = featuringText.split(/,\s*/).map((n) => n.trim()).filter(Boolean);
    }
  });

  // Determine if this show has "with" or "featuring" relationship
  const hasWithRelation = infoTexts.some(
    (t) => t === "with" || t.includes("special guest") || t === "featuring"
  );

  // Get all artists - use a Set to avoid duplicates
  const artistsSet = new Set<string>();
  const artistsOrdered: string[] = [];

  $show.find(".show_artist b").each((_, el) => {
    const name = cleanText($(el).text());
    if (name && !artistsSet.has(name)) {
      artistsSet.add(name);
      artistsOrdered.push(name);
    }
  });

  if (artistsOrdered.length === 0) return null;

  // Extract time and doors
  let time: string | undefined;
  let doors: string | undefined;

  $show.find(".show_time").each((_, timeEl) => {
    const timeText = cleanText($(timeEl).text());
    if (timeText.toLowerCase().startsWith("doors:")) {
      doors = timeText.replace(/^doors:\s*/i, "");
    } else if (timeText.toLowerCase().startsWith("show:")) {
      time = timeText.replace(/^show:\s*/i, "");
    } else if (!time && !timeText.toLowerCase().includes("doors")) {
      time = timeText;
    }
  });

  // Extract price
  let price: string | undefined;
  $show.find(".ticket_link").each((_, infoEl) => {
    if (price) return;
    const text = cleanText($(infoEl).text());
    const extractedPrice = extractPrice(text);
    if (extractedPrice) {
      price = text.toLowerCase().includes("starting at") ? `from ${extractedPrice}` : extractedPrice;
    }
  });

  // Also check show_info for price if not found
  if (!price) {
    $show.find(".show_info").each((_, infoEl) => {
      if (price) return;
      const text = cleanText($(infoEl).text());
      if (text.includes("$")) {
        const extractedPrice = extractPrice(text);
        if (extractedPrice) {
          price = text.toLowerCase().includes("starting at") ? `from ${extractedPrice}` : extractedPrice;
        }
      }
    });
  }

  // Build the show object
  const mainArtist = artistsOrdered[0];
  let featuringArtists: string[] = [];

  if (title) {
    // If there's a title, all artists are featuring
    featuringArtists = artistsOrdered;
  } else if (hasWithRelation && artistsOrdered.length > 1) {
    // First artist is main, rest are featuring
    featuringArtists = artistsOrdered.slice(1);
  } else if (inlineFeaturing.length > 0) {
    // Use inline featuring
    featuringArtists = inlineFeaturing;
  }

  // Add special guest notation for known special guests
  const hasSpecialGuest = infoTexts.some((t) => t.includes("special guest"));
  if (hasSpecialGuest && featuringArtists.length > 0) {
    // Mark the last artist as special guest
    const lastIdx = featuringArtists.length - 1;
    if (!featuringArtists[lastIdx].includes("special guest")) {
      featuringArtists[lastIdx] = `${featuringArtists[lastIdx]} (special guest)`;
    }
  }

  return {
    venue,
    date,
    title,
    artist: title || mainArtist,
    featuring: featuringArtists.length > 0 ? featuringArtists : undefined,
    time,
    doors,
    price,
  };
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

        // Each show_div is a separate show
        $cell.find(".show_div").each((_, showDiv) => {
          const $show = $(showDiv);
          const show = parseShowDiv($, $show, venue, date);
          if (show) {
            shows.push(show);
          }
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

  // Clear existing data
  console.log("Clearing existing data...");
  await client.mutation(api.events.clearData);

  // Create venues
  console.log("Creating venues...");
  const venueIds: Record<string, string> = {};

  for (let i = 0; i < venues.length; i++) {
    const venueName = venues[i];
    const id = await client.mutation(api.events.addVenue, {
      name: venueName,
      isJazzFest: false,
      order: i,
    });
    venueIds[venueName] = id;
  }

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
    });
  }

  console.log("Done!");
}

main().catch(console.error);
