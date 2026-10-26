"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"

const productSchema = z.object({
  productCode: z.string().trim().min(1, "Product code is required"),
  productName: z.string().trim().min(1, "Product name is required"),
  brokerageRate: z.coerce.number().optional().default(0),
})

type ProductFormValues = z.infer<typeof productSchema>

interface ProductFormProps {
  onSuccess?: () => void
  initialData?: Partial<ProductFormValues>
}

export function ProductForm({ onSuccess, initialData, initialIsAmit }: ProductFormProps & { initialIsAmit?: boolean }) {
  const [isLoading, setIsLoading] = useState(false)
  const [isAmit, setIsAmit] = useState(initialIsAmit || false)
  const { toast } = useToast()

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      productCode: initialData?.productCode || "",
      productName: initialData?.productName || "",
      brokerageRate: initialData?.brokerageRate || 0,
    },
  })

  // Fetch user info to check if it's Amit (only on client and if not provided)
  useEffect(() => {
    if (initialIsAmit !== undefined || typeof window === 'undefined') return;
    
    fetch("/api/user-info")
      .then((res) => res.json())
      .then((data) => {
        setIsAmit(data.email === "amitraval1681@gmail.com")
      })
      .catch(console.error)
  }, [initialIsAmit])

  async function onSubmit(values: ProductFormValues) {
    setIsLoading(true)
    try {
      let response;
      const isEditing = !!initialData?.productCode; // Check if we have initial data to determine edit mode
      
      if (isEditing) {
        // Update existing product
        response = await fetch("/api/product", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            oldProductCode: initialData?.productCode, // Use the old product code to identify which product to update
            data: values
          }),
        })
      } else {
        // Create new product
        response = await fetch("/api/product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        })
      }

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || (isEditing ? "Failed to update product" : "Failed to add product"))
      }

      toast({
        title: "Success",
        description: isEditing ? "Product updated successfully" : "Product added successfully",
      })
      
      if (!isEditing) {
        form.reset()
      }
      
      onSuccess?.()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>{initialData?.productCode ? "Edit Product" : "Add Product"}</CardTitle>
        <CardDescription>
          {initialData?.productCode
            ? "Update the product master record."
            : "Add a new product to your master list."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="productCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Code</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter product code" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="productName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter product name" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isAmit && (
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
                        placeholder="Enter brokerage rate" 
                        {...field} 
                        disabled={isLoading} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            </div>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading
                ? initialData?.productCode
                  ? "Saving..."
                  : "Adding..."
                : initialData?.productCode
                  ? "Save Product"
                  : "Add Product"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
