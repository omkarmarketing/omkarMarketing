"use client";

import { InvoiceForm } from "@/components/invoice-form";
import { useState } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { InvoiceDocument } from "@/components/invoice";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export function InvoicePageClient({ 
  initialCompanies, 
  userEmail, 
  isAmit 
}: { 
  initialCompanies: any[];
  userEmail: string;
  isAmit: boolean;
}) {
  const [invoiceData, setInvoiceData] = useState<any>(null);

  const fileName = invoiceData
    ? `${invoiceData.summary.invoiceNo}_${invoiceData.summary.companyName}_${invoiceData.summary.invoiceDate}`
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9._-]/g, "") + ".pdf"
    : "invoice.pdf";

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Brokerage Invoice"
        description="Generate a brokerage invoice from recorded transactions"
      />

      <InvoiceForm
        onInvoiceGenerated={setInvoiceData}
        initialCompanies={initialCompanies}
        initialIsAmit={isAmit}
      />

      {invoiceData && (
        <div className="flex flex-col gap-3 rounded-lg border border-success/30 bg-success/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            Invoice generated successfully
          </p>

          <PDFDownloadLink
            document={<InvoiceDocument data={invoiceData} />}
            fileName={fileName}
            className={buttonVariants({ className: "w-full shrink-0 sm:w-auto" })}
          >
            {({ loading }) => (loading ? "Generating PDF..." : "Download PDF")}
          </PDFDownloadLink>
        </div>
      )}
    </div>
  );
}
