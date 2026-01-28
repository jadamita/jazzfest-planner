import { Doc } from "../../convex/_generated/dataModel";

interface EventData {
  title?: string;
  artist: string;
  featuring?: string[];
  time?: string;
  doors?: string;
  price?: string;
  isHeadliner?: boolean;
}

interface CalendarGridProps {
  venues: Doc<"venues">[];
  eventMap: Record<string, Record<string, EventData[]>>;
  showAllJazzFest: boolean;
  searchQuery: string;
  fuzzySearch: boolean;
}

// Fuzzy search: checks if all characters of the query appear in order in the target
function fuzzyMatch(query: string, target: string): boolean {
  const lowerQuery = query.toLowerCase();
  const lowerTarget = target.toLowerCase();

  // Simple contains check for better UX
  if (lowerTarget.includes(lowerQuery)) return true;

  // Fuzzy: all chars of query appear in order
  let queryIdx = 0;
  for (let i = 0; i < lowerTarget.length && queryIdx < lowerQuery.length; i++) {
    if (lowerTarget[i] === lowerQuery[queryIdx]) {
      queryIdx++;
    }
  }
  return queryIdx === lowerQuery.length;
}

// Strict search: checks if query is a substring of target
function strictMatch(query: string, target: string): boolean {
  return target.toLowerCase().includes(query.toLowerCase());
}

// Check if an event matches the search query
function eventMatchesSearch(event: EventData, query: string, useFuzzy: boolean): boolean {
  if (!query.trim()) return true;

  const matchFn = useFuzzy ? fuzzyMatch : strictMatch;

  // Check artist name
  if (matchFn(query, event.artist)) return true;

  // Check title
  if (event.title && matchFn(query, event.title)) return true;

  // Check featuring artists
  if (event.featuring?.some((f) => matchFn(query, f))) return true;

  return false;
}

// Jazz Fest dates: April 23-26 (Week 1) and April 30 - May 3 (Week 2)
// April 27-29 are the "Daze Between" - no Jazz Fest but plenty of night shows
const DATES = [
  "2025-04-23",
  "2025-04-24",
  "2025-04-25",
  "2025-04-26",
  "2025-04-27",
  "2025-04-28",
  "2025-04-29",
  "2025-04-30",
  "2025-05-01",
  "2025-05-02",
  "2025-05-03",
];

// Actual Jazz Fest dates (Fair Grounds open)
const JAZZ_FEST_DATES = [
  "2025-04-23",
  "2025-04-24",
  "2025-04-25",
  "2025-04-26",
  "2025-04-30",
  "2025-05-01",
  "2025-05-02",
  "2025-05-03",
];

function formatDate(dateStr: string): { day: string; weekday: string } {
  const date = new Date(dateStr + "T12:00:00");
  const day = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  return { day, weekday };
}

function isJazzFestDate(dateStr: string): boolean {
  return JAZZ_FEST_DATES.includes(dateStr);
}

export default function CalendarGrid({
  venues,
  eventMap,
  showAllJazzFest,
  searchQuery,
  fuzzySearch,
}: CalendarGridProps) {
  return (
    <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
      <div
        className="grid gap-px bg-slate-300 dark:bg-slate-700 min-w-max"
        style={{
          gridTemplateColumns: `minmax(100px, 140px) repeat(${DATES.length}, minmax(130px, 160px))`,
        }}
      >
        {/* Header row */}
        <div className="bg-slate-100 dark:bg-slate-900 p-2 sm:p-3 font-bold sticky left-0 z-10 text-sm sm:text-base">
          Venue
        </div>
        {DATES.map((date) => {
          const { day, weekday } = formatDate(date);
          const isJazzFest = isJazzFestDate(date);
          return (
            <div
              key={date}
              className={`p-2 sm:p-3 text-center font-semibold ${
                isJazzFest
                  ? "bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-100"
                  : "bg-slate-200 dark:bg-slate-800"
              }`}
            >
              <div className="text-xs sm:text-sm">{weekday}</div>
              <div className="text-sm sm:text-base">{day}</div>
              {!isJazzFest && (
                <div className="text-xs opacity-60 mt-0.5 hidden sm:block">
                  Daze Between
                </div>
              )}
            </div>
          );
        })}

        {/* Venue rows */}
        {venues.map((venue) => (
          <VenueRow
            key={venue._id}
            venue={venue}
            events={eventMap[venue._id] || {}}
            showAllJazzFest={showAllJazzFest}
            searchQuery={searchQuery}
            fuzzySearch={fuzzySearch}
          />
        ))}
      </div>
    </div>
  );
}

interface VenueRowProps {
  venue: Doc<"venues">;
  events: Record<string, EventData[]>;
  showAllJazzFest: boolean;
  searchQuery: string;
  fuzzySearch: boolean;
}

