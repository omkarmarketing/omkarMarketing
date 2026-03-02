"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
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

/* -------------------- VALIDATION -------------------- */
const schema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companyCity: z.string().min(1, "Company city is required"),
  isManual: z.boolean().default(false),
  // Automated fields
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  brokerageRate: z.coerce.number().min(0).max(100).optional(),
  // Manual fields
  description: z.string().optional(),
  totalAmount: z.coerce.number().min(0).optional(),
  invoiceDate: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.isManual) {
    if (!data.description) {
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
  initialCompanies = [],
  initialIsAmit = false,
}: {
  onInvoiceGenerated?: (data: any) => void;
  initialCompanies?: any[];
  initialIsAmit?: boolean;
}) {
  const { toast } = useToast();

  const [companies, setCompanies] = useState<any[]>(initialCompanies);
  const [companySuggestions, setCompanySuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [invoiceProgress, setInvoiceProgress] = useState<{ status: string; progress: number } | null>(null);
  const [invoicePreview, setInvoicePreview] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isAmit, setIsAmit] = useState(initialIsAmit);
  const [dateRangeWarning, setDateRangeWarning] = useState<string | null>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyName: "",
      companyCity: "",
      isManual: false,
      startDate: "",
      endDate: new Date().toISOString().split("T")[0],
      brokerageRate: 2,
      description: "",
      totalAmount: 0,
      invoiceDate: new Date().toISOString().split("T")[0],
    },
  });

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

    fetch("/api/company")
      .then((res) => res.json())
      .then(setCompanies)
      .catch((error) => {
        console.error("Error fetching companies:", error);
        setCompanies([]);
      });
  }, [initialCompanies]);

  /* -------------------- COMPANY SEARCH -------------------- */
  const handleCompanyChange = (value: string) => {
    form.setValue("companyName", value);

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

  const selectCompany = (company: any) => {
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
    setInvoiceProgress({ status: "Loading preview data...", progress: 50 });
    try {
      const res = await fetch("/api/invoice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, isPreview: true }),
      });

      setInvoiceProgress({ status: "Processing preview...", progress: 80 });
      
      if (!res.ok) {
        setInvoicePreview({
          summary: {
            companyName: values.companyName,
            dateRange: { start: values.startDate, end: values.endDate },
            brokerageRate: values.brokerageRate,
            totalQty: 0,
            totalPayable: 0,
          },
          transactions: [],
        });
        return;
      }

      const data = await res.json();
      setInvoicePreview(data);
      setShowPreview(true);
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
        body: JSON.stringify(values),
      });

      setInvoiceProgress({ status: "Processing data...", progress: 60 });
      
      const data = await res.json();

      if (!data.success) {
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
        endDate: new Date().toISOString().split("T")[0],
        brokerageRate: 2,
        description: "",
        totalAmount: 0,
        invoiceDate: new Date().toISOString().split("T")[0],
      });
      
      // Clear preview
      setInvoicePreview(null);
      setShowPreview(false);
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
                          <div
                            key={`${c.companyName || c["Company Name"]}-${
                              c.companyCity || c["City"]
                            }`}
                            onClick={() => selectCompany(c)}
                            className="px-4 py-2 text-sm cursor-pointer hover:bg-gray-100"
                          >
                            <span className="font-medium">
                              {c.companyName || c["Company Name"]}
                            </span>
                            <span className="ml-2 text-xs text-gray-500">
                              ({c.companyCity || c["City"]})
                            </span>
                          </div>
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
                            value={field.value ? new Date(field.value) : undefined}
                            onChange={(date) => field.onChange(date ? date.toISOString().split('T')[0] : undefined)}
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
                            value={field.value ? new Date(field.value) : undefined}
                            onChange={(date) => field.onChange(date ? date.toISOString().split('T')[0] : undefined)}
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
                          <FormLabel>Brokerage (%)</FormLabel>
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormField
                    name="invoiceDate"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem className="md:col-span-1">
                        <FormLabel>Invoice Date</FormLabel>
                        <FormControl>
                          <DatePicker 
                            value={field.value ? new Date(field.value) : undefined}
                            onChange={(date) => field.onChange(date ? date.toISOString().split('T')[0] : undefined)}
                            placeholder="Select date"
                            displayFormat="dd/MM/yyyy"
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
                        <FormLabel>Custom Description</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., Brokerage for the period..."
                            className="h-11"
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
              {showPreview && !form.watch("isManual") && (
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
                {!form.watch("isManual") && (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => fetchPreview(form.getValues())}
                    disabled={previewLoading}
                  >
                    {previewLoading ? (
                      <>
                        <Spinner className="mr-2 h-4 w-4" /> Loading...
                      </>
                    ) : (
                      "See Preview"
                    )}
                  </Button>
                )}

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
                    (!form.watch("isManual") &&
                      (!invoicePreview ||
                        !invoicePreview.transactions ||
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
