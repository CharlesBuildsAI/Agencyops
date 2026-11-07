import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { ChatScreen } from "@/components/chat-screen";
import { requireUser } from "@/lib/auth";
import { loadDesk } from "@/lib/view";

export default async function BotPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  if (!user) redirect("/login");
  const { slug } = await params;
  const desk = await loadDesk(user.agencyId, slug);
  if (!desk) notFound();
  return (
    <Suspense fallback={<section className="panel grow"><p className="muted" style={{ padding: 24 }}>Opening the desk…</p></section>}>
      <ChatScreen desk={desk} />
    </Suspense>
  );
}
