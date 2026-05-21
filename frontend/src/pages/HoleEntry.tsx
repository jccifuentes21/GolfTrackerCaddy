// HoleEntry.tsx
// The heart of the app — where the round is scored.
//
// Three input modes (set on StartRound, read from the store):
//   live       → one hole at a time, saves on each "Next"
//   front_back → 9 holes at a time, saves on "Save Front 9" then "Save Back 9"
//   full       → all 18 at once, saves on "Finish Round"
//
// Two views toggled by a button in the header:
//   entry     → focused form (default)
//   scorecard → full 18-hole grid, tap any row to jump back to that hole

import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import client from "../api/client";
import { useToast } from "../hooks/useToast";
import { useRoundStore } from "../stores/roundStore";
import type { CourseHole, Hole, Round } from "../types/model.gen";
import styles from "../styles/pages/hole-entry.module.scss";

// ─── Types ────────────────────────────────────────────────────────────────────

type FairwayMiss = "left" | "right" | "none";
type GreenMiss = "left" | "right" | "short" | "long" | "none";

// The shape we POST to /rounds/:roundId/holes
interface HolePayload {
  hole_number: number;
  score: number;
  fairway_hit: boolean;
  fairway_miss: FairwayMiss;
  gir: boolean;
  putts: number;
  green_miss: GreenMiss;
  penalties: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Converts store HoleData to the wire format the backend expects.
// null values fall back to sensible defaults — the backend requires all fields.
const toPayload = (
  holeNumber: number,
  score: number,
  fairwayHit: boolean | null,
  fairwayMiss: FairwayMiss | null,
  gir: boolean | null,
  putts: number | null,
  greenMiss: GreenMiss | null,
  penalties: number,
): HolePayload => ({
  hole_number: holeNumber,
  score,
  fairway_hit: fairwayHit ?? false,
  fairway_miss: fairwayMiss ?? "none",
  gir: gir ?? false,
  putts: putts ?? 0,
  green_miss: greenMiss ?? "none",
  penalties,
});

// ─── Stepper ──────────────────────────────────────────────────────────────────
// A +/- stepper for numeric inputs (score, putts).
// Large 48px tap targets — the user is between holes, possibly wearing a glove.

interface StepperProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
  // getIncrement lets callers override the step size based on current value.
  // Putts uses this to jump from 0 → 2 on first tap (2-putt is the baseline),
  // then increment by 1 from there.
  getIncrement?: (current: number) => number;
}

const Stepper = ({
  value,
  onChange,
  min = 0,
  max = 20,
  label,
  getIncrement,
}: StepperProps) => {
  const inc = getIncrement ? getIncrement(value) : 1;
  return (
    <div className={styles.stepper} role="group" aria-label={label}>
      <button
        type="button"
        className={styles.stepperBtn}
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
      >
        −
      </button>
      {/* aria-live="polite" announces the value change to screen readers
          without interrupting whatever the user is doing */}
      <span className={styles.stepperValue} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={styles.stepperBtn}
        onClick={() => onChange(Math.min(max, value + inc))}
        aria-label={`Increase ${label}`}
        disabled={value >= max}
      >
        +
      </button>
    </div>
  );
};

// ─── Toggle ───────────────────────────────────────────────────────────────────
// Two-option toggle for boolean fields (Fairway Hit, GIR).
// aria-pressed on each button signals the selected state to screen readers.

interface ToggleProps {
  value: boolean | null;
  onChange: (v: boolean) => void;
  trueLabel: string;
  falseLabel: string;
  label: string;
}

const Toggle = ({
  value,
  onChange,
  trueLabel,
  falseLabel,
  label,
}: ToggleProps) => (
  <div className={styles.toggle} role="group" aria-label={label}>
    <button
      type="button"
      className={styles.toggleBtn}
      aria-pressed={value === true}
      onClick={() => onChange(true)}
    >
      {trueLabel}
    </button>
    <button
      type="button"
      className={styles.toggleBtn}
      aria-pressed={value === false}
      onClick={() => onChange(false)}
    >
      {falseLabel}
    </button>
  </div>
);

// ─── Miss selector ────────────────────────────────────────────────────────────
// Four-button selector for miss direction.
// Disabled when GIR is true — you can't miss a green you hit.

