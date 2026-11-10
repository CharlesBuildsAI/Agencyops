import type { Bot } from "@prisma/client";
import {
  createAgentMailInbox,
  createAgentPhoneNumber,
  createLimrunPhone,
  createMobilerunPhone,
  createOrgoComputer,
  createTwilioNumber,
  deleteAgentMailInbox,
  deleteAgentPhoneNumber,
  deleteLimrunPhone,
  deleteMobilerunPhone,
  deleteOrgoComputer,
  deleteTwilioNumber,
  listComposio,
  mobilerunIncludedNumber,
} from "./providers";
import { secret } from "./runtime-secrets";

export type ProvisionState = {
  mail?: string;
  phone?: string;
  orgo?: string;
  composio?: string;
};

export function readProvision(raw: string): ProvisionState {
  try {
    const parsed = JSON.parse(raw) as ProvisionState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function fail(error: unknown) {
  return error instanceof Error ? error.message : "The provider request failed.";
}

export async function provisionBot(bot: Pick<Bot, "id" | "name" | "slug" | "mailInboxId" | "phoneNumberId" | "orgoComputerId"> & { phoneDeviceId?: string; phoneProvider?: string }) {
  const errors: ProvisionState = {};
  let email = "";
  let mailInboxId = bot.mailInboxId;
  let phone = "";
  let phoneNumberId = bot.phoneNumberId;
  let phoneDeviceId = bot.phoneDeviceId || "";
  let phoneProvider = bot.phoneProvider || "";
  let orgoComputerId = bot.orgoComputerId;
  let orgoStatus = "";
  let composioSummary = "";

  const mailKey = secret("AGENTMAIL_API_KEY");
  if (!mailKey) {
    errors.mail = "AgentMail was skipped. This agent has no inbox until you add a key and retry.";
  } else if (!mailInboxId) {
    try {
      const inbox = await createAgentMailInbox({ apiKey: mailKey, name: bot.name, clientId: `ao-${bot.id}` });
      email = inbox.email;
      mailInboxId = inbox.inboxId;
    } catch (error) {
      errors.mail = fail(error);
    }
  }

  const mobilerunKey = secret("MOBILERUN_CLOUD_API_KEY");
  const limrunKey = secret("LIM_API_KEY");
  if (!phoneDeviceId && mobilerunKey) {
    try {
      const device = await createMobilerunPhone({ apiKey: mobilerunKey, name: bot.name, idempotencyKey: `ao-phone-${bot.id}` });
      phoneDeviceId = device.id;
      phoneProvider = "mobilerun";
    } catch (error) {
      errors.phone = fail(error);
    }
  } else if (!phoneDeviceId && limrunKey) {
    try {
      const device = await createLimrunPhone({ apiKey: limrunKey, name: bot.slug });
      phoneDeviceId = device.id;
      phoneProvider = "limrun";
    } catch (error) {
      errors.phone = fail(error);
    }
  } else if (!phoneDeviceId) {
    errors.phone = "No Android phone key. This agent stays on the demo phone until you add Mobilerun or Limrun and retry.";
  }

  const phoneKey = secret("AGENTPHONE_API_KEY");
  const twilioSid = secret("TWILIO_ACCOUNT_SID");
  const twilioToken = secret("TWILIO_AUTH_TOKEN");
  if (!phone && phoneProvider === "mobilerun" && mobilerunKey) {
    try {
      const bought = await mobilerunIncludedNumber(mobilerunKey, bot.slug);
      if (bought.checkoutUrl) {
        errors.phone = "Mobilerun would start a paid number checkout. No number was bought. Add AgentPhone or Twilio to give this phone a line.";
      } else if (bought.numberId) {
        phoneNumberId = bought.numberId;
        phone = bought.state === "provisioning" ? "Number provisioning" : bought.numberId;
      }
    } catch {
      errors.phone = "Mobilerun's eSIM list has no dialable number, and an included number was not available.";
    }
  }
  if (!phone && !phoneNumberId && phoneKey) {
    try {
      const number = await createAgentPhoneNumber({ apiKey: phoneKey, externalId: bot.id });
      phone = number.phoneNumber;
      phoneNumberId = number.id;
    } catch (error) {
      errors.phone = fail(error);
    }
  } else if (!phoneNumberId && twilioSid && twilioToken) {
    try {
      const number = await createTwilioNumber(twilioSid, twilioToken);
      phone = number.phoneNumber;
      phoneNumberId = number.id;
    } catch (error) {
      errors.phone = fail(error);
    }
  } else if (!phone && !phoneNumberId && !errors.phone) {
    errors.phone = "This Android phone has no dialable number yet. Mobilerun eSIM records do not include one. Add AgentPhone or Twilio, or buy a Mobilerun number, then retry.";
  }

  const orgoKey = secret("ORGO_API_KEY");
  if (!orgoKey) {
    errors.orgo = "Orgo was skipped. This agent has no extra desktop computer.";
  } else if (!orgoComputerId) {
    try {
      const computer = await createOrgoComputer({ apiKey: orgoKey, name: bot.slug });
      orgoComputerId = computer.id;
      orgoStatus = computer.status;
    } catch (error) {
      errors.orgo = fail(error);
    }
  }

  const composioKey = secret("COMPOSIO_API_KEY");
  if (!composioKey) {
    errors.composio = "Composio was skipped. Connect apps later from the agent's card.";
  } else {
    try {
      composioSummary = await listComposio(composioKey);
    } catch (error) {
      errors.composio = fail(error);
    }
  }

  return {
    email,
    phone,
    mailInboxId,
    phoneNumberId,
    phoneDeviceId,
    phoneProvider,
    orgoComputerId,
    orgoStatus,
    composioSummary,
    provisionJson: JSON.stringify(errors),
    statusLine: errors.mail || errors.phone || errors.orgo ? "A service still needs a retry." : "Ready",
  };
}

export async function releaseBotResources(bot: Pick<Bot, "mailInboxId" | "phoneNumberId" | "orgoComputerId" | "phoneDeviceId" | "phoneProvider">) {
  const errors: string[] = [];
  const mailKey = secret("AGENTMAIL_API_KEY");
  if (bot.mailInboxId && mailKey) {
    try {
      await deleteAgentMailInbox(mailKey, bot.mailInboxId);
    } catch (error) {
      errors.push(fail(error));
    }
  }
  const phoneKey = secret("AGENTPHONE_API_KEY");
  if (bot.phoneNumberId && phoneKey) {
    try {
      await deleteAgentPhoneNumber(phoneKey, bot.phoneNumberId);
    } catch (error) {
      errors.push(fail(error));
    }
  } else if (bot.phoneNumberId && secret("TWILIO_ACCOUNT_SID") && secret("TWILIO_AUTH_TOKEN")) {
    try {
      await deleteTwilioNumber(secret("TWILIO_ACCOUNT_SID"), secret("TWILIO_AUTH_TOKEN"), bot.phoneNumberId);
    } catch (error) {
      errors.push(fail(error));
    }
  }
  if (bot.phoneDeviceId && bot.phoneProvider === "mobilerun" && secret("MOBILERUN_CLOUD_API_KEY")) {
    try {
      await deleteMobilerunPhone(secret("MOBILERUN_CLOUD_API_KEY"), bot.phoneDeviceId);
    } catch (error) {
      errors.push(fail(error));
    }
  }
  if (bot.phoneDeviceId && bot.phoneProvider === "limrun" && secret("LIM_API_KEY")) {
    try {
      await deleteLimrunPhone(secret("LIM_API_KEY"), bot.phoneDeviceId);
    } catch (error) {
      errors.push(fail(error));
    }
  }
  const orgoKey = secret("ORGO_API_KEY");
  if (bot.orgoComputerId && orgoKey) {
    try {
      await deleteOrgoComputer(orgoKey, bot.orgoComputerId);
    } catch (error) {
      errors.push(fail(error));
    }
  }
  return errors;
}
