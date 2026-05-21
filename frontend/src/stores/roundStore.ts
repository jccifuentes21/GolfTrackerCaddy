import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Course, Tee } from "../types/model.gen";

type InputMode = "live" | "front_back" | "full";
type FairwayMiss = "left" | "right" | "none";
type GreenMiss = "left" | "right" | "short" | "long" | "none";

// HoleData is client-side draft state for the active round entry screen.
// Backend Hole uses snake_case fields; this store uses camelCase because it is TypeScript UI state.
interface HoleData {
  holeNumber: number;
  score: number | null;
  fairwayHit: boolean | null;
  fairwayMiss: FairwayMiss | null;
  gir: boolean | null;
  putts: number | null;
  greenMiss: GreenMiss | null;
  penalties: number;
}

// RoundStore carries the user's current round setup across pages.
// It is not the long-term source of truth for completed rounds; the backend owns that.
interface RoundStore {
  roundId: string | null;
  courseId: string | null;
  teeId: string | null;
  inputMode: InputMode | null;
  selectedCourse: Course | null;
  tees: Tee[];
  holes: HoleData[];
  setSelectedCourse: (course: Course, tees: Tee[]) => void;
  setRound: (
    data: Pick<RoundStore, "roundId" | "courseId" | "teeId" | "inputMode">,
  ) => void;
  setHole: (holeNumber: number, data: Partial<HoleData>) => void;
  setHoles: (holes: HoleData[]) => void;
  initHoles: (count: number) => void;
  reset: () => void;
}

// Empty holes use null to mean "the user has not answered this field yet."
// That is different from false or 0, which are real answers.
const emptyHole = (n: number): HoleData => ({
  holeNumber: n,
  score: null,
  fairwayHit: null,
  fairwayMiss: null,
  gir: null,
  putts: null,
  greenMiss: null,
  penalties: 0, // Penalties default to zero because most holes have none.
});

// Why create<RoundStore>()() with two call sites?
// `persist` is middleware - it wraps the store creator function and changes the
// type signature in a way TypeScript can't infer with a single call. The extra ()
// is a workaround Zustand uses so generics thread through correctly. Without it
// you get type errors on the store's state shape. This is a known Zustand quirk.
export const useRoundStore = create<RoundStore>()(
  persist(
    (set) => ({
      roundId: null,
      courseId: null,
      teeId: null,
      inputMode: null,
      selectedCourse: null,
      tees: [],
      holes: [],

      setSelectedCourse: (course, tees) =>
        set({ selectedCourse: course, courseId: course.id, tees }),

      // setRound stores the minimum data needed for HoleEntry to build the scoring flow.
      setRound: (data) => set(data),

      // initHoles is kept for simple local initialization paths.
      // HoleEntry normally uses setHoles because it combines course holes with saved holes.
      initHoles: (count) =>
        set({
          holes: Array.from({ length: count }, (_, i) => emptyHole(i + 1)),
        }),

      // setHoles replaces the entire holes array in one set() call.
      // Used on HoleEntry mount to initialize all 18 holes from course data +
      // any already-saved holes from the backend. One call = one re-render.
      setHoles: (holes) => set({ holes }),

      setHole: (holeNumber, data) =>
        set((state) => ({
          holes: state.holes.map((h) =>
            // Immutable update: replace one hole object and keep the others referentially stable.
            h.holeNumber === holeNumber ? { ...h, ...data } : h,
          ),
        })),

      // reset() clears both Zustand state AND the persisted localStorage entry.
      // Zustand's persist middleware intercepts set() calls and keeps localStorage
      // in sync automatically - you don't call localStorage.removeItem() yourself.
      reset: () =>
        set({
          roundId: null,
          courseId: null,
          teeId: null,
          inputMode: null,
          selectedCourse: null,
          tees: [],
          holes: [],
        }),
    }),
    {
      // The localStorage key. Namespace it to the app so it doesn't clash with
      // other apps on the same origin during local dev.
      name: "loop-round",

      // createJSONStorage wraps localStorage with JSON.stringify / JSON.parse.
      // The alternative is sessionStorage (clears on tab close) or a custom
      // adapter (IndexedDB, cookies, etc.). localStorage is right here - we
      // explicitly want data to survive tab closes.
      storage: createJSONStorage(() => localStorage),

      // partialize decides what slice of state gets written to localStorage.
      // We persist the course selection and round config so the user can resume
      // if they close the tab mid-flow.
      //
      // We deliberately exclude `holes` - hole data will be owned by the backend
      // once HoleEntry is built. Persisting it here would create a second source
      // of truth and complicate conflict resolution on resume.
      //
      // Action functions (setSelectedCourse, setRound, etc.) are automatically
      // excluded because they can't be JSON-serialized. partialize makes it
      // explicit and documents the intent.
      partialize: (state) => ({
        selectedCourse: state.selectedCourse,
        tees: state.tees,
        courseId: state.courseId,
        roundId: state.roundId,
        teeId: state.teeId,
        inputMode: state.inputMode,
      }),
    },
  ),
);
