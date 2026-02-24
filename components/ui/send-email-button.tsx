'use client'

import { useState } from 'react'
import { Mail, Check, AlertCircle, Loader2 } from 'lucide-react'

interface Props {
  action: () => Promise<{ ok?: boolean; error?: string }>
  label?: string
}

export function SendEmailButton({ action, label = 'Enviar por email' }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleClick() {
    setState('loading')
    const result = await action()
    if (result.ok) {
      setState('ok')
    } else {
      setErrorMsg(result.error ?? 'Error al enviar')
      setState('error')
      setTimeout(() => setState('idle'), 4000)
    }
  }

  if (state === 'ok') {
    return (
      <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-700 text-sm font-bold">
        <Check size={16} />
        Email enviado
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-red-50 border-2 border-red-200 text-red-600 text-sm font-bold">
        <AlertCircle size={16} />
        {errorMsg}
      </div>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === 'loading'}
      className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#3D5151] text-white text-sm font-bold hover:bg-[#4a6363] transition-colors disabled:opacity-60"
    >
      {state === 'loading'
        ? <Loader2 size={16} className="animate-spin" />
        : <Mail size={16} />
      }
      {state === 'loading' ? 'Enviando…' : label}
    </button>
  )
}
