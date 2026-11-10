import { redirect } from "next/navigation";
import { SetupWizard } from "@/components/setup-wizard";
import { prisma } from "@/lib/db";

export default async function SetupPage() {
  const existing = await prisma.user.count();
  if (existing > 0) redirect("/login");
  return <SetupWizard />;
}
