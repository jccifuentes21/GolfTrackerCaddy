import { create } from 'zustand'

type InputMode = 'live' | 'front_back' | 'full'
type MissDirection = 'left' | 'right' | 'short' | 'none'

interface HoleData {
  holeNumber: number
  score: number | null
  fairwayHit: boolean | null
  gir: boolean | null
  putts: number | null
  missDirection: MissDirection | null
}

interface RoundStore {
  roundId: number | null
  courseId: number | null
  teeId: number | null
  inputMode: InputMode | null
  holes: HoleData[]
  setRound: (data: Pick<RoundStore, 'roundId' | 'courseId' | 'teeId' | 'inputMode'>) => void
  setHole: (holeNumber: number, data: Partial<HoleData>) => void
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

export const useRoundStore = create<RoundStore>((set) => ({
  roundId: null,
  courseId: null,
  teeId: null,
  inputMode: null,
  holes: [],

  setRound: (data) => set(data),

  initHoles: (count) =>
    set({ holes: Array.from({ length: count }, (_, i) => emptyHole(i + 1)) }),

  setHole: (holeNumber, data) =>
    set((state) => ({
      holes: state.holes.map((h) =>
        h.holeNumber === holeNumber ? { ...h, ...data } : h
      ),
    })),

  reset: () =>
    set({ roundId: null, courseId: null, teeId: null, inputMode: null, holes: [] }),
}))
