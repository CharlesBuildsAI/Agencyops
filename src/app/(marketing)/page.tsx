import fs from "node:fs";
import path from "node:path";

export default function MarketingPage() {
  const html = fs.readFileSync(path.join(process.cwd(), "content/site-body.html"), "utf8");
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
