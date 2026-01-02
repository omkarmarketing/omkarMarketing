"use client"

import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2 } from "lucide-react"
import { CompanyForm } from "./company-form"

interface Company {
  companyName: string
  companyCity: string
}

interface CompanyTableProps {
  refreshTrigger?: number
}

interface Company {
  companyName: string
  companyCity: string
  id?: number // Index of the company in the sheet
}

interface EditCompanyModalProps {
  company: Company
  index: number
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

export function CompanyTable({ refreshTrigger = 0 }: CompanyTableProps) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    async function fetchCompanies() {
      setIsLoading(true)
      try {
        const response = await fetch("/api/company")
        if (!response.ok) throw new Error("Failed to fetch companies")
        const data = await response.json()
        // Add index to each company
        const companiesWithIndex = data.map((company: any, idx: number) => ({
          ...company,
          id: idx,
        }))
        setCompanies(companiesWithIndex)
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load companies",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchCompanies()
  }, [refreshTrigger, toast])

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading companies...</div>
  if (companies.length === 0)
    return <div className="text-center py-8 text-muted-foreground">No companies added yet</div>

  const handleEdit = (company: Company, index: number) => {
    setEditingCompany(company)
    setEditingIndex(index)
    setIsEditModalOpen(true)
  }

  const handleDelete = async (companyName: string) => {
    if (!window.confirm("Are you sure you want to delete this company?")) {
      return
    }

    try {
      const response = await fetch(`/api/company?companyName=${encodeURIComponent(companyName)}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete company")
      }

      toast({
        title: "Success",
        description: "Company deleted successfully",
      })
      
      // Refresh the company list
      setCompanies(prev => prev.filter(c => c.companyName !== companyName))
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete company",
        variant: "destructive",
      })
    }
  }

  const handleUpdateSuccess = () => {
    setIsEditModalOpen(false)
    setEditingCompany(null)
    setEditingIndex(null)
    // Refresh the companies list
    setCompanies([]) // This will trigger a re-fetch
  }

  const EditCompanyModal = ({ company, index, isOpen, onClose, onSave }: EditCompanyModalProps) => {
    if (!isOpen || !company) return null

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Edit Company</h3>
            <CompanyForm 
              onSuccess={onSave}
              initialData={{
                ...company,
              }}
            />
          </div>
          <div className="p-4 border-t border-border flex justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Companies</CardTitle>
          <CardDescription>All registered companies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{company.companyName}</TableCell>
                    <TableCell>{company.companyCity}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(company, idx)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(company.companyName)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {editingCompany && editingIndex !== null && (
        <EditCompanyModal 
          company={editingCompany}
          index={editingIndex}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingCompany(null);
            setEditingIndex(null);
          }}
          onSave={handleUpdateSuccess}
        />
      )}
    </>
  )
}
