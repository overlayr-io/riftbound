import { ref } from 'vue'

export type ToastType = 'error' | 'warning' | 'success' | 'info'

export interface Toast {
  id: number
  message: string
  type: ToastType
  duration?: number
}

const toasts = ref<Toast[]>([])
let nextId = 0

function add(message: string, type: ToastType = 'info', duration = 4000) {
  const id = nextId++
  toasts.value.push({ id, message, type, duration })

  if (duration > 0) {
    setTimeout(() => remove(id), duration)
  }
}

function remove(id: number) {
  const idx = toasts.value.findIndex(t => t.id === id)
  if (idx !== -1) toasts.value.splice(idx, 1)
}

export const useToast = () => ({
  toasts,
  error:   (msg: string, duration?: number) => add(msg, 'error', duration),
  warning: (msg: string, duration?: number) => add(msg, 'warning', duration),
  success: (msg: string, duration?: number) => add(msg, 'success', duration),
  info:    (msg: string, duration?: number) => add(msg, 'info', duration),
  remove,
})
