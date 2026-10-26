"use client"

import { useState } from "react"
import { ProductForm } from "@/components/product-form"
import { ProductTable } from "@/components/product-table"
import { PageHeader } from "@/components/page-header"

export function ProductPageClient({
  initialProducts,
  initialIsAmit
}: {
  initialProducts: any[]
  initialIsAmit: boolean
}) {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Master"
        description="Manage all registered products"
      />

      <ProductForm
        onSuccess={() => setRefreshKey((k) => k + 1)}
        initialIsAmit={initialIsAmit}
      />

      <ProductTable 
        refreshTrigger={refreshKey} 
        initialProducts={initialProducts}
        initialIsAmit={initialIsAmit}
      />
    </div>
  )
}
