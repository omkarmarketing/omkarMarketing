"use client";

import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* The sidebar is hidden on small screens, so this carries the brand
            and the theme control there instead. */}
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-2 md:hidden">
          <span className="text-base font-semibold text-foreground">
            Omkar Marketing
          </span>
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-auto">
          {/* pb-28 keeps the last control clear of the fixed bottom nav. */}
          <div className="mx-auto w-full max-w-7xl p-4 pb-28 md:p-8">
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
