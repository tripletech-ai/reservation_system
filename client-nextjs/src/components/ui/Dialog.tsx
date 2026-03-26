"use client";

import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

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

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              transition: { type: "spring", damping: 25, stiffness: 350 } 
            }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className={`relative w-full ${sizeClasses[size]} bg-white dark:bg-[#0f1011] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden z-20 ${className}`}
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
                <X className="w-5 h-5" />
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
