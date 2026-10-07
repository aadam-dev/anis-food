"use client";

import { Printer } from "lucide-react";
import { AdminButton } from "@/components/admin/ui";

export default function PrintButton() {
  return (
    <AdminButton onClick={() => window.print()}>
      <Printer className="h-4 w-4" /> Print the manual
    </AdminButton>
  );
}
