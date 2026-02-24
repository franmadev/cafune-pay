'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Home, Receipt, Users, Tag, BarChart2, ShoppingCart } from 'lucide-react'
import type { UserRole } from '@/lib/supabase/types'

interface Props { role: UserRole }

const NAV = [
  { href: '/dashboard',          label: 'Inicio',    icon: Home },
  { href: '/dashboard/pos',      label: 'Venta',     icon: ShoppingCart },
  { href: '/dashboard/receipts', label: 'Historial', icon: Receipt },
]
const ADMIN_NAV = [
  { href: '/dashboard/workers',  label: 'Equipo',   icon: Users },
  { href: '/dashboard/catalog',  label: 'Catálogo', icon: Tag },
  { href: '/dashboard/reports',  label: 'Reportes', icon: BarChart2 },
]

export function BottomNav({ role }: Props) {
  const pathname = usePathname()
  const items    = role === 'worker' ? NAV : [...NAV, ...ADMIN_NAV]

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[#F2F7F7]/96 backdrop-blur border-t border-[#D1DEDE] z-30 flex pb-safe">
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-[11px] font-bold transition-colors active:opacity-60 ${
              active ? 'text-rose-600' : 'text-zinc-400'
            }`}
          >
            <div className="relative p-2 rounded-xl">
              {active && (
                <motion.div
                  layoutId="bottom-nav-pill"
                  className="absolute inset-0 bg-rose-600 rounded-xl shadow-md shadow-rose-600/25"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon
                size={22}
                strokeWidth={active ? 2.2 : 1.8}
                className={`relative z-10 ${active ? 'text-white' : ''}`}
              />
            </div>
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
