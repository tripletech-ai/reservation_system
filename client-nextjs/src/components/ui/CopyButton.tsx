"use client";

import { useState } from 'react';
export default function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (typeof window === 'undefined') return;

        try {
            // 關鍵修正：優先複製傳入的 text，如果 text 為空才複製當前網址
            const contentToCopy = text || window.location.href;

            await navigator.clipboard.writeText(contentToCopy);
            setCopied(true);

            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('無法複製內容:', err);
        }
    };

    return (
        <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200
                ${copied
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                    : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/20 hover:text-white'
                }`}
        >
            {/* 圖示隨狀態切換 */}
            {copied ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            )}

            <span className="text-sm font-medium">
                {copied ? '已複製連接' : 'Line Webhook 連接'}
            </span>
        </button>
    );
}