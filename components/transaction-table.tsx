"use client";

import { useEffect, useRef, useState } from "react";
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
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
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
import { parseDateFromSheet } from "@/lib/date-utils";
import { DatePicker } from "@/components/ui/date-picker";
import { DataEmpty, DataError, DataLoading } from "@/components/data-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// The filters hold "yyyy-MM-dd" strings; DatePicker works in Date objects.
function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateInputValue(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = parseDateFromSheet(value);
  return isNaN(parsed.getTime()) ? undefined : parsed;
}

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
  _sheetName?: string;
}

// Helper function to format date as dd/mm/yyyy
import { formatDateForDisplay } from "@/lib/date-utils";

function formatDate(dateString: string): string {
  return formatDateForDisplay(dateString);
}

function formatDateForInput(dateString: string): string {
  const date = parseDateFromSheet(dateString);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface TransactionTableProps {
  refreshTrigger?: number;
  onRefresh?: () => void;
  initialData?: Transaction[];
}

export function TransactionTable({
  refreshTrigger = 0,
  onRefresh,
  initialData = [],
}: TransactionTableProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialData);
  const hasServerProvidedRows = useRef(initialData.length > 0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<
    { rowIndex: number; sheetName?: string } | null
  >(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20); // Show 20 items per page
  const { toast } = useToast();

  // Sort transactions by date (latest first), then filter based on search term
  const sortedTransactions = [...transactions].sort((a, b) => {
    // Convert dates to proper format for comparison using utility function
    const dateA = parseDateFromSheet(a.date);
    const dateB = parseDateFromSheet(b.date);

    // Create date objects without time for consistent comparison
    const dateACompare = new Date(
      dateA.getFullYear(),
      dateA.getMonth(),
      dateA.getDate()
    );
    const dateBCompare = new Date(
      dateB.getFullYear(),
      dateB.getMonth(),
      dateB.getDate()
    );

    // Handle invalid dates by putting them at the end
    if (isNaN(dateACompare.getTime())) return 1;
    if (isNaN(dateBCompare.getTime())) return -1;

    return dateBCompare.getTime() - dateACompare.getTime(); // Descending order (latest first)
  });

  const filteredTransactions = sortedTransactions.filter((transaction) => {
    const searchLower = searchTerm.toLowerCase();
    const transactionDate = parseDateFromSheet(transaction.date);
    const afterStart =
      !startDate ||
      transactionDate >= parseDateFromSheet(startDate);
    const beforeEnd =
      !endDate ||
      transactionDate <= parseDateFromSheet(endDate);
    return afterStart && beforeEnd && (
      (transaction.buyerCompanyName &&
        transaction.buyerCompanyName.toLowerCase().includes(searchLower)) ||
      (transaction.sellerCompanyName &&
        transaction.sellerCompanyName.toLowerCase().includes(searchLower)) ||
      (transaction.product &&
        transaction.product.toLowerCase().includes(searchLower)) ||
      (transaction.date &&
        transaction.date.toLowerCase().includes(searchLower)) ||
      String(transaction.qty).includes(searchLower) ||
      String(transaction.price).includes(searchLower) ||
      (transaction.remarks &&
        transaction.remarks.toLowerCase().includes(searchLower))
    );
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  useEffect(() => {
    // Skip initial fetch if data is pre-provided from server
    if (hasServerProvidedRows.current && refreshTrigger === 0) {
      setIsLoading(false);
      return;
    }

    async function fetchTransactions() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await fetch("/api/transactions");
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || "Failed to fetch transactions");
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error("The server returned an invalid transaction list.");
        }
        setTransactions(data);
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Failed to load transactions",
        );
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
  const [isUpdating, setIsUpdating] = useState(false);

  async function handleEditTransaction(
    transaction: Transaction,
    rowIndex: number
  ) {
    setEditingTransaction({
      ...transaction,
      date: formatDateForInput(transaction.date),
      _rowIndex: rowIndex,
    });
    setEditingRowIndex(rowIndex);
  }

  async function handleDeleteTransaction(rowIndex: number, sheetName?: string) {
    if (!sheetName) {
      toast({
        title: "Unable to delete transaction",
        description: "The transaction's financial-year sheet could not be identified.",
        variant: "destructive",
      });
      return;
    }
    try {
      const response = await fetch("/api/transactions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rowIndex, sheetName }),
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

  if (isLoading) return <DataLoading rows={5} label="Loading transactions" />;

  // Handle transaction update
  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction || editingRowIndex === null || isUpdating) return;

    setIsUpdating(true);
    try {
      const response = await fetch("/api/transactions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rowIndex: editingRowIndex,
          sheetName: editingTransaction._sheetName,
          date: editingTransaction.date,
          sellerCompanyName: editingTransaction.sellerCompanyName,
          sellerCity: editingTransaction.sellerCompanyCity || "",
          buyerCompanyName: editingTransaction.buyerCompanyName,
          buyerCity: editingTransaction.buyerCompanyCity || "",
          product: editingTransaction.product,
          qty: editingTransaction.qty,
          price: editingTransaction.price,
          remarks: editingTransaction.remarks || "",
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
    } finally {
      setIsUpdating(false);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="edit-transaction-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-background p-6 shadow-lg">
            <h3 id="edit-transaction-title" className="text-lg font-semibold mb-4">Edit Transaction</h3>
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
                    className="w-full"
                    disabled
                    aria-describedby="seller-city-source"
                  />
                  <p id="seller-city-source" className="mt-1 text-xs text-muted-foreground">
                    City is sourced from Company Master.
                  </p>
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
                    className="w-full"
                    disabled
                    aria-describedby="buyer-city-source"
                  />
                  <p id="buyer-city-source" className="mt-1 text-xs text-muted-foreground">
                    City is sourced from Company Master.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Product Name
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
                    min="1"
                    step="1"
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
                    min="0.01"
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
                <Button type="submit" className="w-full sm:w-auto" disabled={isUpdating}>
                  {isUpdating ? "Saving..." : "Update"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
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
                All recorded transactions
              </CardDescription>
            </div>

            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1); // Reset to first page when searching
                  }}
                  className="pl-10 w-full sm:w-64"
                />
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">From date</span>
                  <DatePicker
                    value={fromDateInputValue(startDate)}
                    onChange={(date) => {
                      setStartDate(date ? toDateInputValue(date) : "");
                      setCurrentPage(1);
                    }}
                    placeholder="Select start date"
                    displayFormat="dd/MM/yyyy"
                    className="h-10"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">To date</span>
                  <DatePicker
                    value={fromDateInputValue(endDate)}
                    onChange={(date) => {
                      setEndDate(date ? toDateInputValue(date) : "");
                      setCurrentPage(1);
                    }}
                    placeholder="Select end date"
                    displayFormat="dd/MM/yyyy"
                    className="h-10"
                  />
                </label>
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
          <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </p>
        </CardHeader>
        <CardContent>
          {loadError ? (
            <DataError
              message={loadError}
              onRetry={() => (onRefresh ? onRefresh() : window.location.reload())}
            />
          ) : transactions.length === 0 ? (
            <DataEmpty message="No transactions recorded yet." />
          ) : (
            <>
            <div className="space-y-3 md:hidden">
              {currentTransactions.length === 0 ? (
                <DataEmpty message="No transactions match these filters." />
              ) : currentTransactions.map((tx, idx) => (
                <article
                  key={`${tx._sheetName}-${tx._rowIndex ?? idx}`}
                  className="rounded-lg border p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{tx.sellerCompanyName} → {tx.buyerCompanyName}</p>
                      <p className="text-sm text-muted-foreground">
                        {tx.sellerCompanyCity || "—"} → {tx.buyerCompanyCity || "—"}
                      </p>
                    </div>
                    <Badge variant="secondary">{formatDate(tx.date)}</Badge>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div><dt className="text-muted-foreground">Product</dt><dd>{tx.product}</dd></div>
                    <div><dt className="text-muted-foreground">Quantity</dt><dd>{Number(tx.qty || 0)}</dd></div>
                    <div><dt className="text-muted-foreground">Price</dt><dd>{Number(tx.price || 0).toFixed(2)}</dd></div>
                    <div className="col-span-2"><dt className="text-muted-foreground">Remarks</dt><dd>{tx.remarks || "—"}</dd></div>
                  </dl>
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditTransaction(tx, tx._rowIndex ?? idx + 2)}
                    >
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPendingDelete({ rowIndex: tx._rowIndex ?? idx + 2, sheetName: tx._sheetName })}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold text-foreground/80 py-4">
                      Date
                    </TableHead>
                    <TableHead className="font-semibold text-foreground/80 py-4">
                      Seller Company
                    </TableHead>
                    <TableHead className="font-semibold text-foreground/80 py-4">
                      Seller City
                    </TableHead>
                    <TableHead className="font-semibold text-foreground/80 py-4">
                      Buyer Company
                    </TableHead>
                    <TableHead className="font-semibold text-foreground/80 py-4">
                      Buyer City
                    </TableHead>
                    <TableHead className="font-semibold text-foreground/80 py-4">
                      Product Name
                    </TableHead>
                    <TableHead className="font-semibold text-foreground/80 py-4 text-right">
                      Qty
                    </TableHead>
                    <TableHead className="font-semibold text-foreground/80 py-4 text-right">
                      Price
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
                  {currentTransactions.length === 0 ? (
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
                    currentTransactions.map((tx, idx) => {
                      const qty = Number(tx.qty) || 0;
                      const price = Number(tx.price) || 0;
                      return (
                        <TableRow
                          key={`${tx._sheetName}-${tx._rowIndex ?? idx}`}
                          className="border-b border-border/50 hover:bg-accent/20 transition-colors duration-150"
                        >
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {formatDate(tx.date)}
                              </span>
                            </div>
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
                            <Badge variant="secondary" className="text-xs">
                              {tx.product}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 text-center font-medium">
                            <div className="flex justify-center items-center gap-1">
                              <span>{qty}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 text-center font-medium">
                            <div className="flex justify-center items-center gap-1">
                              <span>{price.toFixed(2)}</span>
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
                                aria-label={`Edit transaction ${formatDate(tx.date)} ${tx.sellerCompanyName} to ${tx.buyerCompanyName}`}
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
                                aria-label={`Delete transaction ${formatDate(tx.date)} ${tx.sellerCompanyName} to ${tx.buyerCompanyName}`}
                                onClick={() =>
                                  setPendingDelete({
                                    rowIndex: tx._rowIndex || idx + 2,
                                    sheetName: tx._sheetName,
                                  })
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
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredTransactions.length)} of {filteredTransactions.length} entries
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {/* Pagination logic - show pages with smart truncation */}
                  {(() => {
                    const pages = [];
                    
                    // Always show first page if not already shown in range
                    if (currentPage > 3) {
                      pages.push(
                        <PaginationItem key={1}>
                          <PaginationLink onClick={() => setCurrentPage(1)}>1</PaginationLink>
                        </PaginationItem>
                      );
                      
                      if (currentPage > 4) {
                        pages.push(
                          <PaginationItem key="ellipsis-start">
                            <span className="px-3 py-2 text-muted-foreground">...</span>
                          </PaginationItem>
                        );
                      }
                    }
                    
                    // Show pages around current page
                    const startPage = Math.max(1, currentPage - 2);
                    const endPage = Math.min(totalPages, currentPage + 2);
                    
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <PaginationItem key={i}>
                          {i === currentPage ? (
                            <PaginationLink isActive>{i}</PaginationLink>
                          ) : (
                            <PaginationLink onClick={() => setCurrentPage(i)}>{i}</PaginationLink>
                          )}
                        </PaginationItem>
                      );
                    }
                    
                    // Show last page if needed
                    if (currentPage < totalPages - 2) {
                      if (currentPage < totalPages - 3) {
                        pages.push(
                          <PaginationItem key="ellipsis-end">
                            <span className="px-3 py-2 text-muted-foreground">...</span>
                          </PaginationItem>
                        );
                      }
                      
                      pages.push(
                        <PaginationItem key={totalPages}>
                          <PaginationLink onClick={() => setCurrentPage(totalPages)}>{totalPages}</PaginationLink>
                        </PaginationItem>
                      );
                    }
                    
                    return pages;
                  })()}
                  

                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
            </>
          )}
        </CardContent>
      </Card>
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              The row is removed from {pendingDelete?.sheetName ?? "its worksheet"}.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const target = pendingDelete;
                setPendingDelete(null);
                if (target) {
                  void handleDeleteTransaction(target.rowIndex, target.sheetName);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
