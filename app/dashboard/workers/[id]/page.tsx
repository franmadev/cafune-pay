import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
import { getMyProfile } from '@/lib/actions/auth'
import { getWorker } from '@/lib/actions/workers'
import { getWorkerCommissions } from '@/lib/actions/worker-commissions'
import { WorkerCommissionsClient } from './worker-commissions-client'
import { WorkerAccountClient } from './worker-account-client'

export const dynamic = 'force-dynamic'

export default async function WorkerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')
  if (profile.role === 'worker') redirect('/dashboard')

  const { id } = await params
  const [worker, commissions] = await Promise.all([
    getWorker(id),
    getWorkerCommissions(id),
  ])

  if (!worker) notFound()

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-2xl mx-auto">
      <Link
        href="/dashboard/workers"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-[#3D5151] mb-6 transition-colors"
      >
        <ArrowLeft size={14} />
        Trabajadoras
      </Link>

      {/* Header */}
      <div className="bg-white border-2 border-zinc-100 rounded-3xl px-6 py-5 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-black text-rose-400">
              {worker.full_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-lg font-black text-[#3D5151]">{worker.full_name}</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              {[worker.phone, worker.email].filter(Boolean).join(' · ') || 'Sin contacto'}
            </p>
          </div>
          {!worker.is_active && (
            <span className="ml-auto text-[10px] bg-zinc-100 text-zinc-400 font-bold px-2 py-1 rounded-full">
              Inactiva
            </span>
          )}
        </div>
      </div>

      {/* Account */}
      <div className="mb-6">
        <WorkerAccountClient
          workerId={id}
          workerName={worker.full_name}
          workerEmail={worker.email}
          hasAccount={!!worker.user_id}
          accountEmail={(worker.users as { email?: string } | null)?.email}
        />
      </div>

      {/* Nómina links */}
      <div className="flex gap-3 mb-6">
        <Link
          href={`/dashboard/reports/payroll?workerId=${id}`}
          className="flex-1 flex items-center justify-between bg-white border-2 border-zinc-100 rounded-3xl px-5 py-4 hover:border-rose-200 hover:bg-rose-50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <FileText size={15} className="text-zinc-400 group-hover:text-rose-500 transition-colors" />
            <span className="text-sm font-semibold text-zinc-600 group-hover:text-rose-700 transition-colors">
              Nómina vigente
            </span>
          </div>
          <ArrowLeft size={13} className="text-zinc-300 rotate-180 group-hover:text-rose-400 transition-colors" />
        </Link>
        <Link
          href={`/dashboard/reports/payroll/history/${id}`}
          className="flex items-center justify-between bg-white border-2 border-zinc-100 rounded-3xl px-5 py-4 hover:border-zinc-200 hover:bg-zinc-50 transition-colors group"
          title="Historial de nóminas"
        >
          <ArrowLeft size={13} className="text-zinc-300 rotate-180 group-hover:text-zinc-500 transition-colors" />
        </Link>
      </div>

      {/* Commissions */}
      <WorkerCommissionsClient
        workerId={id}
        initialCommissions={commissions}
      />
    </div>
  )
}
