'use client'

import { useState, useRef, useEffect } from 'react'
import { Mail, Send, Check, AlertCircle, Loader2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const DOMAINS = [
  'gmail.com',
  'hotmail.com',
  'hotmail.es',
  'outlook.com',
  'live.cl',
  'live.com',
  'icloud.com',
  'yahoo.com',
]

type State = 'idle' | 'sending' | 'input' | 'sending-manual' | 'ok' | 'error'

interface Props {
  action: (email?: string) => Promise<{ ok?: boolean; error?: string }>
}

export function ReceiptEmailSender({ action }: Props) {
  const [state,       setState]       = useState<State>('idle')
  const [email,       setEmail]       = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [errorMsg,    setErrorMsg]    = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (state === 'input') {
      setTimeout(() => inputRef.current?.focus(), 120)
    }
  }, [state])

  // ── Email input → domain suggestions ──────────────────────────────────────
  function handleEmailChange(val: string) {
    setEmail(val)
    const atIdx = val.indexOf('@')

    if (atIdx === -1) {
      const local = val.trim()
      setSuggestions(local ? DOMAINS.map(d => `${local}@${d}`) : [])
    } else {
      const local      = val.slice(0, atIdx + 1)
      const domainPart = val.slice(atIdx + 1).toLowerCase()
      const filtered   = domainPart
        ? DOMAINS.filter(d => d.startsWith(domainPart))
        : DOMAINS
      setSuggestions(filtered.map(d => `${local}${d}`))
    }
  }

  function selectSuggestion(s: string) {
    setEmail(s)
    setSuggestions([])
    inputRef.current?.focus()
  }

  // ── First click: try to send with registered email ─────────────────────────
  async function handleInitialClick() {
    setState('sending')
    const result = await action()
    if (result.ok) {
      setState('ok')
    } else if (result.error === 'Sin email') {
      // No email on record — ask the user to enter one
      setState('input')
    } else {
      setErrorMsg(result.error ?? 'Error al enviar')
      setState('error')
      setTimeout(() => setState('idle'), 4000)
    }
  }

  // ── Second send with manually-entered email ────────────────────────────────
  async function handleManualSend() {
    const trimmed = email.trim()
    if (!trimmed || !trimmed.includes('@')) return
    setState('sending-manual')
    const result = await action(trimmed)
    if (result.ok) {
      setState('ok')
    } else {
      setErrorMsg(result.error ?? 'Error al enviar')
      setState('error')
      setTimeout(() => setState('idle'), 4000)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (state === 'ok') {
    return (
      <div className="flex items-center gap-2 w-full px-5 py-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-700 text-sm font-bold">
        <Check size={16} className="shrink-0" />
        Email enviado
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex items-center gap-2 w-full px-5 py-3.5 rounded-2xl bg-red-50 border-2 border-red-200 text-red-600 text-sm font-bold">
        <AlertCircle size={16} className="shrink-0" />
        {errorMsg}
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col gap-2">
      <AnimatePresence mode="wait">

        {/* ── Input mode ── */}
        {state === 'input' || state === 'sending-manual' ? (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-2"
          >
            {/* Label */}
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-[0.12em]">
              Ingresa el correo del cliente
            </p>

            {/* Input row */}
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-zinc-50 border-2 border-zinc-200 rounded-xl px-3 py-2.5 focus-within:border-[#3D5151] transition-colors">
                <Mail size={15} className="text-zinc-400 shrink-0" />
                <input
                  ref={inputRef}
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  placeholder="correo@gmail.com"
                  value={email}
                  onChange={e => handleEmailChange(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleManualSend()}
                  disabled={state === 'sending-manual'}
                  className="flex-1 bg-transparent text-sm text-zinc-800 placeholder-zinc-400 outline-none min-w-0"
                />
                {email && state !== 'sending-manual' && (
                  <button
                    onClick={() => { setEmail(''); setSuggestions([]) }}
                    className="text-zinc-300 hover:text-zinc-500 transition-colors"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Send button */}
              <button
                onClick={handleManualSend}
                disabled={!email.includes('@') || state === 'sending-manual'}
                className="flex items-center justify-center w-12 rounded-xl bg-[#3D5151] text-white disabled:opacity-40 hover:bg-[#4a6363] transition-colors active:scale-95"
              >
                {state === 'sending-manual'
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Send size={15} />
                }
              </button>
            </div>

            {/* Domain suggestions */}
            <AnimatePresence>
              {suggestions.length > 0 && state !== 'sending-manual' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-1.5 overflow-hidden"
                >
                  {suggestions.slice(0, 5).map(s => (
                    <button
                      key={s}
                      onClick={() => selectSuggestion(s)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-white border border-zinc-200 text-zinc-600 hover:border-[#3D5151] hover:text-[#3D5151] transition-colors font-medium"
                    >
                      {s}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

        ) : (
          /* ── Initial button ── */
          <motion.button
            key="btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleInitialClick}
            disabled={state === 'sending'}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-[#3D5151] text-white text-sm font-bold hover:bg-[#4a6363] transition-colors disabled:opacity-60 active:scale-[0.98]"
          >
            {state === 'sending'
              ? <><Loader2 size={16} className="animate-spin" /> Enviando…</>
              : <><Mail size={16} /> Enviar resumen al cliente</>
            }
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
