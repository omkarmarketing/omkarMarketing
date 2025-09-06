"use client"

import type React from "react"
import { createContext, useContext, useMemo, useState, useCallback } from "react"

export type Product = {
  code: string
  name: string
  rate: number
  companyName: string
}

export type Transaction = {
  id: string
  buyer: string
  seller: string
  date: string // ISO
  productCode: string
  quantity: number
  rate: number
  city: string
  state: string
  brokerageRate: number // %
}

type AppState = {
  companies: string[]
  products: Product[]
  transactions: Transaction[]
  addProduct: (p: Product) => void
  addTransaction: (t: Omit<Transaction, "id">) => void
}

const AppStateContext = createContext<AppState | null>(null)

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [companies] = useState<string[]>(["Buyer Co.", "Seller Inc.", "Acme Traders", "Global Exports"])
  const [products, setProducts] = useState<Product[]>([
    { code: "P-100", name: "Wheat", rate: 50, companyName: "Buyer Co." },
    { code: "P-200", name: "Corn", rate: 40, companyName: "Seller Inc." },
  ])
  const [transactions, setTransactions] = useState<Transaction[]>([])

  const addProduct = useCallback((p: Product) => {
    setProducts((prev) => [p, ...prev])
  }, [])

  const addTransaction = useCallback((t: Omit<Transaction, "id">) => {
    const id = Math.random().toString(36).slice(2)
    setTransactions((prev) => [{ id, ...t }, ...prev])
  }, [])

  const value = useMemo(
    () => ({ companies, products, transactions, addProduct, addTransaction }),
    [companies, products, transactions, addProduct, addTransaction],
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider")
  return ctx
}
