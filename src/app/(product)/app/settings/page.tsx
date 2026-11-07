import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

const LINKS = [
  ["/app/connectors", "Connectors", "Gmail, AMS, HawkSoft, Composio"],
  ["/app/usage", "Usage & budgets", "Caps and a hard stop"],
  ["/app/brand", "Brand", "Name, mark, accent"],
  ["/app/memory", "Memory", "Notes the bots can read"],
  ["/app/logins", "Logins", "Vault references, no passwords"],
  ["/app/audit", "Audit log", "Every action"],
];

export default async function SettingsPage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  return (
    <section className="panel grow page">
      <h1>Settings</h1>
      <p className="sub">{user.agency.name} · signed in as {user.name}</p>
      <div className="settings-list">
        {LINKS.map(([href, label, detail]) => (
          <a key={href} href={href}><span><b>{label}</b><small className="faint" style={{ display: "block" }}>{detail}</small></span></a>
        ))}
      </div>
    </section>
  );
}
