import React from 'react'
import { Badge } from "@/components/ui/badge"

export default function StatusBadge({ status }) {
  const config = {
    idle:    { label: "Ready",        className: "bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800" },
    loading: { label: "Processing…",  className: "bg-amber-950 text-amber-300 border-amber-900 hover:bg-amber-900/80 animate-pulse" },
    success: { label: "Done",         className: "bg-green-950 text-green-300 border-green-900 hover:bg-green-900/80" },
    error:   { label: "Failed",       className: "bg-red-950 text-red-300 border-red-900 hover:bg-red-900/80" },
  }

  const current = config[status] || config.idle;

  return (
    <Badge variant="outline" className={`px-2.5 py-0.5 font-medium rounded-full border transition-colors duration-150 ${current.className}`}>
      {current.label}
    </Badge>
  )
}
