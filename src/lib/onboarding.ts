import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { provisionBot } from "./provision";
import { setRuntimeSecrets } from "./runtime-secrets";
import { STARTER_AGENTS } from "./starters";
import { seedRivera } from "../../prisma/seed";

const COLORS = ["#2F62E6", "#3A6AE8", "#345EDC", "#4872EA", "#2A56D4", "#4E78EC"];

export function slugify(value: string) {
  const base = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return base || "desk";
}

export async function deskIsEmpty() {
  return (await prisma.user.count()) === 0;
}

export type SetupSecrets = {
  agentmail?: string;
  mobilerun?: string;
  limrun?: string;
  agentphone?: string;
  twilioSid?: string;
  twilioToken?: string;
  orgo?: string;
  composio?: string;
  llm?: string;
};

export function rememberSecrets(input: SetupSecrets) {
  const llm = input.llm?.trim() || "";
  setRuntimeSecrets({
    AGENTMAIL_API_KEY: input.agentmail || "",
    MOBILERUN_CLOUD_API_KEY: input.mobilerun || "",
    LIM_API_KEY: input.limrun || "",
    AGENTPHONE_API_KEY: input.agentphone || "",
    AGENTPHONE_BASE_URL: "https://api.agentphone.ai",
    TWILIO_ACCOUNT_SID: input.twilioSid || "",
    TWILIO_AUTH_TOKEN: input.twilioToken || "",
    ORGO_API_KEY: input.orgo || "",
    COMPOSIO_API_KEY: input.composio || "",
    ANTHROPIC_API_KEY: llm.startsWith("sk-ant-") ? llm : "",
    OPENAI_API_KEY: llm && !llm.startsWith("sk-ant-") ? llm : "",
    LLM_PROVIDER: llm ? "auto" : "mock",
    CHANNEL_MODE: input.agentmail || input.agentphone || input.twilioSid ? "live" : "mock",
  });
}

export async function createDesk(input: {
  businessName: string;
  industry: string;
  accentColor: string;
  ownerName: string;
  email: string;
  password: string;
  agentIds: string[];
  secrets: SetupSecrets;
}) {
  if (!(await deskIsEmpty())) throw new Error("This computer already has a desk.");
  rememberSecrets(input.secrets);
  const slug = slugify(input.businessName);
  const agency = await prisma.agency.create({
    data: {
      name: input.businessName.trim(),
      slug,
      mark: input.businessName.trim().slice(0, 1).toUpperCase() || "A",
      accentColor: input.accentColor,
      industry: input.industry.trim(),
      setupComplete: true,
    },
  });
  const user = await prisma.user.create({
    data: {
      agencyId: agency.id,
      email: input.email.trim().toLowerCase(),
      name: input.ownerName.trim(),
      passwordHash: await bcrypt.hash(input.password, 10),
      role: "OWNER",
    },
  });
  const chosen = STARTER_AGENTS.filter((agent) => input.agentIds.includes(agent.id));
  const bots = [];
  for (const [index, agent] of chosen.entries()) {
    const bot = await prisma.bot.create({
      data: {
        agencyId: agency.id,
        slug: agent.id,
        name: agent.name,
        roleTitle: agent.roleTitle,
        blurb: agent.blurb,
        color: COLORS[index % COLORS.length],
        instructions: `You handle ${agent.roleTitle.toLowerCase()} for ${agency.name}. Draft anything a customer would receive and wait for approval.`,
        monthlyCapCents: 10000,
        sortOrder: index,
        statusLine: "Setting up",
      },
    });
    const resources = await provisionBot(bot);
    const updated = await prisma.bot.update({
      where: { id: bot.id },
      data: {
        email: resources.email,
        phone: resources.phone,
        mailInboxId: resources.mailInboxId,
        phoneNumberId: resources.phoneNumberId,
        phoneDeviceId: resources.phoneDeviceId,
        phoneProvider: resources.phoneProvider,
        orgoComputerId: resources.orgoComputerId,
        orgoStatus: resources.orgoStatus,
        composioSummary: resources.composioSummary,
        provisionJson: resources.provisionJson,
        statusLine: resources.statusLine,
      },
    });
    bots.push(updated);
  }
  return { agency, user, bots };
}

export async function loadInsuranceSample() {
  if (!(await deskIsEmpty())) throw new Error("This computer already has a desk.");
  await seedRivera();
}
