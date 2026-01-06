"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const transactionSchema = z.object({
  buyerCompanyName: z.string().min(1, "Buyer is required"),
  buyerCity: z.string().min(1, "Buyer city is required"),
  sellerCompanyName: z.string().min(1, "Seller is required"),
  sellerCity: z.string().min(1, "Seller city is required"),
  date: z.string().min(1, "Date is required"),
  product: z.string().min(1, "Product is required"),
  qty: z.coerce.number().int().positive("Quantity must be a positive integer"),
  price: z.coerce.number().positive("Price must be positive"),
  remarks: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  onSuccess?: () => void;
}

interface Company {
  companyName: string;
  companyCity: string;
}

interface Product {
  productCode: string;
  productName: string;
}

export function TransactionForm({ onSuccess }: TransactionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [lastTransaction, setLastTransaction] =
    useState<Partial<TransactionFormValues> | null>(null);
  const [buyerSuggestions, setBuyerSuggestions] = useState<Company[]>([]);
  const [sellerSuggestions, setSellerSuggestions] = useState<Company[]>([]);
  const [productSuggestions, setProductSuggestions] = useState<Product[]>([]);
  const [showBuyerSuggestions, setShowBuyerSuggestions] = useState(false);
  const [showSellerSuggestions, setShowSellerSuggestions] = useState(false);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [productInputValue, setProductInputValue] = useState("");
  const { toast } = useToast();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      buyerCompanyName: "",
      buyerCity: "",
      sellerCompanyName: "",
      sellerCity: "",
      date: new Date().toISOString().split("T")[0],
      product: "",
      qty: 1,
      price: 0,
      remarks: "",
    },
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [companiesRes, productsRes] = await Promise.all([
          fetch("/api/company"),
          fetch("/api/product"),
        ]);

        if (companiesRes.ok) setCompanies(await companiesRes.json());
        if (productsRes.ok) setProducts(await productsRes.json());
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    }

    fetchData();
  }, []);

  // Handle buyer company name input changes
  const handleBuyerCompanyChange = (value: string) => {
    form.setValue("buyerCompanyName", value);
    if (value.length > 0) {
      const filtered = companies.filter(
        (company) =>
          company.companyName &&
          company.companyName.toLowerCase().includes(value.toLowerCase())
      );
      setBuyerSuggestions(filtered);
      setShowBuyerSuggestions(true);
    } else {
      setShowBuyerSuggestions(false);
    }
  };

  // Handle seller company name input changes
  const handleSellerCompanyChange = (value: string) => {
    form.setValue("sellerCompanyName", value);
    if (value.length > 0) {
      const filtered = companies.filter(
        (company) =>
          company.companyName &&
          company.companyName.toLowerCase().includes(value.toLowerCase())
      );
      setSellerSuggestions(filtered);
      setShowSellerSuggestions(true);
    } else {
      setShowSellerSuggestions(false);
    }
  };

  // Handle product input changes
  const handleProductChange = (value: string) => {
    setProductInputValue(value);

    if (value.length > 0) {
      const filtered = products.filter(
        (product) =>
          product.productName.toLowerCase().includes(value.toLowerCase()) ||
          product.productCode.toLowerCase().includes(value.toLowerCase())
      );
      setProductSuggestions(filtered);
      setShowProductSuggestions(true);
    } else {
      setShowProductSuggestions(false);
    }
  };

  // Handle buyer company selection from suggestions
  const selectBuyerCompany = (company: Company) => {
    form.setValue("buyerCompanyName", company.companyName);
    form.setValue("buyerCity", company.companyCity);
    setShowBuyerSuggestions(false);
  };

  // Handle seller company selection from suggestions
  const selectSellerCompany = (company: Company) => {
    form.setValue("sellerCompanyName", company.companyName);
    form.setValue("sellerCity", company.companyCity);
    setShowSellerSuggestions(false);
  };

  // Handle product selection from suggestions
  const selectProduct = (product: Product) => {
    form.setValue("product", product.productCode);
    setProductInputValue(`${product.productName} (${product.productCode})`);
    setShowProductSuggestions(false);
  };

  // Auto-populate buyer city when buyer company changes
  useEffect(() => {
    const buyerCompanyName = form.watch("buyerCompanyName");
    if (buyerCompanyName) {
      const company = companies.find((c) => c.companyName === buyerCompanyName);
      if (company) {
        form.setValue("buyerCity", company.companyCity);
      }
    }
  }, [form.watch("buyerCompanyName"), companies, form]);

  // Auto-populate seller city when seller company changes
  useEffect(() => {
    const sellerCompanyName = form.watch("sellerCompanyName");
    if (sellerCompanyName) {
      const company = companies.find(
        (c) => c.companyName === sellerCompanyName
      );
      if (company) {
        form.setValue("sellerCity", company.companyCity);
      }
    }
  }, [form.watch("sellerCompanyName"), companies, form]);

  async function onSubmit(values: TransactionFormValues) {
    setIsLoading(true);
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add transaction");
      }

      toast({
        title: "Success",
        description: "Transaction recorded successfully",
      });

      // Save last transaction data for quick entry
      setLastTransaction({
        buyerCompanyName: values.buyerCompanyName,
        buyerCity: values.buyerCity,
        sellerCompanyName: values.sellerCompanyName,
        sellerCity: values.sellerCity,
        product: values.product,
      });

      form.reset({
        buyerCompanyName: "",
        buyerCity: "",
        sellerCompanyName: "",
        sellerCity: "",
        date: new Date().toISOString().split("T")[0],
        product: "",
        qty: 1,
        price: 0,
        remarks: "",
      });
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const copyLastTransaction = () => {
    if (lastTransaction) {
      form.setValue("buyerCompanyName", lastTransaction.buyerCompanyName || "");
      form.setValue("buyerCity", lastTransaction.buyerCity || "");
      form.setValue(
        "sellerCompanyName",
        lastTransaction.sellerCompanyName || ""
      );
      form.setValue("sellerCity", lastTransaction.sellerCity || "");

      // Set product if available
      if (lastTransaction.product) {
        form.setValue("product", lastTransaction.product);
        const product = products.find(
          (p) => p.productCode === lastTransaction.product
        );
        if (product) {
          setProductInputValue(
            `${product.productName} (${product.productCode})`
          );
        }
      }
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Record Transaction</CardTitle>
            <CardDescription>Add a new transaction record</CardDescription>
          </div>
          {lastTransaction && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyLastTransaction}
              disabled={isLoading}
            >
              Copy Last
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sellerCompanyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seller Company</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="Enter seller company name"
                        value={field.value}
                        onChange={(e) =>
                          handleSellerCompanyChange(e.target.value)
                        }
                        disabled={isLoading}
                        autoComplete="off"
                      />
                      {showSellerSuggestions &&
                        sellerSuggestions.length > 0 && (
                        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                          {sellerSuggestions.map((company) => (
                            <div
                              key={`${company.companyName}-${company.companyCity}`}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                              onClick={() => selectSellerCompany(company)}
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

            <FormField
              control={form.control}
              name="sellerCity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seller City</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Seller city"
                      {...field}
                      disabled={true}
                      readOnly
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="buyerCompanyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Buyer Company</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="Enter buyer company name"
                        value={field.value}
                        onChange={(e) =>
                          handleBuyerCompanyChange(e.target.value)
                        }
                        disabled={isLoading}
                        autoComplete="off"
                      />
                      {showBuyerSuggestions && buyerSuggestions.length > 0 && (
                        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                          {buyerSuggestions.map((company) => (
                            <div
                              key={`${company.companyName}-${company.companyCity}`}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                              onClick={() => selectBuyerCompany(company)}
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

            <FormField
              control={form.control}
              name="buyerCity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Buyer City</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Buyer city"
                      {...field}
                      disabled={true}
                      readOnly
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="product"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="Enter product name or code"
                        value={productInputValue}
                        onChange={(e) => handleProductChange(e.target.value)}
                        onFocus={() => {
                          // When focused, if we have a selected product, show empty input for searching
                          if (form.getValues("product") && !productInputValue) {
                            setProductInputValue("");
                          }
                        }}
                        onBlur={() => {
                          // When blurred, if we have a selected product but no input value, show the selected product
                          const selectedProduct = form.getValues("product");
                          if (selectedProduct && !productInputValue) {
                            const product = products.find(
                              (p) => p.productCode === selectedProduct
                            );
                            if (product) {
                              setProductInputValue(
                                `${product.productName} (${product.productCode})`
                              );
                            }
                          }
                        }}
                        disabled={isLoading}
                        autoComplete="off"
                      />
                      {showProductSuggestions &&
                        productSuggestions.length > 0 && (
                        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                          {productSuggestions.map((product) => (
                            <div
                              key={product.productCode}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                              onClick={() => selectProduct(product)}
                            >
                              {product.productName} ({product.productCode})
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="qty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        placeholder="0"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price per Unit</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Add any remarks"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Recording..." : "Record Transaction"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
