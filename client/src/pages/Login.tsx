import React, { useState } from 'react';
import { LogIn, User, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { callGasApi } from '../utils/database';
import { useAuth } from '../utils/auth';

const Login: React.FC = () => {
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const formData = new FormData(e.currentTarget);
        const account = formData.get('account') as string;
        const password = formData.get('password') as string;

        try {
            // 從 manager 表檢查帳號密碼
            const result = await callGasApi<any[]>({
                action: "select",
                table: 'manager',
                where: `account = '${account}' AND password = '${password}' LIMIT 1`
            });

            if (result && result.length > 0) {
                login(result[0]); // 儲存 Session
                window.location.href = '/admin/members';
            } else {
                setError('帳號或密碼錯誤');
            }
        } catch (err) {
            setError('連線伺服器失敗，請稍後再試');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-gradient)',
            padding: '1rem'
        }}>
            <div className="glass-card" style={{
                width: '100%',
                maxWidth: '400px',
                padding: '2.5rem',
                color: 'white',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        background: 'var(--primary)',
                        width: '60px',
                        height: '60px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                        boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
                    }}>
                        <LogIn size={32} />
                    </div>
                    <h1 style={{
                        fontSize: '1.875rem',
                        fontWeight: 700,
                        marginBottom: '0.5rem',
                        background: 'var(--primary-gradient)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>歡迎回來</h1>
                    <p style={{ color: 'var(--text-muted)' }}>請登錄您的管理帳戶</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ position: 'relative' }}>
                        <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            required
                            name='account'
                            type="text"
                            placeholder="帳號"
                            style={{ width: '100%', paddingLeft: '2.75rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '0.5rem', padding: '0.75rem 0.75rem 0.75rem 2.75rem', color: 'black' }}
                        />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            required
                            name='password'
                            type="password"
                            placeholder="密碼"
                            style={{ width: '100%', paddingLeft: '2.75rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '0.5rem', padding: '0.75rem 0.75rem 0.75rem 2.75rem', color: 'black' }}
                        />
                    </div>

                    {error && (
                        <div style={{ color: '#ef4444', fontSize: '0.875rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>
                            {error}
                        </div>
                    )}

                    <button type="submit" disabled={isLoading} style={{
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        padding: '0.875rem',
                        borderRadius: '0.5rem',
                        fontWeight: 600,
                        fontSize: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        marginTop: '0.5rem',
                        opacity: isLoading ? 0.7 : 1,
                        cursor: isLoading ? 'not-allowed' : 'pointer'
                    }}>
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : '立即登錄'}
                        {!isLoading && <ArrowRight size={18} />}
                    </button>
                </form>

            </div>
        </div>
    );
};

export default Login;
