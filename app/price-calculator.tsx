'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, Scissors } from 'lucide-react'

export type HairLength = 'corto' | 'medio' | 'largo' | 'extralargo'

export type PublicService = {
  id: string
  name: string
  description: string
  duration: string
  prices: Record<HairLength, number>
}

type PriceCalculatorProps = {
  services: PublicService[]
  agendaUrl: string
  whatsappUrl: string
}

const hairLengths: { value: HairLength; label: string; hint: string }[] = [
  { value: 'corto', label: 'Corto', hint: 'Sobre oreja o mandíbula' },
  { value: 'medio', label: 'Medio', hint: 'Hasta hombros' },
  { value: 'largo', label: 'Largo', hint: 'Bajo hombros' },
  { value: 'extralargo', label: 'Extra largo', hint: 'Mitad de espalda o más' },
]

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(price)
}

export function PriceCalculator({
  services,
  agendaUrl,
  whatsappUrl,
}: PriceCalculatorProps) {
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id ?? '')
  const [selectedLength, setSelectedLength] = useState<HairLength>('medio')

  const selectedService = services.find((service) => service.id === selectedServiceId) ?? services[0]
  const estimatedPrice = selectedService?.prices[selectedLength] ?? 0

  return (
    <div className="rounded-[2rem] border border-rose-100 bg-white p-6 shadow-[0_20px_60px_rgba(61,81,81,0.08)]">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-rose-50 p-3 text-rose-700">
          <Scissors className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-terra-600">Cotizador</p>
          <h3 className="text-2xl font-semibold">Calcula tu valor estimado</h3>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-rose-800">1. Elige tu servicio</label>
          <div className="grid gap-3">
            {services.map((service) => {
              const isSelected = service.id === selectedService?.id
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => setSelectedServiceId(service.id)}
                  className={`rounded-3xl border px-4 py-4 text-left transition ${
                    isSelected
                      ? 'border-rose-900 bg-rose-900 text-white'
                      : 'border-rose-100 bg-white text-rose-900 hover:border-rose-300 hover:bg-rose-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">{service.name}</p>
                      <p className={`mt-1 text-sm ${isSelected ? 'text-white/80' : 'text-rose-700'}`}>
                        {service.description}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        isSelected ? 'bg-white/15 text-white' : 'bg-terra-50 text-terra-700'
                      }`}
                    >
                      {service.duration}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-rose-800">2. Indica el largo de tu cabello</label>
          <div className="grid gap-3 sm:grid-cols-2">
            {hairLengths.map((length) => {
              const isSelected = selectedLength === length.value
              return (
                <button
                  key={length.value}
                  type="button"
                  onClick={() => setSelectedLength(length.value)}
                  className={`rounded-3xl border px-4 py-4 text-left transition ${
                    isSelected
                      ? 'border-terra-600 bg-terra-600 text-white'
                      : 'border-terra-100 bg-terra-50/60 text-rose-900 hover:border-terra-300'
                  }`}
                >
                  <p className="font-semibold">{length.label}</p>
                  <p className={`mt-1 text-sm ${isSelected ? 'text-white/80' : 'text-rose-700'}`}>
                    {length.hint}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-[2rem] bg-[linear-gradient(135deg,#3d5151,#76a6a5)] p-6 text-white">
          <p className="text-sm uppercase tracking-[0.35em] text-white/70">3. Resultado estimado</p>
          <h4 className="mt-2 text-3xl font-semibold">{formatPrice(estimatedPrice)}</h4>
          <p className="mt-3 max-w-xl text-sm leading-7 text-white/80">
            Valor aproximado para {selectedService?.name.toLowerCase()} en cabello {selectedLength}.
            La evaluación final se realiza en el salón y puede ajustar técnica, tiempos o precio.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={agendaUrl}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-rose-900 transition hover:bg-rose-50"
            >
              Agendar con este servicio
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={whatsappUrl}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Consultar por WhatsApp
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
