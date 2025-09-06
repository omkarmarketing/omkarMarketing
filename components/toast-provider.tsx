"use client"

import type React from "react"
import { createContext, useCallback, useContext, useMemo, useState } from "react"

type Toast = {
  id: string
  message: string
  variant?: "success" | "info" | "error"
  duration?: number
}

type ToastContextValue = {
  showToast: (message: string, options?: { variant?: Toast["variant"]; duration?: number }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, options?: { variant?: Toast["variant"]; duration?: number }) => {
    const id = Math.random().toString(36).slice(2)
    const duration = options?.duration ?? 2000
    setToasts((prev) => [...prev, { id, message, variant: options?.variant, duration }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Bottom-center toasts */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex w-full justify-center px-4">
        <div className="flex w-full max-w-sm flex-col items-stretch gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              role="status"
              className={[
                "pointer-events-auto rounded-lg px-4 py-3 text-sm shadow-md transition-all",
                t.variant === "success" ? "bg-indigo-600 text-white" : "",
                t.variant === "error" ? "bg-red-600 text-white" : "",
                !t.variant || t.variant === "info" ? "bg-gray-800 text-white" : "",
              ].join(" ")}
            >
              {t.message}
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}
