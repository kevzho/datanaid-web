"use client"

import * as React from "react"

export type ToastVariant = "default" | "destructive" | "success"

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
}

export type ToastInput = Omit<Toast, "id">

type Action =
  | { type: "ADD_TOAST"; toast: Toast }
  | { type: "REMOVE_TOAST"; id: string }

interface State {
  toasts: Toast[]
}

const MAX_TOASTS = 3
const AUTO_DISMISS_MS = 4000

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, MAX_TOASTS),
      }
    case "REMOVE_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      }
    default:
      return state
  }
}

// Global store — listeners pattern so multiple components can subscribe
let memoryState: State = { toasts: [] }
const listeners: Array<(state: State) => void> = []

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => listener(memoryState))
}

let toastCount = 0

function genId(): string {
  toastCount = (toastCount + 1) % Number.MAX_SAFE_INTEGER
  return String(toastCount)
}

/**
 * Standalone toast() function — can be called outside React components.
 */
function toast(input: ToastInput) {
  const id = genId()
  const newToast: Toast = { ...input, id }

  dispatch({ type: "ADD_TOAST", toast: newToast })

  // Auto-dismiss after 4 seconds
  setTimeout(() => {
    dispatch({ type: "REMOVE_TOAST", id })
  }, AUTO_DISMISS_MS)

  return id
}

/**
 * Hook to consume the toast store inside React components.
 */
function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [])

  return {
    toasts: state.toasts,
    toast,
    dismiss: (id: string) => dispatch({ type: "REMOVE_TOAST", id }),
  }
}

export { useToast, toast }
