import { redirect } from "next/navigation";
import { ConnectorButtons } from "@/components/editors";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const TILES: Record<string, { letters: string; bg: string }> = {
  gmail: { letters: "Gm", bg: "#ea4335" },
  calendar: { letters: "Ca", bg: "#3b82f6" },
  slack: { letters: "Sl", bg: "#7c5cbf" },
  ams360: { letters: "AM", bg: "#1b1b1f" },
  hawksoft: { letters: "Ha", bg: "#f08a24" },
  composio: { letters: "Co", bg: "#6b7280" },
};

export default async function ConnectorsPage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  const connectors = await prisma.connector.findMany({ where: { agencyId: user.agencyId }, orderBy: { name: "asc" } });
  const order = ["gmail", "calendar", "slack", "ams360", "hawksoft", "composio"];
  connectors.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  return (
    <section className="panel grow page">
      <h1>Connectors</h1>
      <p className="sub">Composio plus direct logins. Reading is instant; sending asks you first.</p>
      <div className="sheet">
        {connectors.map((connector) => {
          const tile = TILES[connector.key] ?? { letters: connector.name.slice(0, 2), bg: "#333" };
          return (
            <div className="conn" key={connector.id}>
              <span className="logo-tile" style={{ background: tile.bg }}>{tile.letters}</span>
              <span>
                <b>{connector.name}</b>
                <span>{connector.detail}</span>
              </span>
              <ConnectorButtons id={connector.key} status={connector.status} />
            </div>
          );
        })}
      </div>
      <div className="vault-note">
        <span><span className="tag-mini">VAULT</span> Carrier passwords stay in the Keychain. Models never see them.</span>
        <a className="btn btn-ghost btn-sm" href="/app/logins">Open Vault</a>
      </div>
    </section>
  );
}
