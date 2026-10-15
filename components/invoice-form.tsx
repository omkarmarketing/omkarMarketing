"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { InvoiceSummaryPreview } from "@/components/invoice-summary-preview";
import { parseDateFromSheet } from "@/lib/date-utils";

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateInputValue(value?: string): Date | undefined {
  return value ? parseDateFromSheet(value) : undefined;
}

type InvoiceCompany = {
  companyName?: string;
  companyCity?: string;
  "Company Name"?: string;
  City?: string;
};

const EMPTY_COMPANIES: InvoiceCompany[] = [];

/* -------------------- VALIDATION -------------------- */
const schema = z.object({
  companyName: z.string().trim().min(1, "Company name is required"),
  companyCity: z.string().trim().min(1, "Company city is required"),
  isManual: z.boolean().default(false),
  // Automated fields
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  brokerageRate: z.coerce.number().min(0).max(100).optional(),
  // Manual fields
  description: z.string().optional(),
  totalAmount: z.coerce.number().min(0)
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8, {
      message: "Use no more than two decimal places",
    })
    .optional(),
  invoiceDate: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.isManual) {
    if (!data.description?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Description is required in manual mode",
        path: ["description"],
      });
    }
    if (data.totalAmount === undefined || data.totalAmount === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Total amount is required in manual mode",
        path: ["totalAmount"],
      });
    }
    if (!data.invoiceDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invoice date is required in manual mode",
        path: ["invoiceDate"],
      });
    }
  } else {
    if (!data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start date is required",
        path: ["startDate"],
      });
    }
    if (!data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date is required",
        path: ["endDate"],
      });
    }
  }
});

