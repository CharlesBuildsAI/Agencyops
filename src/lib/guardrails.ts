const PROHIBITED: { reason: string; pattern: RegExp }[] = [
  { reason: "coverage-advice", pattern: /i recommend (this |that |the )?(coverage|policy|limit)/i },
  { reason: "coverage-advice", pattern: /you should (buy|carry|choose|drop|switch)/i },
  { reason: "coverage-advice", pattern: /best coverage for you/i },
  { reason: "binding", pattern: /you('re| are) bound/i },
  { reason: "binding", pattern: /i('ll| will) bind/i },
  { reason: "binding", pattern: /bind(ing)? (the |this |your )?policy/i },
  { reason: "premium", pattern: /final premium is/i },
  { reason: "premium", pattern: /i can quote you \$/i },
];

const CLAIMED_SEND = /\b(i['’]ve sent|i sent|i emailed them|i texted them|message sent|i already sent)\b/i;

export function findProhibitedAdvice(text: string) {
  for (const rule of PROHIBITED) {
    if (rule.pattern.test(text)) return rule.reason;
  }
  return null;
}

const HANDOFF =
  "I can't advise on coverage or bind a policy. I'll hand this to a licensed agent at the agency.";

export function guardOutboundText(text: string): { text: string; blocked: boolean; reason?: string } {
  const reason = findProhibitedAdvice(text);
  if (reason) return { text: HANDOFF, blocked: true, reason };
  if (CLAIMED_SEND.test(text)) {
    return {
      text: "I drafted that. Nothing goes out until you approve it.",
      blocked: true,
      reason: "claimed-send",
    };
  }
  return { text, blocked: false };
}
