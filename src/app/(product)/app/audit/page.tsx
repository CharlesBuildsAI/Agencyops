import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatClockWithPeriod, formatDayStamp } from "@/lib/time";

export default async function AuditPage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  const rows = await prisma.auditLog.findMany({
    where: { agencyId: user.agencyId },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  return (
    <section className="panel grow page">
      <h1>Audit log</h1>
      <p className="sub">Every draft, approval, send, sign-in, and blocked answer. Sends only appear after a yes.</p>
      {rows.length === 0 ? (
        <div className="empty"><h2>Nothing has happened yet.</h2><p>Replay Dana&apos;s call from the account menu and the trail starts here.</p></div>
      ) : (
        <table className="audit">
          <thead><tr><th>WHEN</th><th>WHO</th><th>ACTION</th><th>DETAIL</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="mono faint">{formatDayStamp(row.createdAt, user.agency.timezone)} {formatClockWithPeriod(row.createdAt, user.agency.timezone)}</td>
                <td>{row.actorName || row.actorType}</td>
                <td className="mono">{row.action}</td>
                <td>{row.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
