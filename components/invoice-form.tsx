"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  companyCity: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  brokerageRate: z.coerce.number().min(0).max(100),
});

export function InvoiceForm({
  onInvoiceGenerated,
}: {
  onInvoiceGenerated?: (data: any) => void;
}) {
  const { toast } = useToast();

  const [companies, setCompanies] = useState<any[]>([]);
  const [companySuggestions, setCompanySuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [invoicePreview, setInvoicePreview] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyName: "",
      companyCity: "",
      startDate: "",
      endDate: new Date().toISOString().split("T")[0],
      brokerageRate: 2,
    },
  });

  /* -------------------- FETCH COMPANIES -------------------- */
  useEffect(() => {
    fetch("/api/company")
      .then((res) => res.json())
      .then(setCompanies)
      .catch((error) => {
        console.error("Error fetching companies:", error);
        setCompanies([]);
      });
  }, []);

  /* -------------------- COMPANY SEARCH -------------------- */
  const handleCompanyChange = (value: string) => {
    form.setValue("companyName", value);

    // Auto-populate company city when company name changes
    if (value) {
      const company = companies.find(
        (c) =>
          (c.companyName || c["Company Name"] || "")
            ?.toString()
            .toLowerCase() === value.toLowerCase()
      );
      if (company) {
        form.setValue(
          "companyCity",
          company.companyCity || company["City"] || ""
        );
      } else {
        form.setValue("companyCity", "");
      }
    }

    if (!value) {
      setShowSuggestions(false);
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
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/invoice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, isPreview: true }),
      });

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
    }
  };

  /* -------------------- SUBMIT -------------------- */
  const onSubmit = async (values: any) => {
    setLoading(true);
    try {
      const res = await fetch("/api/invoice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!data.success) {
        toast({
          title: data.error || "Invoice generation failed",
          variant: "destructive",
        });
        return;
      }

      onInvoiceGenerated?.(data);
      toast({ title: "Invoice downloaded successfully" });
    } catch {
      toast({
        title: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /* -------------------- UI -------------------- */
  return (
    <div className="max-w-4xl mx-auto px-4">
      <Card className="rounded-xl shadow-md border">
        <CardHeader>
          <CardTitle className="text-xl">Generate Brokerage Invoice</CardTitle>
          <p className="text-sm text-muted-foreground">
            Fill details → Preview → Download
          </p>
        </CardHeader>

        <CardContent>
          <Form {...form}>
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

              {/* DATES + RATE */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  name="startDate"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="h-11" />
                      </FormControl>
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
                        <Input type="date" {...field} className="h-11" />
                      </FormControl>
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
                          step="0.01"
                          {...field}
                          className="h-11"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* PREVIEW */}
              {showPreview && (
                <div className="rounded-xl border bg-gray-50 p-5">
                  {previewLoading ? (
                    <div className="flex justify-center py-10">
                      <Spinner />
                    </div>
                  ) : (
                    <InvoiceSummaryPreview
                      summary={invoicePreview.summary}
                      transactions={invoicePreview.transactions}
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
                  onClick={() => fetchPreview(form.getValues())}
                  disabled={previewLoading}
                >
                  {previewLoading ? <Spinner /> : "See Preview"}
                </Button>

                <Button
                  type="submit"
                  className="flex-1"
                  disabled={
                    loading ||
                    !invoicePreview ||
                    invoicePreview.transactions.length === 0
                  }
                >
                  {loading ? <Spinner /> : "Download Invoice"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
