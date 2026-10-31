import test from "node:test";
import assert from "node:assert/strict";
import { decideDeveloperSms } from "../src/suppression_decision.ts";

test("an opted-out creator is suppressed before a build notification is sent", () => {
  const result = decideDeveloperSms({
    phone: "+15555550123", creatorId: "creator-7", event: "build_failed",
    text: "Preview build failed", optedOut: true, suppressed: false,
  });
  assert.deepEqual(result, { action: "suppress", reason: "developer opted out", phone: "+15555550123", event: "build_failed" });
});

test("a release notification is eligible when both gates are clear", () => {
  assert.equal(decideDeveloperSms({ phone: "+15555550123", creatorId: "creator-7", event: "release_ready", text: "Ready", optedOut: false, suppressed: false }).action, "send");
});
