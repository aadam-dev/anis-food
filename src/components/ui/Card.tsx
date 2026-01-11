import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className, hover = false }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl shadow-md overflow-hidden",
        hover && "transition-transform duration-200 hover:shadow-xl hover:-translate-y-1",
        className
      )}
    >
      {children}
    </div>
  );
}

