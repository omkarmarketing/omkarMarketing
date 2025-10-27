// app/products/page.tsx
"use client";

import type React from "react";
import { AppShell } from "@/components/app-shell";
import { useAppState } from "@/context/app-state";
import { useToast } from "@/components/toast-provider";
import { useState, useEffect, useMemo } from "react";
import { Search, Filter, Edit, Trash2, X, ChevronDown } from "lucide-react";

interface Product {
  code: string;
  name: string;
  rate: number;
  companyName: string;
}

function ProductsScreen() {
  const {
    addProduct,
    companies,
    products,
    fetchProducts,
    updateProduct,
    deleteProduct,
  } = useAppState();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    code: "",
    name: "",
    rate: "",
    companyName: "",
    companyCity: "",
  });
  const [companySuggestions, setCompanySuggestions] = useState<
    typeof companies
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [minRate, setMinRate] = useState("");
  const [maxRate, setMaxRate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.companyName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCompany =
        !selectedCompany || product.companyName === selectedCompany;

      const matchesMinRate = !minRate || product.rate >= Number(minRate);
      const matchesMaxRate = !maxRate || product.rate <= Number(maxRate);

      return (
        matchesSearch && matchesCompany && matchesMinRate && matchesMaxRate
      );
    });
  }, [products, searchTerm, selectedCompany, minRate, maxRate]);

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));

    if (key === "companyName") {
      const inputValue = value.toLowerCase();
      const filtered = companies.filter(
        (company) =>
          company.name.toLowerCase().includes(inputValue) ||
          company.city.toLowerCase().includes(inputValue)
      );
      setCompanySuggestions(filtered);
      setShowSuggestions(true);
    }
  }

  function selectCompany(company: (typeof companies)[0]) {
    update("companyName", company.name);
    setForm((f) => ({ ...f, companyCity: company.city }));
    setShowSuggestions(false);
  }

  function clearForm() {
    setForm({ code: "", name: "", rate: "", companyName: "", companyCity: "" });
    setEditingProduct(null);
  }

  function startEdit(product: Product) {
    setEditingProduct(product);
    setForm({
      code: product.code,
      name: product.name,
      rate: product.rate.toString(),
      companyName: product.companyName,
      companyCity:
        companies.find((c) => c.name === product.companyName)?.city || "",
    });
    // Scroll to form
    document
      .getElementById("product-form")
      ?.scrollIntoView({ behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code || !form.name) {
      showToast("Product code and name are required!", { variant: "error" });
      return;
    }

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.code, {
          code: form.code,
          name: form.name,
          rate: Number(form.rate || 0),
          companyName: form.companyName || "",
        });
        showToast("Product Updated!", { variant: "success" });
      } else {
        await addProduct({
          code: form.code,
          name: form.name,
          rate: Number(form.rate || 0),
          companyName: form.companyName || "",
        });
        showToast("Product Added!", { variant: "success" });
      }
      clearForm();
    } catch (error) {
      console.error("Failed to save product:", error);
    }
  }

  async function handleDelete(code: string) {
    try {
      await deleteProduct(code);
      showToast("Product Deleted!", { variant: "success" });
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Failed to delete product:", error);
    }
  }

  function clearFilters() {
    setSearchTerm("");
    setSelectedCompany("");
    setMinRate("");
    setMaxRate("");
  }

  return (
    <AppShell title="Products Management">
      <div className="space-y-6">
        {/* Add/Edit Product Form */}
        <div
          id="product-form"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingProduct ? "Edit Product" : "Add New Product"}
            </h2>
            {editingProduct && (
              <button
                onClick={clearForm}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <X size={16} />
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Product Code">
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => update("code", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  placeholder="e.g., P-123"
                  required
                />
              </Field>

              <Field label="Product Name">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
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
                  step="0.01"
                  inputMode="decimal"
                  value={form.rate}
                  onChange={(e) => update("rate", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  placeholder="e.g., 40.00"
                />
              </Field>

              <Field label="Company">
                <div className="relative">
                  <input
                    type="text"
                    value={form.companyName}
                    onChange={(e) => update("companyName", e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() =>
                      setTimeout(() => setShowSuggestions(false), 200)
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                    placeholder="Search company..."
                  />
                  {form.companyCity && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {form.companyCity}
                      </span>
                    </div>
                  )}
                  {showSuggestions && companySuggestions.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg bg-white shadow-lg border border-gray-200 max-h-60 overflow-auto">
                      {companySuggestions.map((company, index) => (
                        <div
                          key={index}
                          className="px-4 py-3 text-sm text-gray-800 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onMouseDown={() => selectCompany(company)}
                        >
                          <div className="font-medium">{company.name}</div>
                          <div className="text-xs text-gray-500">
                            {company.city}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 active:scale-95 transition-all duration-200"
            >
              {editingProduct ? "Update Product" : "Add Product"}
            </button>
          </form>
        </div>

        {/* Products List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Products ({filteredProducts.length})
            </h2>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent w-full sm:w-64"
                />
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                <Filter size={16} />
                Filters
                <ChevronDown
                  size={16}
                  className={`transition-transform ${
                    showFilters ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Company">
                  <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  >
                    <option value="">All Companies</option>
                    {companies.map((company) => (
                      <option key={company.name} value={company.name}>
                        {company.name} - {company.city}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Min Rate">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={minRate}
                    onChange={(e) => setMinRate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                    placeholder="Min rate"
                  />
                </Field>

                <Field label="Max Rate">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={maxRate}
                    onChange={(e) => setMaxRate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                    placeholder="Max rate"
                  />
                </Field>
              </div>

              <div className="flex justify-between items-center mt-4">
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear all filters
                </button>
                <span className="text-sm text-gray-500">
                  {filteredProducts.length} products found
                </span>
              </div>
            </div>
          )}

          {/* Products Table */}
          <div className="overflow-hidden rounded-lg border border-gray-200">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-2">No products found</div>
                <div className="text-sm text-gray-500">
                  {products.length === 0
                    ? "Add your first product above"
                    : "Try changing your filters"}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rate
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProducts.map((product, index) => (
                      <tr
                        key={index}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {product.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {product.code}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-900">
                            {product.companyName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {companies.find(
                              (c) => c.name === product.companyName
                            )?.city || ""}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          ₹{product.rate.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => startEdit(product)}
                              className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50 transition-colors"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(product.code)}
                              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Product
            </h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this product? This action cannot
              be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
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