interface MissSelectorProps {
  value: GreenMiss | null;
  onChange: (v: GreenMiss) => void;
}

// Compass layout: Long = north, Left = west, Right = east, Short = south.
// "none" is intentionally omitted — the selector only appears when GIR is false,
// so the user already confirmed a miss and must pick a direction.
// areaClass maps each value to the CSS grid-area class that positions it.
const MISS_OPTIONS: { value: GreenMiss; label: string; icon: string }[] = [
  { value: "long", label: "Long", icon: "↑" },
  { value: "left", label: "Left", icon: "←" },
  { value: "right", label: "Right", icon: "→" },
  { value: "short", label: "Short", icon: "↓" },
];

const MISS_AREA_CLASS: Record<GreenMiss, string> = {
  long: styles.missBtnLong,
  left: styles.missBtnLeft,
  none: styles.missBtnNeutral,
  right: styles.missBtnRight,
  short: styles.missBtnShort,
};

const MissSelector = ({ value, onChange }: MissSelectorProps) => (
  <div className={styles.missSelector} role="group" aria-label="Miss direction">
    {MISS_OPTIONS.map((opt) => (
      <button
        key={opt.value}
        type="button"
        className={`${styles.missBtn} ${MISS_AREA_CLASS[opt.value]}`}
        aria-pressed={value === opt.value}
        onClick={() => onChange(opt.value)}
      >
        <span className={styles.missBtnIcon}>{opt.icon}</span>
        <span className={styles.missBtnLabel}>{opt.label}</span>
      </button>
    ))}
  </div>
);

// ─── HoleForm ─────────────────────────────────────────────────────────────────
// The full entry form for a single hole.
// Receives hole data from the store and calls onChange on change.
// courseHole provides the static par/yardage — needed for FIR visibility logic.

interface HoleFormProps {
  holeNumber: number;
  score: number;
  fairwayHit: boolean | null;
  fairwayMiss: FairwayMiss | null;
  gir: boolean | null;
  putts: number | null;
  greenMiss: GreenMiss | null;
  penalties: number;
  courseHole: CourseHole;
  onChange: (field: string, value: unknown) => void;
  compact?: boolean; // true in batch view — adds a per-hole header
}

const HoleForm = ({
  holeNumber,
  score,
  fairwayHit,
  fairwayMiss,
  gir,
  putts,
  greenMiss,
  penalties,
  courseHole,
  onChange,
  compact = false,
}: HoleFormProps) => {
  // Fairway Hit only applies to par 4s and par 5s.
  // On a par 3 you're hitting directly at the green — no fairway to hit.
  const showFairway = courseHole.par >= 4;

  return (
    <div
      className={`${styles.holeForm} ${compact ? styles.holeFormCompact : ""}`}
    >
      {compact && (
        <div className={styles.holeFormHeader}>
          <span className={styles.holeFormNumber}>Hole {holeNumber}</span>
          <span className={styles.holeFormPar}>
            Par {courseHole.par} · {courseHole.yardage} yds
          </span>
        </div>
      )}

      <div className={styles.formRow}>
        <span className={styles.formLabel}>Score</span>
        <Stepper
          value={score}
          onChange={(v) => onChange("score", v)}
          min={Math.max(1, putts ?? 0)}
          max={20}
          label="Score"
        />
      </div>

      {showFairway && (
        <div className={styles.formRow}>
          <span className={styles.formLabel}>Fairway</span>
          <Toggle
            value={fairwayHit}
            onChange={(v) => {
              onChange("fairwayHit", v);
              // Clear fairway miss when fairway is marked as hit.
              if (v) onChange("fairwayMiss", "none");
            }}
            trueLabel="Hit"
            falseLabel="Missed"
            label="Fairway hit"
          />
        </div>
      )}

      {/* Show fairway miss direction only when the fairway was explicitly missed. */}
      {showFairway && fairwayHit === false && (
        <div className={styles.formRow}>
          <span className={styles.formLabel}>Fairway Miss</span>
          <Toggle
            value={
              fairwayMiss === "left"
                ? true
                : fairwayMiss === "right"
                  ? false
                  : null
            }
            onChange={(v) => onChange("fairwayMiss", v ? "left" : "right")}
            trueLabel="Left"
            falseLabel="Right"
            label="Fairway miss direction"
          />
        </div>
      )}

      <div className={styles.formRow}>
        <span className={styles.formLabel}>GIR</span>
        <Toggle
          value={gir}
          onChange={(v) => {
            onChange("gir", v);
            // Auto-clear green miss when GIR is hit — no miss to record.
            if (v) onChange("greenMiss", "none");
          }}
          trueLabel="Yes"
          falseLabel="No"
          label="Green in regulation"
        />
      </div>

      <div className={styles.formRow}>
        <span className={styles.formLabel}>Putts</span>
        {/* First tap jumps to 2 (the par-putt baseline). Subsequent taps add 1. */}
        <Stepper
          value={putts ?? 0}
          onChange={(v) => onChange("putts", v)}
          min={0}
          max={10}
          label="Putts"
          getIncrement={(v) => (v === 0 ? 2 : 1)}
        />
      </div>

      {/* Only show green miss when GIR is explicitly No. */}
      {gir === false && (
        <div className={styles.formRowMiss}>
          <span className={styles.formLabel}>Green Miss</span>
          <MissSelector
            value={greenMiss}
            onChange={(v) => onChange("greenMiss", v)}
          />
        </div>
      )}

      <div className={styles.formRow}>
        <span className={styles.formLabel}>Penalties</span>
        <Stepper
          value={penalties}
          onChange={(v) => onChange("penalties", v)}
          min={0}
          max={10}
          label="Penalties"
        />
      </div>
    </div>
  );
};

