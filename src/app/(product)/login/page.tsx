import { prisma } from "@/lib/db";
import { allowDemoCredentials } from "@/lib/demo-mode";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const empty = (await prisma.user.count()) === 0;
  return (
    <>
      <LoginForm showDemoHint={allowDemoCredentials() && !empty} />
      {empty && (
        <p className="hint" style={{ textAlign: "center" }}>
          <a href="/setup">Set up a new desk</a>
        </p>
      )}
    </>
  );
}
