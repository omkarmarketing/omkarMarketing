"use client"

import { useState } from "react"
import { ProductForm } from "@/components/product-form"
import { ProductTable } from "@/components/product-table"

export default function ProductPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Product Master</h1>
        <p className="text-muted-foreground mt-1">Manage all registered products</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ProductForm onSuccess={() => setRefreshKey((k) => k + 1)} />
        <div />
      </div>

      <ProductTable refreshTrigger={refreshKey} />
    </div>
  )
}
