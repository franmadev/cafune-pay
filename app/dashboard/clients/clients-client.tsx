'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Search, UserRound, Scissors, ExternalLink, Ruler, CalendarDays, ChevronRight } from 'lucide-react'
import { getClientsWithStats } from '@/lib/actions/clients'

type Client = Awaited<ReturnType<typeof getClientsWithStats>>[number]

interface Props {
  initialClients: Client[]
}

export function ClientsClient({ initialClients }: Props) {
  const [clients, setClients]   = useState(initialClients)
  const [query, setQuery]       = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSearch = (value: string) => {
    setQuery(value)
    startTransition(async () => {
      const { getClientsWithStats } = await import('@/lib/actions/clients')
      const results = await getClientsWithStats(value)
      setClients(results)
    })
  }

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-3xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-terra-400 mb-1">Dashboard</p>
        <h1 className="text-2xl md:text-3xl font-black text-[#3D5151]">Clientas</h1>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Buscar por nombre, teléfono o RUT…"
          className="w-full pl-9 pr-4 py-3 bg-white border-2 border-zinc-100 rounded-2xl text-sm text-zinc-700 placeholder-zinc-400 focus:outline-none focus:border-[#76A6A5] transition-colors"
        />
        {isPending && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-zinc-300 border-t-[#76A6A5] rounded-full animate-spin" />
        )}
      </div>

      {/* List */}
      {clients.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-zinc-100 px-6 py-12 text-center">
          <Scissors size={32} className="text-zinc-200 mx-auto mb-3" strokeWidth={1} />
          <p className="text-sm text-zinc-400">
            {query ? 'No se encontraron clientas.' : 'Aún no hay clientas registradas.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map(client => (
            <ClientCard key={client.id} client={client} />
          ))}
          <p className="text-center text-[11px] text-zinc-400 pt-2">
            {clients.length} {clients.length === 1 ? 'clienta' : 'clientas'}
          </p>
        </div>
      )}
    </div>
  )
}

function ClientCard({ client }: { client: Client }) {
  const initials = client.full_name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()

  return (
    <div className="bg-white border-2 border-zinc-100 rounded-2xl px-4 py-4 flex items-center gap-4 hover:border-[#76A6A5]/40 transition-colors">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-black text-rose-400">{initials}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#3D5151] truncate">{client.full_name}</p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {client.phone && (
            <span className="text-[11px] text-zinc-400">{client.phone}</span>
          )}
          {client.rut && (
            <span className="text-[11px] text-zinc-400">{client.rut}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          {client.hair_length_cm != null && (
            <div className="flex items-center gap-1 text-[11px] text-[#76A6A5] font-medium">
              <Ruler size={11} />
              {client.hair_length_cm} cm
            </div>
          )}
          {client.visit_count > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-zinc-400">
              <CalendarDays size={11} />
              {client.visit_count} {client.visit_count === 1 ? 'visita' : 'visitas'}
            </div>
          )}
          {client.visit_count === 0 && client.hair_length_cm == null && (
            <span className="text-[11px] text-zinc-300">Sin historial</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {client.public_token && (
          <Link
            href={`/c/${client.public_token}`}
            target="_blank"
            title="Ver perfil público"
            className="p-2 rounded-xl text-zinc-400 hover:bg-[#F2F7F7] hover:text-[#76A6A5] transition-colors"
          >
            <ExternalLink size={16} />
          </Link>
        )}
        <Link
          href={`/dashboard/clients/${client.id}`}
          className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-50 hover:text-[#3D5151] transition-colors"
        >
          <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  )
}
