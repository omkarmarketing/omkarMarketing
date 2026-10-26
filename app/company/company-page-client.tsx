"use client"

import { useState } from "react"
import { CompanyForm } from "@/components/company-form"
import { CompanyTable } from "@/components/company-table"
import { PageHeader } from "@/components/page-header"

export function CompanyPageClient({
  initialCompanies
}: {
  initialCompanies: any[]
}) {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Master"
        description="Manage all registered companies"
      />

      <CompanyForm onSuccess={() => setRefreshKey((k) => k + 1)} />

      <CompanyTable 
        refreshTrigger={refreshKey} 
        initialCompanies={initialCompanies}
      />
    </div>
  )
}
