'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Eye, EyeOff, ShoppingCart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { MonsteraLeaf } from '@/components/ui/monstera-leaf'

const STORAGE_KEY   = 'cafune_admin_unlocked'
const SESSION_HOURS = 8

interface Props {
  children: React.ReactNode
}

export function AdminGate({ children }: Props) {
  const [mounted,    setMounted]    = useState(false)
  const [unlocked,   setUnlocked]   = useState(false)
  const [password,   setPassword]   = useState('')
  const [showPw,     setShowPw]     = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [pending,    setPending]    = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        const { expires } = JSON.parse(raw) as { expires: number }
        if (Date.now() < expires) { setUnlocked(true); return }
      } catch { /* ignore */ }
    }
    // Auto-focus the input after mount
    setTimeout(() => inputRef.current?.focus(), 150)
  }, [])

  function lock() {
    sessionStorage.removeItem(STORAGE_KEY)
    window.location.href = '/dashboard/pos'
  }

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    if (!password || pending) return
    setPending(true)
    setError(null)

    const supabase = createClient()
    // Get current user's email from the browser session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      setError('No se pudo verificar la sesión')
      setPending(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password })

    if (error) {
      setError('Contraseña incorrecta')
      setPassword('')
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      const expires = Date.now() + SESSION_HOURS * 60 * 60 * 1000
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ expires }))
      setUnlocked(true)
    }
    setPending(false)
  }

  // Avoid hydration mismatch — don't render until mounted
  if (!mounted) return null

  return (
    <>
      <AnimatePresence>
        {!unlocked && (
          <motion.div
            key="lock-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F2F7F7] p-6 overflow-hidden"
          >
            {/* Monstera decorations */}
            <div className="absolute top-0 right-0 w-[200px] md:w-[300px] translate-x-[28%] -translate-y-[12%] pointer-events-none select-none" aria-hidden="true">
              <MonsteraLeaf variant="full" className="text-[#568A66] opacity-[0.13] w-full h-full" />
            </div>
            <div className="absolute bottom-0 left-0 w-[150px] md:w-[220px] -translate-x-[22%] translate-y-[18%] pointer-events-none select-none" aria-hidden="true">
              <MonsteraLeaf variant="small" className="text-[#3D6B4F] opacity-[0.10] w-full h-full" />
            </div>
            <div className="hidden md:block absolute top-1/2 left-0 w-[100px] -translate-x-[38%] -translate-y-[60%] pointer-events-none select-none" aria-hidden="true">
              <MonsteraLeaf variant="young" className="text-[#7FB898] opacity-[0.12] w-full h-full" />
            </div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05, type: 'spring', stiffness: 400, damping: 28 }}
              className="relative w-full max-w-xs text-center"
            >
              <div className="w-16 h-16 bg-terra-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Lock size={28} className="text-terra-500" strokeWidth={2} />
              </div>

              <h1 className="text-2xl font-black text-zinc-900 mb-1">Área restringida</h1>
              <p className="text-sm text-zinc-400 mb-8">
                Ingresa la contraseña de tu cuenta para acceder
              </p>

              <form onSubmit={handleUnlock} className="space-y-3">
                <div className="relative">
                  <input
                    ref={inputRef}
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null) }}
                    placeholder="Contraseña"
                    autoComplete="current-password"
                    suppressHydrationWarning
                    className="w-full px-5 py-4 pr-12 rounded-2xl border-2 border-zinc-200 text-base text-center focus:outline-none focus:border-rose-400 transition-colors bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="text-sm text-red-500"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={!password || pending}
                  className="w-full py-4 bg-rose-900 text-white rounded-2xl font-bold text-base disabled:opacity-50 hover:bg-rose-800 transition-colors"
                >
                  {pending ? 'Verificando…' : 'Desbloquear'}
                </button>
              </form>

              <a
                href="/dashboard/pos"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <ShoppingCart size={15} />
                Ir a nueva venta
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content + lock button */}
      {unlocked && (
        <>
          {children}
          <LockButton onLock={lock} />
        </>
      )}
    </>
  )
}

function LockButton({ onLock }: { onLock: () => void }) {
  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-40 print:hidden">
      <motion.button
        onClick={onLock}
        whileTap={{ scale: 0.92 }}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-zinc-200 rounded-2xl text-sm font-bold text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 shadow-sm transition-all"
      >
        <Lock size={14} />
        Bloquear
      </motion.button>
    </div>
  )
}
