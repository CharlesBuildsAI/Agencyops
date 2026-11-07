import { redirect } from "next/navigation";
import { VaultForm } from "@/components/editors";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function LoginsPage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  const entries = await prisma.vaultEntry.findMany({ where: { agencyId: user.agencyId }, orderBy: { createdAt: "asc" } });
  return (
    <section className="panel grow page">
      <h1>Logins</h1>
      <p className="sub">Carrier passwords stay in the keychain. The desk stores a label only, so a model never sees the secret.</p>
      {entries.length === 0 && (
        <div className="empty"><h2>No portal references yet.</h2><p>Add the name of a carrier portal. Type the password into the keychain on the computer, not here.</p></div>
      )}
      <div className="sheet">
        {entries.map((entry) => (
          <div className="conn" key={entry.id}>
            <span className="logo-tile" style={{ background: "#222" }}>••</span>
            <span>
              <b>{entry.label}</b>
              <span>{entry.username || "Username on file"} · secret ref {entry.secretRef}</span>
            </span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, maxWidth: 480 }}>
        <VaultForm />
      </div>
    </section>
  );
}
