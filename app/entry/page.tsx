// app/entry/page.tsx
"use client";
import type React from "react";
import { AppShell } from "@/components/app-shell";
import { useAppState } from "@/context/app-state";
import { useToast } from "@/components/toast-provider";
import { useState, useEffect, useMemo } from "react";

function EntryScreen() {
  const { products, companies, addTransaction } = useAppState();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for form fields
  const [form, setForm] = useState({
    buyer: "",
    seller: "",
    date: new Date().toISOString().split("T")[0],
    productCode: "",
    quantity: "",
    rate: "",
    sellerCity: "",
    buyerCity: "",
    remarks: "",
  });

  // State for autocomplete suggestions
  const [buyerSuggestions, setBuyerSuggestions] = useState<string[]>([]);
  const [sellerSuggestions, setSellerSuggestions] = useState<string[]>([]);
  const [productSuggestions, setProductSuggestions] = useState<string[]>([]);
  const [showBuyerSuggestions, setShowBuyerSuggestions] = useState(false);
  const [showSellerSuggestions, setShowSellerSuggestions] = useState(false);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);

  // Memoized company names and product codes
  const companyNames = useMemo(() => {
    return companies.map((company) => company.name);
  }, [companies]);

  const productCodes = useMemo(() => {
    return products.map((product) => product.code);
  }, [products]);

  // Find company by name
  const findCompanyByName = (name: string) => {
    return companies.find((company) => company.name === name);
  };

  useEffect(() => {
    // Update buyer suggestions based on input
    if (form.buyer) {
      const inputValue = form.buyer.toLowerCase();
      const filteredCompanies = companyNames
        .filter((company) => company.toLowerCase().includes(inputValue))
        .slice(0, 5);
      setBuyerSuggestions(filteredCompanies);
    } else {
      setBuyerSuggestions([]);
    }
  }, [form.buyer, companyNames]);

  useEffect(() => {
    // Update seller suggestions based on input
    if (form.seller) {
      const inputValue = form.seller.toLowerCase();
      const filteredCompanies = companyNames
        .filter((company) => company.toLowerCase().includes(inputValue))
        .slice(0, 5);
      setSellerSuggestions(filteredCompanies);
    } else {
      setSellerSuggestions([]);
    }
  }, [form.seller, companyNames]);

  useEffect(() => {
    // Update product suggestions based on input
    if (form.productCode) {
      const inputValue = form.productCode.toLowerCase();
      const filteredProducts = productCodes
        .filter((code) => code.toLowerCase().includes(inputValue))
        .slice(0, 5);
      setProductSuggestions(filteredProducts);
    } else {
      setProductSuggestions([]);
    }
  }, [form.productCode, productCodes]);

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function selectBuyer(companyName: string) {
    update("buyer", companyName);
    const company = findCompanyByName(companyName);
    if (company) {
      update("buyerCity", company.city);
    }
    setShowBuyerSuggestions(false);
  }

  function selectSeller(companyName: string) {
    update("seller", companyName);
    const company = findCompanyByName(companyName);
    if (company) {
      update("sellerCity", company.city);
    }
    setShowSellerSuggestions(false);
  }

  function selectProduct(code: string) {
    update("productCode", code);
    setShowProductSuggestions(false);
    // Note: Rate field is now manual, so we don't auto-fill it
  }

  async function saveToGoogleSheets(data: any) {
    try {
      const response = await fetch("/api/addData", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save data");
      }
      return await response.json();
    } catch (error) {
      console.error("Error saving to Google Sheets:", error);
      throw error;
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.productCode) {
      showToast("Please select a product", { variant: "error" });
      return;
    }
    setIsSubmitting(true);
    try {
      // Prepare data for Google Sheets - matching the column names in your sheet
      const sheetData = {
        Buyer: form.buyer,
        Seller: form.seller,
        Date: form.date,
        Product: form.productCode,
        Quantity: form.quantity,
        Rate: form.rate,
        "Seller City": form.sellerCity,
        "Buyer City": form.buyerCity,
        Remarks: form.remarks,
      };

      // Save to Google Sheets
      await saveToGoogleSheets(sheetData);

      // Create transaction data for local state
      const transactionData = {
        buyer: form.buyer,
        seller: form.seller,
        date: form.date,
        productCode: form.productCode,
        quantity: Number(form.quantity || 0),
        rate: Number(form.rate || 0),
        sellerCity: form.sellerCity,
        buyerCity: form.buyerCity,
        remarks: form.remarks,
      };

      // Also save to local state for immediate UI update
      addTransaction(transactionData);

      showToast("Transaction saved to Google Sheets!", {
        variant: "success",
      });

      // Reset only product-related fields, keep buyer/seller info for multiple entries
      setForm({
        ...form,
        productCode: "",
        quantity: "",
        rate: "",
        remarks: "",
      });
    } catch (error: any) {
      console.error("Submission error:", error);
      showToast(`Failed to save transaction: ${error.message}`, {
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell title="New Transaction">
      <form onSubmit={onSubmit} className="space-y-4 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Seller (Company Name)">
            <div className="relative">
              <input
                type="text"
                value={form.seller}
                onChange={(e) => update("seller", e.target.value)}
                onFocus={() => setShowSellerSuggestions(true)}
                onBlur={() =>
                  setTimeout(() => setShowSellerSuggestions(false), 200)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                placeholder="Seller Inc."
                required
                disabled={isSubmitting}
              />
              {showSellerSuggestions && sellerSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg border border-gray-200 max-h-60 overflow-auto">
                  {sellerSuggestions.map((company, index) => (
                    <div
                      key={index}
                      className="px-4 py-2 text-sm text-gray-800 hover:bg-indigo-100 cursor-pointer"
                      onMouseDown={() => selectSeller(company)}
                    >
                      {company}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Field>
          <Field label="Seller City">
            <input
              type="text"
              value={form.sellerCity}
              onChange={(e) => update("sellerCity", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              placeholder="Seller city"
              required
              disabled={isSubmitting}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Buyer (Company Name)">
            <div className="relative">
              <input
                type="text"
                value={form.buyer}
                onChange={(e) => update("buyer", e.target.value)}
                onFocus={() => setShowBuyerSuggestions(true)}
                onBlur={() =>
                  setTimeout(() => setShowBuyerSuggestions(false), 200)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                placeholder="Buyer Co."
                required
                disabled={isSubmitting}
              />
              {showBuyerSuggestions && buyerSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg border border-gray-200 max-h-60 overflow-auto">
                  {buyerSuggestions.map((company, index) => (
                    <div
                      key={index}
                      className="px-4 py-2 text-sm text-gray-800 hover:bg-indigo-100 cursor-pointer"
                      onMouseDown={() => selectBuyer(company)}
                    >
                      {company}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Field>
          <Field label="Buyer City">
            <input
              type="text"
              value={form.buyerCity}
              onChange={(e) => update("buyerCity", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              placeholder="Buyer city"
              required
              disabled={isSubmitting}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date">
            <input
              type="date"
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              required
              disabled={isSubmitting}
            />
          </Field>
          <Field label="Product Code">
            <div className="relative">
              <input
                type="text"
                value={form.productCode}
                onChange={(e) => update("productCode", e.target.value)}
                onFocus={() => setShowProductSuggestions(true)}
                onBlur={() =>
                  setTimeout(() => setShowProductSuggestions(false), 200)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                placeholder="Enter product code"
                required
                disabled={isSubmitting}
              />
              {showProductSuggestions && productSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg border border-gray-200 max-h-60 overflow-auto">
                  {productSuggestions.map((code, index) => (
                    <div
                      key={index}
                      className="px-4 py-2 text-sm text-gray-800 hover:bg-indigo-100 cursor-pointer"
                      onMouseDown={() => selectProduct(code)}
                    >
                      {code}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Quantity">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={form.quantity}
              onChange={(e) => update("quantity", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              placeholder="e.g., 100"
              required
              disabled={isSubmitting}
            />
          </Field>
          <Field label="Rate (per unit)">
            <input
              type="number"
              min={0}
              inputMode="decimal"
              value={form.rate}
              onChange={(e) => update("rate", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              placeholder="e.g., 50"
              required
              disabled={isSubmitting}
            />
          </Field>
        </div>

        <Field label="Remarks">
          <input
            type="text"
            value={form.remarks}
            onChange={(e) => update("remarks", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            placeholder="Enter remarks"
            disabled={isSubmitting}
          />
        </Field>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Saving..." : "Submit Transaction"}
          </button>
          <button
            type="button"
            onClick={() => {
              // Reset only product-related fields
              setForm({
                ...form,
                productCode: "",
                quantity: "",
                rate: "",
                remarks: "",
              });
            }}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-95"
          >
            Clear Product
          </button>
        </div>
      </form>
    </AppShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <label className="mb-1 text-sm font-medium text-gray-800">{label}</label>
      {children}
    </div>
  );
}

export default function EntryPage() {
  return <EntryScreen />;
}
