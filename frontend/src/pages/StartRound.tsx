// StartRound.tsx
// This is the configuration screen before a round begins.
// The user arrives here after selecting a course from CourseSearch.
// They make three decisions: which tee, what date, how they'll enter data.
// Then we POST /rounds and navigate to hole entry.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import client from "../api/client";
import { useToast } from "../hooks/useToast";
import { useRoundStore } from "../stores/roundStore";
import type { Round } from "../types/model.gen";
import styles from "../styles/pages/start-round.module.scss";

// ─── Input mode config ────────────────────────────────────────────────────────
// Defined as a constant outside the component so it's not recreated on every
// render. Each object holds the value (what goes to the backend), the display
// label, and a short description for the golfer.
//
// These exact string values ("live", "front_back", "full") must match the
// InputMode type in roundStore and the input_mode column the backend stores.
const INPUT_MODES = [
  {
    value: "live" as const,
    label: "Hole by hole",
    description: "Score as you walk. One hole at a time, no scrolling.",
  },
  {
    value: "front_back" as const,
    label: "Front / Back 9",
    description: "Enter each nine after you finish it.",
  },
  {
    value: "full" as const,
    label: "Full round",
    description: "Fill everything in once you're done.",
  },
] as const;

// "as const" freezes the array and its nested objects so TypeScript treats
// each .value as a literal type ("live" | "front_back" | "full") rather than
// just "string". This means if you mistype a value elsewhere, TS catches it.

// ─── Tee color lookup ─────────────────────────────────────────────────────────
// Golf tees have conventional colors — Championship is black/navy, Ladies is red,
// etc. We don't get color data from the API so we derive a color from the name.
// This is cosmetic only; it helps the user distinguish tees at a glance.
const TEE_COLORS: Record<string, string> = {
  championship: "#1A1A18",
  black: "#1A1A18",
  blue: "#2563A8",
  white: "#D4D4CC",
  gold: "#B8922A",
  yellow: "#C9A227",
  silver: "#8A8A84",
  red: "#B5280F",
  green: "var(--clr-accent)",
  ladies: "#B5280F",
  senior: "#B8922A",
  junior: "#52B788",
};

