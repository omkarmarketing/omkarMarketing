// context/app-state.tsx
"use client";

import type React from "react";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
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
  id: string;
  name: string;
  city: string;
};

type AppState = {
  companies: Company[];
  products: Product[];
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  addProduct: (p: Product) => Promise<void>;
  addTransaction: (t: Omit<Transaction, "id">) => void;
  addCompany: (c: Company) => Promise<void>;
  clearError: () => void;
  loadCompanies: () => Promise<void>;
  loadProducts: () => Promise<void>;
};

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/companies");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load companies");
      }

      setCompanies(data.data || []);
    } catch (error: any) {
      console.error("Error loading companies:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load products");
      }

      setProducts(data || []);
    } catch (error: any) {
      console.error("Error loading products:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addProduct = useCallback(async (p: Product) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(p),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add product");
      }

      // Update local state only if API succeeds
      setProducts((prev) => [p, ...prev]);
      return data;
    } catch (error: any) {
      console.error("Error adding product:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
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
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load initial data
    loadCompanies();
    loadProducts();
  }, [loadCompanies, loadProducts]);

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
      loadCompanies,
      loadProducts,
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
      loadCompanies,
      loadProducts,
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
