import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-[95vw] sm:max-w-4xl",
};

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  className = "",
}) => {
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      setShouldRender(true);
      document.body.style.overflow = "hidden";
    } else {
      const timer = setTimeout(() => setShouldRender(false), 200);
      document.body.style.overflow = "unset";
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!mounted || !shouldRender) return null;

  return ReactDOM.createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-md"
      />

      <div
        className={`relative w-full ${sizeClasses[size]} bg-white dark:bg-[#0f1011] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden z-20 transition-all duration-300 transform ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'} ${className}`}
      >
        <div className="px-6 py-5 flex items-start justify-between">
          <div className="flex-1">
            {title && (
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/5 transition-all focus:outline-none"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="px-6 py-2 overflow-y-auto max-h-[70vh]">
          {children}
        </div>

        {footer && (
          <div className="px-6 py-5 mt-4 flex items-center justify-end gap-3 bg-gray-50/50 dark:bg-white/5 border-t border-gray-100 dark:border-white/10">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
