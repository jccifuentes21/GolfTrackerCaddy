// RoundSummary.tsx
// End-of-round screen. Shows aggregate stats, a full scorecard, and the AI analysis.
// Also the entry point for editing holes — tapping a score navigates to HoleEntry
// with a forceHole flag so the user lands on that specific hole.

import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import client from "../api/client";
import { useToast } from "../hooks/useToast";
import { useRoundStore } from "../stores/roundStore";
import type { Hole, CourseHole, Round } from "../types/model.gen";
import styles from "../styles/pages/round-summary.module.scss";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Golf standard: even par = E, over = +N, under = N.
const formatToPar = (diff: number): string => {
  if (diff === 0) return "E";
  return diff > 0 ? `+${diff}` : `${diff}`;
};

// Safe percentage string — avoids division by zero.
const pct = (n: number, d: number): string =>
  d === 0 ? "–" : `${Math.round((n / d) * 100)}%`;

// ─── Stats ────────────────────────────────────────────────────────────────────

interface RoundStats {
  totalScore: number;
  totalPar: number;
  scoreToPar: number;
  firHit: number;
  firAttempts: number;
  girHit: number;
  totalHoles: number;
  totalPutts: number;
  avgPutts: number;
  totalPenalties: number;
}

// Pure function — keeps the component body readable and makes the logic testable.
const computeStats = (holes: Hole[], courseHoles: CourseHole[]): RoundStats => {
  // Build a map for O(1) par lookup per hole number.
  const chMap: Record<number, CourseHole> = {};
  for (const ch of courseHoles) chMap[ch.hole_number] = ch;

  const totalScore = holes.reduce((s, h) => s + h.score, 0);
  const totalPar = courseHoles.reduce((s, ch) => s + ch.par, 0);

  // FIR only counts on par 4s and 5s — no fairway to hit on a par 3.
  const par4s5s = holes.filter((h) => (chMap[h.hole_number]?.par ?? 0) >= 4);
  const firHit = par4s5s.filter((h) => h.fairway_hit).length;

  const girHit = holes.filter((h) => h.gir).length;
  const totalPutts = holes.reduce((s, h) => s + h.putts, 0);
  const totalPenalties = holes.reduce((s, h) => s + h.penalties, 0);

  return {
    totalScore,
    totalPar,
    scoreToPar: totalScore - totalPar,
    firHit,
    firAttempts: par4s5s.length,
    girHit,
    totalHoles: holes.length,
    totalPutts,
    avgPutts: holes.length > 0 ? totalPutts / holes.length : 0,
    totalPenalties,
  };
};

// ─── SummaryScorecard ─────────────────────────────────────────────────────────
// Read-only scorecard using API Hole[] (snake_case fields) rather than store
// HoleData (camelCase). Tapping a score navigates to hole entry for that hole.

interface SummaryScorecard {
  holes: Hole[];
  courseHoles: CourseHole[];
  onHoleClick: (n: number) => void;
}

