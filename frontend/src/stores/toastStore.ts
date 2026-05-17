import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  title: string
  description?: string
  type: ToastType
}

interface ToastStore {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

// Zustand is useful for small cross-app UI state because it avoids prop drilling
// without the ceremony of a larger state management setup.
export const useToastStore = create<ToastStore>(set => ({
  toasts: [],
  addToast: toast =>
    set(state => ({
      // crypto.randomUUID() gives each toast stable identity for React keys and removal.
      toasts: [...state.toasts, { ...toast, id: crypto.randomUUID() }],
    })),
  removeToast: id =>
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id),
    })),
}))
