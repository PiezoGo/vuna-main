import { AuthShell } from "@/components/layout/auth-shell";

export default function ChangePasswordLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
