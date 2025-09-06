"use client"

import type React from "react"
import { AppStateProvider } from "@/context/app-state"
import { ToastProvider } from "@/components/toast-provider"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppStateProvider>{children}</AppStateProvider>
    </ToastProvider>
  )
}
