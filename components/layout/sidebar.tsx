'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { logout } from '@/lib/actions/auth'
import { Home, Receipt, Users, Tag, BarChart2, LogOut, Scissors, ShoppingCart } from 'lucide-react'
import type { UserRole } from '@/lib/supabase/types'

interface Props {
  role:     UserRole
  fullName: string
}

const NAV = [
  { href: '/dashboard',          label: 'Inicio',      icon: Home },
  { href: '/dashboard/pos',      label: 'Nueva venta', icon: ShoppingCart },
  { href: '/dashboard/receipts', label: 'Historial',   icon: Receipt },
]
const ADMIN_NAV = [
  { href: '/dashboard/workers',  label: 'Equipo',   icon: Users },
  { href: '/dashboard/catalog',  label: 'Catálogo', icon: Tag },
  { href: '/dashboard/reports',  label: 'Reportes', icon: BarChart2 },
]

export function Sidebar({ role, fullName }: Props) {
  const pathname = usePathname()
  const items    = role === 'worker' ? NAV : [...NAV, ...ADMIN_NAV]

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 flex-col w-[72px] lg:w-64 bg-[#F2F7F7] border-r border-[#D1DEDE] z-30 transition-[width] duration-200">

      {/* Logo */}
      <div className="h-16 flex items-center justify-center lg:justify-start lg:gap-3 lg:px-5 border-b border-[#D1DEDE] flex-shrink-0">
        <div className="w-9 h-9 bg-terra-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-terra-500/25">
          <Scissors size={17} className="text-white" strokeWidth={2.2} />
        </div>
        <span className="hidden lg:block text-base font-black text-[#3D5151] tracking-tight">cafuné</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`relative flex items-center justify-center lg:justify-start lg:gap-3 lg:px-3 py-3.5 rounded-xl min-h-[52px] text-sm font-semibold transition-colors
                ${active ? 'text-white' : 'text-zinc-500 hover:bg-white hover:text-[#3D5151]'}`}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-pill"
                  className="absolute inset-0 bg-rose-600 rounded-xl shadow-md shadow-rose-600/20"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} className="relative z-10 flex-shrink-0" />
              <span className="relative z-10 hidden lg:block">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 lg:p-4 border-t border-[#D1DEDE] flex-shrink-0">
        {/* Avatar — centered at md, row at lg */}
        <div className="flex justify-center lg:hidden mb-2">
          <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center">
            <span className="text-sm font-bold text-zinc-600">{fullName.charAt(0).toUpperCase()}</span>
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-2.5 mb-3 px-1">
          <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-zinc-600">{fullName.charAt(0).toUpperCase()}</span>
          </div>
          <p className="text-xs text-zinc-600 truncate font-medium">{fullName}</p>
        </div>

        <form action={logout}>
          <button
            type="submit"
            title="Cerrar sesión"
            className="w-full flex items-center justify-center lg:justify-start lg:gap-2.5 lg:px-3 py-3 rounded-xl min-h-[48px] text-sm text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700 transition-colors"
          >
            <LogOut size={20} strokeWidth={1.8} />
            <span className="hidden lg:block">Cerrar sesión</span>
          </button>
        </form>
      </div>
    </aside>
  )
}
