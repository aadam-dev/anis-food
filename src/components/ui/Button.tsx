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
  const baseStyles = "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] hover:scale-[1.02]";
  
  // Brand tokens, not literals — see the palette note in src/styles/globals.css.
  // Every variant here carries text, so all of them use the AA-compliant
  // --color-primary-red-ui rather than the brighter logo red.
  const variants = {
    primary:
      "bg-primary-red-ui text-white hover:bg-primary-red-dark focus:ring-primary-red-ui",
    secondary:
      "bg-accent-orange text-neutral-black hover:brightness-95 focus:ring-accent-orange",
    outline:
      "border-2 border-primary-red-ui text-primary-red-ui hover:bg-primary-red-ui hover:text-white focus:ring-primary-red-ui",
    ghost: "text-primary-red-ui hover:bg-red-50 focus:ring-primary-red-ui",
    success: "bg-success-cta text-white hover:brightness-95 focus:ring-success-cta",
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

