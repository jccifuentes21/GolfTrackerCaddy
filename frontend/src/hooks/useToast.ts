import { useToastStore } from '../stores/toastStore'

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
