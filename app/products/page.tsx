"use client"

import type React from "react"
import { AppShell } from "@/components/app-shell"
import { useAppState, AppStateProvider } from "@/context/app-state"
import { useToast } from "@/components/toast-provider"
import { useState } from "react"

function ProductsScreen() {
  const { addProduct } = useAppState()
  const { showToast } = useToast()
  const [form, setForm] = useState({
    code: "",
    name: "",
    rate: "",
    companyName: "",
  })

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code || !form.name) return
    addProduct({
      code: form.code,
      name: form.name,
      rate: Number(form.rate || 0),
      companyName: form.companyName || "",
    })
    showToast("Product Added!", { variant: "success" })
    setForm({ code: "", name: "", rate: "", companyName: "" })
  }

  return (
    <AppShell title="Add Product">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Product Code">
            <input
              type="text"
              value={form.code}
              onChange={(e) => update("code", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              placeholder="e.g., P-123"
              required
            />
          </Field>

          <Field label="Product Name">
            <input
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              placeholder="e.g., Rice"
              required
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Rate">
            <input
              type="number"
              min={0}
              inputMode="decimal"
              value={form.rate}
              onChange={(e) => update("rate", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              placeholder="e.g., 40"
            />
          </Field>

          <Field label="Company Name">
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => update("companyName", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              placeholder="e.g., Buyer Co."
            />
          </Field>
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 active:scale-95"
        >
          Add Product
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

export default function ProductsPage() {
  return (
    <AppStateProvider>
      <ProductsScreen />
    </AppStateProvider>
  )
}
