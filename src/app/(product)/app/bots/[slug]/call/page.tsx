import { notFound, redirect } from "next/navigation";
import { CallScreen } from "@/components/call-screen";
import { requireUser } from "@/lib/auth";
import { loadDesk } from "@/lib/view";

export default async function CallPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  if (!user) redirect("/login");
  const { slug } = await params;
  const desk = await loadDesk(user.agencyId, slug);
  if (!desk) notFound();
  return <CallScreen call={desk.call} bot={desk.bot} />;
}
