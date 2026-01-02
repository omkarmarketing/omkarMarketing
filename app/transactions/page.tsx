"use client"

import { useState } from "react"
import { TransactionForm } from "@/components/transaction-form"
import { TransactionTable } from "@/components/transaction-table"

export default function TransactionsPage() {
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

      <TransactionForm onSuccess={() => setRefreshKey((k) => k + 1)} />

      <TransactionTable refreshTrigger={refreshKey} onRefresh={handleRefresh} />
    </div>
  )
}
