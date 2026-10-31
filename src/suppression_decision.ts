import { z } from "zod";

export const developerSmsSchema = z.object({
  phone: z.string().min(7),
  creatorId: z.string().min(1),
  event: z.enum(["build_failed", "release_ready", "diagnostic"]),
  text: z.string().min(1),
  optedOut: z.boolean().default(false),
  suppressed: z.boolean().default(false),
});

export type DeveloperSms = z.infer<typeof developerSmsSchema>;
export type SmsDecision = { action: "send" | "suppress"; reason: string; phone: string; event: DeveloperSms["event"] };

export function decideDeveloperSms(input: unknown): SmsDecision {
  const message = developerSmsSchema.parse(input);
  if (message.optedOut) return { action: "suppress", reason: "developer opted out", phone: message.phone, event: message.event };
  if (message.suppressed) return { action: "suppress", reason: "number is on the suppression list", phone: message.phone, event: message.event };
  return { action: "send", reason: "eligible developer notification", phone: message.phone, event: message.event };
}
