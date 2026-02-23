import { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";

export const runtime = "nodejs";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