function VenueRow({ venue, events, showAllJazzFest, searchQuery, fuzzySearch }: VenueRowProps) {
  const isJazzFestVenue = venue.isJazzFest;

  return (
    <>
      {/* Venue name cell */}
      <div
        className={`p-2 sm:p-3 font-medium sticky left-0 z-10 ${
          isJazzFestVenue
            ? "bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 border-l-4 border-amber-500"
            : "bg-white dark:bg-slate-800"
        }`}
      >
        <div className="flex items-center gap-1 sm:gap-2">
          {isJazzFestVenue && <span className="text-base sm:text-lg">🎺</span>}
          <span
            className={`text-xs sm:text-sm leading-tight ${isJazzFestVenue ? "font-bold" : ""}`}
          >
            {venue.name}
          </span>
        </div>
      </div>

      {/* Event cells for each date */}
      {DATES.map((date) => {
        const dayEvents = events[date] || [];
        const isJazzFestDateCell = JAZZ_FEST_DATES.includes(date);

        // Filter by search query first
        const searchFiltered = searchQuery.trim()
          ? dayEvents.filter((e) => eventMatchesSearch(e, searchQuery, fuzzySearch))
          : dayEvents;

        // Then filter Jazz Fest events based on showAllJazzFest toggle
        const filteredEvents =
          isJazzFestVenue && !showAllJazzFest
            ? searchFiltered.filter((e) => e.isHeadliner)
            : searchFiltered;

        // Count hidden events (non-headliners that match search but are hidden by toggle)
        const hiddenCount =
          isJazzFestVenue && !showAllJazzFest
            ? searchFiltered.filter((e) => !e.isHeadliner).length
            : 0;

        return (
          <div
            key={`${venue._id}-${date}`}
            className={`p-1 sm:p-2 min-h-20 sm:min-h-25 ${
              isJazzFestVenue
                ? isJazzFestDateCell
                  ? "bg-amber-50 dark:bg-amber-950/50"
                  : "bg-amber-50/50 dark:bg-amber-950/30"
                : isJazzFestDateCell
                  ? "bg-white dark:bg-slate-800"
                  : "bg-slate-50 dark:bg-slate-850"
            }`}
          >
            {filteredEvents.map((event, idx) => (
              <EventCard
                key={idx}
                event={event}
                isJazzFestVenue={isJazzFestVenue}
              />
            ))}
            {hiddenCount > 0 && (
              <div className="text-xs text-amber-600 dark:text-amber-400 opacity-70 mt-1 text-center">
                +{hiddenCount} more
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

interface EventCardProps {
  event: EventData;
  isJazzFestVenue: boolean;
}

function EventCard({ event, isJazzFestVenue }: EventCardProps) {
  const hasDetails =
    event.featuring?.length || event.time || event.doors || event.price;
  const isHeadliner = event.isHeadliner;

  return (
    <div
      className={`text-xs sm:text-sm p-1.5 sm:p-2 rounded mb-1.5 sm:mb-2 ${
        isJazzFestVenue
          ? isHeadliner
            ? "bg-amber-300 dark:bg-amber-600 text-amber-900 dark:text-amber-100 ring-1 ring-amber-400"
            : "bg-amber-100 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200"
          : "bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100"
      }`}
    >
      {/* Title or Artist name - larger */}
      <div
        className={`leading-tight ${isHeadliner ? "font-bold" : "font-medium"}`}
      >
        <strong>{event.title || event.artist}</strong>
      </div>

      {/* Featuring members - smaller (hidden on mobile for space) */}
      {event.featuring && event.featuring.length > 0 && (
        <div className="mt-1 hidden sm:block">
          <span className="text-xs opacity-70 italic">featuring</span>
          <div className="text-xs opacity-90 leading-snug">
            {event.featuring.join(", ")}
          </div>
        </div>
      )}

      {/* Time, Doors, Price - small details */}
      {hasDetails && (
        <div className="mt-1 sm:mt-1.5 pt-1 sm:pt-1.5 border-t border-current/20 space-y-0.5">
          {event.time && (
            <div className="text-xs">
              <span className="opacity-70 hidden sm:inline">Show:</span>{" "}
              <span className="font-medium">{event.time}</span>
            </div>
          )}
          {event.doors && (
            <div className="text-xs hidden sm:block">
              <span className="opacity-70">Doors:</span>{" "}
              <span className="font-medium">{event.doors}</span>
            </div>
          )}
          {event.price && (
            <div className="text-xs">
              <span className="opacity-70 hidden sm:inline">Tickets:</span>{" "}
              <span className="font-medium text-green-700 dark:text-green-400">
                {event.price}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
