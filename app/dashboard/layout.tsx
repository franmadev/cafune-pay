import { redirect } from 'next/navigation'
import { getMyProfile } from '@/lib/actions/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  const worker = Array.isArray(profile.workers)
    ? profile.workers[0]
    : profile.workers

  const displayName = worker?.full_name ?? profile.email

  return (
    <div className="min-h-screen bg-[#F2F7F7] print:bg-white">
      <div className="print:hidden">
        <Sidebar role={profile.role} fullName={displayName} />
      </div>

      <main className="md:pl-[72px] lg:pl-64 pb-20 md:pb-0 print:pl-0 print:pb-0">
        {children}
      </main>

      <div className="print:hidden">
        <BottomNav role={profile.role} />
      </div>
    </div>
  )
}
