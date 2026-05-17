import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Course, Tee } from '../types/model.gen'

type InputMode = 'live' | 'front_back' | 'full'
type MissDirection = 'left' | 'right' | 'short' | 'long' | 'none'

interface HoleData {
  holeNumber: number
  score: number | null
  fairwayHit: boolean | null
  gir: boolean | null
  putts: number | null
  missDirection: MissDirection | null
}

interface RoundStore {
  roundId: string | null
  courseId: string | null
  teeId: string | null
  inputMode: InputMode | null
  selectedCourse: Course | null
  tees: Tee[]
  holes: HoleData[]
  setSelectedCourse: (course: Course, tees: Tee[]) => void
  setRound: (data: Pick<RoundStore, 'roundId' | 'courseId' | 'teeId' | 'inputMode'>) => void
  setHole: (holeNumber: number, data: Partial<HoleData>) => void
  setHoles: (holes: HoleData[]) => void
  initHoles: (count: number) => void
  reset: () => void
}

const emptyHole = (n: number): HoleData => ({
  holeNumber: n,
  score: null,
  fairwayHit: null,
  gir: null,
  putts: null,
  missDirection: null,
})

// Why create<RoundStore>()() with two call sites?
// `persist` is middleware — it wraps the store creator function and changes the
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

      setRound: (data) => set(data),

      initHoles: (count) =>
        set({ holes: Array.from({ length: count }, (_, i) => emptyHole(i + 1)) }),

      // setHoles replaces the entire holes array in one set() call.
      // Used on HoleEntry mount to initialize all 18 holes from course data +
      // any already-saved holes from the backend. One call = one re-render.
      setHoles: (holes) => set({ holes }),

      setHole: (holeNumber, data) =>
        set((state) => ({
          holes: state.holes.map((h) =>
            h.holeNumber === holeNumber ? { ...h, ...data } : h
          ),
        })),

      // reset() clears both Zustand state AND the persisted localStorage entry.
      // Zustand's persist middleware intercepts set() calls and keeps localStorage
      // in sync automatically — you don't call localStorage.removeItem() yourself.
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
      name: 'loop-round',

      // createJSONStorage wraps localStorage with JSON.stringify / JSON.parse.
      // The alternative is sessionStorage (clears on tab close) or a custom
      // adapter (IndexedDB, cookies, etc.). localStorage is right here — we
      // explicitly want data to survive tab closes.
      storage: createJSONStorage(() => localStorage),

      // partialize decides what slice of state gets written to localStorage.
      // We persist the course selection and round config so the user can resume
      // if they close the tab mid-flow.
      //
      // We deliberately exclude `holes` — hole data will be owned by the backend
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
    }
  )
)
