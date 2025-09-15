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
  const [form, setForm] = useState({ name: "", city: "" });
  const [editing, setEditing] = useState<Company | null>(null);
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.city) return;
    try {
      setActionLoading(true);
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.error || "Failed to add company");
      showToast("Company added!", { variant: "success" });
      setForm({ name: "", city: "" });
      await fetchCompanies();
    } catch (err: any) {
      showToast(err.message, { variant: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!editing) return;
    const { id, name, city } = editing;
    try {
      setActionLoading(true);
      const res = await fetch("/api/companies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name, city }),
      });
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.error || "Failed to update company");
      showToast("Company updated!", { variant: "success" });
      setEditing(null);
      await fetchCompanies();
    } catch (err: any) {
      showToast(err.message, { variant: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (company: Company) => {
    const confirmed = confirm(
      `Are you sure you want to delete "${company.name}"?`
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

  const startEdit = (company: Company) => setEditing(company);
  const cancelEdit = () => setEditing(null);

  return (
    <AppShell title="Companies">
      <div className="space-y-8 px-4 sm:px-0">
        {/* Add Form */}
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Company Name">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                placeholder="e.g., ABC Corporation"
                required
                disabled={actionLoading}
              />
            </Field>
            <Field label="City">
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                placeholder="e.g., New York"
                required
                disabled={actionLoading}
              />
            </Field>
          </div>
          <button
            type="submit"
            disabled={actionLoading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed active:scale-95"
          >
            {actionLoading ? "Adding..." : "Add Company"}
          </button>
        </form>

        {/* Company List */}
        <div>
          {loading ? (
            <p>Loading companies…</p>
          ) : companies.length === 0 ? (
            <p>No companies yet.</p>
          ) : (
            <div className="space-y-4 sm:space-y-2">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className="rounded-lg border border-gray-200 p-4 sm:grid sm:grid-cols-3 sm:items-center sm:gap-4"
                >
                  {editing && editing.id === company.id ? (
                    <>
                      <div className="mb-2 sm:mb-0">
                        <input
                          type="text"
                          value={editing.name}
                          onChange={(e) =>
                            setEditing(
                              (prev) =>
                                prev && { ...prev, name: e.target.value }
                            )
                          }
                          className="w-full rounded border px-2 py-1 text-sm"
                          disabled={actionLoading}
                        />
                      </div>
                      <div className="mb-2 sm:mb-0">
                        <input
                          type="text"
                          value={editing.city}
                          onChange={(e) =>
                            setEditing(
                              (prev) =>
                                prev && { ...prev, city: e.target.value }
                            )
                          }
                          className="w-full rounded border px-2 py-1 text-sm"
                          disabled={actionLoading}
                        />
                      </div>
                      <div className="flex gap-2 justify-end sm:justify-start">
                        <button
                          onClick={handleEditSave}
                          disabled={actionLoading}
                          className="px-3 py-1 text-sm bg-green-500 text-white rounded"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={actionLoading}
                          className="px-3 py-1 text-sm bg-gray-300 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-medium text-gray-900">
                        {company.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {company.city}
                      </div>
                      <div className="flex gap-2 justify-end sm:justify-start">
                        <button
                          onClick={() => startEdit(company)}
                          className="px-3 py-1 text-sm bg-blue-500 text-white rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(company)}
                          disabled={actionLoading}
                          className="px-3 py-1 text-sm bg-red-500 text-white rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
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
