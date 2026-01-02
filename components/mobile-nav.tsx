"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Building2, Package, FileText, ReceiptText } from "lucide-react"

const navItems = [
  { href: "/transactions", label: "Transactions", icon: FileText },
  { href: "/invoice", label: "Invoice", icon: ReceiptText },
  { href: "/product", label: "Product", icon: Package },
  { href: "/company", label: "Company", icon: Building2 },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border md:hidden flex justify-around">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center py-3 px-2 text-xs transition-colors ${
              isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-5 h-5 mb-1" />
            <span className="text-xs">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
