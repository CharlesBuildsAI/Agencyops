import {
  mobilerunGlobal,
  mobilerunInstallApp,
  mobilerunOpenApp,
  mobilerunSwipe,
  mobilerunTap,
  mobilerunType,
  mobilerunUiState,
} from "./providers";
import { secret } from "./runtime-secrets";

export type PhoneCommand = {
  op: "observe" | "tap" | "swipe" | "type" | "open_app" | "install_app" | "key";
  x?: number;
  y?: number;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  duration?: number;
  text?: string;
  packageName?: string;
  via?: "api" | "play";
  key?: "back" | "home";
};

type Node = {
  text?: string;
  contentDescription?: string;
  isClickable?: boolean;
  children?: Node[] | null;
};

function summarizeScreen(json: Record<string, unknown>) {
  const phone = json.phone_state as { currentApp?: string; packageName?: string } | undefined;
  const lines: string[] = [];
  const walk = (node: Node | undefined, depth: number) => {
    if (!node || depth > 8 || lines.length >= 24) return;
    const label = node.text || node.contentDescription || "";
    if (label && node.isClickable) lines.push(label);
    for (const child of node.children || []) walk(child, depth + 1);
  };
  walk(json.a11y_tree as Node | undefined, 0);
  const app = phone?.currentApp || phone?.packageName || "the home screen";
  return `On ${app}. Controls: ${lines.join(" | ") || "none listed"}.`;
}

export async function runPhoneCommand(device: { provider: string; deviceId: string }, command: PhoneCommand) {
  if (!device.deviceId || device.provider === "mock" || !device.provider) {
    if (command.op === "observe") {
      return { ok: true, sandbox: true, detail: "Demo Android phone. Home screen, no carrier line, no signed-in accounts." };
    }
    return { ok: true, sandbox: true, detail: "Demo Android phone. Nothing was sent to a real device." };
  }
  if (device.provider === "limrun") {
    return {
      ok: false,
      sandbox: false,
      detail: "Limrun can create and delete the Android phone. Screen control (screenshot tree, tap, swipe, type, keys, install) is not on its management API. Use Mobilerun for those tools.",
    };
  }
  const apiKey = secret("MOBILERUN_CLOUD_API_KEY");
  if (!apiKey) return { ok: false, sandbox: true, detail: "Mobilerun key is missing. The phone was not touched." };
  const id = device.deviceId;
  if (command.op === "observe") {
    const state = await mobilerunUiState(apiKey, id);
    return { ok: true, sandbox: false, detail: summarizeScreen(state) };
  }
  if (command.op === "tap") {
    await mobilerunTap(apiKey, id, command.x || 0, command.y || 0);
    return { ok: true, sandbox: false, detail: `Tapped ${command.x}, ${command.y}.` };
  }
  if (command.op === "swipe") {
    await mobilerunSwipe(apiKey, id, {
      startX: command.startX || 0,
      startY: command.startY || 0,
      endX: command.endX || 0,
      endY: command.endY || 0,
      duration: command.duration || 300,
    });
    return { ok: true, sandbox: false, detail: "Swiped." };
  }
  if (command.op === "type") {
    await mobilerunType(apiKey, id, command.text || "");
    return { ok: true, sandbox: false, detail: "Typed into the focused field." };
  }
  if (command.op === "open_app") {
    await mobilerunOpenApp(apiKey, id, command.packageName || "");
    return { ok: true, sandbox: false, detail: `Opened ${command.packageName}.` };
  }
  if (command.op === "install_app") {
    if (command.via === "play") {
      await mobilerunOpenApp(apiKey, id, "com.android.vending");
      return { ok: true, sandbox: false, detail: "Play Store is open. The Install button still needs its own approved tap." };
    }
    await mobilerunInstallApp(apiKey, id, command.packageName || "");
    return { ok: true, sandbox: false, detail: `Install requested for ${command.packageName}. Mobilerun only installs an APK already in the account library.` };
  }
  await mobilerunGlobal(apiKey, id, command.key === "home" ? 2 : 1);
  return { ok: true, sandbox: false, detail: command.key === "home" ? "Home." : "Back." };
}
