"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Dialog } from "./Dialog";
import { Button } from "./Button";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

type DialogType = "info" | "success" | "warning" | "error";

interface DialogOptions {
  title?: string;
  message: string;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
}

interface DialogContextType {
  showAlert: (options: DialogOptions | string) => void;
  showConfirm: (options: DialogOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<DialogOptions | null>(null);
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const showAlert = useCallback((opts: DialogOptions | string) => {
    const defaultOptions: DialogOptions = typeof opts === "string" 
      ? { message: opts, type: "info" } 
      : { ...opts, type: opts.type || "info" };
    
    setOptions(defaultOptions);
    setIsOpen(true);
    setResolvePromise(null);
  }, []);

  const showConfirm = useCallback((opts: DialogOptions) => {
    return new Promise<boolean>((resolve) => {
      setOptions({ ...opts, showCancel: true });
      setIsOpen(true);
      setResolvePromise(() => resolve);
    });
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    if (resolvePromise) resolvePromise(false);
  }, [resolvePromise]);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    if (options?.onConfirm) options.onConfirm();
    if (resolvePromise) resolvePromise(true);
  }, [options, resolvePromise]);

  const Icon = () => {
    switch (options?.type) {
      case "success": return <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />;
      case "warning": return <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />;
      case "error": return <XCircle className="w-12 h-12 text-red-500 mb-4" />;
      default: return <Info className="w-12 h-12 text-blue-500 mb-4" />;
    }
  };

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <Dialog
        isOpen={isOpen}
        onClose={handleClose}
        size="sm"
        title={options?.title || (options?.type === 'error' ? '發生錯誤' : options?.type === 'success' ? '完成' : '提示')}
        footer={
          <div className="flex w-full gap-3">
            {options?.showCancel && (
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                {options.cancelText || "取消"}
              </Button>
            )}
            <Button variant="primary" className="flex-1" onClick={handleConfirm}>
              {options?.confirmText || "確定"}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col items-center text-center py-4">
          <Icon />
          <p className="text-gray-600 dark:text-gray-300 font-medium whitespace-pre-wrap">
            {options?.message}
          </p>
        </div>
      </Dialog>
    </DialogContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(DialogContext);
  if (!context) throw new Error("useAlert must be used within a DialogProvider");
  return context;
};