// ─── LiveView ─────────────────────────────────────────────────────────────────
// One hole at a time. Prev/Next navigation at the bottom. Saves on Next.

interface LiveViewProps {
  holes: ReturnType<typeof useRoundStore.getState>["holes"];
  courseHoles: CourseHole[];
  currentHole: number;
  onChange: (holeNumber: number, field: string, value: unknown) => void;
  onPrev: () => void;
  onNext: () => void;
  isSaving: boolean;
  isLast: boolean;
  isEditMode: boolean;
}

const LiveView = ({
  holes,
  courseHoles,
  currentHole,
  onChange,
  onPrev,
  onNext,
  isSaving,
  isLast,
  isEditMode,
}: LiveViewProps) => {
  const hole = holes.find((h) => h.holeNumber === currentHole);
  const courseHole = courseHoles.find((ch) => ch.hole_number === currentHole);

  if (!hole || !courseHole) return null;

  return (
    <div className={styles.liveView}>
      {/* Large hole number display — Playfair Display, prominent */}
      <div className={styles.liveHero}>
        <span className={styles.liveHoleNumber}>Hole {currentHole}</span>
        <span className={styles.liveHoleMeta}>
          Par {courseHole.par} · {courseHole.yardage} yds
          {courseHole.handicap > 0 && ` · HCP ${courseHole.handicap}`}
        </span>
      </div>

      <HoleForm
        holeNumber={currentHole}
        score={hole.score ?? courseHole.par}
        fairwayHit={hole.fairwayHit}
        fairwayMiss={hole.fairwayMiss}
        gir={hole.gir}
        putts={hole.putts}
        greenMiss={hole.greenMiss as GreenMiss | null}
        penalties={hole.penalties}
        courseHole={courseHole}
        onChange={(field, value) => onChange(currentHole, field, value)}
      />

      <div className={styles.liveNav}>
        <button
          type="button"
          className={styles.liveNavBtn}
          onClick={onPrev}
          disabled={currentHole === 1}
        >
          ← Back
        </button>
        <button
          type="button"
          className={`${styles.liveNavBtn} ${styles.liveNavBtnPrimary}`}
          onClick={onNext}
          disabled={isSaving}
        >
          {isSaving ? "Saving…" : isEditMode ? "Save & Return" : isLast ? "Finish Round" : "Next →"}
        </button>
      </div>
    </div>
  );
};

// ─── BatchView ────────────────────────────────────────────────────────────────
// Scrollable list of N hole forms — used for front_back and full modes.
// holeRange is the set of hole numbers to display: [1..9], [10..18], or [1..18].

