"use client"

import { useState } from "react"
import { TransactionForm } from "@/components/transaction-form"
import { TransactionTable } from "@/components/transaction-table"

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
      <div>
        <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
        <p className="text-muted-foreground mt-1">Record and manage all transactions</p>
      </div>

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
