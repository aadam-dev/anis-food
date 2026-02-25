"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";

interface OrderButtonProps {
  itemCount?: number;
  variant?: "primary" | "success";
}

export default function OrderButton({ itemCount = 0, variant = "success" }: OrderButtonProps) {
  return (
    <Link href="/order">
      <Button variant={variant} size="md" className="relative">
        <ShoppingCart className="w-5 h-5 mr-2 inline" />
        Order Now
        {itemCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-[#F97316] text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {itemCount}
          </span>
        )}
      </Button>
    </Link>
  );
}

