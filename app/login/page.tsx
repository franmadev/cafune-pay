import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900">Cafune Pay</h1>
          <p className="text-zinc-500 text-sm mt-1">Inicia sesión para continuar</p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
