'use client'
import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import type { Member, MemberListProps } from '@/types'
import { useAlert } from '@/components/ui/DialogProvider'
import { TimeUtils } from '@/lib/TimeUtils'

export default function MemberList({
  initialMembers,
  totalCount,
  currentPage,
  pageSize,
  initialSearch
}: MemberListProps) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [tempStatus, setTempStatus] = useState<boolean>(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [searchValue, setSearchValue] = useState(initialSearch)
  const router = useRouter()
  const { showAlert } = useAlert()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const openMemberDetail = (member: Member) => {
    setSelectedMember(member)
    setTempStatus(member.status)
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  const showStatusText = (status: boolean) => {
    return status ? '已綁定' : '未綁定'
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (searchValue) {
      params.set('q', searchValue)
    } else {
      params.delete('q')
    }
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  const handlePageSizeChange = (newSize: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('pageSize', newSize.toString())
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleUpdate = async () => {
    if (!selectedMember) return
    setIsUpdating(true)
    try {
      const res = await fetch('/api/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: selectedMember.uid, status: tempStatus })
      })
      if (res.ok) {
        setSelectedMember(null)
        router.refresh()
      } else {
        showAlert({ message: '更新失敗', type: 'error' })
      }
    } catch (err) {
      console.error(err)
      showAlert({ message: '網路錯誤', type: 'error' })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl">
        <div className="flex-1 relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="搜尋姓名、電話或 Email..."
            className="w-full pl-12 pr-4 py-3 bg-white/10 rounded-xl border border-white/10 outline-none focus:border-purple-500/50 transition-all text-white placeholder-slate-400 font-bold"
          />
        </div>
        <button type="submit" className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all text-white cursor-pointer">
          搜尋
        </button>
      </form>

      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-bold">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-5 text-xm text-slate-300 uppercase tracking-wider">會員姓名</th>
                <th className="px-6 py-5 text-xm text-slate-300 uppercase tracking-wider">聯絡資訊</th>
                <th className="px-6 py-5 text-xm text-slate-300 uppercase tracking-wider">狀態</th>
                <th className="px-6 py-5 text-xm text-slate-300 uppercase tracking-wider">註冊日期</th>
                <th className="px-6 py-5 text-xm text-slate-300 uppercase tracking-wider text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {initialMembers.length > 0 ? initialMembers.map((member) => (
                <tr
                  key={member.uid}
                  onClick={() => openMemberDetail(member)}
                  className="hover:bg-white/10 transition-colors group cursor-pointer"
                >
                  <td className="px-6 py-5 text-white whitespace-nowrap tracking-tight">{member.name || '未命名'}</td>
                  <td className="px-6 py-5">
                    <div className="space-y-1.5 font-bold">
                      <div className="flex items-center gap-2 text-xm text-slate-200">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400 shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        <span className="font-mono">{member.phone || '-'}</span>
                      </div>
                      {member.email && (
                        <div className="flex items-center gap-2 text-ms text-slate-400 font-bold">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400 shrink-0"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                          <span className="truncate max-w-[200px]">{member.email}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex px-3 py-1 rounded-full text-[13px] font-black tracking-wide ${member.status
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                      }`}>
                      {showStatusText(member.status)}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-xm text-slate-400 font-mono font-bold whitespace-nowrap">
                    {TimeUtils.getDatePart(member.create_at)}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all inline-flex items-center cursor-pointer">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-400 italic font-bold">暫無資料</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-5 border-t border-white/10 flex flex-col lg:flex-row items-center justify-between gap-6 bg-white/[0.02] font-bold">
          <p className="text-xm text-slate-400">
            顯示第 <span className="text-white">{(currentPage - 1) * pageSize + 1}</span> 到 <span className="text-white">{Math.min(currentPage * pageSize, totalCount)}</span> 筆資料，共 <span className="text-white font-black">{totalCount}</span> 筆
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="p-2 bg-white/5 border border-white/10 rounded-xl disabled:opacity-20 hover:bg-white/10 transition-all text-white cursor-pointer"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => handlePageChange(i + 1)}
                  className={`min-w-[40px] h-10 rounded-xl text-xm font-bold transition-all ${currentPage === i + 1 ? 'bg-gradient-to-br from-purple-600 to-cyan-600 text-white shadow-lg shadow-purple-500/30' : 'text-slate-400 hover:text-white border border-transparent hover:border-white/10'} cursor-pointer`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className="p-2 bg-white/5 border border-white/10 rounded-xl disabled:opacity-20 hover:bg-white/10 transition-all text-white cursor-pointer"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        </div>
      </div>

      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setSelectedMember(null)} className="absolute inset-0 bg-black/80 backdrop-blur-md animate-[fadeIn_0.3s_ease-out]" />
          <div className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10 max-h-[90vh] flex flex-col animate-[fadeUp_0.4s_ease-out]">
            <div className="p-6 md:p-8 flex items-center justify-between border-b border-white/5 bg-white/5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center border border-white/10">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-white leading-tight">{selectedMember.name}</h2>
                  <p className="text-slate-300 font-mono text-ms mt-1 font-bold">{selectedMember.uid}</p>
                </div>
              </div>
              <button onClick={() => setSelectedMember(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all text-slate-400 hover:text-white cursor-pointer">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-8 no-scrollbar font-bold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <InfoItem icon={<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>} label="手機電話" value={selectedMember.phone || '未提供'} />
                <InfoItem icon={<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>} label="Email" value={selectedMember.email || '未提供'} />
                <InfoItem icon={<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>} label="LINE ID" value={selectedMember.line_uid || '未連動'} />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-400 text-[14px] font-black uppercase tracking-widest">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M9 12l2 2 4-4"></path></svg>
                    <span>會員狀態</span>
                  </div>
                  <div className="pl-6 flex items-center gap-3">
                    <Switch checked={tempStatus} onChange={setTempStatus} />
                    <span className="font-black text-white">{showStatusText(tempStatus)}</span>
                  </div>
                </div>
              </div>

              {selectedMember.questionnaire && (
                <div className="space-y-4">
                  <h3 className="text-xm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">問卷詳情</h3>
                  <div className="grid grid-cols-1 gap-4 font-bold">
                    {(() => {
                      try {
                        const qData = typeof selectedMember.questionnaire === 'string' ? JSON.parse(selectedMember.questionnaire) : selectedMember.questionnaire
                        return (qData || []).map((item: any, idx: number) => (
                          <div key={idx} className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl">
                            <p className="text-ms text-purple-400 mb-1 uppercase tracking-wider font-black">{item.title}</p>
                            <p className="text-slate-100">{item.ans || '(未填寫)'}</p>
                          </div>
                        ))
                      } catch (e) { return <p className="text-slate-300 italic">解析失敗</p> }
                    })()}
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 pt-0 flex gap-4">
              <button onClick={handleUpdate} disabled={isUpdating} className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl font-bold text-white shadow-lg shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">
                {isUpdating ? '進行中...' : '確定編輯會員'}
              </button>
              <button onClick={() => setSelectedMember(null)} className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold hover:bg-white/10 transition-all text-white cursor-pointer">
                關閉視窗
              </button>
            </div>
          </div>
          <style jsx global>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          `}</style>
        </div>
      )}
    </div>
  )
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-all duration-300 outline-none flex items-center cursor-pointer ${checked ? 'bg-purple-600 shadow-inner' : 'bg-slate-700 shadow-inner'}`}
    >
      <div className={`w-4 h-4 bg-white rounded-full shadow-lg transition-transform duration-300 transform ${checked ? 'translate-x-[26px]' : 'translate-x-[4px]'}`} />
    </button>
  )
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-slate-300 text-ms font-bold tracking-tight">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-white font-bold pl-6">{value}</p>
    </div>
  )
}
