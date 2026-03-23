import { getAuthSession } from '@/services/auth'
import { getMembers } from '@/services/data'
import MemberList from './MemberList'

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string }>
}) {
  const session = await getAuthSession()
  if (!session) return null

  const params = await searchParams
  const q = params.q || ''
  const page = parseInt(params.page || '1')
  const pageSize = parseInt(params.pageSize || '10')

  const { members, totalCount } = await getMembers(session.uid, {
    searchTerm: q,
    page,
    pageSize
  })

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">會員管理</h1>
          <p className="text-slate-400 mt-1">查看並管理所有預約會員資料</p>
        </div>
      </div>

      {/* MemberList will handle search UI, table and detail modal */}
      <MemberList
        initialMembers={members}
        totalCount={totalCount}
        currentPage={page}
        pageSize={pageSize}
        initialSearch={q}
      />
    </div>
  )
}
