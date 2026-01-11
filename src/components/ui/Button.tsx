import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Button component with multiple variants and sizes
 * Supports all standard HTML button attributes
 */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "success";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  fullWidth?: boolean;
}

export default function Button({
  variant = "primary",
  size = "md",
  children,
  className,
  fullWidth = false,
  ...props
}: ButtonProps) {
  const baseStyles = "font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-[#DC2626] text-white hover:bg-[#B91C1C] focus:ring-[#DC2626]",
    secondary: "bg-[#F97316] text-white hover:bg-[#EA580C] focus:ring-[#F97316]",
    outline: "border-2 border-[#DC2626] text-[#DC2626] hover:bg-[#DC2626] hover:text-white focus:ring-[#DC2626]",
    ghost: "text-[#DC2626] hover:bg-red-50 focus:ring-[#DC2626]",
    success: "bg-[#10B981] text-white hover:bg-[#059669] focus:ring-[#10B981]",
  };
  
  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };
  
  return (
    <button
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

