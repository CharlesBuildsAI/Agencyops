import { redirect } from "next/navigation";
import { HomeScreen } from "@/components/home-screen";
import { requireUser } from "@/lib/auth";
import { loadHome } from "@/lib/view";

export default async function HomePage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  const home = await loadHome(user.agencyId);
  return <HomeScreen home={home} />;
}