const SummaryScorecard = ({
  holes,
  courseHoles,
  onHoleClick,
}: SummaryScorecard) => {
  // O(1) lookup maps instead of O(n) .find() inside render loops.
  const holeMap: Record<number, Hole> = Object.fromEntries(
    holes.map((h) => [h.hole_number, h]),
  );
  const chMap: Record<number, CourseHole> = Object.fromEntries(
    courseHoles.map((ch) => [ch.hole_number, ch]),
  );

  const front = Array.from({ length: 9 }, (_, i) => i + 1);
  const back = Array.from({ length: 9 }, (_, i) => i + 10);

  const totalPar = (range: number[]) =>
    range.reduce((s, n) => s + (chMap[n]?.par ?? 0), 0);
  const totalScore = (range: number[]) =>
    range.reduce((s, n) => s + (holeMap[n]?.score ?? 0), 0);

  const renderHalf = (range: number[], label: string) => (
    <div className={styles.scorecardHalf}>
      <div className={styles.scorecardRow}>
        <span className={styles.scorecardLabel}>Hole</span>
        {range.map((n) => (
          <span
            key={n}
            className={`${styles.scorecardCell} ${styles.scorecardHoleNum}`}
            onClick={() => onHoleClick(n)}
            role="button"
            tabIndex={0}
          >
            {n}
          </span>
        ))}
        <span className={styles.scorecardTotal}>{label}</span>
      </div>

      <div className={styles.scorecardRow}>
        <span className={styles.scorecardLabel}>Par</span>
        {range.map((n) => (
          <span key={n} className={styles.scorecardCell}>
            {chMap[n]?.par ?? "–"}
          </span>
        ))}
        <span className={styles.scorecardTotal}>{totalPar(range)}</span>
      </div>

      <div className={styles.scorecardRow}>
        <span className={styles.scorecardLabel}>You</span>
        {range.map((n) => {
          const score = holeMap[n]?.score ?? 0;
          const par = chMap[n]?.par ?? 0;
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
              onClick={() => onHoleClick(n)}
              role="button"
              tabIndex={0}
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
      <p className={styles.scorecardHint}>Tap a score to edit that hole.</p>
      {renderHalf(front, "Out")}
      {renderHalf(back, "In")}
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

// ─── RoundSummary ─────────────────────────────────────────────────────────────

const RoundSummary = () => {
  const { roundId } = useParams<{ roundId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const selectedCourse = useRoundStore((s) => s.selectedCourse);
  const reset = useRoundStore((s) => s.reset);

  const [view, setView] = useState<"stats" | "scorecard">("stats");

  // Analysis is local state — intentionally not persisted. If the user edits
  // holes and comes back, they should re-run the analysis on fresh data.
  const [analysis, setAnalysis] = useState<string | null>(null);

  // Fetch the round itself to get teeId even after a page refresh clears the store.
  const { data: round } = useQuery<Round>({
    queryKey: ["round", roundId],
    queryFn: async () =>
      (await client.get<Round>(`/rounds/${roundId}`)).data,
    enabled: !!roundId,
  });

  // Always derive teeId from the fetched round — the store may hold a stale ID
  // from a different session or round, which would cause wrong courseHoles to load.
  const teeId = round?.tee_id;

  // Fetch saved holes — staleTime 0 so we always get the latest after an edit.
  const { data: holes = [], isSuccess: holesReady } = useQuery<Hole[]>({
    queryKey: ["roundHoles", roundId],
    queryFn: async () =>
      (await client.get<Hole[]>(`/rounds/${roundId}/holes`)).data,
    enabled: !!roundId,
    staleTime: 0,
  });

  // Fetch static course hole data (par, yardage) for stat computation.
  // staleTime: Infinity because course layouts never change.
  const { data: courseHoles = [], isSuccess: courseHolesReady } = useQuery<CourseHole[]>({
    queryKey: ["courseHoles", teeId],
    queryFn: async () =>
      (await client.get<CourseHole[]>(`/tees/${teeId}/holes`)).data,
    enabled: !!teeId,
    staleTime: Infinity,
  });

  // The AI button is only enabled once every hole has been saved.
  // Comparing counts is sufficient — the UNIQUE constraint prevents duplicate hole entries.
  const allSaved =
    holes.length > 0 &&
    courseHoles.length > 0 &&
    holes.length >= courseHoles.length;

  // If both fetches are done and the round isn't complete, skip the summary and
  // drop the user straight into hole entry. replace: true so back doesn't loop here.
  useEffect(() => {
    if (holesReady && courseHolesReady && !allSaved) {
      navigate(`/rounds/${roundId}/holes`, { replace: true });
    }
  }, [holesReady, courseHolesReady, allSaved, navigate, roundId]);

  // Stats recompute only when the underlying data changes.
  const stats = useMemo(
    () =>
      holes.length > 0 && courseHoles.length > 0
        ? computeStats(holes, courseHoles)
        : null,
    [holes, courseHoles],
  );

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await client.post<{ analysis: string }>(
        `/rounds/${roundId}/analyze`,
      );
      return res.data;
    },
    // Analysis text updates in place — old text stays visible while re-running.
    onSuccess: ({ analysis }) => setAnalysis(analysis),
    onError: () =>
      toast.error("Couldn't get analysis.", "Try again in a moment."),
  });

  // Navigate to HoleEntry for a specific hole. forceHole in location state
  // tells HoleEntry to render that hole immediately in single-hole live view.
  const handleHoleEdit = (n: number) => {
    navigate(`/rounds/${roundId}/holes`, { state: { forceHole: n } });
  };

  // Navigate first so the component unmounts before reset() triggers a re-render.
  // Calling reset() before navigate caused a flicker because clearing teeId
  // from the store re-rendered the summary while navigation was still pending.
  const handleDone = () => {
    navigate("/", { replace: true });
    reset();
  };

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
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div className={styles.headerInfo}>
            {(round?.course_name || selectedCourse) && (
              <span className={styles.headerCourse}>
                {round?.course_name || selectedCourse?.club_name || selectedCourse?.course_name}
              </span>
            )}
            <span className={styles.headerTitle}>Round Summary</span>
          </div>

          {/* Toggle between aggregate stats and the full scorecard grid */}
          <button
            type="button"
            className={styles.viewToggle}
            aria-pressed={view === "scorecard"}
            aria-label={view === "scorecard" ? "Show stats" : "Show scorecard"}
            onClick={() =>
              setView((v) => (v === "stats" ? "scorecard" : "stats"))
            }
          >
            {view === "scorecard" ? (
              // Bar chart icon — represents aggregate stats view
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="8" y1="12" x2="8" y2="17" />
                <line x1="12" y1="8" x2="12" y2="17" />
                <line x1="16" y1="15" x2="16" y2="17" />
              </svg>
            ) : (
              // Grid icon — represents scorecard view
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
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
        {view === "scorecard" ? (
          <SummaryScorecard
            holes={holes}
            courseHoles={courseHoles}
            onHoleClick={handleHoleEdit}
          />
        ) : (
          <>
            {/* ── Aggregate stats ── */}
            {stats && (
              <section className={styles.statsSection}>
                {/* Total score gets its own wide card — it's the number golfers care about most */}
                <div className={`${styles.statCard} ${styles.statCardWide}`}>
                  <span className={styles.statLabel}>Score</span>
                  <div className={styles.statScoreRow}>
                    <span className={styles.statValueLarge}>
                      {stats.totalScore}
                    </span>
                    <span
                      className={`${styles.scoreBadge} ${
                        stats.scoreToPar < 0
                          ? styles.scoreBadgeUnder
                          : stats.scoreToPar > 0
                            ? styles.scoreBadgeOver
                            : ""
                      }`}
                    >
                      {formatToPar(stats.scoreToPar)}
                    </span>
                  </div>
                </div>

                {/* 2-column grid for remaining stats */}
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Fairways</span>
                    <span className={styles.statValue}>
                      {pct(stats.firHit, stats.firAttempts)}
                    </span>
                    <span className={styles.statSub}>
                      {stats.firHit}/{stats.firAttempts} hit
                    </span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Greens</span>
                    <span className={styles.statValue}>
                      {pct(stats.girHit, stats.totalHoles)}
                    </span>
                    <span className={styles.statSub}>
                      {stats.girHit}/{stats.totalHoles} hit
                    </span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Avg Putts</span>
                    <span className={styles.statValue}>
                      {stats.avgPutts.toFixed(1)}
                    </span>
                    <span className={styles.statSub}>
                      {stats.totalPutts} total
                    </span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Penalties</span>
                    <span className={styles.statValue}>
                      {stats.totalPenalties}
                    </span>
                    <span className={styles.statSub}>strokes lost</span>
                  </div>
                </div>
              </section>
            )}

            {/* ── AI analysis ── */}
            <section className={styles.aiSection}>
              {/* Explain why the button is disabled before all holes are in */}
              {!allSaved && (
                <p className={styles.aiNote}>
                  Finish entering all holes to unlock the caddy's read.
                </p>
              )}

              {!analysis && (
                <button
                  type="button"
                  className={styles.analyzeBtn}
                  disabled={!allSaved || analyzeMutation.isPending}
                  onClick={() => analyzeMutation.mutate()}
                >
                  {analyzeMutation.isPending
                    ? "Reading the round…"
                    : "Get Caddy's Read"}
                </button>
              )}

              {analysis && (
                <div className={styles.analysisWrap}>
                  <p className={styles.analysisLabel}>Caddy's Read</p>
                  {/* Plain prose — the prompt explicitly asks Claude for no markdown */}
                  <p className={styles.analysisText}>{analysis}</p>
                  {/* Allow re-running after editing holes — old text stays visible while loading */}
                  <button
                    type="button"
                    className={styles.reAnalyzeBtn}
                    onClick={() => analyzeMutation.mutate()}
                    disabled={analyzeMutation.isPending}
                  >
                    {analyzeMutation.isPending ? "Reading…" : "Re-analyze"}
                  </button>
                </div>
              )}
            </section>

            {/* Desktop done button — inline below content, hidden on mobile */}
            <div className={styles.ctaDesktop}>
              <button
                type="button"
                className={styles.doneBtn}
                onClick={handleDone}
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>

      {/* Fixed thumb-zone done button — mobile only */}
      <div className={styles.ctaBar}>
        <button
          type="button"
          className={styles.doneBtn}
          onClick={handleDone}
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default RoundSummary;
