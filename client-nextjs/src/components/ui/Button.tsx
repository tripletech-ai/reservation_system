"use client";

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-[#18181b] text-white hover:bg-[#27272a] shadow-sm",
      secondary: "bg-[#f4f4f5] text-[#18181b] hover:bg-[#e4e4e7]",
      outline: "border border-[#e4e4e7] bg-transparent hover:bg-[#f4f4f5] text-[#18181b]",
      ghost: "bg-transparent hover:bg-[#f4f4f5] text-[#18181b]",
      danger: "bg-[#ef4444] text-white hover:bg-[#dc2626]",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2",
      lg: "px-6 py-3 text-lg font-medium",
      icon: "p-2 aspect-square flex items-center justify-center",
    };

    const baseStyles = "relative inline-flex items-center justify-center rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0a0a0a] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97] hover:-translate-y-0.5 cursor-pointer";

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
