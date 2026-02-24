'use client'

import { useActionState } from 'react'
import { login } from '@/lib/actions/auth'

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, null)

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          suppressHydrationWarning
          className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm
            focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent
            placeholder:text-zinc-400"
          placeholder="hola@cafune.cl"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          suppressHydrationWarning
          className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm
            focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 px-4 bg-rose-900 text-white rounded-lg text-sm font-medium
          hover:bg-rose-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  )
}
