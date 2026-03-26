"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-[#0a0a0a] text-white hover:bg-[#1f1f1f] shadow-sm",
      secondary: "bg-[#f1f5f9] text-[#0f172a] hover:bg-[#e2e8f0]",
      outline: "border border-[#e2e8f0] bg-transparent hover:bg-[#f8fafc] text-[#0f172a]",
      ghost: "bg-transparent hover:bg-[#f1f5f9] text-[#0f172a]",
      danger: "bg-[#ef4444] text-white hover:bg-[#dc2626]",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2",
      lg: "px-6 py-3 text-lg font-medium",
      icon: "p-2 aspect-square flex items-center justify-center",
    };

    const baseStyles = "relative inline-flex items-center justify-center rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0a0a0a] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97] cursor-pointer";

    return (
      <motion.button
        ref={ref as any}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || isLoading}
        {...(props as any)}
      >
        {isLoading && (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = "Button";
