"use client"

import { useState } from "react"
import { CompanyForm } from "@/components/company-form"
import { CompanyTable } from "@/components/company-table"

export default function CompanyPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Company Master</h1>
        <p className="text-muted-foreground mt-1">Manage all registered companies</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <CompanyForm onSuccess={() => setRefreshKey((k) => k + 1)} />
        <div />
      </div>

      <CompanyTable refreshTrigger={refreshKey} />
    </div>
  )
}
