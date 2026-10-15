"use client"

import { useEffect, useRef, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2 } from "lucide-react"
import { CompanyForm } from "./company-form"

interface Company {
  companyName: string
  companyCity: string
}

interface CompanyTableProps {
  refreshTrigger?: number
  initialCompanies?: Company[]
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

export function CompanyTable({ 
  refreshTrigger = 0,
  initialCompanies = []
}: CompanyTableProps) {
  const [companies, setCompanies] = useState<Company[]>(initialCompanies)
  const [isLoading, setIsLoading] = useState(initialCompanies.length === 0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [reloadKey, setReloadKey] = useState(0)
  const lastRefreshTrigger = useRef(refreshTrigger)
  const lastReloadKey = useRef(reloadKey)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    async function fetchCompanies() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const response = await fetch("/api/company")
        if (!response.ok) {
          const error = await response.json().catch(() => null)
          throw new Error(error?.error || "Failed to load companies")
        }
        const data = await response.json()
        if (!Array.isArray(data)) throw new Error("The server returned an invalid company list.")
        // Add index to each company
        const companiesWithIndex = data.map((company: any, idx: number) => ({
          ...company,
          id: idx,
        }))
        setCompanies(companiesWithIndex)
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Failed to load companies")
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load companies",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    // Only fetch if no initial data or if triggered by refresh
    const refreshRequested =
      refreshTrigger !== lastRefreshTrigger.current || reloadKey !== lastReloadKey.current
    if (companies.length === 0 || refreshRequested) {
      lastRefreshTrigger.current = refreshTrigger
      lastReloadKey.current = reloadKey
      fetchCompanies()
    }
  }, [companies.length, refreshTrigger, reloadKey, toast])

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading companies...</div>

  const filteredCompanies = companies.filter((company) =>
    `${company.companyName} ${company.companyCity}`.toLowerCase().includes(searchTerm.toLowerCase()),
  )

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
    setReloadKey((key) => key + 1)
  }

  const EditCompanyModal = ({ company, index, isOpen, onClose, onSave }: EditCompanyModalProps) => {
    if (!isOpen || !company) return null

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div role="dialog" aria-modal="true" aria-labelledby="edit-company-title" className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <h3 id="edit-company-title" className="text-lg font-semibold mb-4">Edit Company</h3>
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
          <Input
            aria-label="Search companies"
            placeholder="Search by company or city"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="mb-4 h-11"
          />
          {loadError ? (
            <div role="alert" className="rounded-md border border-destructive/30 p-4 text-sm">
              <p>{loadError}</p>
              <Button type="button" variant="outline" className="mt-3" onClick={() => setReloadKey((key) => key + 1)}>
                Try again
              </Button>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {companies.length === 0 ? "No companies added yet." : "No companies match your search."}
            </p>
          ) : (
          <>
          <div className="space-y-3 md:hidden">
            {filteredCompanies.map((company, idx) => (
              <article key={`${company.companyName}-${company.companyCity}`} className="rounded-lg border p-4">
                <h3 className="font-semibold">{company.companyName}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{company.companyCity}</p>
                <div className="mt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => handleEdit(company, idx)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => handleDelete(company.companyName)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((company, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{company.companyName}</TableCell>
                    <TableCell>{company.companyCity}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Edit ${company.companyName}`}
                          onClick={() => handleEdit(company, idx)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Delete ${company.companyName}`}
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
          </>
          )}
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
