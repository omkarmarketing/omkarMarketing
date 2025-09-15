"use client";

import type React from "react";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
} from "react";

export type Product = {
  code: string;
  name: string;
  rate: number;
  companyName: string;
};

export type Transaction = {
  id: string;
  buyer: string;
  seller: string;
  date: string; // ISO
  productCode: string;
  quantity: number;
  rate: number;
  city: string;
  state: string;
  brokerageRate: number; // %
};

type Company = {
  name: string;
  city: string;
};

type AppState = {
  companies: Company[];
  products: Product[];
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  addProduct: (p: Product) => void;
  addTransaction: (t: Omit<Transaction, "id">) => void;
  addCompany: (c: Company) => Promise<void>;
  clearError: () => void;
};

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([
    { name: "Buyer Co.", city: "New York" },
    { name: "Seller Inc.", city: "Chicago" },
    { name: "Acme Traders", city: "Los Angeles" },
    { name: "Global Exports", city: "Miami" },
  ]);
  const [products, setProducts] = useState<Product[]>([
    { code: "P-100", name: "Wheat", rate: 50, companyName: "Buyer Co." },
    { code: "P-200", name: "Corn", rate: 40, companyName: "Seller Inc." },
  ]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const addProduct = useCallback((p: Product) => {
    setProducts((prev) => [p, ...prev]);
  }, []);

  const addTransaction = useCallback((t: Omit<Transaction, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setTransactions((prev) => [{ id, ...t }, ...prev]);
  }, []);

  const addCompany = useCallback(async (c: Company) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(c),
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle specific error cases
        let errorMessage = data.error || "Failed to add company";

        if (res.status === 500 && data.error?.includes("configuration")) {
          errorMessage =
            "Server configuration error. Please check Google Sheets setup.";
        } else if (res.status === 404) {
          errorMessage =
            "Google Sheet not found. Please check the spreadsheet ID.";
        } else if (res.status === 403) {
          errorMessage =
            "Permission denied. Please check Google Sheets permissions.";
        }

        throw new Error(errorMessage);
      }

      // Update local state only if API succeeds
      setCompanies((prev) => [c, ...prev]);
      return data;
    } catch (error: any) {
      console.error("Error adding company:", error);
      setError(error.message);
      throw error; // Re-throw to let the component handle it
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      companies,
      products,
      transactions,
      loading,
      error,
      addProduct,
      addTransaction,
      addCompany,
      clearError,
    }),
    [
      companies,
      products,
      transactions,
      loading,
      error,
      addProduct,
      addTransaction,
      addCompany,
      clearError,
    ]
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}