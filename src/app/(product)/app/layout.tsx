import { redirect } from "next/navigation";
import { AppFrame } from "@/components/app-frame";
import { requireUser } from "@/lib/auth";
import { loadFrame } from "@/lib/view";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user) redirect("/login");
  const frame = await loadFrame(user);
  return <AppFrame frame={frame}>{children}</AppFrame>;
}
