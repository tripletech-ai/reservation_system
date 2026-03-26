'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Phone, Mail, ExternalLink, X, ChevronLeft, ChevronRight, User, Calendar, MessageSquare, ShieldCheck } from 'lucide-react'
import type { Member, MemberListProps } from '@/types'
import { useAlert } from '@/components/ui/DialogProvider'


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

  // 當選擇會員改變時，同步其狀態到暫存狀態
  const openMemberDetail = (member: Member) => {
    setSelectedMember(member)
    setTempStatus(member.status)
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  const showStatusText = (status: boolean) => {
    if (status) {
      return '已綁定'
    } else {
      return '未綁定'
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (searchValue) {
      params.set('q', searchValue)
    } else {
      params.delete('q')
    }
    params.set('page', '1') // 搜尋時重設分頁
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
    params.set('page', '1') // 每次切換筆數都回第一頁
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
      {/* 搜尋欄位 */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="搜尋姓名、電話或 Email..."
            className="w-full pl-12 pr-4 py-3 bg-white/10 rounded-xl border border-white/10 outline-none focus:border-purple-500/50 transition-all text-white placeholder-slate-400"
          />
        </div>
        <button type="submit" className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all text-white">
          搜尋
        </button>
      </form>

      {/* 資料表格 */}
      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl relative">
        <div className="overflow-x-auto scrollbar-hide md:scrollbar-default">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-5 text-xm font-bold text-slate-300 uppercase tracking-wider">會員姓名</th>
                <th className="px-6 py-5 text-xm font-bold text-slate-300 uppercase tracking-wider">聯絡資訊</th>
                <th className="px-6 py-5 text-xm font-bold text-slate-300 uppercase tracking-wider">狀態</th>
                <th className="px-6 py-5 text-xm font-bold text-slate-300 uppercase tracking-wider">註冊日期</th>
                <th className="px-6 py-5 text-xm font-bold text-slate-300 uppercase tracking-wider text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {initialMembers.length > 0 ? initialMembers.map((member) => (
                <tr
                  key={member.uid}
                  onClick={() => openMemberDetail(member)}
                  className="hover:bg-white/10 transition-colors group cursor-pointer"
                >
                  <td className="px-6 py-5 font-bold text-white whitespace-nowrap">{member.name || '未命名'}</td>
                  <td className="px-6 py-5">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xm text-slate-200">
                        <Phone size={14} className="text-cyan-400 shrink-0" />
                        <span className="font-mono">{member.phone || '-'}</span>
                      </div>
                      {member.email && (
                        <div className="flex items-center gap-2 text-ms text-slate-400">
                          <Mail size={14} className="text-purple-400 shrink-0" />
                          <span className="truncate max-w-[200px]">{member.email}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex px-3 py-1 rounded-full text-[13px] font-bold tracking-wide ${member.status
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                      }`}>
                      {showStatusText(member.status)}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-xm text-slate-400 font-mono whitespace-nowrap">
                    {new Date(member.create_at).toLocaleDateString('zh-TW')}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button
                      className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all inline-flex items-center"
                    >
                      <ExternalLink size={18} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-400 italic">
                    暫無符合條件的會員資料
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 分頁控制項 */}
        <div className="px-6 py-5 border-t border-white/10 flex flex-col lg:flex-row items-center justify-between gap-6 bg-white/[0.02]">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <p className="text-xm text-slate-400 font-medium">
              顯示第 <span className="text-white">{(currentPage - 1) * pageSize + 1}</span> 到 <span className="text-white">{Math.min(currentPage * pageSize, totalCount)}</span> 筆資料，共 <span className="text-white font-bold">{totalCount}</span> 筆
            </p>
            <div className="h-4 w-px bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-ms text-slate-300 uppercase font-bold tracking-tighter">每頁</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-ms text-white outline-none focus:border-purple-500/50 transition-all cursor-pointer font-bold"
              >
                {[10, 20, 50, 100].map(size => (
                  <option key={size} value={size} className="bg-[#111]">{size} 筆</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="p-2 bg-white/5 border border-white/10 rounded-xl disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/10 hover:border-white/20 transition-all text-white"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] sm:max-w-none no-scrollbar">
              {totalPages > 0 ? [...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => handlePageChange(i + 1)}
                  className={`min-w-[40px] h-10 rounded-xl text-xm font-bold transition-all ${currentPage === i + 1
                    ? 'bg-gradient-to-br from-purple-600 to-cyan-600 text-white shadow-lg shadow-purple-500/30'
                    : 'hover:bg-white/10 text-slate-400 hover:text-white border border-transparent hover:border-white/10'
                    }`}
                >
                  {i + 1}
                </button>
              )) : (
                <button className="min-w-[40px] h-10 rounded-xl text-xm font-medium bg-gradient-to-br from-purple-600/50 to-cyan-600/50 text-white opacity-50 cursor-default">
                  1
                </button>
              )}
            </div>

            <button
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => handlePageChange(currentPage + 1)}
              className="p-2 bg-white/5 border border-white/10 rounded-xl disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/10 hover:border-white/20 transition-all text-white"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* 詳細資料 Modal */}
      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMember(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10 max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 md:p-8 flex items-center justify-between border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center border border-white/10">
                    <User className="w-8 h-8 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-white leading-tight">{selectedMember.name}</h2>
                    <p className="text-slate-300 font-mono text-ms mt-1">{selectedMember.uid}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="p-3 hover:bg-white/10 rounded-2xl transition-all text-slate-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-8 no-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <InfoItem icon={<Phone className="text-cyan-400" size={18} />} label="手機電話" value={selectedMember.phone || '未提供'} />
                  <InfoItem icon={<Mail className="text-purple-400" size={18} />} label="Email" value={selectedMember.email || '未提供'} />
                  <InfoItem icon={<MessageSquare className="text-emerald-400" size={18} />} label="LINE ID" value={selectedMember.line_uid || '未連動'} />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-400 text-[14px] font-bold uppercase tracking-widest">
                      <ShieldCheck className="text-yellow-400" size={18} />
                      <span>會員狀態</span>
                    </div>
                    <div className="pl-6 flex items-center gap-3">
                      <Switch checked={tempStatus} onChange={setTempStatus} />
                      <span className="font-bold text-xm text-white">{showStatusText(tempStatus)}</span>
                    </div>
                  </div>
                </div>

                {selectedMember.questionnaire && (
                  <div className="space-y-4">
                    <h3 className="text-xm font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Calendar size={16} className="text-purple-400" /> 訪談問卷答案
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {(() => {
                        try {
                          const qData = typeof selectedMember.questionnaire === 'string'
                            ? JSON.parse(selectedMember.questionnaire)
                            : selectedMember.questionnaire;

                          if (Array.isArray(qData) && qData.length > 0) {
                            return qData.map((item: any, idx: number) => (
                              <div key={idx} className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl">
                                <p className="text-ms font-bold text-purple-400 mb-1 uppercase tracking-wider">{item.title}</p>
                                <p className="text-slate-100 font-medium">{item.ans || '(未填寫)'}</p>
                              </div>
                            ));
                          }

                          if (typeof qData === 'object' && qData !== null && Object.keys(qData).length > 0) {
                            return Object.entries(qData).map(([key, value]: [string, any]) => (
                              <div key={key} className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl">
                                <p className="text-ms font-bold text-purple-400 mb-1 uppercase tracking-wider">{key}</p>
                                <p className="text-slate-100 font-medium whitespace-pre-wrap">
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </p>
                              </div>
                            ));
                          }

                          return (
                            <div className="p-8 text-center bg-white/5 border border-dashed border-white/10 rounded-2xl text-slate-300 italic">
                              尚無填寫問卷紀錄
                            </div>
                          );
                        } catch (e) {
                          return <p className="text-slate-300 italic">解析失敗</p>;
                        }
                      })()}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-white/10 flex justify-between text-ms text-slate-600 font-mono">
                  <span>註冊日期: {new Date(selectedMember.create_at).toLocaleString('zh-TW')}</span>
                  <span>最後更新: {new Date(selectedMember.update_at).toLocaleString('zh-TW')}</span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-8 pt-0 flex gap-4">
                <button
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl font-semibold text-white shadow-lg shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {isUpdating ? '進行中...' : '確定編輯會員'}
                </button>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-semibold hover:bg-white/10 transition-all text-white"
                >
                  關閉視窗
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-all duration-300 outline-none flex items-center ${checked ? 'bg-purple-600 shadow-inner' : 'bg-slate-700 shadow-inner'
        }`}
    >
      <motion.div
        animate={{ x: checked ? 26 : 4 }}
        className="w-4 h-4 bg-white rounded-full shadow-lg"
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  )
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-slate-300 text-ms">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-white font-medium pl-6">{value}</p>
    </div>
  )
}
