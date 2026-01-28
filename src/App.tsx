import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import CalendarGrid from "./components/CalendarGrid";
import AdminPage from "./components/AdminPage";

export default function App() {
  const calendarData = useQuery(api.events.getCalendarData);
  const pendingCount = useQuery(api.events.getPendingEventsCount);
  const [showAllJazzFest, setShowAllJazzFest] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [fuzzySearch, setFuzzySearch] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);

  const hasData = calendarData?.venues && calendarData.venues.length > 0;

  if (showAdmin) {
    return <AdminPage onBack={() => setShowAdmin(false)} />;
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-linear-to-r from-purple-900 via-purple-800 to-amber-700 text-white p-3 sm:p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="text-2xl sm:text-3xl">🎷</span>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold truncate">
                Jazz Fest Planner 2026
              </h1>
              <p className="text-purple-200 text-xs sm:text-sm hidden sm:block">
                New Orleans Jazz & Heritage Festival + NOLA Shows
              </p>
            </div>
          </div>
          {/* Search input */}
          <div className="flex-1 max-w-md flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search artists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 pl-9 rounded-lg bg-white/20 placeholder-white/60 text-white text-sm border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/30"
              />
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
            <label className="flex items-center gap-1.5 text-xs text-white/80 cursor-pointer select-none whitespace-nowrap">
              <input
                type="checkbox"
                checked={fuzzySearch}
                onChange={(e) => setFuzzySearch(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-white/30 bg-white/20 text-amber-500 focus:ring-white/50"
              />
              <span className="hidden sm:inline">Fuzzy Search</span>
            </label>
            <button
              onClick={() => setShowAdmin(true)}
              className="relative p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Add Event"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {pendingCount !== undefined && pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-4.5 h-4.5 flex items-center justify-center px-1">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="p-3 sm:p-6 max-w-8xl mx-auto">
        {calendarData === undefined ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-slate-500">Loading calendar...</div>
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 px-4">
            <p className="text-base sm:text-lg text-slate-500 text-center">
              No events available. Please check back later.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-3 sm:gap-4 items-center text-xs sm:text-sm">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-amber-200 dark:bg-amber-700 rounded" />
                  <span>Jazz Fest</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-100 dark:bg-blue-900/50 rounded" />
                  <span>NOLA Venues</span>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <div className="w-4 h-4 bg-slate-200 dark:bg-slate-600 rounded" />
                  <span>Daze Between</span>
                </div>
              </div>

              {/* Toggle for showing all Jazz Fest artists */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-xs sm:text-sm font-medium">
                  {showAllJazzFest ? "All artists" : "Headliners"}
                </span>
                <button
                  onClick={() => setShowAllJazzFest(!showAllJazzFest)}
                  className={`relative inline-flex h-5 sm:h-6 w-9 sm:w-11 items-center rounded-full transition-colors ${
                    showAllJazzFest
                      ? "bg-amber-500"
                      : "bg-slate-300 dark:bg-slate-600"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 sm:h-4 w-3.5 sm:w-4 transform rounded-full bg-white transition-transform ${
                      showAllJazzFest
                        ? "translate-x-4 sm:translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </label>
            </div>

            <CalendarGrid
              venues={calendarData.venues}
              eventMap={calendarData.eventMap}
              showAllJazzFest={showAllJazzFest}
              searchQuery={searchQuery}
              fuzzySearch={fuzzySearch}
            />

            <div className="mt-8 text-sm text-slate-500 dark:text-slate-400">
              <p>
                <strong>Jazz Fest 2026:</strong> Week 1: Apr 23-26 | Week 2: Apr
                30 - May 3
              </p>
              <p className="mt-1">
                Scroll horizontally to see all dates. Toggle above to show/hide
                full Jazz Fest lineup.
              </p>
              <p>
                Data sourced from{" "}
                <a
                  href="http://www.jazzfestgrids.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  JazzFestGrids.com
                </a>
              </p>
              <p>
                Made with ❤️ by{" "}
                <a
                  href="https://github.com/jadamita"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Joseph Adamita
                </a>
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
