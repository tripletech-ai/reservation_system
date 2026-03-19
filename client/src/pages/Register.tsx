import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { User, Phone, Mail, Loader2, ListTodo, ArrowRight } from 'lucide-react';
import { generateUid } from '../utils/id';
import { callGasApi } from '../utils/database';

const Register: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // 取得從 Booking 傳過來的 state
    const { line_uid, manager_uid, questionnaire, return_url } = location.state || {};

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: ''
    });

    // questionnaire 解析
    const parsedQuestionnaire = useMemo(() => {
        if (!questionnaire) return [];
        try {
            return JSON.parse(questionnaire);
        } catch {
            return [];
        }
    }, [questionnaire]);

    // 用來儲存問卷答案的物件 { 題目 title: 選擇的 option.title 或 '__OTHER__' }
    const [answers, setAnswers] = useState<Record<string, string>>({});
    // 用來追蹤「其他」選項的手動輸入文字
    const [otherInputs, setOtherInputs] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAttempted, setIsAttempted] = useState(false);

    const isPhoneValid = useMemo(() => {
        if (!formData.phone) return false;
        const cleanPhone = formData.phone.replace(/[- ]/g, '');
        return /^09\d{8}$/.test(cleanPhone);
    }, [formData.phone]);

    const isEmailValid = useMemo(() => {
        if (!formData.email) return false;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
    }, [formData.email]);

    // 驗證問卷是不是全填了
    const isQuestionnaireComplete = useMemo(() => {
        for (const q of parsedQuestionnaire) {
            if (!answers[q.title]) return false;
            // 選了「其他」但沒填文字也算沒填好
            if (answers[q.title] === '__OTHER__' && !otherInputs[q.title]?.trim()) return false;
        }
        return true;
    }, [answers, otherInputs, parsedQuestionnaire]);

    const handleRegister = async () => {
        setIsAttempted(true);
        if (!formData.name || !isPhoneValid || !isEmailValid || !isQuestionnaireComplete) {
            return;
        }

        setIsSubmitting(true);
        try {
            const now = new Date().toISOString();
            const memberUid = generateUid();

            // 將回答組合成 [{title, ans}] 格式
            const finalAnswers = parsedQuestionnaire.map((q: any) => {
                const raw = answers[q.title];
                const ans = raw === '__OTHER__' ? (otherInputs[q.title]?.trim() || '') : (raw || '');
                return { title: q.title, ans };
            });
            const answersJsonString = JSON.stringify(finalAnswers);

            const data = {
                uid: memberUid,
                manager_uid: manager_uid || '',
                name: formData.name,
                line_uid: line_uid || '',
                phone: formData.phone.replace(/[- ]/g, ''),
                email: formData.email,
                questionnaire: answersJsonString,
                status: 1,
                create_at: now,
                update_at: now
            };

            const result = await callGasApi({
                action: 'insert',
                table: 'member',
                data: data
            });
            console.log(return_url);
            if (result !== null) {
                // 清除 Booking 頁面的快取，確保回去時重新 fetch（否則 is_member 仍是 false 會被踢回來）
                queryClient.removeQueries({ queryKey: ['booking_member_event'] });
                navigate(return_url || '/booking', { replace: true });
            } else {
                alert('系統忙碌中，註冊失敗，請重試！');
            }
        } catch (error) {
            alert('發生錯誤，請稍後再試。');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: '3rem', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ position: 'absolute', top: -100, right: -100, width: '40vw', height: '40vw', background: 'radial-gradient(circle, var(--primary-soft) 0%, transparent 70%)', zIndex: 0 }} />
            <div style={{ position: 'absolute', bottom: -50, left: -50, width: '30vw', height: '30vw', background: 'radial-gradient(circle, rgba(168, 85, 247, 0.05) 0%, transparent 70%)', zIndex: 0 }} />

            <div style={{ width: '100%', maxWidth: '520px', padding: '1rem', zIndex: 1, marginTop: '2rem' }}>
                <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>成為會員，開始預約</h1>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.4rem' }}>只需填寫基本資料與服務偏好，即可享受專屬服務！</p>
                </header>

                <div style={{ background: '#fff', borderRadius: '1.5rem', padding: '1.5rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Basic Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem', marginLeft: '0.2rem' }}>姓名*</label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                                    placeholder="您的稱呼"
                                    style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 2.8rem', borderRadius: '0.8rem', border: '2px solid', borderColor: isAttempted && !formData.name ? '#ef4444' : '#e2e8f0', background: '#f8fafc', fontSize: '0.95rem', outline: 'none' }}
                                />
                            </div>
                            {isAttempted && !formData.name && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.4rem', fontWeight: 600 }}>請輸入姓名</p>}
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem', marginLeft: '0.2rem' }}>電話*</label>
                            <div style={{ position: 'relative' }}>
                                <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                                    placeholder="09XX-XXX-XXX"
                                    style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 2.8rem', borderRadius: '0.8rem', border: '2px solid', borderColor: isAttempted && !isPhoneValid ? '#ef4444' : '#e2e8f0', background: '#f8fafc', fontSize: '0.95rem', outline: 'none' }}
                                />
                            </div>
                            {isAttempted && !isPhoneValid && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.4rem', fontWeight: 600 }}>請輸入正確格式的台灣手機號碼</p>}
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem', marginLeft: '0.2rem' }}>信箱*</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                                    placeholder="example@mail.com"
                                    style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 2.8rem', borderRadius: '0.8rem', border: '2px solid', borderColor: isAttempted && !isEmailValid ? '#ef4444' : '#e2e8f0', background: '#f8fafc', fontSize: '0.95rem', outline: 'none' }}
                                />
                            </div>
                            {isAttempted && !isEmailValid && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.4rem', fontWeight: 600 }}>請輸入正確的信箱格式</p>}
                        </div>
                    </div>

                    {parsedQuestionnaire.length > 0 && (
                        <>
                            <div style={{ height: '1px', background: '#e2e8f0', margin: '0.5rem 0' }} />

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <ListTodo size={18} /> 偏好問卷
                                </h2>

                                {parsedQuestionnaire.map((q: any, idx: number) => {
                                    const hasOptions = q.options && q.options.length > 0;
                                    // 沒有選項時自動標記為「其他」，方便驗證
                                    if (!hasOptions && answers[q.title] !== '__OTHER__') {
                                        setAnswers(prev => ({ ...prev, [q.title]: '__OTHER__' }));
                                    }
                                    return (
                                        <div key={idx}>
                                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '0.6rem' }}>
                                                {q.title}*
                                            </label>

                                            {hasOptions ? (
                                                <>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                        {q.options.map((opt: any, optIdx: number) => {
                                                            const isSelected = answers[q.title] === opt.title;
                                                            return (
                                                                <button
                                                                    key={optIdx}
                                                                    onClick={() => setAnswers(prev => ({ ...prev, [q.title]: opt.title }))}
                                                                    style={{
                                                                        padding: '0.5rem 1rem',
                                                                        borderRadius: '2rem',
                                                                        border: '2px solid',
                                                                        background: isSelected ? 'var(--primary)' : '#fff',
                                                                        borderColor: isSelected ? 'var(--primary)' : '#e2e8f0',
                                                                        color: isSelected ? '#fff' : '#64748b',
                                                                        fontWeight: 600,
                                                                        fontSize: '0.85rem',
                                                                        transition: 'all 0.2s',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    {opt.title}
                                                                </button>
                                                            )
                                                        })}
                                                        {/* 其他選項按鈕 */}
                                                        <button
                                                            onClick={() => setAnswers(prev => ({ ...prev, [q.title]: '__OTHER__' }))}
                                                            style={{
                                                                padding: '0.5rem 1rem',
                                                                borderRadius: '2rem',
                                                                border: '2px solid',
                                                                background: answers[q.title] === '__OTHER__' ? 'var(--primary)' : '#fff',
                                                                borderColor: answers[q.title] === '__OTHER__' ? 'var(--primary)' : '#e2e8f0',
                                                                color: answers[q.title] === '__OTHER__' ? '#fff' : '#64748b',
                                                                fontWeight: 600,
                                                                fontSize: '0.85rem',
                                                                transition: 'all 0.2s',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            其他
                                                        </button>
                                                    </div>
                                                    {isAttempted && !answers[q.title] && (
                                                        <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.4rem', fontWeight: 600 }}>請選擇一個選項</p>
                                                    )}
                                                </>
                                            ) : null}

                                            {/* 其他/無選項時顯示 input */}
                                            {(answers[q.title] === '__OTHER__' || !hasOptions) && (
                                                <input
                                                    type="text"
                                                    autoFocus={hasOptions} // 有選項時才 autoFocus，無選項本來就預設顯示
                                                    placeholder="請填寫您的答案"
                                                    value={otherInputs[q.title] || ''}
                                                    onChange={(e) => setOtherInputs(prev => ({ ...prev, [q.title]: e.target.value }))}
                                                    style={{
                                                        marginTop: hasOptions ? '0.5rem' : '0',
                                                        width: '100%',
                                                        padding: '0.6rem 0.85rem',
                                                        borderRadius: '0.75rem',
                                                        border: '2px solid',
                                                        borderColor: isAttempted && !otherInputs[q.title]?.trim() ? '#ef4444' : '#e2e8f0',
                                                        background: '#f8fafc',
                                                        fontSize: '0.9rem',
                                                        outline: 'none'
                                                    }}
                                                />
                                            )}
                                            {isAttempted && answers[q.title] === '__OTHER__' && !otherInputs[q.title]?.trim() && (
                                                <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.4rem', fontWeight: 600 }}>請填寫內容</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    <button
                        onClick={handleRegister}
                        disabled={isSubmitting}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            background: isSubmitting ? '#cbd5e1' : 'var(--primary-gradient)',
                            color: 'white',
                            borderRadius: '1rem',
                            fontWeight: 800,
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            boxShadow: isSubmitting ? 'none' : '0 8px 20px -5px rgba(99, 102, 241, 0.4)',
                            transition: 'all 0.3s',
                            marginTop: '1rem',
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            border: 'none',
                        }}
                    >
                        {isSubmitting ? (
                            <><Loader2 size={20} className="animate-spin" /> 處理中...</>
                        ) : (
                            <>送出資料 <ArrowRight size={20} /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Register;
