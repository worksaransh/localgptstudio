import * as React from "react"
import { cn } from "@/lib/utils"

export function Select({ value, onValueChange, children, placeholder }: { value?: string; onValueChange?: (v: string) => void; children: React.ReactNode; placeholder?: string }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {children}
      </select>
    </div>
  )
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return <option value={value}>{children}</option>
}
