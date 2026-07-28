import { RequireAuth } from "@/components/app/require-auth";

export default function ApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAuth>{children}</RequireAuth>;
}
