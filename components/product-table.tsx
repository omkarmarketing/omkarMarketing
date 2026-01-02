"use client"

import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2 } from "lucide-react"
import { ProductForm } from "./product-form"

interface Product {
  productCode: string
  productName: string
}

interface ProductTableProps {
  refreshTrigger?: number
}

interface Product {
  productCode: string
  productName: string
  id?: number // Index of the product in the sheet
}

interface EditProductModalProps {
  product: Product
  index: number
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

export function ProductTable({ refreshTrigger = 0 }: ProductTableProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    async function fetchProducts() {
      setIsLoading(true)
      try {
        const response = await fetch("/api/product")
        if (!response.ok) throw new Error("Failed to fetch products")
        const data = await response.json()
        // Add index to each product
        const productsWithIndex = data.map((product: any, idx: number) => ({
          ...product,
          id: idx,
        }))
        setProducts(productsWithIndex)
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load products",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [refreshTrigger, toast])

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading products...</div>
  if (products.length === 0) return <div className="text-center py-8 text-muted-foreground">No products added yet</div>

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
    // Refresh the products list
    setProducts([]) // This will trigger a re-fetch
  }

  const EditProductModal = ({ product, index, isOpen, onClose, onSave }: EditProductModalProps) => {
    if (!isOpen || !product) return null

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Edit Product</h3>
            <ProductForm 
              onSuccess={onSave}
              initialData={{
                ...product,
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Code</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{product.productCode}</TableCell>
                    <TableCell>{product.productName}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(product, idx)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
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
