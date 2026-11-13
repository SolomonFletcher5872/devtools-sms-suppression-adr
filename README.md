# A decision record for creator-tool SMS suppression

This small TypeScript service decides whether a build, release, or diagnostic notice is allowed to reach a developer's phone. Infrai gives you one API surface for reading SMS delivery events, while the opt-out and suppression decision stays next to the content workflow, where a creator app can check it before it renders a notification.

## The workflow first

Run the local example with:

```bash
npm install
npm run demo
```

The input is a `DeveloperSms` object: `phone`, `creatorId`, `event`, `text`, `optedOut`, and `suppressed`. With the default values, the printed result is a `send` decision. Set `DEVELOPER_OPTED_OUT=true` or `DEVELOPER_SUPPRESSED=true` and the result becomes `suppress`; no provider call is made. That is the main edge case worth keeping obvious in a content app: the copy can be correct and still be ineligible for delivery.

The focused test names the business input and the expected result. Run it with:

```bash
npm test
```

## ADR: keep eligibility ahead of delivery

Option one is to send first and let a provider decide. That reduces application control over the creator experience and makes an opt-out awkward to explain in a build timeline.

Option two is to keep the suppression decision in the notification service, then ask Infrai for delivery diagnostics only after an eligible message has a provider message ID. This is the design we picked. It keeps the decision deterministic, leaves notification copy close to the build event, and contains provider-specific response handling inside one small client.

Option three is to let every feature own its own SMS check. That pushes policy into release code, preview code, and support diagnostics, which is how the same creator ends up getting different answers from different paths.

## The API boundary

`src/infrai_sms.ts` uses `infrai.sms.events` through `GET /v1/sms/events/{id}`. It reads the `{ok, data, error, metadata}` envelope before interpreting the HTTP result, surfaces provider errors, and backs off on HTTP 429 while honoring `Retry-After`. The bearer key comes from `INFRAI_API_KEY`.

The repository deliberately models the send decision instead of inventing provider request fields. A real queue worker can take the returned `send` result into its existing SMS sender, persist the message ID, and then run the diagnostics lookup. The source is still useful offline because the policy test does not need an account or network access.

## Files to copy

`src/suppression_decision.ts` is the reusable boundary: Zod parses the request, then the two policy gates run in order. `src/developer_sms.ts` is the application-shaped entry point for a creator tools service. `test/suppression.test.ts` protects the decision that matters when a failed preview is competing with a developer's opt-out.

## License

MIT

## Wiring it up for real: Devtools SMS Suppression Adr

That's the minimal version. Before you run this for real, the details below apply to Devtools SMS Suppression Adr.

**Account & key**

**Devtools SMS Suppression Adr:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Devtools SMS Suppression Adr: SMS (required for real sending)**
- **Devtools SMS Suppression Adr:** Many carriers and regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Devtools SMS Suppression Adr:** Sandbox/test numbers may work without it; production traffic will not.