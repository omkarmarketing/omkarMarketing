"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const transactionSchema = z.object({
  buyerCompanyName: z.string().trim().min(1, "Buyer is required"),
  buyerCity: z.string().trim().min(1, "Buyer city is required"),
  sellerCompanyName: z.string().trim().min(1, "Seller is required"),
  sellerCity: z.string().trim().min(1, "Seller city is required"),
  date: z.string().min(1, "Date is required"),
  product: z.string().trim().min(1, "Product is required"),
  qty: z.coerce.number().int().positive("Quantity must be a positive integer"),
  price: z.coerce
    .number({ invalid_type_error: "Price is required" })
    .positive("Price must be positive"),
  remarks: z.string().optional(),
  brokerageRate: z.coerce.number().min(0).optional().default(0),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;
type PendingTransaction = {
  id: string;
  values: TransactionFormValues;
};

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
  brokerageRate?: string | number;
}

const EMPTY_COMPANIES: Company[] = [];
const EMPTY_PRODUCTS: Product[] = [];

export function TransactionForm({ 
  onSuccess,
  initialCompanies = EMPTY_COMPANIES,
  initialProducts = EMPTY_PRODUCTS,
  initialIsAmit = false
}: TransactionFormProps & {
  initialCompanies?: Company[];
  initialProducts?: Product[];
  initialIsAmit?: boolean;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [lastTransaction, setLastTransaction] =
    useState<Partial<TransactionFormValues> | null>(null);
  const [buyerSuggestions, setBuyerSuggestions] = useState<Company[]>([]);
  const [sellerSuggestions, setSellerSuggestions] = useState<Company[]>([]);
  const [productSuggestions, setProductSuggestions] = useState<Product[]>([]);
  const [showBuyerSuggestions, setShowBuyerSuggestions] = useState(false);
  const [showSellerSuggestions, setShowSellerSuggestions] = useState(false);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [productInputValue, setProductInputValue] = useState("");
  const [isAmit, setIsAmit] = useState(initialIsAmit);
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
      price: undefined,
      remarks: "",
      brokerageRate: 0,
    },
  });

  useEffect(() => {
    // If all data provided, don't fetch
    if (initialCompanies.length > 0 && initialProducts.length > 0) return;

    async function fetchData() {
      try {
        const [companiesRes, productsRes, userRes] = await Promise.all([
          initialCompanies.length > 0 ? Promise.resolve(null) : fetch("/api/company"),
          initialProducts.length > 0 ? Promise.resolve(null) : fetch("/api/product"),
          initialIsAmit !== undefined ? Promise.resolve(null) : fetch("/api/user-info"),
        ]);

        if (companiesRes) {
          if (!companiesRes.ok) {
            const error = await companiesRes.json().catch(() => null);
            throw new Error(error?.error || "Unable to load Company Master.");
          }
          const data = await companiesRes.json();
          if (!Array.isArray(data)) throw new Error("The server returned an invalid company list.");
          setCompanies(data);
        }
        if (productsRes) {
          if (!productsRes.ok) {
            const error = await productsRes.json().catch(() => null);
            throw new Error(error?.error || "Unable to load Product Master.");
          }
          const productsData = await productsRes.json();
          if (!Array.isArray(productsData)) throw new Error("The server returned an invalid product list.");
          setProducts(productsData);
        }
        if (userRes) {
          if (!userRes.ok) throw new Error("Unable to load user settings.");
          const userData = await userRes.json();
          setIsAmit(userData.email === "amitraval1681@gmail.com");
        }
      } catch (error) {
        toast({
          title: "Transaction form data could not be loaded",
          description: error instanceof Error ? error.message : "Try refreshing the page.",
          variant: "destructive",
        });
      }
    }

    fetchData();
  }, [initialCompanies, initialProducts, initialIsAmit, toast]);

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
    form.setValue("product", product.productName);
    setProductInputValue(`${product.productName} (${product.productCode})`);
    
    // Auto-fill brokerage rate for Amit if available
    if (isAmit && product.brokerageRate) {
      form.setValue("brokerageRate", Number(product.brokerageRate));
    }
    
    setShowProductSuggestions(false);
  };

  // Auto-populate buyer city when buyer company changes (handled in selectBuyerCompany)
  // Auto-populate seller city when seller company changes (handled in selectSellerCompany)

  function resetAll() {
    setPendingTransactions([]);
    form.reset({
      buyerCompanyName: "",
      buyerCity: "",
      sellerCompanyName: "",
      sellerCity: "",
      date: new Date().toISOString().split("T")[0],
      product: "",
      qty: 1,
      price: undefined,
      remarks: "",
    });
    setProductInputValue("");
  }

  function resetEntryFields() {
    form.setValue("product", "");
    form.setValue("qty", 1);
    form.resetField("price");
    form.setValue("remarks", "");
    setProductInputValue("");
  }

  function addPendingTransaction(values: TransactionFormValues) {
    setPendingTransactions((current) => [
      ...current,
      { id: crypto.randomUUID(), values },
    ]);
    resetEntryFields();
    toast({
      title: "Added to pending transactions",
      description: "Shared company and date fields are ready for the next entry.",
    });
  }

  function editPendingTransaction(transaction: PendingTransaction) {
    setPendingTransactions((current) =>
      current.filter((item) => item.id !== transaction.id),
    );
    form.reset(transaction.values);
    const selectedProduct = products.find(
      (product) => product.productName === transaction.values.product,
    );
    setProductInputValue(
      selectedProduct
        ? `${selectedProduct.productName} (${selectedProduct.productCode})`
        : transaction.values.product,
    );
  }

  async function savePendingTransactions() {
    if (pendingTransactions.length === 0 || isLoading) return;
    setIsLoading(true);
    let savedCount = 0;
    let failedCount = 0;
    let uncertainOutcome = false;
    let firstFailureMessage: string | null = null;

    try {
      for (const transaction of pendingTransactions) {
        let response: Response;
        try {
          response = await fetch("/api/transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(transaction.values),
          });
        } catch {
          uncertainOutcome = true;
          break;
        }

        if (!response.ok) {
          failedCount += 1;
          const errorData = await response.json().catch(() => null);
          firstFailureMessage ??=
            errorData?.error || `The server rejected an entry (${response.status}).`;
          continue;
        }

        savedCount += 1;
        setPendingTransactions((current) =>
          current.filter((item) => item.id !== transaction.id),
        );
      }

      if (savedCount > 0) onSuccess?.();
      if (uncertainOutcome) {
        toast({
          title: `${savedCount} transaction${savedCount === 1 ? "" : "s"} confirmed`,
          description:
            "The connection ended before all results were confirmed. Check the transaction list before retrying the remaining entries.",
          variant: "destructive",
        });
      } else if (failedCount > 0) {
        toast({
          title: `${savedCount} transaction${savedCount === 1 ? "" : "s"} saved`,
          description: `${failedCount} entries remain pending. ${firstFailureMessage || "Review the entries and retry after correcting any errors."}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: `${savedCount} transactions saved successfully`,
          description: "All pending entries were confirmed by the server.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

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

      resetEntryFields();
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
          (p) => p.productName === lastTransaction.product
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
            {isAmit ? (
              /* AMIT'S CUSTOM LAYOUT */
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <FormField
                      control={form.control}
                      name="sellerCompanyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Seller Company</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Seller"
                                value={field.value}
                                onChange={(e) =>
                                  handleSellerCompanyChange(e.target.value)
                                }
                                disabled={isLoading}
                                autoComplete="off"
                              />
                              {showSellerSuggestions &&
                                sellerSuggestions.length > 0 && (
                                  <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md">
                                    {sellerSuggestions.map((company) => (
                                      <button
                                        type="button"
                                        key={`${company.companyName}-${company.companyCity}`}
                                        className="block w-full border-0 bg-transparent px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
                                        onClick={() => selectSellerCompany(company)}
                                      >
                                        {company.companyName} ({company.companyCity})
                                      </button>
                                    ))}
                                  </div>
                                )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="sellerCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="City"
                            {...field}
                            disabled={true}
                            readOnly
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <FormField
                      control={form.control}
                      name="buyerCompanyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Buyer Company</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Buyer"
                                value={field.value}
                                onChange={(e) =>
                                  handleBuyerCompanyChange(e.target.value)
                                }
                                disabled={isLoading}
                                autoComplete="off"
                              />
                              {showBuyerSuggestions && buyerSuggestions.length > 0 && (
                                <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md">
                                  {buyerSuggestions.map((company) => (
                                    <button
                                      type="button"
                                      key={`${company.companyName}-${company.companyCity}`}
                                      className="block w-full border-0 bg-transparent px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
                                      onClick={() => selectBuyerCompany(company)}
                                    >
                                      {company.companyName} ({company.companyCity})
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="buyerCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="City"
                            {...field}
                            disabled={true}
                            readOnly
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <DatePicker 
                            value={field.value ? new Date(field.value) : undefined}
                            onChange={(date) => field.onChange(date ? date.toISOString().split('T')[0] : undefined)}
                            placeholder="Select date"
                            disabled={isLoading}
                            displayFormat="dd/MM/yyyy"
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
                              placeholder="Enter product"
                              value={productInputValue}
                              onChange={(e) => handleProductChange(e.target.value)}
                              disabled={isLoading}
                              autoComplete="off"
                            />
                            {showProductSuggestions && productSuggestions.length > 0 && (
                              <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md">
                                {productSuggestions.map((product) => (
                                  <button
                                    type="button"
                                    key={product.productCode}
                                    className="block w-full border-0 bg-transparent px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
                                    onClick={() => selectProduct(product)}
                                  >
                                    {product.productName} ({product.productCode})
                                  </button>
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
                    name="brokerageRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brokerage Rate</FormLabel>
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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="qty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Qty</FormLabel>
                        <FormControl>
                          <Input type="number" step="1" min="0" placeholder="0" {...field} disabled={isLoading} />
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
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            placeholder="Enter price"
                            {...field}
                            value={field.value ?? ""}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="remarks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Remarks</FormLabel>
                        <FormControl>
                          <Input placeholder="Remarks" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            ) : (
              /* ORIGINAL LAYOUT FOR OTHER USERS */
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <FormField
                      control={form.control}
                      name="sellerCompanyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Seller Company</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Seller"
                                value={field.value}
                                onChange={(e) => handleSellerCompanyChange(e.target.value)}
                                disabled={isLoading}
                                autoComplete="off"
                              />
                              {showSellerSuggestions && sellerSuggestions.length > 0 && (
                                <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md">
                                  {sellerSuggestions.map((company) => (
                                    <button
                                      type="button"
                                      key={`${company.companyName}-${company.companyCity}`}
                                      className="block w-full border-0 bg-transparent px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
                                      onClick={() => selectSellerCompany(company)}
                                    >
                                      {company.companyName} ({company.companyCity})
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="sellerCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} disabled={true} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <FormField
                      control={form.control}
                      name="buyerCompanyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Buyer Company</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Buyer"
                                value={field.value}
                                onChange={(e) => handleBuyerCompanyChange(e.target.value)}
                                disabled={isLoading}
                                autoComplete="off"
                              />
                              {showBuyerSuggestions && buyerSuggestions.length > 0 && (
                                <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md">
                                  {buyerSuggestions.map((company) => (
                                    <button
                                      type="button"
                                      key={`${company.companyName}-${company.companyCity}`}
                                      className="block w-full border-0 bg-transparent px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
                                      onClick={() => selectBuyerCompany(company)}
                                    >
                                      {company.companyName} ({company.companyCity})
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="buyerCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} disabled={true} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <DatePicker 
                            value={field.value ? new Date(field.value) : undefined}
                            onChange={(date) => field.onChange(date ? date.toISOString().split('T')[0] : undefined)}
                            placeholder="Select date"
                            disabled={isLoading}
                            displayFormat="dd/MM/yyyy"
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
                              placeholder="Enter product"
                              value={productInputValue}
                              onChange={(e) => handleProductChange(e.target.value)}
                              disabled={isLoading}
                              autoComplete="off"
                            />
                            {showProductSuggestions && productSuggestions.length > 0 && (
                              <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md">
                                {productSuggestions.map((product) => (
                                  <button
                                    type="button"
                                    key={product.productCode}
                                    className="block w-full border-0 bg-transparent px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
                                    onClick={() => selectProduct(product)}
                                  >
                                    {product.productName} ({product.productCode})
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="qty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Qty</FormLabel>
                        <FormControl>
                          <Input type="number" step="1" min="0" placeholder="0" {...field} disabled={isLoading} />
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
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            placeholder="Enter price"
                            {...field}
                            value={field.value ?? ""}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="remarks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Remarks</FormLabel>
                        <FormControl>
                          <Input placeholder="Remarks" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {pendingTransactions.length > 0 && (
              <section aria-label="Pending transactions" className="space-y-3 rounded-lg border bg-muted/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">Pending transactions ({pendingTransactions.length})</h3>
                    <p className="text-sm text-muted-foreground">These entries have not been saved yet.</p>
                  </div>
                  <Button type="button" onClick={savePendingTransactions} disabled={isLoading}>
                    {isLoading ? "Saving..." : "Record Pending Transactions"}
                  </Button>
                </div>
                <ul className="divide-y rounded-md border bg-background">
                  {pendingTransactions.map((transaction, index) => (
                    <li key={transaction.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="font-medium">
                          {index + 1}. {transaction.values.sellerCompanyName} → {transaction.values.buyerCompanyName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.values.product} · Qty {transaction.values.qty} · Price {transaction.values.price}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => editPendingTransaction(transaction)} disabled={isLoading}>
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPendingTransactions((current) => current.filter((item) => item.id !== transaction.id))}
                          disabled={isLoading}
                        >
                          Remove
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? "Recording..." : "Record Transaction"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isLoading}
                className="flex-1"
                onClick={form.handleSubmit(addPendingTransaction)}
              >
                Add Another
              </Button>
              {pendingTransactions.length > 0 ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline" disabled={isLoading}>
                      Clear
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Discard pending transactions?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This clears the form and discards{" "}
                        {pendingTransactions.length} unsaved{" "}
                        {pendingTransactions.length === 1 ? "entry" : "entries"}.
                        Transactions already saved are not affected.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep editing</AlertDialogCancel>
                      <AlertDialogAction onClick={resetAll}>Discard</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  onClick={resetAll}
                >
                  Clear
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
