"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { Button } from "@/components/ui/button";

const SIDEBAR_STORAGE_KEY = "omkar:sidebar-open";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Read after mount: the server cannot know the stored choice, and reading
  // during render would make the markup disagree with the client.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (stored !== null) setSidebarOpen(stored === "true");
    } catch {
      // Private browsing or blocked storage: keep the default.
    }
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen((open) => {
      const next = !open;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        // Not being able to remember the choice should not break toggling.
      }
      // Keep the pre-paint attribute in step, or the CSS fallback would fight
      // the React state after the first toggle.
      if (next) {
        document.documentElement.removeAttribute("data-sidebar");
      } else {
        document.documentElement.setAttribute("data-sidebar", "closed");
      }
      return next;
    });
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar open={sidebarOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-border bg-card px-2 py-2 md:py-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden shrink-0 md:inline-flex"
            aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            aria-expanded={sidebarOpen}
            onClick={toggleSidebar}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelLeftOpen className="h-5 w-5" />
            )}
          </Button>
          {/* The sidebar is hidden on small screens, so this carries the brand. */}
          <span className="px-2 text-base font-semibold text-foreground md:hidden">
            Omkar Marketing
          </span>
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
