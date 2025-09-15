"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FilePlus, FileText, Download, Package, Building2 } from "lucide-react";

const items = [
  { href: "/entry", label: "New Entry", Icon: FilePlus },
  { href: "/invoices", label: "Invoices", Icon: FileText },
  { href: "/export", label: "Export", Icon: Download },
  { href: "/products", label: "Products", Icon: Package },
  { href: "/companies", label: "Companies", Icon: Building2 },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white">
      <ul className="mx-auto flex max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl 2xl:max-w-3xl items-stretch justify-between px-4 md:px-6 py-2">
        {items.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <li key={href} className="w-1/4">
              <Link
                href={href}
                className={[
                  "flex flex-col items-center justify-center gap-1 rounded-lg py-2 text-xs md:text-sm",
                  active ? "text-indigo-600" : "text-gray-700",
                ].join(" ")}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={
                    active
                      ? "h-5 w-5 md:h-6 md:w-6 text-indigo-600"
                      : "h-5 w-5 md:h-6 md:w-6 text-gray-700"
                  }
                  aria-hidden="true"
                />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
