"use client"

import type React from "react"
import { AppShell } from "@/components/app-shell"
import { useToast } from "@/components/toast-provider"
import { AppStateProvider } from "@/context/app-state"
import { useState } from "react"
import { Download } from "lucide-react"

function ExportScreen() {
  const { showToast } = useToast()
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")

  function onDownload(e: React.FormEvent) {
    e.preventDefault()
    showToast("Downloading...", { variant: "info" })
    // CSV generation can be implemented here if desired.
  }

  return (
    <AppShell title="Export Data">
      <form onSubmit={onDownload} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Start Date">
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </Field>
          <Field label="End Date">
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </Field>
        </div>

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 active:scale-95"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download CSV
        </button>
      </form>
    </AppShell>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <label className="mb-1 text-sm font-medium text-gray-800">{label}</label>
      {children}
    </div>
  )
}

export default function ExportPage() {
  return (
    <AppStateProvider>
      <ExportScreen />
    </AppStateProvider>
  )
}
