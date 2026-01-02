"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  Download,
  Calendar,
  DollarSign,
  Package,
  Pencil,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  date: string;
  buyerCompanyName: string;
  buyerCompanyCity?: string;
  sellerCompanyName: string;
  sellerCompanyCity?: string;
  product: string;
  qty: number | string;
  price: number | string;
  remarks?: string;
  _rowIndex?: number;
}

interface TransactionTableProps {
  refreshTrigger?: number;
  onRefresh?: () => void;
}

export function TransactionTable({
  refreshTrigger = 0,
  onRefresh,
}: TransactionTableProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Sort transactions by date first, then filter based on search term
  const sortedTransactions = [...transactions].sort((a, b) => {
    // Convert dates to proper format for comparison
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA.getTime() - dateB.getTime();
  });

  const filteredTransactions = sortedTransactions.filter((transaction) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      transaction.buyerCompanyName.toLowerCase().includes(searchLower) ||
      transaction.sellerCompanyName.toLowerCase().includes(searchLower) ||
      transaction.product.toLowerCase().includes(searchLower) ||
      transaction.date.toLowerCase().includes(searchLower) ||
      String(transaction.qty).includes(searchLower) ||
      String(transaction.price).includes(searchLower) ||
      (transaction.remarks &&
        transaction.remarks.toLowerCase().includes(searchLower))
    );
  });

  useEffect(() => {
    async function fetchTransactions() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/transactions");
        if (!response.ok) throw new Error("Failed to fetch transactions");
        const data = await response.json();
        setTransactions(data);
      } catch (error) {
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to load transactions",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchTransactions();
  }, [refreshTrigger, toast]);

  async function handleExport() {
    try {
      const response = await fetch("/api/transactions/export-excel");
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "transactions.csv";
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Transactions exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Export failed",
        variant: "destructive",
      });
    }
  }

  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);

  async function handleEditTransaction(
    transaction: Transaction,
    rowIndex: number
  ) {
    setEditingTransaction(transaction);
    setEditingRowIndex(rowIndex);
  }

  async function handleDeleteTransaction(rowIndex: number) {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      try {
        const response = await fetch("/api/transactions", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rowIndex }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete transaction");
        }

        toast({
          title: "Success",
          description: "Transaction deleted successfully",
        });

        // Refresh the transactions list
        if (onRefresh) {
          onRefresh();
        } else {
          // Fallback to refreshTrigger update
          window.location.reload();
        }
      } catch (error) {
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to delete transaction",
          variant: "destructive",
        });
      }
    }
  }

  if (isLoading)
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading transactions...
      </div>
    );

  // Handle transaction update
  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction || editingRowIndex === null) return;

    try {
      const response = await fetch("/api/transactions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editingTransaction,
          rowIndex: editingRowIndex,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update transaction");
      }

      toast({
        title: "Success",
        description: "Transaction updated successfully",
      });

      // Close the edit form and refresh
      setEditingTransaction(null);
      setEditingRowIndex(null);
      if (onRefresh) {
        onRefresh();
      } else {
        window.location.reload();
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update transaction",
        variant: "destructive",
      });
    }
  };

  const handleEditChange = (
    field: keyof Transaction,
    value: string | number
  ) => {
    if (editingTransaction) {
      setEditingTransaction({
        ...editingTransaction,
        [field]: value,
      });
    }
  };

  return (
    <>
      {/* Edit Transaction Modal */}
      {editingTransaction && editingRowIndex !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Edit Transaction</h3>
            <form onSubmit={handleUpdateTransaction}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <Input
                    type="date"
                    value={editingTransaction.date as string}
                    onChange={(e) => handleEditChange("date", e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Buyer Company
                  </label>
                  <Input
                    value={editingTransaction.buyerCompanyName}
                    onChange={(e) =>
                      handleEditChange("buyerCompanyName", e.target.value)
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Buyer City
                  </label>
                  <Input
                    value={editingTransaction.buyerCompanyCity || ""}
                    onChange={(e) =>
                      handleEditChange("buyerCompanyCity", e.target.value)
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Seller Company
                  </label>
                  <Input
                    value={editingTransaction.sellerCompanyName}
                    onChange={(e) =>
                      handleEditChange("sellerCompanyName", e.target.value)
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Seller City
                  </label>
                  <Input
                    value={editingTransaction.sellerCompanyCity || ""}
                    onChange={(e) =>
                      handleEditChange("sellerCompanyCity", e.target.value)
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Product
                  </label>
                  <Input
                    value={editingTransaction.product}
                    onChange={(e) =>
                      handleEditChange("product", e.target.value)
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Quantity
                  </label>
                  <Input
                    type="number"
                    value={editingTransaction.qty}
                    onChange={(e) =>
                      handleEditChange("qty", parseFloat(e.target.value) || 0)
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Price
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingTransaction.price}
                    onChange={(e) =>
                      handleEditChange("price", parseFloat(e.target.value) || 0)
                    }
                    className="w-full"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Remarks
                  </label>
                  <Input
                    value={editingTransaction.remarks || ""}
                    onChange={(e) =>
                      handleEditChange("remarks", e.target.value)
                    }
                    className="w-full"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingTransaction(null);
                    setEditingRowIndex(null);
                  }}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button type="submit" className="w-full sm:w-auto">
                  Update
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      <Card className="border-0 shadow-xl rounded-xl bg-gradient-to-br from-card to-muted/50 overflow-hidden">
        <CardHeader className="p-6 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-t-xl border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-6 w-6 text-primary" />
                <CardTitle className="text-2xl font-bold text-foreground">
                  Transactions
                </CardTitle>
              </div>
              <CardDescription className="text-muted-foreground">
                All recorded transactions for the current financial year
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>

              {transactions.length > 0 && (
                <Button
                  onClick={handleExport}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions recorded yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold text-foreground/80 py-4">
                      Date
                    </TableHead>
                    <TableHead className="font-semibold text-foreground/80 py-4">
                      Buyer Company
                    </TableHead>
                    <TableHead className="font-semibold text-foreground/80 py-4">
                      Buyer City
                    </TableHead>
                    <TableHead className="font-semibold text-foreground/80 py-4">
                      Seller Company
                    </TableHead>
                    <TableHead className="font-semibold text-foreground/80 py-4">
                      Seller City
                    </TableHead>
                    <TableHead className="font-semibold text-foreground/80 py-4">
                      Product
                    </TableHead>
                    <TableHead className="font-semibold text-foreground/80 py-4 text-right">
                      Qty
                    </TableHead>
                    <TableHead className="font-semibold text-foreground/80 py-4 text-right">
                      Price
                    </TableHead>
                    <TableHead className="font-semibold text-foreground/80 py-4 text-right">
                      Total
                    </TableHead>
                    <TableHead className="font-semibold text-foreground/80 py-4">
                      Remarks
                    </TableHead>
                    <TableHead className="font-semibold text-foreground/80 py-4 text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="text-center py-12 text-muted-foreground"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Package className="h-12 w-12 text-muted-foreground/50" />
                          <p className="text-lg font-medium">
                            No transactions found
                          </p>
                          <p className="text-sm">
                            Try adjusting your search query
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((tx, idx) => {
                      const qty = Number(tx.qty) || 0;
                      const price = Number(tx.price) || 0;
                      const total = qty * price;
                      return (
                        <TableRow
                          key={idx}
                          className="border-b border-border/50 hover:bg-accent/20 transition-colors duration-150"
                        >
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{tx.date}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="font-medium">
                              {tx.buyerCompanyName}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Buyer
                            </div>
                          </TableCell>
                          <TableCell className="py-4 text-muted-foreground">
                            {tx.buyerCompanyCity || "-"}
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="font-medium">
                              {tx.sellerCompanyName}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Seller
                            </div>
                          </TableCell>
                          <TableCell className="py-4 text-muted-foreground">
                            {tx.sellerCompanyCity || "-"}
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="secondary" className="text-xs">
                              {tx.product}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 text-center font-medium">
                            <div className="flex justify-center items-center gap-1">
                              <span>{qty.toFixed(2)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 text-center font-medium">
                            <div className="flex justify-center items-center gap-1">
                              <span>{price.toFixed(2)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 text-center font-bold text-primary">
                            <div className="flex justify-center items-center gap-1">
                              <span>{total.toFixed(2)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div
                              className="max-w-[120px] truncate text-sm text-muted-foreground"
                              title={tx.remarks || "-"}
                            >
                              {tx.remarks || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleEditTransaction(
                                    tx,
                                    tx._rowIndex || idx + 2
                                  )
                                } // Using the row index from the sheet data
                                className="h-8 w-8 p-0"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleDeleteTransaction(
                                    tx._rowIndex || idx + 2
                                  )
                                } // Using the row index from the sheet data
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
