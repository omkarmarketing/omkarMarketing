"use client";

import type React from "react";
import { AppShell } from "@/components/app-shell";
import { useAppState, AppStateProvider } from "@/context/app-state";
import { useToast } from "@/components/toast-provider";
import { useState, useMemo } from "react";

function EntryScreen() {
  const { products, addTransaction } = useAppState();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);

  const [form, setForm] = useState({
    buyer: "",
    seller: "",
    date: "",
    productCode: "",
    quantity: "",
    rate: "",
    city: "",
    state: "",
    brokerageRate: "",
  });

  // Calculate totals
  const calculations = useMemo(() => {
    const quantity = Number(form.quantity || 0);
    const rate = Number(form.rate || 0);
    const brokerageRate = Number(form.brokerageRate || 0);

    const baseAmount = quantity * rate;
    const brokerageAmount = baseAmount * (brokerageRate / 100);
    const amountBeforeGst = baseAmount + brokerageAmount;

    // Apply GST if amount is above 5000
    const gstThreshold = 5000;
    const gstRate = amountBeforeGst > gstThreshold ? 0.18 : 0; // 18% GST if above threshold
    const gstAmount = amountBeforeGst * gstRate;
    const totalAmount = amountBeforeGst + gstAmount;

    return {
      baseAmount,
      brokerageAmount,
      gstApplicable: amountBeforeGst > gstThreshold,
      gstRate: gstRate * 100, // Convert to percentage
      gstAmount,
      totalAmount,
    };
  }, [form.quantity, form.rate, form.brokerageRate]);

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
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
      // Prepare data for Google Sheets
      const sheetData = {
        buyer: form.buyer,
        seller: form.seller,
        date: form.date,
        product: form.productCode,
        quantity: form.quantity,
        rate: form.rate,
        city: form.city,
        state: form.state,
        brokerageRate: form.brokerageRate,
      };

      // Save to Google Sheets
      await saveToGoogleSheets(sheetData);

      // Create transaction data
      const transactionData = {
        buyer: form.buyer,
        seller: form.seller,
        date: form.date,
        productCode: form.productCode,
        quantity: Number(form.quantity || 0),
        rate: Number(form.rate || 0),
        city: form.city,
        state: form.state,
        brokerageRate: Number(form.brokerageRate || 0),
        gstApplicable: calculations.gstApplicable,
        gstAmount: calculations.gstAmount,
        totalAmount: calculations.totalAmount,
      };

      // Also save to local state for immediate UI update
      addTransaction(transactionData);

      // Set invoice data and show invoice
      setInvoiceData({
        ...transactionData,
        productName:
          products.find((p) => p.code === form.productCode)?.name ||
          form.productCode,
        baseAmount: calculations.baseAmount,
        brokerageAmount: calculations.brokerageAmount,
        invoiceNumber: `INV-${Math.floor(100000 + Math.random() * 900000)}`,
        invoiceDate: new Date().toISOString().split("T")[0],
      });
      setShowInvoice(true);

      showToast("Transaction saved to Google Sheets! Invoice generated!", {
        variant: "success",
      });

      // Reset form
      setForm({
        buyer: "",
        seller: "",
        date: "",
        productCode: "",
        quantity: "",
        rate: "",
        city: "",
        state: "",
        brokerageRate: "",
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

  function handleBackToForm() {
    setShowInvoice(false);
    setInvoiceData(null);
  }

  function Invoice({ data, onBack }: { data: any; onBack: () => void }) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
        {/* Invoice Header */}
        <div className="flex justify-between items-start mb-8 border-b-2 border-indigo-600 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">TAX INVOICE</h1>
            <p className="text-sm text-gray-600 mt-1">Original Copy</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-indigo-700">
              {data.invoiceNumber}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Invoice Date: {data.invoiceDate}
            </p>
          </div>
        </div>

        {/* Company Details */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-gray-700 mb-3 text-lg border-b pb-2">
              SELLER
            </h3>
            <p className="font-semibold text-gray-800">{data.seller}</p>
            <p className="text-sm text-gray-600 mt-2">123 Business Street</p>
            <p className="text-sm text-gray-600">Mumbai, Maharashtra 400001</p>
            <p className="text-sm text-gray-600 mt-2">GSTIN: 27ABCDE1234F1Z5</p>
            <p className="text-sm text-gray-600">PAN: ABCDE1234F</p>
          </div>

          <div>
            <h3 className="font-bold text-gray-700 mb-3 text-lg border-b pb-2">
              BILL TO
            </h3>
            <p className="font-semibold text-gray-800">{data.buyer}</p>
            <p className="text-sm text-gray-600 mt-2">
              {data.city}, {data.state}
            </p>
            <p className="text-sm text-gray-600 mt-4">
              <span className="font-medium">Place of Supply:</span> {data.state}
            </p>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="mb-8 grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-700">Invoice Date</p>
            <p className="text-gray-900">{data.date}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">
              Transaction Date
            </p>
            <p className="text-gray-900">{data.date}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Due Date</p>
            <p className="text-gray-900">
              {
                new Date(
                  new Date(data.date).setDate(
                    new Date(data.date).getDate() + 30
                  )
                )
                  .toISOString()
                  .split("T")[0]
              }
            </p>
          </div>
        </div>

        {/* Product Table */}
        <div className="mb-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-indigo-50">
                <th className="text-left p-3 border border-gray-300 font-semibold text-gray-700">
                  Description
                </th>
                <th className="text-center p-3 border border-gray-300 font-semibold text-gray-700">
                  HSN/SAC
                </th>
                <th className="text-right p-3 border border-gray-300 font-semibold text-gray-700">
                  Quantity
                </th>
                <th className="text-right p-3 border border-gray-300 font-semibold text-gray-700">
                  Rate (₹)
                </th>
                <th className="text-right p-3 border border-gray-300 font-semibold text-gray-700">
                  Amount (₹)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border border-gray-300">
                  <div className="font-medium">{data.productName}</div>
                  <div className="text-sm text-gray-600">
                    Code: {data.productCode}
                  </div>
                </td>
                <td className="p-3 border border-gray-300 text-center">9988</td>
                <td className="p-3 border border-gray-300 text-right">
                  {data.quantity}
                </td>
                <td className="p-3 border border-gray-300 text-right">
                  {data.rate.toFixed(2)}
                </td>
                <td className="p-3 border border-gray-300 text-right">
                  {data.baseAmount.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Calculation Table */}
        <div className="mb-8 ml-auto w-1/2">
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className="p-2 border border-gray-300 font-medium">
                  Subtotal
                </td>
                <td className="p-2 border border-gray-300 text-right">
                  ₹{data.baseAmount.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td className="p-2 border border-gray-300 font-medium">
                  Brokerage ({data.brokerageRate}%)
                </td>
                <td className="p-2 border border-gray-300 text-right">
                  ₹{data.brokerageAmount.toFixed(2)}
                </td>
              </tr>
              {data.gstApplicable && (
                <>
                  <tr>
                    <td className="p-2 border border-gray-300 font-medium">
                      CGST (9%)
                    </td>
                    <td className="p-2 border border-gray-300 text-right">
                      ₹{(data.gstAmount / 2).toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-gray-300 font-medium">
                      SGST (9%)
                    </td>
                    <td className="p-2 border border-gray-300 text-right">
                      ₹{(data.gstAmount / 2).toFixed(2)}
                    </td>
                  </tr>
                </>
              )}
              <tr className="bg-gray-50">
                <td className="p-2 border border-gray-300 font-bold">Total</td>
                <td className="p-2 border border-gray-300 text-right font-bold">
                  ₹{data.totalAmount.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amount in Words */}
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700">Amount in Words:</p>
          <p className="text-gray-900">
            {numberToWords(data.totalAmount)} Only
          </p>
        </div>

        {/* Bank Details */}
        <div className="mb-8 grid grid-cols-2 gap-8">
          <div>
            <h4 className="font-bold text-gray-700 mb-2">BANK DETAILS</h4>
            <p className="text-sm text-gray-600">Account Name: {data.seller}</p>
            <p className="text-sm text-gray-600">Bank Name: Example Bank</p>
            <p className="text-sm text-gray-600">Account Number: 1234567890</p>
            <p className="text-sm text-gray-600">IFSC Code: EXMP0123456</p>
          </div>

          <div>
            <h4 className="font-bold text-gray-700 mb-2">TERMS & CONDITIONS</h4>
            <p className="text-sm text-gray-600">
              • Payment due within 30 days
            </p>
            <p className="text-sm text-gray-600">
              • Late fee of 1.5% per month on overdue amounts
            </p>
            <p className="text-sm text-gray-600">
              • Goods once sold will not be taken back
            </p>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 mt-12 pt-6 border-t border-gray-300">
          <div className="text-center">
            <p className="font-medium text-gray-700 mb-1">For {data.seller}</p>
            <div className="h-0.5 w-40 bg-gray-400 mx-auto my-4"></div>
            <p className="text-sm text-gray-600">Authorized Signatory</p>
          </div>

          <div className="text-center">
            <p className="font-medium text-gray-700 mb-1">
              Receiver's Signature
            </p>
            <div className="h-0.5 w-40 bg-gray-400 mx-auto my-4"></div>
            <p className="text-sm text-gray-600">For {data.buyer}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-300 text-center">
          <p className="text-xs text-gray-500">
            This is a computer-generated invoice and does not require a physical
            signature.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {data.seller} • Tel: +91 1234567890 • Email: info@example.com •
            www.example.com
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-between">
          <button
            onClick={onBack}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
          >
            Back to Form
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => window.print()}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              Print Invoice
            </button>
            <button
              onClick={() => {
                showToast(
                  "Invoice download functionality would be implemented here"
                );
              }}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Download PDF
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Helper function to convert numbers to words
  function numberToWords(amount: number): string {
    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
    ];
    const teens = [
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    function convertLessThanThousand(num: number): string {
      if (num === 0) return "";

      let result = "";

      if (num >= 100) {
        result += ones[Math.floor(num / 100)] + " Hundred ";
        num %= 100;
      }

      if (num >= 10 && num <= 19) {
        result += teens[num - 10] + " ";
      } else {
        if (num >= 20) {
          result += tens[Math.floor(num / 10)] + " ";
          num %= 10;
        }

        if (num > 0) {
          result += ones[num] + " ";
        }
      }

      return result;
    }

    let rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);

    let words = "";

    if (rupees === 0) {
      words = "Zero";
    } else {
      if (rupees >= 10000000) {
        words +=
          convertLessThanThousand(Math.floor(rupees / 10000000)) + "Crore ";
        rupees %= 10000000;
      }

      if (rupees >= 100000) {
        words += convertLessThanThousand(Math.floor(rupees / 100000)) + "Lakh ";
        rupees %= 100000;
      }

      if (rupees >= 1000) {
        words +=
          convertLessThanThousand(Math.floor(rupees / 1000)) + "Thousand ";
        rupees %= 1000;
      }

      if (rupees >= 100) {
        words += convertLessThanThousand(Math.floor(rupees / 100)) + "Hundred ";
        rupees %= 100;
      }

      words += convertLessThanThousand(rupees);

      words += "Rupees";
    }

    if (paise > 0) {
      words += " and " + convertLessThanThousand(paise) + "Paise";
    }

    return words;
  }

  return (
    <AppShell title={showInvoice ? "Invoice" : "New Transaction"}>
      {showInvoice && invoiceData ? (
        <Invoice data={invoiceData} onBack={handleBackToForm} />
      ) : (
        <form onSubmit={onSubmit} className="space-y-4 max-w-4xl mx-auto">
          <Field label="Buyer (Company Name)">
            <input
              type="text"
              value={form.buyer}
              onChange={(e) => update("buyer", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              placeholder="Buyer Co."
              required
              disabled={isSubmitting}
            />
          </Field>

          <Field label="Seller (Company Name)">
            <input
              type="text"
              value={form.seller}
              onChange={(e) => update("seller", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              placeholder="Seller Inc."
              required
              disabled={isSubmitting}
            />
          </Field>

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

            <Field label="Product">
              <select
                value={form.productCode}
                onChange={(e) => update("productCode", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                required
                disabled={isSubmitting}
              >
                <option value="">Select a product</option>
                {products.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="City">
              <input
                type="text"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                placeholder="City"
                required
                disabled={isSubmitting}
              />
            </Field>

            <Field label="State">
              <input
                type="text"
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                placeholder="State"
                required
                disabled={isSubmitting}
              />
            </Field>
          </div>

          <Field label="Brokerage Rate (%)">
            <input
              type="number"
              min={0}
              inputMode="decimal"
              value={form.brokerageRate}
              onChange={(e) => update("brokerageRate", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              placeholder="e.g., 2"
              required
              disabled={isSubmitting}
            />
          </Field>

          {/* Calculation summary */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-800">
              Amount Calculation
            </h3>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Base Amount:</span>
                <span>₹{calculations.baseAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span>Brokerage ({form.brokerageRate || 0}%):</span>
                <span>₹{calculations.brokerageAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span>Amount before GST:</span>
                <span>
                  ₹
                  {(
                    calculations.baseAmount + calculations.brokerageAmount
                  ).toFixed(2)}
                </span>
              </div>

              {calculations.gstApplicable && (
                <>
                  <div className="flex justify-between">
                    <span>GST ({calculations.gstRate.toFixed(0)}%):</span>
                    <span>₹{calculations.gstAmount.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-1"></div>
                </>
              )}

              <div className="flex justify-between font-semibold">
                <span>Total Amount:</span>
                <span>₹{calculations.totalAmount.toFixed(2)}</span>
              </div>

              {calculations.gstApplicable && (
                <div className="text-xs text-gray-500 mt-1">
                  * GST applied as amount exceeds ₹5,000
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? "Saving to Google Sheets..."
              : "Submit & Generate Invoice"}
          </button>
        </form>
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

export default function EntryPage() {
  return (
    <AppStateProvider>
      <EntryScreen />
    </AppStateProvider>
  );
}
