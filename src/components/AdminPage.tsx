import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { usePostHog } from "posthog-js/react";

// Profanity word list (common offensive terms)
const PROFANITY_LIST = [
  "fuck",
  "shit",
  "ass",
  "bitch",
  "damn",
  "crap",
  "piss",
  "dick",
  "cock",
  "pussy",
  "asshole",
  "bastard",
  "slut",
  "whore",
  "cunt",
  "fag",
  "nigger",
  "nigga",
  "retard",
  "douche",
  "twat",
  "wanker",
  "bollocks",
  "bugger",
];

// Check if text contains profanity
function containsProfanity(text: string): boolean {
  const lowerText = text.toLowerCase();
  // Check for exact word matches and common obfuscations
  for (const word of PROFANITY_LIST) {
    // Check exact match with word boundaries
    const regex = new RegExp(`\\b${word}\\b`, "i");
    if (regex.test(lowerText)) return true;
    // Check common letter substitutions (e.g., @ for a, 0 for o, 1 for i, 3 for e, $ for s)
    const obfuscated = word
      .replace(/a/g, "[a@4]")
      .replace(/e/g, "[e3]")
      .replace(/i/g, "[i1!]")
      .replace(/o/g, "[o0]")
      .replace(/s/g, "[s$5]")
      .replace(/t/g, "[t7]");
    const obfuscatedRegex = new RegExp(`\\b${obfuscated}\\b`, "i");
    if (obfuscatedRegex.test(lowerText)) return true;
  }
  return false;
}

