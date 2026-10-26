"use client";

import type { ReactNode } from "react";

/**
 * The autocomplete dropdown shared by the transaction and invoice forms.
 * Both previously inlined this markup (seven copies in total) with hardcoded
 * light-mode colours, which is why the panels went unreadable in dark mode.
 */
export function SuggestionList<T>({
  items,
  getKey,
  onSelect,
  renderItem,
}: {
  items: T[];
  getKey: (item: T, index: number) => string;
  onSelect: (item: T) => void;
  renderItem: (item: T) => ReactNode;
}) {
  if (items.length === 0) return null;

  return (
    <div
      role="listbox"
      className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md"
    >
      {items.map((item, index) => (
        <button
          type="button"
          role="option"
          aria-selected={false}
          key={getKey(item, index)}
          onClick={() => onSelect(item)}
          className="block w-full border-0 bg-transparent px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
        >
          {renderItem(item)}
        </button>
      ))}
    </div>
  );
}