interface BatchViewProps {
  holes: ReturnType<typeof useRoundStore.getState>["holes"];
  courseHoles: CourseHole[];
  holeRange: number[];
  onChange: (holeNumber: number, field: string, value: unknown) => void;
  onSave: () => void;
  isSaving: boolean;
  saveLabel: string;
}

const BatchView = ({
  holes,
  courseHoles,
  holeRange,
  onChange,
  onSave,
  isSaving,
  saveLabel,
}: BatchViewProps) => (
  <div className={styles.batchView}>
    {holeRange.map((n) => {
      const hole = holes.find((h) => h.holeNumber === n);
      const courseHole = courseHoles.find((ch) => ch.hole_number === n);
      if (!hole || !courseHole) return null;

      return (
        <HoleForm
          key={n}
          holeNumber={n}
          score={hole.score ?? courseHole.par}
          fairwayHit={hole.fairwayHit}
          fairwayMiss={hole.fairwayMiss as FairwayMiss | null}
          gir={hole.gir}
          putts={hole.putts}
          greenMiss={hole.greenMiss as GreenMiss | null}
          penalties={hole.penalties}
          courseHole={courseHole}
          onChange={(field, value) => onChange(n, field, value)}
          compact
        />
      );
    })}

    <div className={styles.batchSave}>
      <button
        type="button"
        className={styles.ctaButton}
        onClick={onSave}
        disabled={isSaving}
      >
        {isSaving ? "Saving…" : saveLabel}
      </button>
    </div>
  </div>
);

// ─── ScorecardView ────────────────────────────────────────────────────────────
// Read-only 18-hole grid. In live mode, tapping a hole jumps to it in entry view.
// The grid is horizontally scrollable on mobile — standard golf scorecard layout.

interface ScorecardViewProps {
  holes: ReturnType<typeof useRoundStore.getState>["holes"];
  courseHoles: CourseHole[];
  onHoleClick?: (holeNumber: number) => void;
}

const ScorecardView = ({
  holes,
  courseHoles,
  onHoleClick,
}: ScorecardViewProps) => {
  // Build lookup maps so we don't run .find() inside nested renders (O(n²) → O(1)).
  const holeByNumber = Object.fromEntries(holes.map((h) => [h.holeNumber, h]));
  const courseHoleByNumber = Object.fromEntries(
    courseHoles.map((ch) => [ch.hole_number, ch]),
  );

  const front = Array.from({ length: 9 }, (_, i) => i + 1);
  const back = Array.from({ length: 9 }, (_, i) => i + 10);

  const totalPar = (range: number[]) =>
    range.reduce((s, n) => s + (courseHoleByNumber[n]?.par ?? 0), 0);
  const totalScore = (range: number[]) =>
    range.reduce((s, n) => s + (holeByNumber[n]?.score ?? 0), 0);

  const renderHalf = (range: number[], outLabel: string) => (
    <div className={styles.scorecardHalf}>
      {/* Hole numbers row */}
      <div className={styles.scorecardRow}>
        <span className={styles.scorecardLabel}>Hole</span>
        {range.map((n) => (
          <span
            key={n}
            className={`${styles.scorecardCell} ${styles.scorecardHoleNum}`}
            onClick={() => onHoleClick?.(n)}
            role={onHoleClick ? "button" : undefined}
            tabIndex={onHoleClick ? 0 : undefined}
          >
            {n}
          </span>
        ))}
        <span className={styles.scorecardTotal}>{outLabel}</span>
      </div>

      {/* Par row */}
      <div className={styles.scorecardRow}>
        <span className={styles.scorecardLabel}>Par</span>
        {range.map((n) => (
          <span key={n} className={styles.scorecardCell}>
            {courseHoleByNumber[n]?.par ?? "–"}
          </span>
        ))}
        <span className={styles.scorecardTotal}>{totalPar(range)}</span>
      </div>

      {/* Score row */}
      <div className={styles.scorecardRow}>
        <span className={styles.scorecardLabel}>You</span>
        {range.map((n) => {
          const score = holeByNumber[n]?.score ?? 0;
          const par = courseHoleByNumber[n]?.par ?? 0;
          const diff = score > 0 ? score - par : null;

          return (
            <span
              key={n}
              className={`${styles.scorecardCell} ${styles.scorecardScore} ${
                diff !== null && diff < 0
                  ? styles.under
                  : diff !== null && diff >= 2
                    ? styles.double
                    : ""
              }`}
              onClick={() => onHoleClick?.(n)}
              role={onHoleClick ? "button" : undefined}
              tabIndex={onHoleClick ? 0 : undefined}
            >
              {score > 0 ? score : "–"}
            </span>
          );
        })}
        <span className={styles.scorecardTotal}>
          {totalScore(range) > 0 ? totalScore(range) : "–"}
        </span>
      </div>
    </div>
  );

  return (
    <div className={styles.scorecardWrap}>
      <p className={styles.scorecardHint}>
        {onHoleClick ? "Tap a score to jump to that hole." : ""}
      </p>
      {renderHalf(front, "Out")}
      {renderHalf(back, "In")}

      {/* Total row */}
      <div className={styles.scorecardTotalRow}>
        <span>Total</span>
        <span>
          Par {totalPar([...front, ...back])} · You{" "}
          {totalScore([...front, ...back]) || "–"}
        </span>
      </div>
    </div>
  );
};

