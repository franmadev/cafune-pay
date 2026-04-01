import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Instagram,
  MapPin,
  MessageCircle,
  Phone,
  ShoppingBag,
  Star,
} from 'lucide-react'
import { getSession } from '@/lib/actions/auth'

const agendaUrl = 'https://AGENDA_CAFUNE_AQUI'
const instagramUrl = 'https://instagram.com/INSTAGRAM_CAFUNE'
const whatsappUrl =
  'https://wa.me/56900000000?text=Hola%20Cafun%C3%A9,%20quiero%20consultar%20por%20una%20hora%20o%20servicio.'

const branches = [
  {
    name: 'El Milagro',
    address: 'Dirección pendiente de confirmar',
    mapsUrl: 'https://maps.google.com/?q=El+Milagro+La+Serena',
    phoneLabel: '+56 9 0000 0001',
    phoneHref: 'tel:+56900000001',
    schedule: 'Lunes a sábado, 10:00 a 19:00',
  },
  {
    name: 'Las Compañías',
    address: 'Dirección pendiente de confirmar',
    mapsUrl: 'https://maps.google.com/?q=Las+Companias+La+Serena',
    phoneLabel: '+56 9 0000 0002',
    phoneHref: 'tel:+56900000002',
    schedule: 'Lunes a sábado, 10:00 a 19:00',
  },
] as const

const services = [
  {
    id: 'balayage',
    name: 'Balayage',
    description: 'Iluminación personalizada con degradado suave y diagnóstico previo.',
    duration: 'Desde 3 h',
    imgSeed: 'cafune-s1',
  },
  {
    id: 'color-global',
    name: 'Color global',
    description: 'Aplicación pareja de color con elección de tono según objetivo.',
    duration: 'Desde 2 h',
    imgSeed: 'cafune-s2',
  },
  {
    id: 'botox-capilar',
    name: 'Botox capilar',
    description: 'Nutrición y brillo profundo para controlar el frizz y mejorar la textura.',
    duration: 'Desde 2 h',
    imgSeed: 'cafune-s3',
  },
  {
    id: 'alisado',
    name: 'Alisado',
    description: 'Reducción de volumen y control del frizz según evaluación en salón.',
    duration: 'Desde 3 h',
    imgSeed: 'cafune-s4',
  },
] as const

const products = [
  {
    name: 'Shampoo profesional',
    category: 'Limpieza',
    description: 'Limpieza suave para uso frecuente y mantenimiento de color.',
  },
  {
    name: 'Máscara nutritiva',
    category: 'Tratamiento',
    description: 'Nutrición intensiva para cabellos sensibilizados o decolorados.',
  },
  {
    name: 'Protector térmico',
    category: 'Styling',
    description: 'Protección antes de secado, brushing o herramientas de calor.',
  },
  {
    name: 'Aceite reparador',
    category: 'Finalización',
    description: 'Brillo, sellado de puntas y control de frizz.',
  },
] as const

const testimonials = [
  {
    quote: 'La asesoría fue clara desde el inicio y el resultado quedó incluso mejor de lo que esperaba.',
    author: 'Camila R.',
  },
  {
    quote: 'Me ayudaron a elegir el servicio correcto según mi pelo y el presupuesto estimado fue muy cercano.',
    author: 'Fernanda M.',
  },
  {
    quote: 'El salón se siente cuidado en cada detalle y el equipo explica muy bien cada paso.',
    author: 'Valentina P.',
  },
] as const

const CIRCULAR_TEXT = 'ESPACIO CAFUNÉ · LA SERENA · ESPACIO CAFUNÉ · LA SERENA · '

export const metadata: Metadata = {
  title: 'Cafuné | Peluquería en La Serena',
  description:
    'Espacio Cafuné — peluquería en La Serena. Servicios de color, cuidado y forma en El Milagro y Las Compañías. Agenda tu hora online.',
}

