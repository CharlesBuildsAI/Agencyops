export type DesktopScreen = {
  id: string;
  label: string;
  tint: string;
};

export interface ComputerAdapter {
  readonly id: "stub" | "orgo";
  listScreens(computerJson: string): DesktopScreen[];
}

const FALLBACK: DesktopScreen[] = [];

export function readScreens(computerJson: string): DesktopScreen[] {
  try {
    const parsed = JSON.parse(computerJson) as { screens?: DesktopScreen[] };
    if (parsed.screens && parsed.screens.length > 0) return parsed.screens;
  } catch {
    /* use fallback */
  }
  return FALLBACK;
}

export class StubComputerAdapter implements ComputerAdapter {
  readonly id = "stub" as const;

  listScreens(computerJson: string) {
    return readScreens(computerJson);
  }
}

/** Stable seam for a later Orgo virtual desktop. v1 renders the local activity desktop. */
export class OrgoComputerAdapter implements ComputerAdapter {
  readonly id = "orgo" as const;

  listScreens(computerJson: string) {
    return readScreens(computerJson);
  }
}

export function getComputerAdapter(): ComputerAdapter {
  if ((process.env.COMPUTER_PROVIDER || "stub") === "orgo") return new OrgoComputerAdapter();
  return new StubComputerAdapter();
}