export function InvoiceForm({
  onInvoiceGenerated,
  initialCompanies = EMPTY_COMPANIES,
  initialIsAmit = false,
}: {
  onInvoiceGenerated?: (data: any) => void;
  initialCompanies?: InvoiceCompany[];
  initialIsAmit?: boolean;
}) {
  const { toast } = useToast();

  const [companies, setCompanies] = useState<InvoiceCompany[]>(initialCompanies);
  const [companySuggestions, setCompanySuggestions] = useState<InvoiceCompany[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [invoiceProgress, setInvoiceProgress] = useState<{ status: string; progress: number } | null>(null);
  const [invoicePreview, setInvoicePreview] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewRequestValues, setPreviewRequestValues] = useState<string | null>(null);
  const [isAmit, setIsAmit] = useState(initialIsAmit);
  const [dateRangeWarning, setDateRangeWarning] = useState<string | null>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyName: "",
      companyCity: "",
      isManual: false,
      startDate: "",
      endDate: toDateInputValue(new Date()),
      brokerageRate: 2,
      description: "",
      totalAmount: 0,
      invoiceDate: toDateInputValue(new Date()),
    },
  });
  const currentFormValues = form.watch();
  const hasCurrentPreview =
    Boolean(invoicePreview) &&
    previewRequestValues === JSON.stringify(currentFormValues);

  /* -------------------- FETCH USER INFO -------------------- */
  useEffect(() => {
    if (initialIsAmit !== undefined) return; // Skip if provided by prop
    
    fetch("/api/user-info")
      .then((res) => res.json())
      .then((data) => {
        setIsAmit(data.email === "amitraval1681@gmail.com");
      })
      .catch(console.error);
  }, [initialIsAmit]);

  /* -------------------- FETCH COMPANIES -------------------- */
  useEffect(() => {
    if (initialCompanies.length > 0) return; // Skip if provided by prop

    async function fetchCompanies() {
      try {
        const response = await fetch("/api/company");
        if (!response.ok) {
          const error = await response.json().catch(() => null);
          throw new Error(error?.error || "Unable to load companies.");
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error("The server returned an invalid company list.");
        }
        setCompanies(data);
      } catch (error) {
        toast({
          title: "Companies could not be loaded",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      }
    }

    void fetchCompanies();
  }, [initialCompanies, toast]);

  /* -------------------- COMPANY SEARCH -------------------- */
  const handleCompanyChange = (value: string) => {
    form.setValue("companyName", value);
    form.setValue("companyCity", "");

    if (!value) {
      setShowSuggestions(false);
      form.setValue("companyCity", "");
      return;
    }

    const filtered = companies.filter((c) =>
      (c.companyName || c["Company Name"] || "")
        ?.toString()
        .toLowerCase()
        .includes(value.toLowerCase())
    );

    setCompanySuggestions(filtered);
    setShowSuggestions(true);
  };

  const selectCompany = (company: InvoiceCompany) => {
    form.setValue(
      "companyName",
      company.companyName || company["Company Name"] || ""
    );
    form.setValue("companyCity", company.companyCity || company["City"] || "");
    setShowSuggestions(false);
  };

  /* -------------------- PREVIEW -------------------- */
  const fetchPreview = async (values: any) => {
    // Validate date range before proceeding
    if (values.startDate && values.endDate) {
      const startDate = new Date(values.startDate);
      const endDate = new Date(values.endDate);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 365) { // More than 1 year
        setDateRangeWarning(`Date range is ${diffDays} days. This may take a long time to process. Consider selecting a smaller range.`);
      } else if (diffDays > 180) { // More than 6 months
        setDateRangeWarning(`Date range is ${diffDays} days. Processing may take some time.`);
      } else {
        setDateRangeWarning(null);
      }
    }
    
    setPreviewLoading(true);
    setPreviewRequestValues(null);
    setInvoiceProgress({ status: "Loading preview data...", progress: 50 });
    try {
      const res = await fetch("/api/invoice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, isPreview: true }),
      });

      setInvoiceProgress({ status: "Processing preview...", progress: 80 });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        setInvoicePreview(null);
        setShowPreview(false);
        toast({
          title: "Preview unavailable",
          description: errorData?.error || "Unable to prepare an invoice preview.",
          variant: "destructive",
        });
        return;
      }

      const data = await res.json();
      if (!data.success) {
        setInvoicePreview(null);
        setShowPreview(false);
        toast({
          title: "Preview unavailable",
          description: data.error || "Unable to prepare an invoice preview.",
          variant: "destructive",
        });
        return;
      }
      setInvoicePreview(data);
      setShowPreview(true);
      setPreviewRequestValues(JSON.stringify(form.getValues()));
      toast({ title: "Invoice preview is ready" });
    } catch {
      toast({
        title: "Preview failed",
        variant: "destructive",
      });
    } finally {
      setPreviewLoading(false);
      setInvoiceProgress(null);
    }
  };

  /* -------------------- SUBMIT -------------------- */
  const onSubmit = async (values: any) => {
    // Validate date range before proceeding
    if (values.startDate && values.endDate) {
      const startDate = new Date(values.startDate);
      const endDate = new Date(values.endDate);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 365) { // More than 1 year
        const confirmed = window.confirm(`You're generating an invoice for ${diffDays} days. This may take a long time to process. Are you sure you want to continue?`);
        if (!confirmed) return;
      }
    }
    
    setLoading(true);
    setInvoiceProgress({ status: "Starting invoice generation...", progress: 10 });
    try {
      const res = await fetch("/api/invoice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          expectedFingerprint: invoicePreview?.fingerprint,
        }),
      });

      setInvoiceProgress({ status: "Processing data...", progress: 60 });
      
      const data = await res.json();

      if (!data.success) {
        setInvoicePreview(null);
        setShowPreview(false);
        setPreviewRequestValues(null);
        toast({
          title: data.error || "Invoice generation failed",
          variant: "destructive",
        });
        return;
      }

      setInvoiceProgress({ status: "Generating PDF...", progress: 90 });
      
      onInvoiceGenerated?.(data);
      toast({ title: "Invoice downloaded successfully" });
      
      // Reset form after successful generation
      form.reset({
        companyName: "",
        companyCity: "",
        isManual: false,
        startDate: "",
        endDate: toDateInputValue(new Date()),
        brokerageRate: 2,
        description: "",
        totalAmount: 0,
        invoiceDate: toDateInputValue(new Date()),
      });
      
      // Clear preview
      setInvoicePreview(null);
      setShowPreview(false);
      setPreviewRequestValues(null);
    } catch {
      toast({
        title: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setInvoiceProgress(null);
    }
  };

  /* -------------------- UI -------------------- */
  return (
    <div className="max-w-4xl mx-auto px-4">
      <Form {...form}>
        <Card className="rounded-xl shadow-md border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-xl">Generate Brokerage Invoice</CardTitle>
            <p className="text-sm text-muted-foreground">
              Fill details → Preview → Download
            </p>
          </div>
          <FormField
            name="isManual"
            control={form.control}
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="h-5 w-5 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                  />
                </FormControl>
                <FormLabel className="text-sm font-medium cursor-pointer">Manual Mode</FormLabel>
              </FormItem>
            )}
          />
        </CardHeader>

        <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* COMPANY */}
              <FormField
                name="companyName"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="relative">
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Search company..."
                        className="h-11"
                        onChange={(e) => handleCompanyChange(e.target.value)}
                      />
                    </FormControl>

                    {showSuggestions && companySuggestions.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full rounded-lg border bg-white shadow-lg max-h-48 overflow-y-auto">
                        {companySuggestions.map((c) => (
                          <button
                            type="button"
                            key={`${c.companyName || c["Company Name"]}-${
                              c.companyCity || c["City"]
                            }`}
                            onClick={() => selectCompany(c)}
                            className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                          >
                            <span className="font-medium">
                              {c.companyName || c["Company Name"]}
                            </span>
                            <span className="ml-2 text-xs text-gray-500">
                              ({c.companyCity || c["City"]})
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* COMPANY CITY */}
              <FormField
                name="companyCity"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company City</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Company city"
                        className="h-11"
                        disabled={true}
                        readOnly
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />


              {/* DATES + RATE (Automated Mode) */}
              {!form.watch("isManual") ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {dateRangeWarning && (
                    <div className="col-span-full">
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700">
                        ⚠️ {dateRangeWarning}
                      </div>
                    </div>
                  )}
                  <FormField
                    name="startDate"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <DatePicker 
                            value={fromDateInputValue(field.value)}
                            onChange={(date) => field.onChange(date ? toDateInputValue(date) : undefined)}
                            placeholder="Select start date"
                            displayFormat="dd/MM/yyyy"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="endDate"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <DatePicker 
                            value={fromDateInputValue(field.value)}
                            onChange={(date) => field.onChange(date ? toDateInputValue(date) : undefined)}
                            placeholder="Select end date"
                            displayFormat="dd/MM/yyyy"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {!isAmit && (
                    <FormField
                      name="brokerageRate"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brokerage Rate (per Qty)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              className="h-11"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              ) : (
                /* MANUAL FIELDS (Manual Mode) */
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <FormField
                    name="invoiceDate"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem className="md:col-span-1">
                        <FormLabel>Invoice Date</FormLabel>
                        <FormControl>
                          <DatePicker 
                            value={fromDateInputValue(field.value)}
                            onChange={(date) => field.onChange(date ? toDateInputValue(date) : undefined)}
                            placeholder="Select date"
                            displayFormat="dd/MM/yyyy"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="brokerageRate"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brokerage (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            {...field}
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="description"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel htmlFor="manual-invoice-description">Custom Description</FormLabel>
                        <FormControl>
                          <Textarea
                            id="manual-invoice-description"
                            {...field}
                            rows={3}
                            placeholder="e.g., Brokerage for the period..."
                            className="min-h-24"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="totalAmount"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem className="md:col-span-1">
                        <FormLabel>Total Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            placeholder="0.00"
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* PREVIEW */}
              {showPreview && hasCurrentPreview && (
                <div className="rounded-xl border bg-gray-50 p-5">
                  {previewLoading ? (
                    <div className="flex justify-center py-10">
                      <Spinner />
                    </div>
                  ) : (
                    <InvoiceSummaryPreview
                      summary={invoicePreview.summary}
                      transactions={invoicePreview.transactions || []}
                    />
                  )}
                </div>
              )}

              {/* ACTIONS */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={form.handleSubmit(fetchPreview)}
                  disabled={previewLoading || loading}
                >
                  {previewLoading ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" /> Loading...
                    </>
                  ) : (
                    "See Preview"
                  )}
                </Button>

                {invoiceProgress && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
                      style={{ width: `${invoiceProgress.progress}%` }}
                    ></div>
                  </div>
                )}
                {invoiceProgress && (
                  <div className="text-sm text-muted-foreground mb-4 text-center">
                    {invoiceProgress.status}
                  </div>
                )}
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={
                    loading ||
                    !hasCurrentPreview ||
                    (!form.watch("isManual") &&
                      (!invoicePreview.transactions ||
                        invoicePreview.transactions.length === 0))
                  }
                >
                  {loading ? <Spinner /> : "Download Invoice"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </Form>
    </div>
  );
}
