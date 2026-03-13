import { notFound } from 'next/navigation'
import { Scissors, Ruler, CalendarDays, TrendingUp } from 'lucide-react'
import { getPublicClientProfile } from '@/lib/actions/public-clients'
import { formatDateShort } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const profile = await getPublicClientProfile(token)
  if (!profile) notFound()

  const { client, hairHistory, visits } = profile

  // Construir mapa receipt_id → largo para vincular medición a visita
  const hairByReceipt = new Map<string, number>()
  for (const h of hairHistory) {
    if (h.receipt_id) hairByReceipt.set(h.receipt_id, h.length_cm)
  }

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-sm space-y-4">

        {/* Header */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="text-center pt-8 pb-5 px-6 border-b border-dashed border-zinc-200">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Scissors size={18} className="text-[#A68776]" />
              <span className="text-2xl font-black tracking-tight text-[#3D5151]">cafuné</span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
              Espacio de cuidado personal
            </p>
          </div>

          <div className="px-6 py-6 text-center">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl font-black text-rose-400">
                {client.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <h1 className="text-xl font-black text-[#3D5151]">{client.full_name}</h1>
            {client.phone && (
              <p className="text-sm text-zinc-400 mt-1">{client.phone}</p>
            )}

            {/* Stats */}
            <div className="flex justify-center gap-6 mt-5">
              {client.hair_length_cm && (
                <div className="text-center">
                  <p className="text-lg font-black text-[#3D5151]">{client.hair_length_cm} cm</p>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Largo actual</p>
                </div>
              )}
              {visits.length > 0 && (
                <div className="text-center">
                  <p className="text-lg font-black text-[#3D5151]">{visits.length}</p>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider">
                    {visits.length === 1 ? 'Visita' : 'Visitas'}
                  </p>
                </div>
              )}
              {hairHistory.length > 1 && (
                <div className="text-center">
                  <p className="text-lg font-black text-[#3D5151]">
                    {hairHistory[0].length_cm - hairHistory[hairHistory.length - 1].length_cm > 0
                      ? `+${hairHistory[0].length_cm - hairHistory[hairHistory.length - 1].length_cm}`
                      : hairHistory[0].length_cm - hairHistory[hairHistory.length - 1].length_cm
                    } cm
                  </p>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Crecimiento</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Historial de largo */}
        {hairHistory.length > 0 && (
          <div className="bg-white rounded-3xl shadow-xl px-6 py-5">
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
                      <div className="flex items-center gap-1.5 flex-wrap">
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

        {/* Historial de visitas con servicios */}
        {visits.length > 0 && (
          <div className="bg-white rounded-3xl shadow-xl px-6 py-5">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays size={15} className="text-[#76A6A5]" />
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
                Historial de visitas
              </p>
            </div>
            <div className="space-y-4">
              {visits.map((v) => {
                const services = v.receipt_services as Array<{
                  variant_name: string | null
                  service_catalog: { name: string } | null
                }>
                const hairThisVisit = hairByReceipt.get(v.id)
                return (
                  <div key={v.id} className="border-l-2 border-zinc-100 pl-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold text-zinc-400">
                        {formatDateShort(v.issued_at)}
                      </p>
                      {hairThisVisit && (
                        <div className="flex items-center gap-1 text-[10px] text-[#76A6A5] font-medium">
                          <Ruler size={10} />
                          {hairThisVisit} cm
                        </div>
                      )}
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

        {visits.length === 0 && hairHistory.length === 0 && (
          <div className="bg-white rounded-3xl shadow-xl px-6 py-10 text-center">
            <Scissors size={32} className="text-zinc-200 mx-auto mb-3" strokeWidth={1} />
            <p className="text-sm text-zinc-400">Aún no hay historial registrado.</p>
          </div>
        )}

        <p className="text-center text-[10px] text-zinc-400 pb-4">
          cafuné · espacio de cuidado personal
        </p>
      </div>
    </div>
  )
}
