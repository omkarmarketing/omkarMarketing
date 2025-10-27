"use client";

import { AppShell } from "@/components/app-shell";
import { useAppState, AppStateProvider } from "@/context/app-state";
import { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

function numberToWords(amount) {
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

  function convertLessThanThousand(num) {
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
      words += convertLessThanThousand(Math.floor(rupees / 1000)) + "Thousand ";
      rupees %= 1000;
    }
    if (rupees >= 100) {
      words += convertLessThanThousand(Math.floor(rupees / 100)) + "Hundred ";
      rupees %= 100;
    }
    words += convertLessThanThousand(rupees);
    words += "Rupees";
  }

  return words + " Only";
}

// Invoice Summary Component (Page 1) - Omkar Marketing Style
// Invoice Summary Component
function InvoiceSummary({ data }) {
  return (
    <div
      className="bg-white p-8 max-w-4xl mx-auto"
      style={{ fontFamily: "Arial, sans-serif" }}
    >
      {/* Company Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Omkar Marketing</h1>
        <p className="text-sm text-gray-600">
          B-205, Safal 6, Hanumapura, Shahibaug
        </p>
        <p className="text-sm text-gray-600">Ahmedabad - 380004</p>
        <p className="text-sm font-semibold text-gray-700 mt-1">
          All type of Edible Oil Broker
        </p>
      </div>

      {/* Contact Info */}
      <div className="flex justify-center gap-8 mb-6 border-t border-b border-gray-300 py-2">
        <p className="text-sm text-gray-700">Amit Raval # 9879788229</p>
        <p className="text-sm text-gray-700">Chandrakant Dave # 9687888229</p>
      </div>

      {/* PAN and Party Info */}
      <div className="text-center mb-4">
        <p className="text-sm font-semibold text-gray-700">
          PAN No. AAGFO0133Q
        </p>
        <p className="text-sm font-semibold text-gray-700 mt-2">
          PARTY NAME : {data.partyName}
        </p>
      </div>

      {/* Invoice Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <span className="text-sm text-gray-600">Invoice No. </span>
          <span className="font-semibold">{data.invoiceNumber}</span>
        </div>
        <div>
          <span className="text-sm text-gray-600">Date. </span>
          <span className="font-semibold">{data.invoiceDate}</span>
        </div>
      </div>

      {/* Brokerage Details Table */}
      <div className="mb-6">
        <table className="w-full border-collapse border border-gray-400">
          <thead>
            <tr>
              <th className="border border-gray-400 p-3 text-left bg-gray-50 w-16">
                Sr.No
              </th>
              <th className="border border-gray-400 p-3 text-left bg-gray-50">
                Particulars
              </th>
              <th className="border border-gray-400 p-3 text-right bg-gray-50 w-32">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-400 p-3 text-center">1</td>
              <td className="border border-gray-400 p-3">
                Brokerage for the period {data.startDate} to {data.endDate}
              </td>
              <td className="border border-gray-400 p-3 text-right font-semibold">
                {data.totalBrokerage.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
            </tr>
            <tr>
              <td
                colSpan="2"
                className="border border-gray-400 p-3 text-right font-bold"
              >
                Total Amount
              </td>
              <td className="border border-gray-400 p-3 text-right font-bold">
                {data.totalBrokerage.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Amount in Words */}
      <div className="mb-6">
        <p className="text-sm">
          <strong>Total Amount in words : </strong>
          {numberToWords(data.totalBrokerage)}
        </p>
      </div>

      {/* Bank Details */}
      <div className="mb-8">
        <h4 className="font-bold text-gray-700 mb-2">Bank Details:</h4>
        <div className="text-sm text-gray-700 space-y-1">
          <p>
            <strong>Bank:</strong> Bank of India
          </p>
          <p>
            <strong>Branch:</strong> Bopal Branch, Ahmedabad
          </p>
          <p>
            <strong>Account No:</strong> 2042 2011 0000 441
          </p>
          <p>
            <strong>IFSC Code:</strong> BKID0002042
          </p>
          <p>
            <strong>MICR Code:</strong> 380013055
          </p>
        </div>
      </div>

      {/* Signature Section */}
      <div className="text-right mt-12">
        <p className="text-sm text-gray-600 mb-8">For, Omkar Marketing</p>
        <div className="h-px w-32 bg-gray-400 ml-auto mb-2"></div>
        <p className="text-sm text-gray-600">Partner</p>
      </div>

      {/* Footer */}
      <div className="text-center mt-8">
        <p className="text-xs text-gray-500">
          Subject to Ahmedabad Jurisdiction
        </p>
      </div>
    </div>
  );
}
// Transaction Details Component (Annexure)
function TransactionDetails({ data }) {
  return (
    <div
      className="bg-white p-8 max-w-6xl mx-auto"
      style={{ fontFamily: "Arial, sans-serif" }}
    >
      <h2 className="text-xl font-bold text-center mb-6">Annexure 1</h2>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-400 text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-400 p-2 text-left">
                Seller Name
              </th>
              <th className="border border-gray-400 p-2 text-left">Date</th>
              <th className="border border-gray-400 p-2 text-left">
                Buyer name
              </th>
              <th className="border border-gray-400 p-2 text-left">City</th>
              <th className="border border-gray-400 p-2 text-left">Product</th>
              <th className="border border-gray-400 p-2 text-right">
                Quantity
              </th>
              <th className="border border-gray-400 p-2 text-right">Rate/pc</th>
            </tr>
          </thead>
          <tbody>
            {data.transactions.map((transaction, index) => (
              <tr key={index}>
                <td className="border border-gray-400 p-2">
                  {transaction.seller}
                </td>
                <td className="border border-gray-400 p-2">
                  {new Date(transaction.date).toLocaleDateString("en-GB")}
                </td>
                <td className="border border-gray-400 p-2">
                  {transaction.buyer}
                </td>
                <td className="border border-gray-400 p-2">
                  {transaction.city}
                </td>
                <td className="border border-gray-400 p-2">
                  {transaction.productCode}
                </td>
                <td className="border border-gray-400 p-2 text-right">
                  {transaction.quantity}
                </td>
                <td className="border border-gray-400 p-2 text-right">
                  {transaction.rate}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="mt-6 flex justify-end space-x-8 text-sm">
        <div>
          <strong>Total Qty: </strong>
          {data.totalQuantity}
        </div>
        <div>
          <strong>Brokerage: </strong>
          {data.brokerageRate}
        </div>
        <div>
          <strong>Total Brokerage Amount: </strong>
          {data.totalBrokerage}
        </div>
      </div>
    </div>
  );
}
// Transaction History Component (Page 2)
function TransactionHistory({ data }: { data: any }) {
  return (
    <div
      className="bg-white p-6 rounded-lg shadow-lg max-w-6xl mx-auto"
      style={{ fontFamily: "Arial, sans-serif" }}
    >
      <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
        Annexure 1
      </h2>

      {/* Transaction Table */}
      <div className="mb-6">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left p-2 border border-gray-300 font-semibold text-gray-700">
                Seller Name
              </th>
              <th className="text-left p-2 border border-gray-300 font-semibold text-gray-700">
                Date
              </th>
              <th className="text-left p-2 border border-gray-300 font-semibold text-gray-700">
                Buyer name
              </th>
              <th className="text-left p-2 border border-gray-300 font-semibold text-gray-700">
                City
              </th>
              <th className="text-left p-2 border border-gray-300 font-semibold text-gray-700">
                Product
              </th>
              <th className="text-right p-2 border border-gray-300 font-semibold text-gray-700">
                Quantity
              </th>
              <th className="text-right p-2 border border-gray-300 font-semibold text-gray-700">
                Rate/pc
              </th>
              <th className="text-right p-2 border border-gray-300 font-semibold text-gray-700">
                Brokerage Amt
              </th>
            </tr>
          </thead>
          <tbody>
            {data.transactions.map((t: any, index: number) => (
              <tr key={index}>
                <td className="p-2 border border-gray-300">{t.seller}</td>
                <td className="p-2 border border-gray-300">
                  {new Date(t.date).toLocaleDateString("en-IN")}
                </td>
                <td className="p-2 border border-gray-300">{t.buyer}</td>
                <td className="p-2 border border-gray-300">{t.city}</td>
                <td className="p-2 border border-gray-300">{t.productCode}</td>
                <td className="p-2 border border-gray-300 text-right">
                  {t.quantity}
                </td>
                <td className="p-2 border border-gray-300 text-right">
                  {t.rate.toFixed(2)}
                </td>
                <td className="p-2 border border-gray-300 text-right">
                  {(t.quantity * data.brokerageRate).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 text-sm font-semibold">
        <div className="text-center p-2 bg-gray-100 rounded">
          <p>Total Qty</p>
          <p>{data.totalQuantity}</p>
        </div>
        <div className="text-center p-2 bg-gray-100 rounded">
          <p>Brokerage Rate</p>
          <p>₹{data.brokerageRate} per unit</p>
        </div>
        <div className="text-center p-2 bg-gray-100 rounded">
          <p>Total Brokerage Amount</p>
          <p>
            ₹
            {data.totalBrokerage.toLocaleString("en-IN", {
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

// Main Invoice Component
function Invoice({ data, onBack }: { data: any; onBack: () => void }) {
  const summaryRef = useRef<HTMLDivElement>(null);
  const transactionRef = useRef<HTMLDivElement>(null);

  const downloadPDF = async () => {
    if (!summaryRef.current || !transactionRef.current) return;

    try {
      // Create PDF instance
      const pdf = new jsPDF("p", "mm", "a4");

      // Capture summary page
      const summaryCanvas = await html2canvas(summaryRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const summaryImgData = summaryCanvas.toDataURL("image/png");
      const summaryImgProps = pdf.getImageProperties(summaryImgData);
      const summaryPdfWidth = pdf.internal.pageSize.getWidth();
      const summaryPdfHeight =
        (summaryImgProps.height * summaryPdfWidth) / summaryImgProps.width;

      pdf.addImage(
        summaryImgData,
        "PNG",
        0,
        0,
        summaryPdfWidth,
        summaryPdfHeight
      );

      // Add transaction history as second page
      pdf.addPage();

      const transactionCanvas = await html2canvas(transactionRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const transactionImgData = transactionCanvas.toDataURL("image/png");
      const transactionImgProps = pdf.getImageProperties(transactionImgData);
      const transactionPdfWidth = pdf.internal.pageSize.getWidth();
      const transactionPdfHeight =
        (transactionImgProps.height * transactionPdfWidth) /
        transactionImgProps.width;

      pdf.addImage(
        transactionImgData,
        "PNG",
        0,
        0,
        transactionPdfWidth,
        transactionPdfHeight
      );

      // Save PDF
      pdf.save(`invoice-${data.invoiceNumber}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    }
  };

  return (
    <div className="space-y-8">
      {/* Summary Page */}
      <div ref={summaryRef}>
        <InvoiceSummary data={data} />
      </div>

      {/* Transaction History Page */}
      <div ref={transactionRef}>
        <TransactionHistory data={data} />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between max-w-3xl mx-auto">
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
            onClick={downloadPDF}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function InvoicesScreen() {
  const { companies } = useAppState();
  const [company, setCompany] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [brokerageRate, setBrokerageRate] = useState("10");
  const [submitted, setSubmitted] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [totals, setTotals] = useState({
    totalTransactions: 0,
    totalQuantity: 0,
    totalBrokerage: 0,
  });
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Filter companies based on input
  useEffect(() => {
    if (company && companies) {
      const filtered = companies
        .filter(
          (c: any) =>
            c.name.toLowerCase().includes(company.toLowerCase()) ||
            c.city.toLowerCase().includes(company.toLowerCase())
        )
        .slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [company, companies]);

  const selectCompany = (companyData: any) => {
    setCompany(companyData.name);
    setShowSuggestions(false);
  };

  // Fetch data from API
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (company) params.append("company", company);
      if (start) params.append("startDate", start);
      if (end) params.append("endDate", end);
      if (brokerageRate) params.append("brokerageRate", brokerageRate);

      const response = await fetch(`/api/invoice?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.transactions) {
        setTransactions(data.transactions);
        setTotals(data.totals);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Error fetching data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Load data when filters change after submission
  useEffect(() => {
    if (submitted) {
      fetchData();
    }
  }, [company, start, end, brokerageRate, submitted]);

  const generateInvoice = async () => {
    if (transactions.length === 0) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company,
          startDate: start,
          endDate: end,
          brokerageRate: brokerageRate ? parseFloat(brokerageRate) : null,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.invoiceData) {
        setInvoiceData(data.invoiceData);
        setShowInvoice(true);
      }
    } catch (error) {
      console.error("Error generating invoice:", error);
      alert("Error generating invoice. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell title="Generate Invoice">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">Loading data...</div>
        </div>
      </AppShell>
    );
  }

  if (showInvoice && invoiceData) {
    return (
      <AppShell title="Invoice">
        <Invoice data={invoiceData} onBack={() => setShowInvoice(false)} />
      </AppShell>
    );
  }

  return (
    <AppShell title="Generate Invoice">
      <form
        className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
      >
        {/* Company Search with Autocomplete */}
        <div className="flex flex-col relative">
          <label className="mb-2 text-sm font-medium text-gray-800">
            Company Name
          </label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            placeholder="Type company name..."
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10 mt-1 max-h-60 overflow-y-auto">
              {suggestions.map((companyData, index) => (
                <div
                  key={index}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                  onClick={() => selectCompany(companyData)}
                >
                  <div className="font-medium text-gray-800">
                    {companyData.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {companyData.city}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Note: Transactions where the company is either buyer or seller will
            be included
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col">
            <label className="mb-2 text-sm font-medium text-gray-800">
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
            <label className="mb-2 text-sm font-medium text-gray-800">
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

        {/* Brokerage Rate Field */}
        <div className="flex flex-col">
          <label className="mb-2 text-sm font-medium text-gray-800">
            Brokerage Rate (₹ per unit)
          </label>
          <input
            type="number"
            step="1"
            min="0"
            value={brokerageRate}
            onChange={(e) => setBrokerageRate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
          <p className="text-xs text-gray-500 mt-1">
            Brokerage will be calculated as: Brokerage Rate × Total Quantity
          </p>
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 active:scale-95"
        >
          Generate Summary
        </button>
      </form>

      {submitted && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            {company || "All Companies"} — {start || "Start"} to {end || "End"}
            {brokerageRate && ` (Brokerage: ₹${brokerageRate} per unit)`}
          </h2>

          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">
                No transactions found for the selected criteria.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2 text-sm text-gray-700 mb-6">
                <div className="flex items-center justify-between">
                  <span>Total Transactions</span>
                  <span className="font-medium text-gray-800">
                    {totals.totalTransactions}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total Quantity</span>
                  <span className="font-medium text-gray-800">
                    {totals.totalQuantity}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Brokerage Rate</span>
                  <span className="font-medium text-gray-800">
                    ₹{brokerageRate} per unit
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total Brokerage Amount</span>
                  <span className="font-medium text-gray-800">
                    ₹{totals.totalBrokerage.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 active:scale-95"
                onClick={generateInvoice}
                disabled={isLoading}
              >
                {isLoading
                  ? "Generating Invoice..."
                  : "Generate Detailed Invoice"}
              </button>
            </>
          )}
        </div>
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
