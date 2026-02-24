'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function ReportsDateForm({ from, to }: { from: string; to: string }) {
  const router = useRouter()
  const [f, setF] = useState(from)
  const [t, setT] = useState(to)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    router.push(`/dashboard/reports?from=${f}&to=${t}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end mb-6">
      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1">Desde</label>
        <input
          type="date"
          value={f}
          onChange={(e) => setF(e.target.value)}
          className="px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1">Hasta</label>
        <input
          type="date"
          value={t}
          onChange={(e) => setT(e.target.value)}
          className="px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
        />
      </div>
      <button
        type="submit"
        className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors"
      >
        Filtrar
      </button>
    </form>
  )
}
