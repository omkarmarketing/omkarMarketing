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

const schema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  brokerageRate: z.coerce.number().min(0).max(100, "Rate must be 0-100"),
});

export function InvoiceForm({
  onInvoiceGenerated,
}: {
  onInvoiceGenerated?: (data: any) => void;
}) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [companySuggestions, setCompanySuggestions] = useState<any[]>([]);
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyName: "",
      startDate: "",
      endDate: new Date().toISOString().split("T")[0],
      brokerageRate: 2, // default like your invoice
    },
  });

  useEffect(() => {
    fetch("/api/company")
      .then((res) => res.json())
      .then(setCompanies);
  }, []);

  // Handle company name input changes
  const handleCompanyChange = (value: string) => {
    form.setValue("companyName", value);
    if (value.length > 0) {
      const filtered = companies.filter(
        (company) =>
          company.companyName &&
          company.companyName.toLowerCase().includes(value.toLowerCase())
      );
      setCompanySuggestions(filtered);
      setShowCompanySuggestions(true);
    } else {
      setShowCompanySuggestions(false);
    }
  };

  // Handle company selection from suggestions
  const selectCompany = (company: any) => {
    form.setValue("companyName", company.companyName);
    setShowCompanySuggestions(false);
  };

  async function onSubmit(values: any) {
    setLoading(true);
    try {
      console.log("Submitting invoice form with values:", values);
      const res = await fetch("/api/invoice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      console.log("Response status:", res.status);
      const data = await res.json();
      console.log("Response data:", data);

      if (data.success) {
        console.log("Invoice generated successfully");
        onInvoiceGenerated?.(data);
        toast({ title: "Invoice generated successfully" });
      } else {
        // Handle specific error cases with more user-friendly messages
        if (data.error === "No matching transactions found.") {
          toast({
            title: "No Transactions Found",
            description:
              "There are no transactions matching your criteria. Please check your date range and company name.",
            variant: "destructive",
          });
        } else {
          toast({
            title: data.error || "Failed to generate invoice",
            variant: "destructive",
          });
        }
        return; // Don't throw an error for user-friendly handling
      }
    } catch (e: any) {
      console.error("Error generating invoice:", e);
      toast({
        title: "Error generating invoice",
        description:
          e.message ||
          "An unexpected error occurred while generating the invoice",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Brokerage Invoice</CardTitle>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              name="companyName"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="Enter company name"
                        value={field.value}
                        onChange={(e) => handleCompanyChange(e.target.value)}
                        disabled={loading}
                        autoComplete="off"
                      />
                      {showCompanySuggestions &&
                        companySuggestions.length > 0 && (
                          <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                            {companySuggestions.map((company) => (
                              <div
                                key={`${company.companyName}-${company.companyCity}`}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                onClick={() => selectCompany(company)}
                              >
                                {company.companyName} ({company.companyCity})
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                name="startDate"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              name="brokerageRate"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brokerage Rate (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Rate per unit (%)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button className="w-full" disabled={loading}>
              {loading ? <Spinner /> : "Generate Invoice"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
