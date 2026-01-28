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

function parseShowDiv(
  $: cheerio.CheerioAPI,
  $show: cheerio.Cheerio<Element>,
  venue: string,
  date: string
): Show | null {
  const titleEl = $show.find(".show_title b").first();
  const title = titleEl.length ? cleanText(titleEl.text()) : undefined;

  const infoTexts: string[] = [];
  $show.find(".show_info").each((_, el) => {
    const text = cleanText($(el).text()).toLowerCase();
    if (text && !text.includes("ticket") && !text.includes("$")) {
      infoTexts.push(text);
    }
  });

  let inlineFeaturing: string[] = [];
  $show.find(".show_info").each((_, el) => {
    const text = cleanText($(el).text());
    if (text.toLowerCase().startsWith("featuring ")) {
      const featuringText = text.substring(10);
      inlineFeaturing = featuringText
        .split(/,\s*/)
        .map((n) => n.trim())
        .filter(Boolean);
    }
  });

  const hasWithRelation = infoTexts.some(
    (t) => t === "with" || t.includes("special guest") || t === "featuring"
  );

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

  let price: string | undefined;
  $show.find(".ticket_link").each((_, infoEl) => {
    if (price) return;
    const text = cleanText($(infoEl).text());
    const extractedPrice = extractPrice(text);
    if (extractedPrice) {
      price = text.toLowerCase().includes("starting at")
        ? `from ${extractedPrice}`
        : extractedPrice;
    }
  });

  if (!price) {
    $show.find(".show_info").each((_, infoEl) => {
      if (price) return;
      const text = cleanText($(infoEl).text());
      if (text.includes("$")) {
        const extractedPrice = extractPrice(text);
        if (extractedPrice) {
          price = text.toLowerCase().includes("starting at")
            ? `from ${extractedPrice}`
            : extractedPrice;
        }
      }
    });
  }

  const mainArtist = artistsOrdered[0];
  let featuringArtists: string[] = [];

  if (title) {
    featuringArtists = artistsOrdered;
  } else if (hasWithRelation && artistsOrdered.length > 1) {
    featuringArtists = artistsOrdered.slice(1);
  } else if (inlineFeaturing.length > 0) {
    featuringArtists = inlineFeaturing;
  }

  const hasSpecialGuest = infoTexts.some((t) => t.includes("special guest"));
  if (hasSpecialGuest && featuringArtists.length > 0) {
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
          const show = parseShowDiv($, $show, venue, date);
          if (show) {
            shows.push(show);
          }
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

    console.log(
      `Imported ${result.eventsCreated} events from ${result.venuesCreated} venues`
    );

    return result;
  },
});
