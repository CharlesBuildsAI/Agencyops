import { redirect } from "next/navigation";
import { BrandForm } from "@/components/editors";
import { requireUser } from "@/lib/auth";

const SWATCHES = [
  { name: "moonlit text", color: "#F3F5F8" },
  { name: "surface", color: "#2A2C33" },
  { name: "midnight", color: "#0A0A0C" },
  { name: "starlight", color: "#E6F08A" },
  { name: "moon", color: "#C5D0E4" },
];

export default async function BrandPage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  return (
    <section className="panel grow page">
      <h1>Brand</h1>
      <p className="sub">White-label for {user.agency.name}. Highlighter still marks only what needs you.</p>
      <div className="brand-grid">
        <div className="sheet" style={{ padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Workspace</h2>
          <div className="kv"><span>Product</span><b>{user.agency.productName}</b></div>
          <div className="kv"><span>Client</span><b>{user.agency.name}</b></div>
          <div className="kv"><span>Mark</span><span className="mark">{user.agency.mark}</span></div>
          <div style={{ marginTop: 16 }}>
            <BrandForm
              initial={{
                name: user.agency.name,
                productName: user.agency.productName,
                mark: user.agency.mark,
                accentColor: user.agency.accentColor,
              }}
            />
          </div>
        </div>
        <div className="sheet" style={{ padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Palette roles</h2>
          <div className="swatches">
            {SWATCHES.map((swatch) => (
              <span key={swatch.name} className="swatch" style={{ background: swatch.color }} title={swatch.name} />
            ))}
          </div>
          <p className="faint mono">moonlit text · surface · midnight · starlight · moon</p>
        </div>
      </div>
      <div className="download">
        <span className="row" style={{ gap: 10 }}>
          <span className="mark">{user.agency.mark}</span>
          <span><b>{user.agency.productName} for {user.agency.name}</b><small className="faint" style={{ display: "block" }}>A team of AI bots for your agency ops</small></span>
        </span>
        <a className="btn btn-accent" href="/api/brand/mac">Download for Mac</a>
      </div>
    </section>
  );
}
