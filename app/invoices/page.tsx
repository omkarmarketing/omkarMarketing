"use client";

import { AppShell } from "@/components/app-shell";
import { useAppState, AppStateProvider } from "@/context/app-state";
import { useState, useMemo, useEffect } from "react";

function InvoicesScreen() {
  const { companies, transactions, products, loadData } = useAppState();
  const [company, setCompany] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        await loadData();
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;
    return transactions.filter((t) => {
      const d = new Date(t.date);
      const inStart = !startDate || d >= startDate;
      const inEnd = !endDate || d <= endDate;
      const matchesCompany =
        !company || t.buyer === company || t.seller === company;
      return inStart && inEnd && matchesCompany;
    });
  }, [transactions, start, end, company]);

  const totals = useMemo(() => {
    const totalTransactions = filtered.length;
    const totalAmount = filtered.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalBrokerage = filtered.reduce(
      (sum, t) => sum + (t.quantity * t.rate * t.brokerageRate) / 100,
      0
    );
    const totalGst = filtered.reduce((sum, t) => sum + (t.gstAmount || 0), 0);
    return { totalTransactions, totalAmount, totalBrokerage, totalGst };
  }, [filtered]);

  const generateInvoice = () => {
    if (filtered.length === 0) return;

    // Group transactions by buyer/seller and date range
    const invoiceTransactions = filtered;

    // Calculate invoice totals
    const invoiceTotal = invoiceTransactions.reduce(
      (sum, t) => sum + t.totalAmount,
      0
    );
    const brokerageTotal = invoiceTransactions.reduce(
      (sum, t) => sum + (t.quantity * t.rate * t.brokerageRate) / 100,
      0
    );
    const gstTotal = invoiceTransactions.reduce(
      (sum, t) => sum + (t.gstAmount || 0),
      0
    );

    // Determine if this is for a buyer or seller perspective
    const isBuyerPerspective = company
      ? invoiceTransactions.some((t) => t.buyer === company)
      : false;
    const counterparty =
      company ||
      (invoiceTransactions.length > 0
        ? isBuyerPerspective
          ? invoiceTransactions[0].seller
          : invoiceTransactions[0].buyer
        : "");

    setInvoiceData({
      company: company || "All Companies",
      counterparty,
      isBuyerPerspective,
      startDate: start,
      endDate: end,
      transactions: invoiceTransactions,
      totalAmount: invoiceTotal,
      totalBrokerage: brokerageTotal,
      totalGst: gstTotal,
      invoiceNumber: `INV-${Math.floor(100000 + Math.random() * 900000)}`,
      invoiceDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(new Date().setDate(new Date().getDate() + 30))
        .toISOString()
        .split("T")[0],
    });

    setShowInvoice(true);
  };

  function Invoice({ data, onBack }: { data: any; onBack: () => void }) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
        {/* Invoice Header */}
        <div className="flex justify-between items-start mb-8 border-b-2 border-indigo-600 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              SUMMARY INVOICE
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Period: {data.startDate} to {data.endDate}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-indigo-700">
              {data.invoiceNumber}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Invoice Date: {data.invoiceDate}
            </p>
            <p className="text-sm text-gray-600">Due Date: {data.dueDate}</p>
          </div>
        </div>

        {/* Company Details */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-gray-700 mb-3 text-lg border-b pb-2">
              {data.isBuyerPerspective ? "BUYER" : "SELLER"}
            </h3>
            <p className="font-semibold text-gray-800">{data.company}</p>
            <p className="text-sm text-gray-600 mt-2">123 Business Street</p>
            <p className="text-sm text-gray-600">Mumbai, Maharashtra 400001</p>
            <p className="text-sm text-gray-600 mt-2">GSTIN: 27ABCDE1234F1Z5</p>
            <p className="text-sm text-gray-600">PAN: ABCDE1234F</p>
          </div>

          <div>
            <h3 className="font-bold text-gray-700 mb-3 text-lg border-b pb-2">
              {data.isBuyerPerspective ? "SELLER" : "BUYER"}
            </h3>
            <p className="font-semibold text-gray-800">{data.counterparty}</p>
            <p className="text-sm text-gray-600 mt-2">456 Trade Avenue</p>
            <p className="text-sm text-gray-600">Delhi, Delhi 110001</p>
            <p className="text-sm text-gray-600 mt-2">GSTIN: 07FGHIJ5678K9L0</p>
            <p className="text-sm text-gray-600">PAN: FGHIJ5678K</p>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="mb-8 grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-700">Invoice Period</p>
            <p className="text-gray-900">
              {data.startDate} to {data.endDate}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">
              Total Transactions
            </p>
            <p className="text-gray-900">{data.transactions.length}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Due Date</p>
            <p className="text-gray-900">{data.dueDate}</p>
          </div>
        </div>

        {/* Transaction Table */}
        <div className="mb-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-indigo-50">
                <th className="text-left p-3 border border-gray-300 font-semibold text-gray-700">
                  Date
                </th>
                <th className="text-left p-3 border border-gray-300 font-semibold text-gray-700">
                  Product
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
              {data.transactions.map((t: any, index: number) => (
                <tr key={index}>
                  <td className="p-3 border border-gray-300">{t.date}</td>
                  <td className="p-3 border border-gray-300">
                    <div className="font-medium">
                      {products.find((p) => p.code === t.productCode)?.name ||
                        t.productCode}
                    </div>
                    <div className="text-sm text-gray-600">
                      Code: {t.productCode}
                    </div>
                  </td>
                  <td className="p-3 border border-gray-300 text-right">
                    {t.quantity}
                  </td>
                  <td className="p-3 border border-gray-300 text-right">
                    {t.rate.toFixed(2)}
                  </td>
                  <td className="p-3 border border-gray-300 text-right">
                    {t.totalAmount.toFixed(2)}
                  </td>
                </tr>
              ))}
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
                  ₹{(data.totalAmount - data.totalGst).toFixed(2)}
                </td>
              </tr>
              <tr>
                <td className="p-2 border border-gray-300 font-medium">
                  Brokerage
                </td>
                <td className="p-2 border border-gray-300 text-right">
                  ₹{data.totalBrokerage.toFixed(2)}
                </td>
              </tr>
              {data.totalGst > 0 && (
                <>
                  <tr>
                    <td className="p-2 border border-gray-300 font-medium">
                      CGST (9%)
                    </td>
                    <td className="p-2 border border-gray-300 text-right">
                      ₹{(data.totalGst / 2).toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-gray-300 font-medium">
                      SGST (9%)
                    </td>
                    <td className="p-2 border border-gray-300 text-right">
                      ₹{(data.totalGst / 2).toFixed(2)}
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
            <p className="text-sm text-gray-600">
              Account Name: {data.company}
            </p>
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
              • Please quote invoice number in all correspondence
            </p>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 mt-12 pt-6 border-t border-gray-300">
          <div className="text-center">
            <p className="font-medium text-gray-700 mb-1">For {data.company}</p>
            <div className="h-0.5 w-40 bg-gray-400 mx-auto my-4"></div>
            <p className="text-sm text-gray-600">Authorized Signatory</p>
          </div>

          <div className="text-center">
            <p className="font-medium text-gray-700 mb-1">
              Receiver's Signature
            </p>
            <div className="h-0.5 w-40 bg-gray-400 mx-auto my-4"></div>
            <p className="text-sm text-gray-600">For {data.counterparty}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-300 text-center">
          <p className="text-xs text-gray-500">
            This is a computer-generated invoice and does not require a physical
            signature.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {data.company} • Tel: +91 1234567890 • Email: info@example.com •
            www.example.com
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-between">
          <button
            onClick={onBack}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
          >
            Back to Summary
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
                alert("PDF download functionality would be implemented here");
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

  // If data is still loading, show a loading state
  if (isLoading) {
    return (
      <AppShell title="Generate Invoice">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">Loading data...</div>
        </div>
      </AppShell>
    );
  }

  // If there are no companies, show an error message
  if (companies.length === 0) {
    return (
      <AppShell title="Generate Invoice">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            No Companies Found
          </h2>
          <p className="text-gray-600 mb-4">
            It seems there are no companies in the system. Please check if:
          </p>
          <ul className="list-disc list-inside text-gray-600 mb-4">
            <li>Your Google Sheets is properly connected</li>
            <li>You have transactions with company names in your sheet</li>
            <li>The data format in your sheet is correct</li>
          </ul>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Reload Data
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={showInvoice ? "Invoice" : "Generate Invoice"}>
      {showInvoice && invoiceData ? (
        <Invoice data={invoiceData} onBack={() => setShowInvoice(false)} />
      ) : (
        <>
          <form
            className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
          >
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-800">
                Select Company
              </label>
              <select
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">All Companies</option>
                {companies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-800">
                  Start Date
                </label>
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-800">
                  End Date
                </label>
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 active:scale-95"
            >
              Generate Summary
            </button>
          </form>

          {submitted && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">
                {company || "All Companies"} — {start || "Start"} to{" "}
                {end || "End"}
              </h2>
              <div className="space-y-2 text-sm text-gray-700 mb-4">
                <div className="flex items-center justify-between">
                  <span>Total Transactions</span>
                  <span className="font-medium text-gray-800">
                    {totals.totalTransactions}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total Amount</span>
                  <span className="font-medium text-gray-800">
                    ₹{totals.totalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total Brokerage</span>
                  <span className="font-medium text-gray-800">
                    ₹{totals.totalBrokerage.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total GST</span>
                  <span className="font-medium text-gray-800">
                    ₹{totals.totalGst.toFixed(2)}
                  </span>
                </div>
              </div>

              {filtered.length > 0 && (
                <button
                  type="button"
                  className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 active:scale-95"
                  onClick={generateInvoice}
                >
                  Generate Detailed Invoice
                </button>
              )}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

export default function InvoicesPage() {
  return (
    <AppStateProvider>
      <InvoicesScreen />
    </AppStateProvider>
  );
}
