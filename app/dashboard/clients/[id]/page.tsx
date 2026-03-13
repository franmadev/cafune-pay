import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Ruler, CalendarDays, TrendingUp, ExternalLink, Scissors } from 'lucide-react'
import { getMyProfile } from '@/lib/actions/auth'
import { getClientHairHistory } from '@/lib/actions/clients'
import { createClient } from '@/lib/supabase/server'
import { formatDateShort, formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  const { id } = await params
  const supabase = await createClient()

  const [{ data: client }, hairHistory, { data: visits }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, full_name, phone, rut, hair_length_cm, public_token, created_at')
      .eq('id', id)
      .single(),
    getClientHairHistory(id),
    supabase
      .from('receipts')
      .select(`
        id, issued_at, total_amount,
        receipt_services (
          variant_name,
          service_catalog ( name )
        )
      `)
      .eq('client_id', id)
      .eq('status', 'completed')
      .order('issued_at', { ascending: false })
      .limit(30),
  ])

  if (!client) notFound()

  const totalSpent = (visits ?? []).reduce((s, r) => s + r.total_amount, 0)

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-2xl mx-auto">

      {/* Back */}
      <Link
        href="/dashboard/clients"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-[#3D5151] mb-6 transition-colors"
      >
        <ArrowLeft size={14} />
        Clientas
      </Link>

      {/* Header card */}
      <div className="bg-white border-2 border-zinc-100 rounded-3xl px-6 py-6 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-black text-rose-400">
                {client.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-black text-[#3D5151]">{client.full_name}</h1>
              {client.phone && <p className="text-sm text-zinc-400 mt-0.5">{client.phone}</p>}
              {client.rut   && <p className="text-xs text-zinc-400">{client.rut}</p>}
            </div>
          </div>
          {client.public_token && (
            <Link
              href={`/c/${client.public_token}`}
              target="_blank"
              title="Ver perfil público"
              className="flex items-center gap-1.5 text-xs text-[#76A6A5] font-bold px-3 py-2 bg-[#F2F7F7] rounded-xl hover:bg-[#E8F0F0] transition-colors flex-shrink-0"
            >
              <ExternalLink size={13} />
              Perfil
            </Link>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-6 mt-5 pt-5 border-t border-dashed border-zinc-100">
          {client.hair_length_cm != null && (
            <div className="text-center">
              <p className="text-lg font-black text-[#3D5151]">{client.hair_length_cm} cm</p>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Largo actual</p>
            </div>
          )}
          <div className="text-center">
            <p className="text-lg font-black text-[#3D5151]">{visits?.length ?? 0}</p>
            <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Visitas</p>
          </div>
          {totalSpent > 0 && (
            <div className="text-center">
              <p className="text-lg font-black text-[#3D5151]">{formatCurrency(totalSpent)}</p>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Total</p>
            </div>
          )}
        </div>
      </div>

      {/* Hair history */}
      {hairHistory.length > 0 && (
        <div className="bg-white border-2 border-zinc-100 rounded-3xl px-6 py-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} className="text-[#76A6A5]" />
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
              Historial de largo
            </p>
          </div>
          <div className="space-y-3">
            {hairHistory.map((h, i) => (
              <div key={h.id} className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${
                    i === 0 ? 'bg-[#76A6A5]' : 'bg-zinc-200'
                  }`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-zinc-400">{formatDateShort(h.recorded_at)}</span>
                      {i === 0 && (
                        <span className="text-[10px] bg-[#F2F7F7] text-[#76A6A5] font-bold px-1.5 py-0.5 rounded-full">
                          actual
                        </span>
                      )}
                    </div>
                    {h.service_name && (
                      <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                        {h.service_name}
                        {h.variant_name && (
                          <span className="text-zinc-400"> · {h.variant_name}</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {i < hairHistory.length - 1 && (
                    <span className={`text-[10px] font-medium ${
                      h.length_cm > hairHistory[i + 1].length_cm
                        ? 'text-emerald-500'
                        : h.length_cm < hairHistory[i + 1].length_cm
                        ? 'text-rose-400'
                        : 'text-zinc-300'
                    }`}>
                      {h.length_cm > hairHistory[i + 1].length_cm
                        ? `+${h.length_cm - hairHistory[i + 1].length_cm}`
                        : h.length_cm < hairHistory[i + 1].length_cm
                        ? `${h.length_cm - hairHistory[i + 1].length_cm}`
                        : '='
                      } cm
                    </span>
                  )}
                  <span className={`text-sm tabular-nums font-bold ${
                    i === 0 ? 'text-[#3D5151]' : 'text-zinc-400'
                  }`}>
                    {h.length_cm} cm
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visit history */}
      {visits && visits.length > 0 && (
        <div className="bg-white border-2 border-zinc-100 rounded-3xl px-6 py-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={15} className="text-[#76A6A5]" />
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
              Historial de visitas
            </p>
          </div>
          <div className="space-y-4">
            {visits.map(v => {
              const services = v.receipt_services as Array<{
                variant_name: string | null
                service_catalog: { name: string } | null
              }>
              return (
                <div key={v.id} className="border-l-2 border-zinc-100 pl-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-zinc-400">
                      {formatDateShort(v.issued_at)}
                    </p>
                    <p className="text-[11px] font-bold text-[#3D5151]">
                      {formatCurrency(v.total_amount)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    {services.map((s, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-zinc-300 flex-shrink-0" />
                        <p className="text-sm text-[#3D5151]">
                          {s.service_catalog?.name ?? 'Servicio'}
                          {s.variant_name && (
                            <span className="text-zinc-400 font-normal"> · {s.variant_name}</span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {visits?.length === 0 && hairHistory.length === 0 && (
        <div className="bg-white border-2 border-zinc-100 rounded-3xl px-6 py-10 text-center">
          <Scissors size={32} className="text-zinc-200 mx-auto mb-3" strokeWidth={1} />
          <p className="text-sm text-zinc-400">Aún no hay historial registrado.</p>
        </div>
      )}
    </div>
  )
}
