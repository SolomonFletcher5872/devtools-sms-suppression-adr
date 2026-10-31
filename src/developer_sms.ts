import { decideDeveloperSms } from "./suppression_decision.ts";
import { readSmsEvents } from "./infrai_sms.ts";

const payload = {
  phone: process.env.DEVELOPER_PHONE ?? "+15555550100",
  creatorId: "creator-demo",
  event: "build_failed" as const,
  text: "The creator preview build needs attention.",
  optedOut: process.env.DEVELOPER_OPTED_OUT === "true",
  suppressed: process.env.DEVELOPER_SUPPRESSED === "true",
};

const decision = decideDeveloperSms(payload);
console.log(JSON.stringify({ workflow: "developer-tools-sms", decision }, null, 2));

const messageId = process.env.INFRAI_MESSAGE_ID;
if (messageId && decision.action === "send") {
  console.log(JSON.stringify({ diagnostics: await readSmsEvents(messageId) }, null, 2));
}
