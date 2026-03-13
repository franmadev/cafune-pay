'use client'

import { useState, useTransition } from 'react'
import { KeyRound, Trash2, Check, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { createWorkerAccount, deleteWorkerAccount } from '@/lib/actions/workers'

interface Props {
  workerId:    string
  workerName:  string
  workerEmail: string | null
  hasAccount:  boolean
  accountEmail?: string
}

export function WorkerAccountClient({ workerId, workerName, workerEmail, hasAccount, accountEmail }: Props) {
  const [mode, setMode]              = useState<'idle' | 'create' | 'confirm-delete'>('idle')
  const [email, setEmail]            = useState(workerEmail ?? '')
  const [password, setPassword]      = useState('')
  const [showPwd, setShowPwd]        = useState(false)
  const [done, setDone]              = useState(false)
  const [error, setError]            = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleCreate = () => {
    setError(null)
    startTransition(async () => {
      const result = await createWorkerAccount(workerId, email, password)
      if (result.error) { setError(result.error); return }
      setDone(true)
      setMode('idle')
      setPassword('')
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteWorkerAccount(workerId)
      if (result.error) { setError(result.error); return }
      setMode('idle')
      setDone(false)
    })
  }

  if (hasAccount || done) {
    return (
      <div className="bg-white border-2 border-zinc-100 rounded-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <KeyRound size={15} className="text-[#76A6A5]" />
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
              Cuenta de acceso
            </p>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Check size={16} className="text-emerald-600" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-bold text-[#3D5151]">Cuenta activa</p>
                <p className="text-xs text-zinc-400 mt-0.5">{accountEmail ?? email}</p>
              </div>
            </div>

            {mode === 'confirm-delete' ? (
              <div className="flex items-center gap-2">
                <p className="text-xs text-zinc-500">¿Eliminar?</p>
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="px-3 py-1.5 bg-rose-500 text-white text-xs font-bold rounded-xl hover:bg-rose-600 disabled:opacity-50 transition-colors"
                >
                  {isPending ? '…' : 'Sí, eliminar'}
                </button>
                <button
                  onClick={() => setMode('idle')}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-600"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setMode('confirm-delete')}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-rose-500 transition-colors p-2 rounded-lg hover:bg-rose-50"
              >
                <Trash2 size={14} />
                Eliminar cuenta
              </button>
            )}
          </div>
          {error && (
            <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 mt-3">
              <AlertCircle size={15} className="text-rose-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-rose-700 font-medium">{error}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border-2 border-zinc-100 rounded-3xl overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <KeyRound size={15} className="text-[#76A6A5]" />
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
            Cuenta de acceso
          </p>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Permite a {workerName.split(' ')[0]} operar el POS y ver su historial y nóminas.
        </p>
      </div>

      {mode === 'idle' ? (
        <div className="px-6 py-5">
          <p className="text-sm text-zinc-500 mb-4">Esta trabajadora no tiene cuenta de acceso.</p>
          <button
            onClick={() => setMode('create')}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#3D5151] text-white text-sm font-bold rounded-xl hover:bg-[#2d3d3d] transition-colors"
          >
            <KeyRound size={15} />
            Crear cuenta
          </button>
        </div>
      ) : (
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-200 text-sm focus:outline-none focus:border-[#76A6A5] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-1.5">Contraseña</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full px-4 py-2.5 pr-10 rounded-xl border-2 border-zinc-200 text-sm focus:outline-none focus:border-[#76A6A5] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
              <AlertCircle size={15} className="text-rose-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-rose-700 font-medium">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={isPending || !email || !password}
              className="flex-1 py-2.5 bg-[#3D5151] text-white text-sm font-bold rounded-xl hover:bg-[#2d3d3d] disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Creando…' : 'Crear cuenta'}
            </button>
            <button
              onClick={() => { setMode('idle'); setError(null) }}
              className="px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-600 border-2 border-zinc-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
