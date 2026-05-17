import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import client from "../api/client";
import { useToast } from "../hooks/useToast";
import { useRoundStore } from "../stores/roundStore";
import type { APICourse, SearchResponse } from "../types/api.gen";
import type { Course, Tee } from "../types/model.gen";
import styles from "../styles/pages/course-search.module.scss";

// Search waits until the query is specific enough to avoid noisy API calls.
const MIN_QUERY_LENGTH = 3;
// Debouncing groups fast keystrokes into one request instead of calling the API per letter.
const DEBOUNCE_MS = 300;

export default function CourseSearch() {
  const navigate = useNavigate();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // The cleanup cancels the previous timer when the user keeps typing.
  // That is the core debounce pattern in React.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  const enabled = debouncedQuery.length >= MIN_QUERY_LENGTH;

  // React Query owns server state here: loading, caching, refetching, and errors.
  // The query key includes the search text so each term gets its own cache entry.
  const { data, isFetching, isError, errorUpdatedAt } =
    useQuery<SearchResponse>({
      queryKey: ["courses", "search", debouncedQuery],
      queryFn: async () => {
        const res = await client.get<SearchResponse>("/courses/search", {
          params: { query: debouncedQuery },
        });
        return res.data;
      },
      enabled,
      staleTime: 5 * 60 * 1000,
      retry: false,
    });

  // Fire a toast on each new error event. Keyed on errorUpdatedAt (a timestamp
  // that bumps only when a fresh error lands), so we don't re-toast on every
  // render where isError happens to still be true.
  useEffect(() => {
    if (isError) {
      toast.error(
        "Couldn't search right now.",
        "Check your connection, then try again.",
      );
    }
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorUpdatedAt]);

  const setSelectedCourse = useRoundStore((s) => s.setSelectedCourse);

  // Selecting a course writes it to the backend cache first.
  // The response gives us app-owned Course and Tee records, which StartRound needs next.
  const saveMutation = useMutation({
    mutationFn: async (course: APICourse) => {
      const res = await client.post<{ course: Course; tees: Tee[] }>(
        "/courses",
        course,
      );
      return res.data;
    },
    onSuccess: ({ course, tees }) => {
      setSelectedCourse(course, tees);
      navigate("/rounds/new");
    },
    onError: () => {
      toast.error("Couldn't save that course.", "Try again in a moment.");
    },
  });

  const handleSelectCourse = (course: APICourse) => {
    saveMutation.mutate(course);
  };

  // Boolean render flags make the JSX state machine easier to read than nested conditions.
  const showIdle = !enabled;
  const showSearching = enabled && isFetching;
  const showEmpty =
    enabled && !isFetching && !isError && data?.courses?.length === 0;
  const showResults =
    enabled && !isFetching && !isError && (data?.courses?.length ?? 0) > 0;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.back}
          aria-label="Back"
          onClick={() => navigate("/")}
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
        <h1 className={styles.title}>Find your course</h1>

        <div className={styles.field}>
          <span className={styles.fieldIcon}>
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
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </span>
          <input
            className={styles.input}
            type="text"
            enterKeyHint="search"
            autoComplete="off"
            placeholder="Course or club name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className={styles.clear}
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </div>
      </header>

      <section className={styles.results}>
        {showIdle && <p className={styles.idle}>Where are you teeing off?</p>}

        {showSearching && (
          <ul className={styles.skeletonList}>
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className={styles.skeletonRow}>
                <div className={styles.skeletonAvatar} />
                <div className={styles.skeletonBars}>
                  <div
                    className={`${styles.skeletonBar} ${styles.skeletonBarTop}`}
                  />
                  <div
                    className={`${styles.skeletonBar} ${styles.skeletonBarBottom}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        {showEmpty && (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No courses found.</p>
            <p className={styles.emptyBody}>
              Try a different spelling, or search by club name.
            </p>
          </div>
        )}

        {showResults && (
          <ul className={styles.list}>
            {data!.courses.map((course, i) => {
              const displayName = course.course_name || course.club_name;
              const initial = displayName.trim().charAt(0).toUpperCase() || "?";
              return (
                <li key={course.id}>
                  <button
                    type="button"
                    className={styles.row}
                    style={{ "--index": i } as React.CSSProperties}
                    onClick={() => handleSelectCourse(course)}
                    disabled={saveMutation.isPending}
                  >
                    <span className={styles.monogram} aria-hidden="true">
                      {initial}
                    </span>
                    <span className={styles.rowInfo}>
                      <span className={styles.rowCourse}>{displayName}</span>
                      <span className={styles.rowLocation}>
                        {[course.location.city, course.location.state]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
