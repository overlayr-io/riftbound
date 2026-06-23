import { ref } from 'vue'

export type ToastType = 'error' | 'warning' | 'success' | 'info' | 'hint'

export interface Toast {
  id: number
  message: string
  type: ToastType
  duration?: number
}

const toasts = ref<Toast[]>([])
let nextId = 0

function add(message: string, type: ToastType = 'info', duration = 4000): number {
  const id = nextId++
  toasts.value.push({ id, message, type, duration })

  if (duration > 0) {
    setTimeout(() => remove(id), duration)
  }

  return id
}

function remove(id: number) {
  const idx = toasts.value.findIndex(t => t.id === id)
  if (idx !== -1) toasts.value.splice(idx, 1)
}

function updateMessage(id: number, message: string) {
  const toast = toasts.value.find(t => t.id === id)
  if (toast) toast.message = message
}

export const useToast = () => ({
  toasts,
  error:   (msg: string, duration?: number) => add(msg, 'error', duration),
  warning: (msg: string, duration?: number) => add(msg, 'warning', duration),
  success: (msg: string, duration?: number) => add(msg, 'success', duration),
  info:    (msg: string, duration?: number) => add(msg, 'info', duration),
  hint:    (msg: string) => add(msg, 'hint' as ToastType, 0),
  remove,
  updateMessage,
})