export default async function Home() {
  const user = await getSession()
  const adminHref = user ? '/dashboard' : '/login'
  const adminLabel = user ? 'Dashboard' : 'Acceso equipo'

  return (
    <main className="min-h-screen overflow-x-hidden bg-terra-50 text-terra-900">

      {/* ─────────────── NAV ─────────────── */}
      <nav className="sticky top-0 z-50 border-b border-terra-100 bg-terra-50/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link
            href="/"
            className="font-display text-2xl font-semibold tracking-tight text-terra-900"
          >
            Cafuné.
          </Link>
          <div className="hidden items-center gap-8 text-[13px] text-terra-700 md:flex">
            <a href="#servicios" className="transition hover:text-terra-900">Servicios</a>
            <a href="#productos" className="transition hover:text-terra-900">Productos</a>
            <Link href="/cotizador" className="transition hover:text-terra-900">Cotizador</Link>
            <a href="#sucursales" className="transition hover:text-terra-900">Sucursales</a>
          </div>
          {/* Contact right — desktop only */}
          <div className="hidden text-right text-[12px] leading-[1.5] text-terra-600 lg:block">
            <p>El Milagro: <a href="tel:+56900000001" className="hover:text-terra-900">+56 9 0000 0001</a></p>
            <p>Las Compañías: <a href="tel:+56900000002" className="hover:text-terra-900">+56 9 0000 0002</a></p>
          </div>
          {/* Mobile CTA */}
          <Link
            href={agendaUrl}
            className="inline-flex items-center gap-1.5 rounded-full bg-terra-500 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-terra-600 lg:hidden"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Agendar
          </Link>
        </div>
      </nav>

      {/* ─────────────── HERO ─────────────── */}
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 lg:px-10 lg:pt-24">
        <div className="grid items-end gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16">

          {/* Left — Copy */}
          <div className="pb-4">
            <h1
              className="hero-title font-display font-semibold leading-[0.88] tracking-tight text-terra-900"
              style={{ fontSize: 'clamp(3.8rem, 10vw, 8.5rem)' }}
            >
              Belleza,<br />
              cuidado<br />
              y color.
            </h1>

            <div className="hero-actions mt-10 flex flex-wrap items-center gap-4">
              <Link
                href={agendaUrl}
                className="inline-flex items-center gap-2 rounded-full bg-terra-500 px-7 py-3.5 text-sm font-medium text-white shadow-lg shadow-terra-500/25 transition hover:bg-terra-600 active:scale-[0.97]"
              >
                Agendar hora
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="max-w-xs text-[13px] leading-[1.7] text-terra-700">
                Confort, atención personalizada y un alto nivel de servicio en La Serena.
              </p>
            </div>
          </div>

          {/* Right — Arch image with circular text */}
          <div className="hero-card flex justify-center lg:justify-end">
            <div className="relative flex items-center justify-center">

              {/* Circular rotating text */}
              <svg
                viewBox="0 0 380 380"
                className="animate-spin-slow pointer-events-none absolute"
                style={{ width: 380, height: 380 }}
                aria-hidden
              >
                <defs>
                  <path
                    id="heroCircle"
                    d="M 190 190 m -170 0 a 170 170 0 1 1 340 0 a 170 170 0 1 1 -340 0"
                  />
                </defs>
                <text
                  fontSize="10.5"
                  fill="#8F7060"
                  letterSpacing="4"
                  fontFamily="var(--font-geist-sans)"
                  fillOpacity="0.75"
                >
                  <textPath href="#heroCircle">{CIRCULAR_TEXT}</textPath>
                </text>
              </svg>

              {/* Arch image */}
              <div
                className="arch relative z-10"
                style={{ width: 280, height: 380 }}
              >
                <Image
                  src="https://picsum.photos/seed/cafune-hero/560/760"
                  alt="Espacio Cafuné"
                  fill
                  className="object-cover object-top"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── SERVICIOS ─────────────── */}
      <section id="servicios" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <p className="reveal mb-12 text-center text-[11px] font-semibold uppercase tracking-[0.5em] text-terra-500">
            Servicios de Cafuné
          </p>

          <div className="grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4">
            {services.map((service, i) => (
              <div
                key={service.id}
                className="reveal flex flex-col items-center gap-4 text-center"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                {/* Arch image */}
                <div
                  className="arch w-full bg-terra-100"
                  style={{ aspectRatio: '3/4', maxWidth: 220 }}
                >
                  <div className="relative h-full w-full">
                    <Image
                      src={`https://picsum.photos/seed/${service.imgSeed}/440/590`}
                      alt={service.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="font-display text-lg font-medium text-terra-900">
                    {service.name}
                  </h3>
                  <p className="mt-1 text-[12px] leading-5 text-terra-600">{service.description}</p>
                  <div className="mt-1 flex items-center justify-center gap-1 text-[11px] text-terra-500">
                    <Clock3 className="h-3 w-3" />
                    {service.duration}
                  </div>
                  <Link
                    href="/cotizador"
                    className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-medium text-terra-600 transition hover:text-terra-900"
                  >
                    Consultar precio
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <p className="reveal mt-10 text-center text-[13px] leading-7 text-terra-600">
            La visita al salón incluye siempre un diagnóstico personalizado antes de comenzar cualquier servicio.
          </p>
        </div>
      </section>

      {/* ─────────────── ABOUT / SPLIT ─────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">

          {/* Left — Circular portrait */}
          <div className="reveal flex justify-center">
            <div className="relative flex items-center justify-center">
              {/* Circular rotating text */}
              <svg
                viewBox="0 0 320 320"
                className="animate-spin-slow pointer-events-none absolute"
                style={{ width: 320, height: 320 }}
                aria-hidden
              >
                <defs>
                  <path
                    id="aboutCircle"
                    d="M 160 160 m -145 0 a 145 145 0 1 1 290 0 a 145 145 0 1 1 -290 0"
                  />
                </defs>
                <text
                  fontSize="10.5"
                  fill="#8F7060"
                  letterSpacing="4"
                  fontFamily="var(--font-geist-sans)"
                  fillOpacity="0.75"
                >
                  <textPath href="#aboutCircle">{CIRCULAR_TEXT}</textPath>
                </text>
              </svg>

              {/* Arch image */}
              <div
                className="arch relative z-10"
                style={{ width: 220, height: 300 }}
              >
                <Image
                  src="https://picsum.photos/seed/cafune-about/440/600"
                  alt="Espacio Cafuné"
                  fill
                  className="object-cover object-top"
                />
              </div>
            </div>
          </div>

          {/* Right — Content */}
          <div className="reveal space-y-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.45em] text-terra-500">
              Espacio Cafuné en La Serena
            </p>
            <h2
              className="font-display font-semibold leading-[0.92] text-terra-900"
              style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)' }}
            >
              Un regalo para ti<br />o para quien quieras.
            </h2>
            <div className="space-y-4 text-[15px] leading-[1.8] text-terra-700">
              <p>
                En Cafuné cada persona es única y así tratamos su cabello. Al crear un look, nuestro equipo toma en cuenta la individualidad de cada clienta, el estilo de vida y el objetivo deseado.
              </p>
              <p>
                Nuestras tarjetas de regalo permiten a tus seres queridos acceder a cualquier servicio de nuestro catálogo, con la misma atención personalizada de siempre.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href={agendaUrl}
                className="inline-flex items-center gap-2 rounded-full bg-terra-500 px-7 py-3.5 text-sm font-medium text-white shadow-md shadow-terra-500/20 transition hover:bg-terra-600 active:scale-[0.97]"
              >
                Agendar hora
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={whatsappUrl}
                className="inline-flex items-center gap-2 rounded-full border border-terra-200 bg-white px-7 py-3.5 text-sm font-medium text-terra-800 transition hover:bg-terra-50"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── GALERÍA ─────────────── */}
      <section className="bg-white py-4">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {(['cafune-g1', 'cafune-g2', 'cafune-g3'] as const).map((seed) => (
              <div key={seed} className="reveal aspect-[3/4] arch bg-terra-100">
                <div className="relative h-full w-full">
                  <Image
                    src={`https://picsum.photos/seed/${seed}/400/540`}
                    alt=""
                    fill
                    className="object-cover transition duration-500 hover:scale-[1.04]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── COTIZADOR CTA ─────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10">
        <div className="reveal grid overflow-hidden rounded-[2rem] border border-terra-100 bg-white shadow-[0_16px_56px_rgba(90,60,40,0.08)] lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="p-8 sm:p-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.45em] text-terra-500">
              Antes de tu visita
            </p>
            <h2
              className="font-display mt-3 font-semibold leading-[1.0] text-terra-900"
              style={{ fontSize: 'clamp(2rem, 4.5vw, 3.2rem)' }}
            >
              Consulta un precio<br />estimado en 3 pasos.
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-[1.85] text-terra-700">
              Elige tu servicio, indica el largo de tu cabello y obtén un valor referencial. El precio final siempre se define en el salón.
            </p>
          </div>
          <div className="border-t border-terra-100 p-8 sm:p-12 lg:border-l lg:border-t-0">
            <Link
              href="/cotizador"
              className="inline-flex items-center gap-2 rounded-full bg-terra-500 px-8 py-4 text-sm font-medium text-white shadow-md shadow-terra-500/20 transition hover:bg-terra-600 active:scale-[0.97]"
            >
              Ver precio estimado
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-4 text-[12px] leading-[1.65] text-terra-500">
              El resultado es referencial. El precio definitivo<br />se establece con evaluación directa en el salón.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────── TESTIMONIOS ─────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <p className="reveal mb-12 text-center text-[11px] font-semibold uppercase tracking-[0.5em] text-terra-500">
            Lo que dicen las clientas
          </p>
          <div className="grid gap-6 lg:grid-cols-3">
            {testimonials.map((t, i) => (
              <article
                key={t.author}
                className="reveal relative rounded-[2rem] border border-terra-100 bg-terra-50 p-8"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div
                  className="font-display pointer-events-none absolute -top-2 left-7 select-none text-[90px] font-semibold leading-none text-terra-200"
                  aria-hidden
                >
                  "
                </div>
                <div className="mb-4 flex gap-1 pt-6">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-terra-400 text-terra-400" />
                  ))}
                </div>
                <p className="text-[15px] leading-[1.8] text-terra-800">{t.quote}</p>
                <p className="mt-5 text-sm font-medium text-terra-600">{t.author}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── PRODUCTOS ─────────────── */}
      <section id="productos" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10">
        <div className="reveal mb-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.45em] text-terra-500">
              Productos
            </p>
            <h2
              className="font-display mt-3 font-semibold leading-[0.95] text-terra-900"
              style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)' }}
            >
              Cuidado que llevas a casa.
            </h2>
          </div>
          <p className="max-w-xs text-[14px] leading-7 text-terra-600">
            Líneas disponibles en el salón para mantener el resultado entre visitas.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {products.map((product, i) => (
            <article
              key={product.name}
              className="reveal group rounded-[1.75rem] border border-terra-100 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(90,60,40,0.10)]"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="mb-4 inline-flex rounded-2xl bg-terra-50 p-3.5 text-terra-500">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-terra-400">
                {product.category}
              </p>
              <h3 className="font-display mt-2 text-xl font-medium text-terra-900">
                {product.name}
              </h3>
              <p className="mt-2 text-[13px] leading-6 text-terra-600">{product.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ─────────────── SUCURSALES ─────────────── */}
      <section id="sucursales" className="bg-[#3A2D26] py-24 text-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="reveal mb-14">
            <p className="text-[11px] font-semibold uppercase tracking-[0.45em] text-terra-300/70">
              Dónde encontrarnos
            </p>
            <h2
              className="font-display mt-3 font-semibold text-white"
              style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)' }}
            >
              Dos espacios<br />en La Serena.
            </h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {branches.map((branch, i) => (
              <article
                key={branch.name}
                className="reveal rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 backdrop-blur-sm"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <h3 className="font-display text-3xl font-medium text-white">{branch.name}</h3>
                <div className="mt-6 space-y-4 text-[15px] text-white/65">
                  <p className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-terra-300/70" />
                    {branch.address}
                  </p>
                  <p className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-terra-300/70" />
                    <Link
                      href={branch.phoneHref}
                      className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
                    >
                      {branch.phoneLabel}
                    </Link>
                  </p>
                  <p className="flex items-start gap-3">
                    <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-terra-300/70" />
                    {branch.schedule}
                  </p>
                </div>
                <Link
                  href={branch.mapsUrl}
                  className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Ver en el mapa
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── FOOTER ─────────────── */}
      <footer className="bg-terra-50">
        {/* Top bar */}
        <div className="border-b border-terra-100">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-12 sm:px-8 sm:flex-row sm:items-center sm:justify-between lg:px-10">
            <div>
              <p className="font-display text-3xl font-semibold text-terra-900">Cafuné.</p>
              <p className="mt-1 text-[13px] text-terra-600">Beauty studio · La Serena</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={agendaUrl}
                className="inline-flex items-center gap-2 rounded-full bg-terra-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-terra-600"
              >
                <CalendarDays className="h-4 w-4" />
                Agendar hora
              </Link>
              <Link
                href={whatsappUrl}
                className="inline-flex items-center gap-2 rounded-full border border-terra-200 bg-white px-6 py-3 text-sm font-medium text-terra-800 transition hover:bg-terra-50"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Link>
              <Link
                href={instagramUrl}
                className="inline-flex items-center gap-2 rounded-full border border-terra-200 bg-white px-6 py-3 text-sm font-medium text-terra-800 transition hover:bg-terra-50"
              >
                <Instagram className="h-4 w-4" />
                Instagram
              </Link>
            </div>
          </div>
        </div>

        {/* Branches + legal */}
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
            {branches.map((branch) => (
              <div key={branch.name}>
                <p className="text-sm font-semibold text-terra-800">{branch.name}</p>
                <p className="mt-1 text-[13px] text-terra-500">{branch.address}</p>
                <p className="text-[13px] text-terra-500">{branch.phoneLabel}</p>
              </div>
            ))}
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <p className="text-[12px] text-terra-400">
                © {new Date().getFullYear()} Espacio Cafuné
              </p>
              <Link href={adminHref} className="text-[12px] text-terra-400 transition hover:text-terra-700">
                {adminLabel}
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ─────────────── FLOATING WHATSAPP ─────────────── */}
      <Link
        href={whatsappUrl}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-plant-dark px-5 py-3 text-sm font-medium text-white shadow-[0_8px_32px_rgba(61,107,79,0.40)] transition hover:bg-[#2f5941] active:scale-[0.97]"
      >
        <MessageCircle className="h-4 w-4" />
        WhatsApp
      </Link>
    </main>
  )
}
