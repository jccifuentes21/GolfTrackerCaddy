import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import client from "../api/client";
import { useToast } from "../hooks/useToast";
import type { APICourse, SearchResponse } from "../types/api.gen";
import styles from "../styles/pages/course-search.module.scss";

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 300;

export default function CourseSearch() {
  const navigate = useNavigate();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  const enabled = debouncedQuery.length >= MIN_QUERY_LENGTH;

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
    console.log({
      isError,
      errorUpdatedAt,
    });
    if (isError) {
      toast.error(
        "Couldn't search right now.",
        "Check your connection, then try again.",
      );
    }
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorUpdatedAt]);

  function handleSelectCourse(course: APICourse) {
    // TODO — the "important stuff" lives here:
    //   1. POST /courses with `course` to persist it (use useMutation)
    //   2. Push selection into roundStore (extend the store with a `selectedCourse`
    //      and `tees` field, or split into a separate courseStore)
    //   3. navigate('/rounds/new')
    //
    // Heads-up: backend POST /courses errors on duplicate course IDs today.
    // Either fix that with ON CONFLICT DO NOTHING server-side, or handle the
    // duplicate response gracefully here.
    console.log("Selected course:", course);
  }

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