// Looks up a color by scanning the tee name for any known keyword.
// toLowerCase + includes means "Championship Tees" matches "championship".
// Falls back to the accent green if nothing matches.
const getTeeColor = (teeName: string): string => {
  const lower = teeName.toLowerCase();
  for (const [key, color] of Object.entries(TEE_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return "var(--clr-accent)";
};

// ─── Component ────────────────────────────────────────────────────────────────
const StartRound = () => {
  const navigate = useNavigate();
  const toast = useToast();

  // useUser() is Clerk's hook — gives us the signed-in user.
  // We need user.id to pass to POST /rounds (the backend stores it on the round).
  // `isLoaded` tells us Clerk has finished its async auth check — never use
  // user before isLoaded is true or you'll get null at startup.
  const { user, isLoaded } = useUser();

  // Pull what we need from the round store.
  // We read selectedCourse and tees (set by CourseSearch when the user picked
  // a course) and setRound (to store the new roundId after creation).
  const selectedCourse = useRoundStore((s) => s.selectedCourse);
  const tees = useRoundStore((s) => s.tees);
  const setRound = useRoundStore((s) => s.setRound);
  const courseId = useRoundStore((s) => s.courseId);

  // ─── Local state ────────────────────────────────────────────────────────────
  // These three are the decisions the user makes on this screen.
  // They live in local state (not the store) because they're transient —
  // they only matter until the round is created.

  // If there's only one tee, pre-select it so the user doesn't have to pick.
  // The function form of useState (lazy initializer) runs once before the first
  // render — no effect needed, no extra render cycle.
  const [selectedTeeId, setSelectedTeeId] = useState<string | null>(
    () => tees.length === 1 ? tees[0].id : null,
  );

  // Date defaults to today in "YYYY-MM-DD" format, which is what the native
  // <input type="date"> expects and what the backend's time.Parse wants.
  const [date, setDate] = useState<string>(
    () => new Date().toISOString().split("T")[0],
  );

  // "live" | "front_back" | "full" | null — null means the user hasn't chosen yet.
  // We default to null so the user makes a conscious choice. If you wanted to
  // pre-select "live" (most common), just change this to useState<...>("live").
  const [inputMode, setInputMode] = useState<
    "live" | "front_back" | "full" | null
  >(null);

  // ─── Guard: redirect if no course selected ──────────────────────────────────
  // The user might land here directly (bookmarked URL, back-nav from a reload).
  // If there's no selectedCourse in the store, there's nothing to show — send
  // them back to course search. `replace: true` means the browser won't push
  // a new history entry, so pressing back won't loop them here again.
  useEffect(() => {
    if (!selectedCourse) {
      navigate("/courses", { replace: true });
    }
  }, [selectedCourse, navigate]);

  // ─── Mutation: POST /rounds ──────────────────────────────────────────────────
  // useMutation (from react-query) is for actions triggered by the user, not
  // automatic fetches. Here the action is "create a round in the database."
  //
  // mutationFn receives the payload we pass to .mutate() below.
  // onSuccess receives what mutationFn returned — the created Round from the API.
  // onError fires if the POST failed for any reason.
  const createRoundMutation = useMutation({
    mutationFn: async (payload: {
      tee_id: string;
      user_id: string;
      course_name: string;
      date: string;
      input_mode: string;
    }) => {
      const res = await client.post<Round>("/rounds", payload);
      return res.data;
    },

    onSuccess: (round) => {
      // Store the round ID and other selections so HoleEntry can read them.
      // courseId is already in the store from CourseSearch — we pass it again
      // here because setRound overwrites the whole slice of state.
      setRound({
        roundId: round.id,
        courseId: courseId,
        teeId: round.tee_id,
        inputMode: round.input_mode as "live" | "front_back" | "full",
      });

      // Navigate into the round. Replace so the user can't back-nav to setup.
      navigate(`/rounds/${round.id}/holes`, { replace: true });
    },

    onError: () => {
      toast.error("Couldn't start the round.", "Try again in a moment.");
    },
  });

  // ─── Derived state ───────────────────────────────────────────────────────────
  // canSubmit drives the CTA disabled state.
  // Rules: must have a tee selected, Clerk must be loaded, mutation must not
  // already be in flight (prevents double-submit).
  //
  // Note: date always has a value (defaults to today), and we allow null
  // inputMode to be submitted — the backend will accept any valid string or
  // we could default it here. Currently we require an explicit choice.
  const canSubmit =
    !!selectedTeeId &&
    !!inputMode &&
    isLoaded &&
    !createRoundMutation.isPending;

  // ─── Submit handler ──────────────────────────────────────────────────────────
  const handleStartRound = () => {
    // These checks are technically redundant (the button is disabled if any
    // of these are missing) but TypeScript needs the narrowing, and explicit
    // guards make the code easier to reason about in an interview setting.
    if (!selectedTeeId || !inputMode || !user || !selectedCourse) return;

    createRoundMutation.mutate({
      tee_id: selectedTeeId,
      user_id: user.id,
      // Stored on the round so dashboard/hole entry can show course name after a refresh.
      course_name: selectedCourse.club_name || selectedCourse.course_name,
      date,
      input_mode: inputMode,
    });
  };

  // Don't render anything until the guard has had a chance to redirect.
  // Without this, you'd briefly see an empty/broken page before the effect fires.
  if (!selectedCourse) return null;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* ── Header: green ground, back button, course context ── */}
      <header className={styles.header}>
        <button
          type="button"
          className={styles.back}
          aria-label="Back to course search"
          onClick={() => navigate("/courses")}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Course name above the title — smaller, tertiary, acts as breadcrumb */}
        <p className={styles.courseName}>
          {selectedCourse.club_name || selectedCourse.course_name}
        </p>

        <h1 className={styles.title}>Set up your round</h1>
      </header>

      {/* ── Body: the three decisions ── */}
      <div className={styles.body}>

        {/* ── Section 1: Tee picker ── */}
        <section className={styles.section}>
          <p className={styles.sectionLabel}>Playing from</p>

          {/* Only show the picker if there's more than one tee.
              If there's just one, auto-selection already fired and we show
              a read-only row instead of a redundant single-option picker. */}
          {tees.length === 1 ? (
            <div className={styles.teeRowSingle}>
              <span
                className={styles.teeDot}
                style={{ background: getTeeColor(tees[0].tee_name) }}
                aria-hidden="true"
              />
              <span className={styles.teeInfo}>
                <span className={styles.teeName}>{tees[0].tee_name}</span>
                <span className={styles.teeMeta}>
                  {tees[0].course_rating} / {tees[0].slope_rating} · {tees[0].total_yards} yds · Par {tees[0].par}
                </span>
              </span>
            </div>
          ) : (
            <ul className={styles.teeList}>
              {tees.map((tee, i) => {
                const isSelected = tee.id === selectedTeeId;
                return (
                  <li key={tee.id}>
                    {/* Each tee is a button — not a radio input — because we
                        want full control over the selected state visual.
                        Semantically a radio group would be more correct, but
                        button + aria-pressed is a valid and simpler pattern. */}
                    <button
                      type="button"
                      className={styles.teeRow}
                      aria-pressed={isSelected}
                      style={{ "--index": i } as React.CSSProperties}
                      onClick={() => setSelectedTeeId(tee.id)}
                    >
                      {/* Colored dot — derived from tee name, cosmetic only */}
                      <span
                        className={styles.teeDot}
                        style={{ background: getTeeColor(tee.tee_name) }}
                        aria-hidden="true"
                      />

                      <span className={styles.teeInfo}>
                        <span className={styles.teeName}>{tee.tee_name}</span>
                        <span className={styles.teeMeta}>
                          {tee.course_rating} / {tee.slope_rating} · {tee.total_yards} yds · Par {tee.par}
                        </span>
                      </span>

                      {/* Selection indicator: empty circle → filled checkmark.
                          Pure CSS in the SCSS — the aria-pressed attribute drives it. */}
                      <span className={styles.radio} aria-hidden="true">
                        {isSelected && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path
                              d="M2 6l3 3 5-5"
                              stroke="currentColor"
                              strokeWidth="1.75"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── Section 2: Date ── */}
        <section className={styles.section}>
          <p className={styles.sectionLabel}>Date played</p>

          {/* Native date input — the browser's built-in picker is appropriate
              here. We style the wrapper, not the picker itself (cross-browser
              styling of the calendar popup is unreliable and not worth it).
              value="YYYY-MM-DD" is the required format for type="date". */}
          <div className={styles.dateField}>
            <span className={styles.dateIcon} aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <input
              type="date"
              className={styles.dateInput}
              value={date}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </section>

        {/* ── Section 3: Input mode ── */}
        <section className={styles.section}>
          <p className={styles.sectionLabel}>How are you entering?</p>

          {/* Same pattern as the tee picker — button rows, aria-pressed,
              stagger animation via --index CSS custom property. */}
          <ul className={styles.modeList}>
            {INPUT_MODES.map((mode, i) => {
              const isSelected = inputMode === mode.value;
              return (
                <li key={mode.value}>
                  <button
                    type="button"
                    className={styles.modeRow}
                    aria-pressed={isSelected}
                    style={{ "--index": i } as React.CSSProperties}
                    onClick={() => setInputMode(mode.value)}
                  >
                    <span className={styles.modeInfo}>
                      <span className={styles.modeName}>{mode.label}</span>
                      <span className={styles.modeDesc}>{mode.description}</span>
                    </span>

                    <span className={styles.radio} aria-hidden="true">
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M2 6l3 3 5-5"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Desktop CTA — inline, below the form, hidden on mobile */}
        <div className={styles.ctaDesktop}>
          <button
            type="button"
            className={styles.ctaButton}
            disabled={!canSubmit}
            onClick={handleStartRound}
          >
            {createRoundMutation.isPending ? "Starting…" : "Start Round"}
          </button>
        </div>
      </div>

      {/* ── Fixed bottom CTA bar — mobile only ── */}
      {/* Fixed positioning keeps this in the thumb zone regardless of scroll.
          On desktop we use the inline button above instead (via CSS display). */}
      <div className={styles.ctaBar}>
        <button
          type="button"
          className={styles.ctaButton}
          disabled={!canSubmit}
          onClick={handleStartRound}
        >
          {createRoundMutation.isPending ? "Starting…" : "Start Round"}
        </button>
      </div>
    </div>
  );
};

export default StartRound;
