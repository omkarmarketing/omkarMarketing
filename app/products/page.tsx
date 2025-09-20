// app/products/page.tsx
"use client";

import type React from "react";
import { AppShell } from "@/components/app-shell";
import { useAppState } from "@/context/app-state";
import { useToast } from "@/components/toast-provider";
import { useState, useEffect } from "react";

function ProductsScreen() {
  const { addProduct, companies } = useAppState();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    code: "",
    name: "",
    rate: "",
    companyName: "",
  });
  const [companySuggestions, setCompanySuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    // Extract company names for suggestions
    const companyNames = companies.map((company) => company.name);
    setCompanySuggestions(companyNames);
  }, [companies]);

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));

    // Update company suggestions based on input
    if (key === "companyName") {
      const inputValue = value.toLowerCase();
      const filteredCompanies = companies
        .filter((company) => company.name.toLowerCase().includes(inputValue))
        .map((company) => company.name);

      setCompanySuggestions(filteredCompanies);
      setShowSuggestions(true);
    }
  }

  function selectCompany(company: string) {
    update("companyName", company);
    setShowSuggestions(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code || !form.name) {
      showToast("Product code and name are required!", { variant: "error" });
      return;
    }

    try {
      await addProduct({
        code: form.code,
        name: form.name,
        rate: Number(form.rate || 0),
        companyName: form.companyName || "",
      });
      showToast("Product Added!", { variant: "success" });
      setForm({ code: "", name: "", rate: "", companyName: "" });
    } catch (error) {
      // Error handling is done in the addProduct function
      console.error("Failed to add product:", error);
    }
  }

  return (
    <AppShell title="Add Product">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Product Code">
            <input
              type="text"
              value={form.code}
              onChange={(e) => update("code", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              placeholder="e.g., P-123"
              required
            />
          </Field>

          <Field label="Product Name">
            <input
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              placeholder="e.g., Rice"
              required
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Rate">
            <input
              type="number"
              min={0}
              inputMode="decimal"
              value={form.rate}
              onChange={(e) => update("rate", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              placeholder="e.g., 40"
            />
          </Field>

          <Field label="Company Name">
            <div className="relative">
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => update("companyName", e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                placeholder="e.g., Buyer Co."
              />
              {showSuggestions && companySuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg border border-gray-200 max-h-60 overflow-auto">
                  {companySuggestions.map((company, index) => (
                    <div
                      key={index}
                      className="px-4 py-2 text-sm text-gray-800 hover:bg-indigo-100 cursor-pointer"
                      onMouseDown={() => selectCompany(company)}
                    >
                      {company}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Field>
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 active:scale-95"
        >
          Add Product
        </button>
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

export default function ProductsPage() {
  return <ProductsScreen />;
}