// Spam detection patterns
function isSpammy(text: string): { isSpam: boolean; reason?: string } {
  if (!text.trim()) return { isSpam: false };

  // Check for URLs (more than 1 is suspicious)
  const urlCount = (text.match(/https?:\/\/|www\./gi) || []).length;
  if (urlCount > 1) {
    return { isSpam: true, reason: "Too many URLs detected" };
  }

  // Check for excessive repeated characters (e.g., "aaaaaa")
  if (/(.)\1{5,}/i.test(text)) {
    return { isSpam: true, reason: "Excessive repeated characters" };
  }

  // Check for ALL CAPS (more than 10 chars in a row)
  if (/[A-Z]{10,}/.test(text) && text.length > 15) {
    return { isSpam: true, reason: "Excessive use of capital letters" };
  }

  // Check for common spam phrases
  const spamPhrases = [
    "buy now",
    "click here",
    "free money",
    "act now",
    "limited time",
    "make money",
    "earn cash",
    "work from home",
    "casino",
    "viagra",
    "cialis",
    "lottery",
    "winner",
    "congratulations you",
    "claim your",
    "crypto",
    "bitcoin investment",
    "nft drop",
    "discord.gg",
    "t.me/",
    "join now",
    "dm me",
    "check bio",
    "link in bio",
  ];
  const lowerText = text.toLowerCase();
  for (const phrase of spamPhrases) {
    if (lowerText.includes(phrase)) {
      return { isSpam: true, reason: `Spam phrase detected: "${phrase}"` };
    }
  }

  // Check for excessive special characters
  const specialCharCount = (
    text.match(/[!@#$%^&*()_+=\[\]{}|\\:";'<>?,./~`]/g) || []
  ).length;
  if (specialCharCount > text.length * 0.3 && text.length > 10) {
    return { isSpam: true, reason: "Excessive special characters" };
  }

  // Check for phone number patterns (suspicious in event names)
  if (/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(text)) {
    return { isSpam: true, reason: "Phone number detected" };
  }

  // Check for email patterns (suspicious in event names)
  if (/\S+@\S+\.\S+/.test(text)) {
    return { isSpam: true, reason: "Email address detected" };
  }

  return { isSpam: false };
}

// Validate all text fields
function validateContent(fields: { name: string; value: string }[]): {
  valid: boolean;
  error?: string;
} {
  for (const field of fields) {
    if (!field.value.trim()) continue;

    // Check profanity
    if (containsProfanity(field.value)) {
      return {
        valid: false,
        error: `${field.name} contains inappropriate language`,
      };
    }

    // Check spam
    const spamCheck = isSpammy(field.value);
    if (spamCheck.isSpam) {
      return { valid: false, error: `${field.name}: ${spamCheck.reason}` };
    }
  }
  return { valid: true };
}

// Generate a random math CAPTCHA
function generateCaptcha(): { question: string; answer: number } {
  const operations = ["+", "-", "x"];
  const operation = operations[Math.floor(Math.random() * operations.length)];
  let num1: number, num2: number, answer: number;

  switch (operation) {
    case "+":
      num1 = Math.floor(Math.random() * 20) + 1;
      num2 = Math.floor(Math.random() * 20) + 1;
      answer = num1 + num2;
      break;
    case "-":
      num1 = Math.floor(Math.random() * 20) + 10;
      num2 = Math.floor(Math.random() * 10) + 1;
      answer = num1 - num2;
      break;
    case "x":
      num1 = Math.floor(Math.random() * 10) + 1;
      num2 = Math.floor(Math.random() * 10) + 1;
      answer = num1 * num2;
      break;
    default:
      num1 = 1;
      num2 = 1;
      answer = 2;
  }

  return { question: `${num1} ${operation} ${num2}`, answer };
}

const DATES = [
  { value: "2026-04-23", label: "Thu, Apr 23" },
  { value: "2026-04-24", label: "Fri, Apr 24" },
  { value: "2026-04-25", label: "Sat, Apr 25" },
  { value: "2026-04-26", label: "Sun, Apr 26 (Daze Between)" },
  { value: "2026-04-27", label: "Mon, Apr 27 (Daze Between)" },
  { value: "2026-04-28", label: "Tue, Apr 28 (Daze Between)" },
  { value: "2026-04-29", label: "Wed, Apr 29" },
  { value: "2026-04-30", label: "Thu, Apr 30" },
  { value: "2026-05-01", label: "Fri, May 1" },
  { value: "2026-05-02", label: "Sat, May 2" },
  { value: "2026-05-03", label: "Sun, May 3" },
];

interface AdminPageProps {
  onBack: () => void;
}

export default function AdminPage({ onBack }: AdminPageProps) {
  const posthog = usePostHog();
  const venues = useQuery(api.events.getVenues);
  const createVenue = useMutation(api.events.createVenue);
  const addEvent = useMutation(api.events.addEvent);

  // Form state
  const [selectedVenueId, setSelectedVenueId] = useState<string>("");
  const [isCreatingVenue, setIsCreatingVenue] = useState(false);
  const [newVenueName, setNewVenueName] = useState("");
  const [isJazzFestVenue, setIsJazzFestVenue] = useState(false);

  const [date, setDate] = useState(DATES[0].value);
  const [artist, setArtist] = useState("");
  const [title, setTitle] = useState("");
  const [featuring, setFeaturing] = useState("");
  const [time, setTime] = useState("");
  const [doors, setDoors] = useState("");
  const [price, setPrice] = useState("");
  const [isHeadliner, setIsHeadliner] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // CAPTCHA state
  const [captcha, setCaptcha] = useState(generateCaptcha);
  const [captchaAnswer, setCaptchaAnswer] = useState("");

  const refreshCaptcha = useCallback(() => {
    setCaptcha(generateCaptcha());
    setCaptchaAnswer("");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    // Validate CAPTCHA
    if (parseInt(captchaAnswer, 10) !== captcha.answer) {
      setErrorMessage("Incorrect CAPTCHA answer. Please try again.");
      refreshCaptcha();
      setIsSubmitting(false);
      return;
    }

    // Validate content for profanity and spam
    const fieldsToValidate = [
      { name: "Artist name", value: artist },
      { name: "Event title", value: title },
      { name: "Featuring", value: featuring },
      { name: "Venue name", value: newVenueName },
    ];
    const contentValidation = validateContent(fieldsToValidate);
    if (!contentValidation.valid) {
      setErrorMessage(contentValidation.error || "Invalid content detected");
      setIsSubmitting(false);
      return;
    }

    try {
      let venueId: Id<"venues">;

      // Create new venue if needed
      if (isCreatingVenue) {
        if (!newVenueName.trim()) {
          setErrorMessage("Please enter a venue name");
          setIsSubmitting(false);
          return;
        }
        venueId = await createVenue({
          name: newVenueName.trim(),
          isJazzFest: isJazzFestVenue,
        });
      } else {
        if (!selectedVenueId) {
          setErrorMessage("Please select a venue");
          setIsSubmitting(false);
          return;
        }
        venueId = selectedVenueId as Id<"venues">;
      }

      if (!artist.trim()) {
        setErrorMessage("Please enter an artist name");
        setIsSubmitting(false);
        return;
      }

      // Parse featuring artists
      const featuringArray = featuring
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);

      await addEvent({
        venueId,
        date,
        artist: artist.trim(),
        title: title.trim() || undefined,
        featuring: featuringArray.length > 0 ? featuringArray : undefined,
        time: time.trim() || undefined,
        doors: doors.trim() || undefined,
        price: price.trim() || undefined,
        isHeadliner: isHeadliner || undefined,
      });

      setSuccessMessage(
        `Event added: ${artist} at ${isCreatingVenue ? newVenueName : venues?.find((v) => v._id === selectedVenueId)?.name}`,
      );

      // Reset form (keep venue selection)
      setArtist("");
      setTitle("");
      setFeaturing("");
      setTime("");
      setDoors("");
      setPrice("");
      setIsHeadliner(false);
      refreshCaptcha();

      if (isCreatingVenue) {
        setIsCreatingVenue(false);
        setNewVenueName("");
        setIsJazzFestVenue(false);
      }
    } catch (error) {
      setErrorMessage(`Error adding event: ${error}`);
    } finally {
      setIsSubmitting(false);
      posthog.capture("event_added");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <header className="sticky top-0 z-20 bg-linear-to-r from-purple-900 via-purple-800 to-amber-700 text-white p-3 sm:p-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-lg sm:text-xl font-bold">Add Event</h1>
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Venue Selection */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
            <h2 className="font-semibold mb-3 text-slate-900 dark:text-white">
              Venue
            </h2>

            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={!isCreatingVenue}
                  onChange={() => setIsCreatingVenue(false)}
                  className="text-purple-600"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Select existing venue
                </span>
              </label>

              {!isCreatingVenue && (
                <select
                  value={selectedVenueId}
                  onChange={(e) => setSelectedVenueId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                >
                  <option value="">-- Select a venue --</option>
                  {venues?.map((venue) => (
                    <option key={venue._id} value={venue._id}>
                      {venue.name} {venue.isJazzFest ? "(Jazz Fest)" : ""}
                    </option>
                  ))}
                </select>
              )}

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={isCreatingVenue}
                  onChange={() => setIsCreatingVenue(true)}
                  className="text-purple-600"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Create new venue
                </span>
              </label>

              {isCreatingVenue && (
                <div className="space-y-3 pl-6">
                  <input
                    type="text"
                    value={newVenueName}
                    onChange={(e) => setNewVenueName(e.target.value)}
                    placeholder="Venue name"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                  />
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isJazzFestVenue}
                      onChange={(e) => setIsJazzFestVenue(e.target.checked)}
                      className="text-amber-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      Jazz Fest venue (Fair Grounds)
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Event Details */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm space-y-4">
            <h2 className="font-semibold text-slate-900 dark:text-white">
              Event Details
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Date *
              </label>
              <select
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              >
                {DATES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Artist / Band Name *
              </label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="e.g., Foo Fighters"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Event Title (optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., A Grateful Dead Celebration"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              />
              <p className="text-xs text-slate-500 mt-1">
                Use for special events with a title separate from the artist
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Featuring (optional)
              </label>
              <input
                type="text"
                value={featuring}
                onChange={(e) => setFeaturing(e.target.value)}
                placeholder="e.g., John Doe, Jane Smith"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              />
              <p className="text-xs text-slate-500 mt-1">
                Comma-separated list of featured artists
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Show Time
                </label>
                <input
                  type="text"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="e.g., 9:00 PM"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Doors
                </label>
                <input
                  type="text"
                  value={doors}
                  onChange={(e) => setDoors(e.target.value)}
                  placeholder="e.g., 8:00 PM"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Price
              </label>
              <input
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g., $45.00 or from $30"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              />
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isHeadliner}
                onChange={(e) => setIsHeadliner(e.target.checked)}
                className="text-amber-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Headliner (for Jazz Fest filtering)
              </span>
            </label>
          </div>

          {/* CAPTCHA */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
            <h2 className="font-semibold mb-3 text-slate-900 dark:text-white">
              Verification
            </h2>
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 dark:bg-slate-700 px-4 py-2 rounded-lg font-mono text-lg text-slate-900 dark:text-white">
                {captcha.question} = ?
              </div>
              <input
                type="number"
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                placeholder="Answer"
                className="w-24 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                required
              />
              <button
                type="button"
                onClick={refreshCaptcha}
                className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                title="New question"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          {successMessage && (
            <div className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 px-4 py-3 rounded-lg text-sm">
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg text-sm">
              {errorMessage}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold rounded-lg transition-colors"
          >
            {isSubmitting ? "Adding Event..." : "Add Event"}
          </button>
        </form>
      </main>
    </div>
  );
}
