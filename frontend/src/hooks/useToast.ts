import { useToastStore } from '../stores/toastStore'

// useToast is a tiny facade over the store.
// Components get semantic methods instead of manually passing toast type strings everywhere.
export function useToast() {
  const addToast = useToastStore(s => s.addToast)

  return {
    success: (title: string, description?: string) =>
      addToast({ title, description, type: 'success' }),
    error: (title: string, description?: string) =>
      addToast({ title, description, type: 'error' }),
    info: (title: string, description?: string) =>
      addToast({ title, description, type: 'info' }),
  }
}
