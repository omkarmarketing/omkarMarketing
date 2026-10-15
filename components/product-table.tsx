"use client"

import { useEffect, useRef, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2 } from "lucide-react"
import { ProductForm } from "./product-form"

interface Product {
  productCode: string
  productName: string
  brokerageRate?: string | number
}

interface ProductTableProps {
  refreshTrigger?: number
  initialProducts?: Product[]
  initialIsAmit?: boolean
}

interface Product {
  productCode: string
  productName: string
  brokerageRate?: string | number
  id?: number // Index of the product in the sheet
}

interface EditProductModalProps {
  product: Product
  index: number
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

export function ProductTable({ 
  refreshTrigger = 0,
  initialProducts = [],
  initialIsAmit = false
}: ProductTableProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [isLoading, setIsLoading] = useState(initialProducts.length === 0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [reloadKey, setReloadKey] = useState(0)
  const lastRefreshTrigger = useRef(refreshTrigger)
  const lastReloadKey = useRef(reloadKey)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAmit, setIsAmit] = useState(initialIsAmit)
  const { toast } = useToast()

  useEffect(() => {
    async function fetchProducts() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const response = await fetch("/api/product")
        if (!response.ok) {
          const error = await response.json().catch(() => null)
          throw new Error(error?.error || "Failed to load products")
        }
        const data = await response.json()
        if (!Array.isArray(data)) throw new Error("The server returned an invalid product list.")
        // Add index to each product
        const productsWithIndex = data.map((product: any, idx: number) => ({
          ...product,
          id: idx,
        }))
        setProducts(productsWithIndex)
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Failed to load products")
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load products",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    // Only fetch if no initial data or if triggered by refresh
    const refreshRequested =
      refreshTrigger !== lastRefreshTrigger.current || reloadKey !== lastReloadKey.current
    if (products.length === 0 || refreshRequested) {
      lastRefreshTrigger.current = refreshTrigger
      lastReloadKey.current = reloadKey
      fetchProducts()
    }

    // Fetch user info to check if it's Amit (only on client and if not provided)
    if (initialIsAmit === undefined && typeof window !== 'undefined') {
      fetch("/api/user-info")
        .then((res) => res.json())
        .then((data) => {
          setIsAmit(data.email === "amitraval1681@gmail.com")
        })
        .catch(console.error)
    }
  }, [initialIsAmit, products.length, refreshTrigger, reloadKey, toast])

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading products...</div>
  const filteredProducts = products.filter((product) =>
    `${product.productCode} ${product.productName}`.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleEdit = (product: Product, index: number) => {
    setEditingProduct(product)
    setEditingIndex(index)
    setIsEditModalOpen(true)
  }

  const handleDelete = async (productCode: string) => {
    if (!window.confirm("Are you sure you want to delete this product?")) {
      return
    }

    try {
      const response = await fetch(`/api/product?productCode=${encodeURIComponent(productCode)}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete product")
      }

      toast({
        title: "Success",
        description: "Product deleted successfully",
      })
      
      // Refresh the product list
      setProducts(prev => prev.filter(p => p.productCode !== productCode))
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete product",
        variant: "destructive",
      })
    }
  }

  const handleUpdateSuccess = () => {
    setIsEditModalOpen(false)
    setEditingProduct(null)
    setEditingIndex(null)
    setReloadKey((key) => key + 1)
  }

  const EditProductModal = ({ product, index, isOpen, onClose, onSave }: EditProductModalProps) => {
    if (!isOpen || !product) return null

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div role="dialog" aria-modal="true" aria-labelledby="edit-product-title" className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <h3 id="edit-product-title" className="text-lg font-semibold mb-4">Edit Product</h3>
            <ProductForm 
              onSuccess={onSave}
              initialData={{
                ...product,
                brokerageRate: Number(product.brokerageRate || 0),
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
          <CardTitle>Products</CardTitle>
          <CardDescription>All registered products</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            aria-label="Search products"
            placeholder="Search by product name or code"
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
          ) : filteredProducts.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {products.length === 0 ? "No products added yet." : "No products match your search."}
            </p>
          ) : (
          <>
          <div className="space-y-3 md:hidden">
            {filteredProducts.map((product, idx) => (
              <article key={product.productCode} className="rounded-lg border p-4">
                <p className="text-sm font-medium text-muted-foreground">{product.productCode}</p>
                <h3 className="mt-1 font-semibold">{product.productName}</h3>
                {isAmit && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Brokerage rate: {product.brokerageRate || 0}
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => handleEdit(product, idx)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => handleDelete(product.productCode)}>
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
                  <TableHead>Product Code</TableHead>
                  <TableHead>Product Name</TableHead>
                  {isAmit && <TableHead>Brokerage Rate</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{product.productCode}</TableCell>
                    <TableCell>{product.productName}</TableCell>
                    {isAmit && <TableCell>{product.brokerageRate || 0}</TableCell>}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Edit ${product.productName}`}
                          onClick={() => handleEdit(product, idx)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Delete ${product.productName}`}
                          onClick={() => handleDelete(product.productCode)}
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
      {editingProduct && editingIndex !== null && (
        <EditProductModal 
          product={editingProduct}
          index={editingIndex}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingProduct(null);
            setEditingIndex(null);
          }}
          onSave={handleUpdateSuccess}
        />
      )}
    </>
  )
}
