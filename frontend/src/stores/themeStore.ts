import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark'

interface ThemeStore {
  theme: Theme
  toggle: () => void
}

// Reads the browser preference once for the initial value.
// Persisted user choice wins after Zustand rehydrates.
const getSystemTheme = (): Theme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

// CSS variables are keyed off data-theme on the document root.
// This keeps theme switching in CSS instead of branching inside React components.
const applyTheme = (theme: Theme) => {
  document.documentElement.setAttribute('data-theme', theme)
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: getSystemTheme(),
      toggle: () =>
        set((state) => {
          const next = state.theme === 'light' ? 'dark' : 'light'
          applyTheme(next)
          return { theme: next }
        }),
    }),
    {
      name: 'golf-theme',
      // Re-apply the persisted theme after localStorage hydration finishes.
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme)
      },
    }
  )
)
