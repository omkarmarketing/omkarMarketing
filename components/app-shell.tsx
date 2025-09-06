"use client"

import { BottomNav } from "./bottom-nav"
import type React from "react"
import { ToastProvider } from "./toast-provider"

export function AppShell({
  title,
  children,
  hideNav = false,
}: {
  title: string
  children: React.ReactNode
  hideNav?: boolean
}) {
  return (
    <ToastProvider>
      <div className="min-h-dvh bg-gray-100">
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl 2xl:max-w-3xl items-center justify-center px-4 md:px-6 py-3">
            <h1 className="text-pretty text-base md:text-lg font-semibold text-gray-800">{title}</h1>
          </div>
        </header>
        <main className={hideNav ? "pb-6" : "pb-24"}>
          <div className="mx-auto max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl 2xl:max-w-3xl px-4 md:px-6 py-4 lg:py-6">
            {children}
          </div>
        </main>
        {!hideNav && <BottomNav />}
      </div>
    </ToastProvider>
  )
}
