"use client";
import { InvoiceForm } from "@/components/invoice-form";
import { useState } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { InvoiceDocument } from "@/components/invoice";

export default function InvoicePage() {
  const [invoiceData, setInvoiceData] = useState<any>(null);

  // ⭐ Auto-generate file name
  const fileName = invoiceData
    ? `${invoiceData.summary.invoiceNo}_${invoiceData.summary.companyName}_${invoiceData.summary.invoiceDate}`
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9._-]/g, "") + ".pdf"
    : "invoice.pdf";

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Brokerage Invoice</h1>
      </div>

      <div className="w-full">
        <InvoiceForm onInvoiceGenerated={setInvoiceData} />
      </div>

      {invoiceData && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 font-semibold mb-4 text-center sm:text-left">
            Invoice generated successfully!
          </p>

          <div className="flex justify-center">
            <PDFDownloadLink
              document={<InvoiceDocument data={invoiceData} />}
              fileName={fileName} // <-- ⬅️ Dynamic filename here
              className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base w-full sm:w-auto text-center"
            >
              Download {fileName}
            </PDFDownloadLink>
          </div>
        </div>
      )}
    </div>
  );
}
