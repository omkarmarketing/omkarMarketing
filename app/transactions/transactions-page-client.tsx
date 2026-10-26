"use client"

import { useState } from "react"
import { TransactionForm } from "@/components/transaction-form"
import { TransactionTable } from "@/components/transaction-table"
import { PageHeader } from "@/components/page-header"

export function TransactionsPageClient({ 
  initialCompanies, 
  initialProducts,
  initialIsAmit,
  initialTransactions = []
}: { 
  initialCompanies: any[]; 
  initialProducts: any[];
  initialIsAmit: boolean;
  initialTransactions?: any[];
}) {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="Record and manage all transactions"
      />

      <TransactionForm 
        onSuccess={() => setRefreshKey((k) => k + 1)} 
        initialCompanies={initialCompanies}
        initialProducts={initialProducts}
        initialIsAmit={initialIsAmit}
      />

      <TransactionTable initialData={initialTransactions} refreshTrigger={refreshKey} onRefresh={handleRefresh} />
    </div>
  )
}
