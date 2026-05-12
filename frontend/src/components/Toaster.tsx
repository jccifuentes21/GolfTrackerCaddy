import { useState } from 'react'
import * as Toast from '@radix-ui/react-toast'
import { useToastStore } from '../stores/toastStore'
import styles from '../styles/components/toast.module.scss'

type ToastEntry = {
  id: string
  title: string
  description?: string
  type: 'success' | 'error' | 'info'
  onRemove: (id: string) => void
}

function ToastItem({ id, title, description, type, onRemove }: ToastEntry) {
  const [open, setOpen] = useState(true)

  return (
    <Toast.Root
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) setTimeout(() => onRemove(id), 220)
      }}
      className={`${styles.root} ${styles[type]}`}
    >
      <div className={styles.content}>
        <Toast.Title className={styles.title}>{title}</Toast.Title>
        {description && (
          <Toast.Description className={styles.description}>
            {description}
          </Toast.Description>
        )}
      </div>
      <Toast.Close className={styles.close} aria-label="Dismiss">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
        </svg>
      </Toast.Close>
    </Toast.Root>
  )
}

export default function Toaster() {
  const { toasts, removeToast } = useToastStore()

  return (
    <Toast.Provider swipeDirection="right" duration={4000}>
      {toasts.map(toast => (
        <ToastItem key={toast.id} {...toast} onRemove={removeToast} />
      ))}
      <Toast.Viewport className={styles.viewport} />
    </Toast.Provider>
  )
}
