import { UserButton, useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import client from "../api/client";
import type { Hole, Round, Tee } from "../types/model.gen";
import styles from "../styles/pages/dashboard.module.scss";

const INPUT_MODE_LABELS: Record<string, string> = {
  live: "Hole by hole",
  front_back: "Front / Back 9",
  full: "Full round",
};

// Go stores dates as UTC ISO strings. Parse and format for display.
const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

// Golf convention: E for even, +N over, -N under.
const formatToPar = (score: number, par: number): string => {
  const diff = score - par;
  if (diff === 0) return "E";
  return diff > 0 ? `+${diff}` : `${diff}`;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useUser();
  // Clerk user data loads asynchronously, so the greeting needs a safe fallback.
  const firstName = user?.firstName ?? "there";

  // Fetch all rounds, newest first (the backend orders by date DESC).
  const { data: rounds = [], isLoading } = useQuery<Round[]>({
    queryKey: ["rounds"],
    queryFn: async () => (await client.get<Round[]>("/rounds")).data,
  });

  // Fetch holes for each round in parallel to compute total score.
  const holesQueries = useQueries({
    queries: rounds.map((round) => ({
      queryKey: ["holes", round.id],
      queryFn: async () => (await client.get<Hole[]>(`/rounds/${round.id}/holes`)).data,
      enabled: rounds.length > 0,
    })),
  });

  // Deduplicate tee IDs before querying — multiple rounds on the same course share a tee_id,
  // and useQueries will warn (and behave unexpectedly) if it sees duplicate query keys.
  const uniqueTeeIds = useMemo(
    () => [...new Set(rounds.map((r) => r.tee_id))],
    [rounds],
  );

  const teeQueryResults = useQueries({
    queries: uniqueTeeIds.map((teeId) => ({
      queryKey: ["tee", teeId],
      queryFn: async () => (await client.get<Tee>(`/tees/${teeId}`)).data,
      enabled: uniqueTeeIds.length > 0,
      staleTime: Infinity,
    })),
  });

  // id → Tee lookup so each round row can grab its tee in O(1).
  const teeById = useMemo(() => {
    const map: Record<string, Tee | undefined> = {};
    uniqueTeeIds.forEach((id, i) => {
      map[id] = teeQueryResults[i]?.data;
    });
    return map;
  }, [uniqueTeeIds, teeQueryResults]);


  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.logo}>The Loop</span>
        <UserButton />
      </header>

      <section className={styles.hero}>
        <p className={styles.heroLabel}>Ready to play</p>
        <h1 className={styles.heroHeading}>Hello, {firstName}.</h1>
        {/* Desktop only — mobile gets the fixed bottom bar */}
        <button
          className={styles.ctaDesktop}
          onClick={() => navigate("/courses")}
        >
          Start a Round
        </button>
      </section>

      <section className={styles.rounds}>
        <h2 className={styles.roundsHeading}>Recent Rounds</h2>

        {/* Show nothing while loading to avoid flashing the empty state */}
        {!isLoading && rounds.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>No rounds yet</p>
            <p className={styles.emptyBody}>
              Start your first round and your caddy will meet you on the other
              side.
            </p>
          </div>
        ) : (
          <ul className={styles.roundsList}>
            {rounds.map((round, i) => {
              const holes = holesQueries[i]?.data;
              const tee = teeById[round.tee_id];
              const totalScore = holes
                ? holes.reduce((sum, h) => sum + h.score, 0)
                : null;
              const hasScore = totalScore !== null && totalScore > 0 && tee != null;

              return (
                <li
                  key={round.id}
                  className={styles.roundRow}
                  style={{ "--index": i } as React.CSSProperties}
                  onClick={() => navigate(`/rounds/${round.id}`)}
                >
                  <div className={styles.roundInfo}>
                    <span className={styles.roundCourse}>
                      {round.course_name || formatDate(round.date)}
                    </span>
                    <span className={styles.roundDate}>
                      {round.course_name ? formatDate(round.date) : (INPUT_MODE_LABELS[round.input_mode] ?? round.input_mode)}
                    </span>
                  </div>

                  {/* Score + to-par — shown once holes and tee data are fetched */}
                  <div className={styles.roundMeta}>
                    <span className={styles.roundScore}>
                      {hasScore ? totalScore : "—"}
                    </span>
                    <span className={styles.roundPar}>
                      {hasScore ? formatToPar(totalScore!, tee!.par) : ""}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Fixed thumb-zone CTA — mobile only, always reachable */}
      <div className={styles.ctaBar}>
        <button
          className={styles.ctaButton}
          onClick={() => navigate("/courses")}
        >
          Start a Round
        </button>
      </div>
    </div>
  );
}
