"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"

const companySchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companyCity: z.string().min(1, "City is required"),
})

type CompanyFormValues = z.infer<typeof companySchema>

interface CompanyFormProps {
  onSuccess?: () => void
  initialData?: Partial<CompanyFormValues>
}

export function CompanyForm({ onSuccess, initialData }: CompanyFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      companyName: initialData?.companyName || "",
      companyCity: initialData?.companyCity || "",
    },
  })

  async function onSubmit(values: CompanyFormValues) {
    setIsLoading(true)
    try {
      let response;
      const isEditing = !!initialData?.companyName; // Check if we have initial data to determine edit mode
      
      if (isEditing) {
        // Update existing company
        response = await fetch("/api/company", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            oldCompanyName: initialData?.companyName, // Use the old company name to identify which company to update
            data: values
          }),
        })
      } else {
        // Create new company
        response = await fetch("/api/company", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        })
      }

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || (isEditing ? "Failed to update company" : "Failed to add company"))
      }

      toast({
        title: "Success",
        description: isEditing ? "Company updated successfully" : "Company added successfully",
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
        <CardTitle>Add Company</CardTitle>
        <CardDescription>Add a new company to your master list</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter company name" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyCity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter city" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Adding..." : "Add Company"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
