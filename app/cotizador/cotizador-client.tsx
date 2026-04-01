'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  MessageCircle,
  RotateCcw,
} from 'lucide-react'

type HairLength = 'corto' | 'medio' | 'largo' | 'extralargo'

type Service = {
  id: string
  name: string
  description: string
  duration: string
  prices: Record<HairLength, number>
}

const agendaUrl = 'https://AGENDA_CAFUNE_AQUI'
const whatsappUrl =
  'https://wa.me/56900000000?text=Hola%20Cafun%C3%A9,%20quiero%20consultar%20por%20una%20hora%20o%20servicio.'

const services: Service[] = [
  {
    id: 'balayage',
    name: 'Balayage',
    description:
      'Iluminación personalizada con degradado suave y diagnóstico previo. Ideal para dar profundidad y movimiento al color.',
    duration: 'Desde 3 h',
    prices: { corto: 95000, medio: 125000, largo: 160000, extralargo: 190000 },
  },
  {
    id: 'color-global',
    name: 'Color global',
    description:
      'Aplicación pareja de color con elección de tono según tu objetivo y tipo de mantenimiento deseado.',
    duration: 'Desde 2 h',
    prices: { corto: 45000, medio: 55000, largo: 68000, extralargo: 79000 },
  },
  {
    id: 'botox-capilar',
    name: 'Botox capilar',
    description:
      'Tratamiento de nutrición y brillo profundo para controlar el frizz y mejorar la textura del cabello.',
    duration: 'Desde 2 h',
    prices: { corto: 35000, medio: 48000, largo: 62000, extralargo: 76000 },
  },
  {
    id: 'alisado',
    name: 'Alisado',
    description:
      'Servicio de reducción de volumen y control del frizz. Técnica y duración según evaluación en salón.',
    duration: 'Desde 3 h',
    prices: { corto: 70000, medio: 90000, largo: 120000, extralargo: 145000 },
  },
]

const hairLengths: { value: HairLength; label: string; hint: string }[] = [
  { value: 'corto', label: 'Corto', hint: 'Sobre oreja o mandíbula' },
  { value: 'medio', label: 'Medio', hint: 'Hasta los hombros' },
  { value: 'largo', label: 'Largo', hint: 'Bajo los hombros' },
  { value: 'extralargo', label: 'Extra largo', hint: 'Mitad de espalda o más' },
]

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(price)
}

function ProgressDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Paso ${current} de 3`}>
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className={`h-2 rounded-full transition-all duration-500 ${
            n <= current ? 'w-7 bg-rose-900' : 'w-2 bg-rose-200'
          }`}
        />
      ))}
    </div>
  )
}

export function CotizadorClient() {
  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedLength, setSelectedLength] = useState<HairLength | null>(null)

  const estimatedPrice =
    selectedService && selectedLength ? selectedService.prices[selectedLength] : null
  const lengthLabel = hairLengths.find((l) => l.value === selectedLength)?.label ?? ''

  function advance(service?: Service, length?: HairLength) {
    if (service) setSelectedService(service)
    if (length) setSelectedLength(length)
    setStep((s) => s + 1)
  }

  function goBack() {
    setStep((s) => s - 1)
  }

  function reset() {
    setStep(1)
    setSelectedService(null)
    setSelectedLength(null)
  }

  return (
    <div className="min-h-screen bg-[--color-background] text-rose-900">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-rose-100/50 bg-[--color-background]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-xl items-center justify-between px-5">
          <Link
            href="/"
            className="font-display text-xl font-medium tracking-tight text-rose-900"
          >
            Cafuné
          </Link>
          <ProgressDots current={step} />
        </div>
      </nav>

      {/* ── Content ── */}
      <div className="mx-auto max-w-xl px-5 py-14 sm:py-20">

        {/* Step label */}
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-terra-600">
          Paso {step} de 3
        </p>

        {/* Animated step container — key forces remount → animation replays */}
        <div key={step} className="animate-step">

          {/* ── PASO 1: Seleccionar servicio ── */}
          {step === 1 && (
            <div>
              <h1
                className="font-display mb-10 font-light leading-[0.92] text-rose-900"
                style={{ fontSize: 'clamp(2.4rem, 7vw, 4.5rem)' }}
              >
                ¿Qué servicio<br />te interesa?
              </h1>

              <div className="space-y-3">
                {services.map((service) => {
                  const active = selectedService?.id === service.id
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => setSelectedService(service)}
                      className={`group w-full rounded-[1.5rem] border p-5 text-left transition ${
                        active
                          ? 'border-rose-900 bg-rose-900 text-white shadow-lg shadow-rose-900/20'
                          : 'border-rose-100 bg-white text-rose-900 hover:border-rose-300 hover:shadow-[0_8px_24px_rgba(61,81,81,0.08)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-display text-xl font-medium">{service.name}</p>
                          <p
                            className={`mt-1 text-sm leading-6 ${
                              active ? 'text-white/75' : 'text-rose-800/70'
                            }`}
                          >
                            {service.description}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-xl px-3 py-1 text-xs ${
                              active ? 'bg-white/15 text-white' : 'bg-terra-50 text-terra-700'
                            }`}
                          >
                            <Clock3 className="h-3 w-3" />
                            {service.duration}
                          </span>
                          {active && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white">
                              <Check className="h-3 w-3 text-rose-900" />
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                disabled={!selectedService}
                onClick={() => advance()}
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-rose-900 py-4 text-sm font-medium text-white shadow-md shadow-rose-900/20 transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continuar
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ── PASO 2: Largo de cabello ── */}
          {step === 2 && selectedService && (
            <div>
              <button
                type="button"
                onClick={goBack}
                className="mb-8 inline-flex items-center gap-1.5 text-sm text-rose-700/65 transition hover:text-rose-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Cambiar servicio
              </button>

              {/* Servicio seleccionado */}
              <div className="mb-8 rounded-2xl border border-rose-100 bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-terra-600">
                  Servicio seleccionado
                </p>
                <p className="font-display mt-2 text-2xl font-medium text-rose-900">
                  {selectedService.name}
                </p>
                <p className="mt-1 text-sm leading-6 text-rose-800/70">
                  {selectedService.description}
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-700/60">
                  <Clock3 className="h-3.5 w-3.5" />
                  {selectedService.duration}
                </p>
              </div>

              <h2
                className="font-display mb-8 font-light leading-[0.92] text-rose-900"
                style={{ fontSize: 'clamp(2.2rem, 6vw, 4rem)' }}
              >
                ¿Cuál es el largo<br />de tu cabello?
              </h2>

              <div className="grid grid-cols-2 gap-3">
                {hairLengths.map((length) => {
                  const active = selectedLength === length.value
                  return (
                    <button
                      key={length.value}
                      type="button"
                      onClick={() => setSelectedLength(length.value)}
                      className={`rounded-[1.5rem] border p-5 text-left transition ${
                        active
                          ? 'border-terra-600 bg-terra-600 text-white shadow-md shadow-terra-600/20'
                          : 'border-rose-100 bg-white text-rose-900 hover:border-rose-300 hover:shadow-[0_6px_20px_rgba(61,81,81,0.07)]'
                      }`}
                    >
                      <p className="font-display text-xl font-medium">{length.label}</p>
                      <p
                        className={`mt-1 text-sm ${
                          active ? 'text-white/75' : 'text-rose-800/70'
                        }`}
                      >
                        {length.hint}
                      </p>
                      {active && (
                        <div className="mt-3 flex h-5 w-5 items-center justify-center rounded-full bg-white">
                          <Check className="h-3 w-3 text-terra-600" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                disabled={!selectedLength}
                onClick={() => advance()}
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-rose-900 py-4 text-sm font-medium text-white shadow-md shadow-rose-900/20 transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Ver precio estimado
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ── PASO 3: Resultado ── */}
          {step === 3 && selectedService && selectedLength && estimatedPrice !== null && (
            <div>
              <button
                type="button"
                onClick={goBack}
                className="mb-8 inline-flex items-center gap-1.5 text-sm text-rose-700/65 transition hover:text-rose-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Cambiar largo
              </button>

              <h2
                className="font-display mb-8 font-light leading-[0.92] text-rose-900"
                style={{ fontSize: 'clamp(2.2rem, 6vw, 3.8rem)' }}
              >
                Tu precio<br />estimado
              </h2>

              {/* Resultado principal */}
              <div className="overflow-hidden rounded-[2rem] bg-rose-900 p-8 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-rose-200/70">
                  {selectedService.name} · Cabello {lengthLabel}
                </p>
                <p
                  className="font-display mt-5 font-light leading-none text-white"
                  style={{ fontSize: 'clamp(3.5rem, 14vw, 7.5rem)' }}
                >
                  {formatPrice(estimatedPrice)}
                </p>
                <p className="mt-3 text-sm text-rose-200/60">
                  {selectedService.duration}
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={agendaUrl}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-medium text-rose-900 transition hover:bg-rose-50"
                  >
                    <CalendarDays className="h-4 w-4" />
                    Agendar hora
                  </Link>
                  <Link
                    href={whatsappUrl}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/25 py-3.5 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Consultar por WhatsApp
                  </Link>
                </div>
              </div>

              {/* Advertencia */}
              <div className="mt-5 rounded-[1.5rem] border border-terra-200/60 bg-terra-50 p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-terra-600" />
                  <div>
                    <p className="text-sm font-semibold text-terra-800">Valor referencial</p>
                    <p className="mt-2 text-sm leading-[1.75] text-terra-700">
                      Este precio es una estimación basada en el largo de tu cabello. El valor
                      final puede variar según el estado real de tu cabello, la densidad, el
                      historial de tratamientos y el diagnóstico que realizamos directamente en el
                      salón antes de comenzar cualquier servicio.
                    </p>
                    <p className="mt-2 text-sm font-medium text-terra-800">
                      La evaluación definitiva siempre se realiza en el salón.
                    </p>
                  </div>
                </div>
              </div>

              {/* Repetir */}
              <button
                type="button"
                onClick={reset}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-rose-200 bg-white py-3.5 text-sm font-medium text-rose-800 transition hover:border-rose-300 hover:bg-rose-50"
              >
                <RotateCcw className="h-4 w-4" />
                Calcular otro servicio
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
