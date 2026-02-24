'use client'

import { Search, X } from 'lucide-react'

interface Props {
  value:       string
  onChange:    (v: string) => void
  placeholder?: string
  className?:  string
}

export function SearchInput({ value, onChange, placeholder = 'Buscar…', className = '' }: Props) {
  return (
    <div className={`relative ${className}`}>
      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        suppressHydrationWarning
        className="w-full pl-9 pr-9 py-2.5 rounded-xl border-2 border-zinc-200 bg-white text-sm focus:outline-none focus:border-rose-400 transition-colors"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          <X size={15} />
        </button>
      )}
    </div>
  )
}
