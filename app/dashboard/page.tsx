import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyProfile } from '@/lib/actions/auth'
import { formatCurrency } from '@/lib/utils'
import { Plus, BarChart2, Users, Tag, Receipt, ShoppingCart, UserRound, Settings } from 'lucide-react'
import { MonsteraLeaf } from '@/components/ui/monstera-leaf'
import type { LucideIcon } from 'lucide-react'

export default async function DashboardPage() {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  const supabase = await createClient()

  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

  const [{ data: completed }, { count: openCount }] = await Promise.all([
    supabase
      .from('receipts')
      .select('total_services, total_products, total_amount')
      .eq('status', 'completed')
      .gte('issued_at', start)
      .lt('issued_at', end),
    supabase
      .from('receipts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open'),
  ])

  const totalVentas    = (completed ?? []).reduce((s, r) => s + r.total_amount,   0)
  const totalServicios = (completed ?? []).reduce((s, r) => s + r.total_services, 0)
  const totalProductos = (completed ?? []).reduce((s, r) => s + r.total_products, 0)

  const worker  = Array.isArray(profile.workers) ? profile.workers[0] : profile.workers
  const isAdmin = profile.role === 'admin' || profile.role === 'superadmin'

  return (
    <div className="min-h-screen relative overflow-hidden">

      {/* ── Monstera decorations (ambient, non-interactive) ─────────────────── */}
      {/* Large leaf — top right */}
      <div className="absolute top-0 right-0 w-[280px] md:w-[360px] lg:w-[420px] translate-x-[30%] -translate-y-[15%] pointer-events-none select-none" aria-hidden="true">
        <MonsteraLeaf
          variant="full"
          className="text-[#568A66] opacity-[0.13] w-full h-full drop-shadow-sm"
        />
      </div>

      {/* Medium leaf — bottom left */}
      <div className="absolute bottom-0 left-0 w-[200px] md:w-[260px] -translate-x-[25%] translate-y-[20%] pointer-events-none select-none" aria-hidden="true">
        <MonsteraLeaf
          variant="small"
          className="text-[#3D6B4F] opacity-[0.10] w-full h-full"
        />
      </div>

      {/* Young leaf — mid left, decorative */}
      <div className="hidden md:block absolute top-1/2 left-0 w-[120px] -translate-x-[40%] -translate-y-[60%] pointer-events-none select-none" aria-hidden="true">
        <MonsteraLeaf
          variant="young"
          className="text-[#7FB898] opacity-[0.12] w-full h-full"
        />
      </div>

      {/* ── Page content ─────────────────────────────────────────────────────── */}
      <div className="relative z-10 p-5 md:p-8 lg:p-10">

        {/* ── Hero ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8 md:mb-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-terra-400 mb-1">
              {new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }).format(now)}
            </p>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-[#3D5151] leading-tight">
              Hola, {worker?.full_name?.split(' ')[0] ?? 'bienvenida'} ✦
            </h1>
          </div>

          {/* Hero CTA */}
          <Link
            href="/dashboard/pos"
            className="relative flex items-center gap-3 px-8 py-5 bg-rose-900 text-white rounded-2xl text-lg font-black hover:bg-rose-800 shadow-xl shadow-rose-900/20 w-full md:w-auto justify-center overflow-hidden active:scale-[0.97] transition-transform"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <ShoppingCart size={22} strokeWidth={2.5} />
            Nueva atención
          </Link>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 min-[500px]:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8 md:mb-10">
          <StatCard
            label="Ventas hoy"
            value={formatCurrency(totalVentas)}
            sub={`${completed?.length ?? 0} boletas`}
            accent
          />
          <StatCard label="Servicios"  value={formatCurrency(totalServicios)} sub="Del día" />
          <StatCard label="Productos"  value={formatCurrency(totalProductos)} sub="Del día" />
          {(openCount ?? 0) > 0 ? (
            <StatCard label="Abiertas" value={String(openCount)} sub="Pendientes" warn />
          ) : (
            <StatCard label="Cerradas" value={String(completed?.length ?? 0)} sub="Completadas" />
          )}
        </div>

        {/* ── Quick links ── */}
        {isAdmin ? (
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400 mb-4">Acceso rápido</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <QuickLink href="/dashboard/reports"  label="Reportes"      icon={BarChart2} />
              <QuickLink href="/dashboard/workers"  label="Equipo"        icon={Users} />
              <QuickLink href="/dashboard/clients"  label="Clientas"      icon={UserRound} />
              <QuickLink href="/dashboard/catalog"  label="Catálogo"      icon={Tag} />
              <QuickLink href="/dashboard/receipts" label="Historial"     icon={Receipt} />
              <QuickLink href="/dashboard/settings" label="Configuración" icon={Settings} />
            </div>
          </div>
        ) : worker && (
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400 mb-4">Acceso rápido</p>
            <div className="grid grid-cols-2 gap-3">
              <QuickLink href="/dashboard/clients" label="Clientas" icon={UserRound} />
              <QuickLink href={`/dashboard/reports/payroll?workerId=${worker.id}`} label="Mi nómina" icon={Receipt} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, accent, warn,
}: {
  label: string; value: string; sub?: string; accent?: boolean; warn?: boolean
}) {
  return (
    <div className={`rounded-2xl p-4 md:p-5 border-2 relative overflow-hidden ${
      accent ? 'bg-rose-900 border-rose-800'
    : warn   ? 'bg-amber-50 border-amber-200'
             : 'bg-white border-zinc-100'
    }`}>
      {/* Shine overlay for accent card */}
      {accent && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      )}
      <p className={`text-[10px] font-black uppercase tracking-[0.12em] mb-2 ${
        accent ? 'text-rose-300' : warn ? 'text-amber-500' : 'text-zinc-400'
      }`}>{label}</p>
      <p className={`text-2xl md:text-3xl font-black leading-none tabular-nums ${
        accent ? 'text-white' : 'text-[#3D5151]'
      }`}>{value}</p>
      {sub && (
        <p className={`text-xs mt-1.5 font-medium ${
          accent ? 'text-rose-300' : 'text-zinc-400'
        }`}>{sub}</p>
      )}
    </div>
  )
}

function QuickLink({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-start gap-3 bg-white border-2 border-zinc-100 rounded-2xl p-5 text-zinc-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 active:scale-[0.97] transition-all min-h-[100px]"
    >
      <Icon size={22} strokeWidth={1.6} className="transition-colors" />
      <span className="text-sm font-bold">{label}</span>
    </Link>
  )
}
