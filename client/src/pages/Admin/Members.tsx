import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Mail, Calendar, ShieldCheck, Phone, MapPin, Power } from 'lucide-react';

interface Member {
    id: number;
    name: string;
    email: string;
    level: string;
    date: string;
    status: string;
    phone?: string;
    address?: string;
    totalBookings?: number;
    lastVisit?: string;
}

const Members: React.FC = () => {
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [memberList, setMemberList] = useState<Member[]>([
        {
            id: 1,
            name: '王小明',
            email: 'ming@example.com',
            level: '黃金會員',
            date: '2025-01-15',
            status: '活躍',
            phone: '0912-345-678',
            address: '台北市大安區新生南路三段',
            totalBookings: 12,
            lastVisit: '2025-03-05'
        },
        {
            id: 2,
            name: '李華',
            email: 'hua@example.com',
            level: '普通會員',
            date: '2025-02-10',
            status: '活躍',
            phone: '0922-111-222',
            address: '台中市南屯區公益路二段',
            totalBookings: 3,
            lastVisit: '2025-03-01'
        },
        {
            id: 3,
            name: '張三',
            email: 'san@example.com',
            level: '白金會員',
            date: '2024-12-05',
            status: '休眠',
            phone: '0988-777-666',
            address: '高雄市左營區博愛二路',
            totalBookings: 45,
            lastVisit: '2025-01-20'
        },
    ]);

    // Close selected member if needed (optional, keeping useEffect structure for now)
    useEffect(() => {
        // No-op for menu closing since operations column was removed
    }, []);

    const toggleStatus = (id: number) => {
        setMemberList(prev => prev.map(m => {
            if (m.id === id) {
                const newStatus = m.status === '活躍' ? '休眠' : '活躍';
                const updatedMember = { ...m, status: newStatus };
                if (selectedMember?.id === id) setSelectedMember(updatedMember);
                return updatedMember;
            }
            return m;
        }));
    };

    return (
        <div className="animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>會員管理</h1>
                    <p style={{ color: '#71717a', fontSize: '1rem' }}>管理系統內的所有註冊會員資料</p>
                </div>
            </div>

            <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                        <input type="text" placeholder="搜尋會員名稱、郵箱..." style={{ width: '100%', paddingLeft: '2.75rem', color: '#1e293b', border: '1px solid #e2e8f0', background: '#f8fafc' }} />
                    </div>
                    <button style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Filter size={18} /> 篩選
                    </button>
                </div>

                <table style={{ position: 'relative' }}>
                    <thead>
                        <tr>
                            <th>姓名</th>
                            <th>電話號碼</th>
                            <th>加入日期</th>
                            <th>狀態</th>
                        </tr>
                    </thead>
                    <tbody>
                        {memberList.map(member => (
                            <tr
                                key={member.id}
                                onClick={() => setSelectedMember(member)}
                                style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                            >
                                <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{member.name}</td>
                                <td style={{ color: '#64748b' }}>{member.phone}</td>
                                <td>{member.date}</td>
                                <td>
                                    <span style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.375rem',
                                        color: member.status === '活躍' ? '#22c55e' : '#94a3b8',
                                        fontWeight: 500
                                    }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                                        {member.status}
                                    </span>
                                </td>

                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Member Details Dialog */}
            {selectedMember && (
                <div className="modal-overlay" onClick={() => setSelectedMember(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>會員詳細資料</h2>
                            <button
                                onClick={() => setSelectedMember(null)}
                                style={{ background: 'transparent', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                                <X size={20} color="#64748b" />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '1.5rem',
                                    background: 'var(--primary-gradient)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '2rem',
                                    fontWeight: 700,
                                    boxShadow: '0 8px 16px rgba(99, 102, 241, 0.2)'
                                }}>
                                    {selectedMember.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>{selectedMember.name}</h3>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <span style={{
                                            padding: '0.125rem 0.625rem',
                                            borderRadius: '2rem',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            background: '#f1f5f9',
                                            color: '#64748b'
                                        }}>
                                            ID: #{selectedMember.id.toString().padStart(4, '0')}
                                        </span>
                                        <span style={{
                                            padding: '0.125rem 0.625rem',
                                            borderRadius: '2rem',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            background: selectedMember.level === '白金會員' ? '#fef3c7' : selectedMember.level === '黃金會員' ? '#f1f5f9' : '#f0f9ff',
                                            color: selectedMember.level === '白金會員' ? '#92400e' : selectedMember.level === '黃金會員' ? '#1e293b' : '#0369a1'
                                        }}>
                                            {selectedMember.level}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div className="info-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                                        <Mail size={16} /> 電子郵件
                                    </label>
                                    <div style={{ fontWeight: 500, color: '#1e293b' }}>{selectedMember.email}</div>
                                </div>
                                <div className="info-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                                        <Phone size={16} /> 電話號碼
                                    </label>
                                    <div style={{ fontWeight: 500, color: '#1e293b' }}>{selectedMember.phone}</div>
                                </div>
                                <div className="info-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                                        <Calendar size={16} /> 加入日期
                                    </label>
                                    <div style={{ fontWeight: 500, color: '#1e293b' }}>{selectedMember.date}</div>
                                </div>
                                <div className="info-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                                        <ShieldCheck size={16} /> 帳號狀態
                                    </label>
                                    <div style={{
                                        fontWeight: 600,
                                        color: selectedMember.status === '活躍' ? '#22c55e' : '#ef4444',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.375rem'
                                    }}>
                                        {selectedMember.status}
                                    </div>
                                </div>
                                <div className="info-group" style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                                        <MapPin size={16} /> 通訊地址
                                    </label>
                                    <div style={{ fontWeight: 500, color: '#1e293b' }}>{selectedMember.address}</div>
                                </div>
                            </div>

                            <div style={{
                                marginTop: '2rem',
                                padding: '1.25rem',
                                background: '#f8fafc',
                                borderRadius: '1rem',
                                display: 'flex',
                                justifyContent: 'space-around'
                            }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>總預約次數</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>{selectedMember.totalBookings}</div>
                                </div>
                                <div style={{ width: '1px', background: '#e2e8f0' }} />
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>最後到訪</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{selectedMember.lastVisit}</div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                onClick={() => setSelectedMember(null)}
                                style={{ background: '#f1f5f9', color: '#475569' }}
                            >
                                關閉
                            </button>
                            <button
                                className="primary"
                                style={{
                                    background: selectedMember.status === '活躍' ? '#f1f5f9' : 'var(--primary-gradient)',
                                    color: selectedMember.status === '活躍' ? '#475569' : 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                                onClick={() => toggleStatus(selectedMember.id)}
                            >
                                <Power size={16} />
                                {selectedMember.status === '活躍' ? '切換為休眠' : '切換為活躍'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Members;


