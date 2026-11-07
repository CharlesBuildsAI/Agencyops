import { authed } from "@/lib/http";

export async function GET(request: Request) {
  const { user, error } = await authed();
  if (!user) return error;
  const base = process.env.APP_URL || new URL(request.url).origin;
  const url = `${base}/app`;
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>URL</key><string>${url}</string></dict></plist>
`;
  const safe = user.agency.productName.replace(/[^\w.-]+/g, "") || "AgencyOps";
  return new Response(plist, {
    headers: {
      "content-type": "application/xml",
      "content-disposition": `attachment; filename="${safe}.webloc"`,
    },
  });
}
