"use client";
import { InvoiceForm } from "@/components/invoice-form";
import { useState } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { InvoiceDocument } from "@/components/invoice";

export default function InvoicePage() {
  const [invoiceData, setInvoiceData] = useState<any>(null);

  // ⭐ Auto-generate file name
  const fileName = invoiceData
    ? `INV-${invoiceData.summary.invoiceNo}_${invoiceData.summary.companyName}_${invoiceData.summary.invoiceDate}`
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9._-]/g, "") + ".pdf"
    : "invoice.pdf";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Brokerage Invoice</h1>
      <InvoiceForm onInvoiceGenerated={setInvoiceData} />

      {invoiceData && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
          <p className="text-green-700 font-semibold mb-4">
            Invoice generated successfully!
          </p>

          <PDFDownloadLink
            document={<InvoiceDocument data={invoiceData} />}
            fileName={fileName} // <-- ⬅️ Dynamic filename here
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Download {fileName}
          </PDFDownloadLink>
        </div>
      )}
    </div>
  );
}
