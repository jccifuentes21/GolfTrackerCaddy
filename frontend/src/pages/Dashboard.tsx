import { UserButton, useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/pages/dashboard.module.scss";

// Temporary local data lets the page design exist before the real rounds API is wired.
// Once the backend list endpoint is connected, this array should be replaced by a query.
const placeholderRounds = [
  { id: 1, course: "Augusta National GC", date: "May 4, 2025", score: 82, par: 72 },
  { id: 2, course: "Pebble Beach GL", date: "Apr 20, 2025", score: 79, par: 72 },
  { id: 3, course: "TPC Sawgrass", date: "Apr 5, 2025", score: 85, par: 72 },
];

// Golf scoring is usually shown relative to par: E, +3, -1.
// Keeping that formatting in a helper prevents JSX from filling up with display math.
function formatToPar(score: number, par: number): string {
  const diff = score - par;
  if (diff === 0) return "E";
  return diff > 0 ? `+${diff}` : `${diff}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useUser();
  // Clerk user data loads asynchronously, so the greeting needs a safe fallback.
  const firstName = user?.firstName ?? "there";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.logo}>The Loop</span>
        <UserButton />
      </header>

      <section className={styles.hero}>
        <p className={styles.heroLabel}>Ready to play</p>
        <h1 className={styles.heroHeading}>Hello, {firstName}.</h1>
        {/* Desktop only - mobile gets the fixed bottom bar */}
        <button className={styles.ctaDesktop} onClick={() => navigate("/courses")}>
          Start a Round
        </button>
      </section>

      <section className={styles.rounds}>
        <h2 className={styles.roundsHeading}>Recent Rounds</h2>

        {placeholderRounds.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>No rounds yet</p>
            <p className={styles.emptyBody}>
              Start your first round and your caddy will meet you on the other side.
            </p>
          </div>
        ) : (
          <ul className={styles.roundsList}>
            {placeholderRounds.map((round, i) => (
              <li
                key={round.id}
                className={styles.roundRow}
                style={{ "--index": i } as React.CSSProperties}
                onClick={() => navigate(`/rounds/${round.id}`)}
              >
                <div className={styles.roundInfo}>
                  <span className={styles.roundCourse}>{round.course}</span>
                  <span className={styles.roundDate}>{round.date}</span>
                </div>
                <div className={styles.roundMeta}>
                  <span className={styles.roundScore}>{round.score}</span>
                  <span className={styles.roundPar}>{formatToPar(round.score, round.par)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Fixed thumb-zone CTA - mobile only, always reachable */}
      <div className={styles.ctaBar}>
        <button className={styles.ctaButton} onClick={() => navigate("/courses")}>
          Start a Round
        </button>
      </div>
    </div>
  );
}