// ─── HoleEntry (main) ─────────────────────────────────────────────────────────

const HoleEntry = () => {
  const navigate = useNavigate();
  const toast = useToast();

  // roundId comes from the URL — the source of truth.
  // Using the URL means the page works even after a refresh (store is cleared).
  const { roundId } = useParams<{ roundId: string }>();

  const teeIdFromStore = useRoundStore((s) => s.teeId);
  const inputModeFromStore = useRoundStore((s) => s.inputMode);

  // When resuming a round from the Dashboard (store is empty), fetch the round
  // to recover teeId and inputMode. Disabled once the store has both values.
  const { data: roundData } = useQuery<Round>({
    queryKey: ["round", roundId],
    queryFn: async () => (await client.get<Round>(`/rounds/${roundId}`)).data,
    enabled: !!roundId && (!teeIdFromStore || !inputModeFromStore),
    staleTime: Infinity,
  });

  const teeId = teeIdFromStore ?? roundData?.tee_id;
  const inputMode = (inputModeFromStore ?? roundData?.input_mode) as
    | "live"
    | "front_back"
    | "full"
    | null;

  // forceHole is passed via navigation state when the user taps a hole in RoundSummary.
  // It overrides the normal resume logic and forces live-mode view for that specific hole.
  const location = useLocation();
  const forceHole =
    (location.state as { forceHole?: number } | null)?.forceHole ?? null;

  // When editing a specific hole from RoundSummary, always use live view regardless
  // of the original input mode — focused single-hole editing makes more sense.
  const effectiveInputMode = forceHole !== null ? "live" : inputMode;
  const holes = useRoundStore((s) => s.holes);
  const setHoles = useRoundStore((s) => s.setHoles);
  const setHole = useRoundStore((s) => s.setHole);
  const selectedCourse = useRoundStore((s) => s.selectedCourse);

  // ─── Local UI state ─────────────────────────────────────────────────────────
  const [view, setView] = useState<"entry" | "scorecard">("entry");

  // currentHole and activeBatch are "override or derived" — the user's navigation
  // takes precedence; if null, we compute the right starting point from saved holes.
  // This avoids calling setState inside the initialization effect (which triggers
  // an extra render cycle and trips the react-hooks/set-state-in-effect linter rule).
  const [currentHoleOverride, setCurrentHole] = useState<number | null>(forceHole);
  const [activeBatchOverride, setActiveBatch] = useState<
    "front" | "back" | null
  >(null);

  // ─── Guard ──────────────────────────────────────────────────────────────────
  // Only guard on roundId — teeId may still be loading from the API when the
  // store is empty (e.g. resuming from Dashboard). Kicking to "/" on missing
  // teeId would break any resume flow that doesn't come via StartRound.
  useEffect(() => {
    if (!roundId) navigate("/", { replace: true });
  }, [roundId, navigate]);

  // ─── Fetch course holes (static par/yardage per hole) ───────────────────────
  // staleTime: Infinity because course layouts never change mid-round.
  const { data: courseHoles = [] } = useQuery<CourseHole[]>({
    queryKey: ["courseHoles", teeId],
    queryFn: async () =>
      (await client.get<CourseHole[]>(`/tees/${teeId}/holes`)).data,
    enabled: !!teeId,
    staleTime: Infinity,
  });

  // ─── Fetch saved holes (resume support) ─────────────────────────────────────
  // staleTime: 0 means always re-fetch on mount — we want the latest saved state.
  const { data: savedHoles = [] } = useQuery<Hole[]>({
    queryKey: ["roundHoles", roundId],
    queryFn: async () =>
      (await client.get<Hole[]>(`/rounds/${roundId}/holes`)).data,
    enabled: !!roundId,
    staleTime: 0,
  });

  // ─── Derive current hole and active batch from saved progress ───────────────
  // If the user has an override (they navigated manually), use it.
  // Otherwise, compute the resume position from the saved holes.
  // This is pure computation — no setState, no effect, no extra render.
  const savedNumbers = new Set(savedHoles.map((h) => h.hole_number));

  const currentHole: number =
    currentHoleOverride ??
    (() => {
      if (effectiveInputMode === "live" && savedHoles.length > 0) {
        return (
          courseHoles.find((ch) => !savedNumbers.has(ch.hole_number))
            ?.hole_number ?? 1
        );
      }
      return 1;
    })();

  const activeBatch: "front" | "back" =
    activeBatchOverride ??
    (effectiveInputMode === "front_back" && savedHoles.length >= 9 ? "back" : "front");

  // ─── Initialize holes in the store ──────────────────────────────────────────
  // Runs once when both datasets arrive. Skips if the store already has data
  // (user hasn't refreshed — don't clobber in-progress edits).
  useEffect(() => {
    if (courseHoles.length === 0) return;
    if (holes.length > 0) return;

    // O(n) map build → O(1) per lookup. Better than .find() inside .map() (O(n²)).
    const savedMap = new Map(savedHoles.map((h) => [h.hole_number, h]));

    setHoles(
      courseHoles.map((ch) => {
        const saved = savedMap.get(ch.hole_number);
        return {
          holeNumber: ch.hole_number,
          score: saved?.score ?? null,
          fairwayHit: saved?.fairway_hit ?? null,
          fairwayMiss: saved?.fairway_miss as FairwayMiss | null,
          gir: saved?.gir ?? null,
          putts: saved?.putts ?? null,
          greenMiss: (saved?.green_miss as GreenMiss) ?? null,
          penalties: saved?.penalties ?? 0,
        };
      }),
    );
  }, [courseHoles, savedHoles]);

  // ─── Save mutation ───────────────────────────────────────────────────────────
  // Loops through holes sequentially and POSTs each one.
  // Sequential (not parallel) so errors are easy to attribute to a specific hole.
  const saveMutation = useMutation({
    mutationFn: async (holesToSave: typeof holes) => {
      for (const h of holesToSave) {
        const par =
          courseHoles.find((ch) => ch.hole_number === h.holeNumber)?.par ?? 0;
        await client.post(
          `/rounds/${roundId}/holes`,
          toPayload(
            h.holeNumber,
            h.score ?? par,
            h.fairwayHit,
            h.fairwayMiss as FairwayMiss | null,
            h.gir,
            h.putts,
            h.greenMiss as GreenMiss | null,
            h.penalties,
          ),
        );
      }
    },
    onError: () => {
      toast.error(
        "Could not save holes.",
        "Check your connection and try again.",
      );
    },
  });

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const scoreForHole = (hole: (typeof holes)[number]) => {
    const par =
      courseHoles.find((ch) => ch.hole_number === hole.holeNumber)?.par ?? 0;
    return hole.score ?? par;
  };

  const handleChange = (holeNumber: number, field: string, value: unknown) => {
    setHole(holeNumber, { [field]: value } as Parameters<typeof setHole>[1]);
  };

  // Live: save current hole then advance (or finish)
  const handleLiveNext = async () => {
    const hole = holes.find((h) => h.holeNumber === currentHole);
    if (!hole) return;

    // Live view displays par as the default score. Commit that displayed value
    // before saving so the scorecard reads the same score from local state.
    const holeToSave = { ...hole, score: scoreForHole(hole) };
    if (hole.score === null) {
      setHole(hole.holeNumber, { score: holeToSave.score });
    }

    try {
      await saveMutation.mutateAsync([holeToSave]);
    } catch {
      return; // onError toast already fired
    }

    if (forceHole !== null || currentHole === 18) {
      // Edit mode: return to summary after saving any hole.
      // Normal mode: finish after hole 18.
      navigate(`/rounds/${roundId}`, { replace: true });
    } else {
      setCurrentHole(currentHole + 1);
    }
  };

  // Batch: save a group then advance batch or finish
  const handleBatchSave = async (range: number[]) => {
    const holesToSave = holes
      .filter((h) => range.includes(h.holeNumber))
      .map((h) => ({ ...h, score: scoreForHole(h) }));

    holesToSave.forEach((h) => {
      const original = holes.find((hole) => hole.holeNumber === h.holeNumber);
      if (original?.score === null) {
        setHole(h.holeNumber, { score: h.score });
      }
    });

    try {
      await saveMutation.mutateAsync(holesToSave);
    } catch {
      return;
    }

    if (effectiveInputMode === "front_back" && activeBatch === "front") {
      setActiveBatch("back");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate(`/rounds/${roundId}`, { replace: true });
    }
  };

  // ─── Derived values ──────────────────────────────────────────────────────────

  const front9 = Array.from({ length: 9 }, (_, i) => i + 1);
  const back9 = Array.from({ length: 9 }, (_, i) => i + 10);

  const currentBatchRange =
    effectiveInputMode === "front_back"
      ? activeBatch === "front"
        ? front9
        : back9
      : Array.from({ length: 18 }, (_, i) => i + 1);

  const batchSaveLabel =
    effectiveInputMode === "front_back"
      ? activeBatch === "front"
        ? "Save Front 9"
        : "Save Back 9"
      : "Finish Round";

  const headerModeLabel =
    effectiveInputMode === "front_back"
      ? activeBatch === "front"
        ? "Front 9"
        : "Back 9"
      : effectiveInputMode === "full"
        ? "Full Round"
        : null; // live mode — hole number is prominent in the body, nothing extra needed

  if (!roundId) return null;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <button
            type="button"
            className={styles.back}
            aria-label="Back"
            onClick={() => navigate(-1)}
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

          <div className={styles.headerInfo}>
            {headerModeLabel && (
              <span className={styles.headerCourse}>{headerModeLabel}</span>
            )}
            <span className={styles.headerSubtitle}>
              {roundData?.course_name || selectedCourse?.club_name || selectedCourse?.course_name || "Round"}
            </span>
          </div>

          {/* Toggle between entry form and scorecard grid */}
          <button
            type="button"
            className={styles.viewToggle}
            aria-pressed={view === "scorecard"}
            aria-label={
              view === "scorecard" ? "Switch to entry" : "Switch to scorecard"
            }
            onClick={() =>
              setView((v) => (v === "entry" ? "scorecard" : "entry"))
            }
          >
            {view === "scorecard" ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="3" y1="15" x2="21" y2="15" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <line x1="15" y1="3" x2="15" y2="21" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className={styles.body}>
        {courseHoles.length === 0 ? (
          <p className={styles.loading}>Loading course data…</p>
        ) : view === "scorecard" ? (
          <ScorecardView
            holes={holes}
            courseHoles={courseHoles}
            onHoleClick={
              inputMode === "live"
                ? (n) => {
                    setCurrentHole(n);
                    setView("entry");
                  }
                : undefined
            }
          />
        ) : effectiveInputMode === "live" ? (
          <LiveView
            holes={holes}
            courseHoles={courseHoles}
            currentHole={currentHole}
            onChange={handleChange}
            onPrev={() => setCurrentHole(Math.max(1, currentHole - 1))}
            onNext={handleLiveNext}
            isSaving={saveMutation.isPending}
            isLast={currentHole === 18}
            isEditMode={forceHole !== null}
          />
        ) : (
          <BatchView
            holes={holes}
            courseHoles={courseHoles}
            holeRange={currentBatchRange}
            onChange={handleChange}
            onSave={() => handleBatchSave(currentBatchRange)}
            isSaving={saveMutation.isPending}
            saveLabel={batchSaveLabel}
          />
        )}
      </div>
    </div>
  );
};

export default HoleEntry;
