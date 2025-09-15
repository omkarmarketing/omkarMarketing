// app/companies/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { useToast } from "@/components/toast-provider";

type Company = {
  id: number;
  name: string;
  city: string;
};

export default function CompaniesPage() {
  return <CompaniesScreen />;
}

function CompaniesScreen() {
  const { showToast } = useToast();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ id: 0, name: "", city: "" });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/companies");
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "Failed to fetch companies");
      setCompanies(json.data);
    } catch (err: any) {
      showToast(err.message, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const openAddModal = () => {
    setForm({ id: 0, name: "", city: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (company: Company) => {
    setForm({ id: company.id, name: company.name, city: company.city });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.city) return;

    try {
      setActionLoading(true);
      const url = "/api/companies";
      const method = form.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(
          json.error || `Failed to ${form.id ? "update" : "add"} company`
        );

      showToast(`Company ${form.id ? "updated" : "added"}!`, {
        variant: "success",
      });
      closeModal();
      await fetchCompanies();
    } catch (err: any) {
      showToast(err.message, { variant: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (company: Company) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${company.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      const res = await fetch("/api/companies", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: company.id }),
      });

      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.error || "Failed to delete company");

      showToast("Company deleted!", { variant: "success" });
      await fetchCompanies();
    } catch (err: any) {
      showToast(err.message, { variant: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AppShell title="Companies">
      <div className="space-y-6">
        {/* Header with Add Button */}
        <div className="flex justify-center">
          <button
            onClick={openAddModal}
            className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            Add Company
          </button>
        </div>

        {/* Company List */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-gray-600">Loading companies...</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="p-8 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-6 0H5m2 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No companies
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first company.
              </p>
              <div className="mt-6">
                <button
                  onClick={openAddModal}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Add Company
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {company.name}
                    </h3>
                    <p className="text-sm text-gray-600 flex items-center truncate">
                      <svg
                        className="w-4 h-4 mr-1 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      {company.city}
                    </p>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => openEditModal(company)}
                      className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      disabled={actionLoading}
                      title="Edit company"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(company)}
                      disabled={actionLoading}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                      title="Delete company"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {form.id ? "Edit Company" : "Add New Company"}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Company Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                      placeholder="e.g., ABC Corporation"
                      required
                      disabled={actionLoading}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="city"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      City
                    </label>
                    <input
                      id="city"
                      type="text"
                      value={form.city}
                      onChange={(e) =>
                        setForm({ ...form, city: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                      placeholder="e.g., New York"
                      required
                      disabled={actionLoading}
                    />
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={actionLoading}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-indigo-400 transition-colors flex items-center justify-center"
                    >
                      {actionLoading ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          {form.id ? "Updating..." : "Adding..."}
                        </>
                      ) : (
                        <>{form.id ? "Update Company" : "Add Company"}</>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// // app/companies/page.tsx - Updated version
// "use client";

// import type React from "react";
// import { AppShell } from "@/components/app-shell";
// import { useAppState } from "@/context/app-state";
// import { useToast } from "@/components/toast-provider";
// import { useState, useEffect } from "react";

// function CompaniesScreen() {
//   const { addCompany, loading, error, clearError } = useAppState();
//   const { showToast } = useToast();
//   const [form, setForm] = useState({
//     name: "",
//     city: "",
//   });

//   // Clear error when component mounts or when error changes
//   useEffect(() => {
//     if (error) {
//       showToast(error, { variant: "error" });
//       clearError();
//     }
//   }, [error, showToast, clearError]);

//   function update<K extends keyof typeof form>(
//     key: K,
//     value: (typeof form)[K]
//   ) {
//     setForm((f) => ({ ...f, [key]: value }));
//   }

//   async function onSubmit(e: React.FormEvent) {
//     e.preventDefault();
//     if (!form.name || !form.city) return;

//     try {
//       await addCompany({
//         name: form.name,
//         city: form.city,
//       });
//       showToast("Company Added to Google Sheets!", { variant: "success" });
//       setForm({ name: "", city: "" });
//     } catch (error: any) {
//       // Error is already handled in the context and shown via toast
//       console.error("Failed to add company:", error);
//     }
//   }

//   return (
//     <AppShell title="Add Company">
//       <form onSubmit={onSubmit} className="space-y-4">
//         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
//           <Field label="Company Name">
//             <input
//               type="text"
//               value={form.name}
//               onChange={(e) => update("name", e.target.value)}
//               className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
//               placeholder="e.g., ABC Corporation"
//               required
//               disabled={loading}
//             />
//           </Field>

//           <Field label="City">
//             <input
//               type="text"
//               value={form.city}
//               onChange={(e) => update("city", e.target.value)}
//               className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
//               placeholder="e.g., New York"
//               required
//               disabled={loading}
//             />
//           </Field>
//         </div>

//         <button
//           type="submit"
//           disabled={loading}
//           className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed active:scale-95"
//         >
//           {loading ? "Adding..." : "Add Company"}
//         </button>
//       </form>
//     </AppShell>
//   );
// }

// function Field({
//   label,
//   children,
// }: {
//   label: string;
//   children: React.ReactNode;
// }) {
//   return (
//     <div className="flex flex-col">
//       <label className="mb-1 text-sm font-medium text-gray-800">{label}</label>
//       {children}
//     </div>
//   );
// }

// export default function CompaniesPage() {
//   return <CompaniesScreen />;
// }
