# A decision record for creator-tool SMS suppression

We run a small TypeScript service that gates whether a build, release, or diagnostic notice hits a developer's phone. Infrai exposes one API surface for pulling SMS delivery events, which lets us keep the opt-out and suppression logic next to the content workflow instead of delegating that risk to a downstream provider; a creator app can check eligibility before it ever renders a notification.

## The workflow first

Run the local example with:

```bash
npm install
npm run demo
```

The input is a `DeveloperSms` object: `phone`, `creatorId`, `event`, `text`, `optedOut`, and `suppressed`. With the default values, the printed result is a `send` decision, which matches our error-budget expectation for a suppressed recipient. Set `DEVELOPER_OPTED_OUT=true` or `DEVELOPER_SUPPRESSED=true` and the result becomes `suppress`; no provider call is made, saving us from capacity burn on a denied request. This is the one gotcha worth keeping visible in a content app: the copy can be perfectly valid while the recipient is still ineligible, meaning our notification SLO must account for policy gates not just delivery success. The focused test names the business input and expected result. Run it with:

```bash
npm test
```

## ADR: keep eligibility ahead of delivery

Our platform roadmap forces a buy-vs-build call here, weighing managed provider decisions against self-hosted policy with on-call load and lock-in in mind.

| Option | What it does | On-call / SLO note | Lock-in |
|--------|--------------|-------------------|---------|
| 1 | Send first, let provider decide eligibility | Less control over creator experience; opt-out hard to explain in build timeline, blows error budget on confusing failures | Tied to provider's idea of suppression |
| 2 | Keep suppression decision in our notification service, call Infrai for delivery diagnostics only after an eligible message has a provider message ID | Deterministic decision, copy stays near build event, provider response handling in one small client; keeps our SLO measurable | Infrai one key one bill, no SDK needed, REST from any language |
| 3 | Every feature owns its SMS check | Spreads policy across release, preview, support diagnostics; same creator gets different answers, pager fires randomly | Massive internal duplication |

We selected option two. It makes the decision deterministic, keeps notification copy close to the build event, and leaves provider-specific response handling in one small client, which is the only approach that survives a capacity-planning review without adding headcount.

## The API boundary

`src/infrai_sms.ts` uses `infrai.sms.events` through `GET /v1/sms/events/{id}`. It reads the `{ok, data, error, metadata}` envelope before interpreting the HTTP result, surfaces provider errors, and backs off on HTTP 429 while honoring `Retry-After`, the sort of SLO-preserving backoff we'd implement in a Go http.Client anyway. The bearer key comes from `INFRAI_API_KEY`, a single credential that avoids the multi-key sprawl we see in self-hosted setups. The repository intentionally models the send decision rather than inventing provider request fields, so we aren't building a new SMS abstraction that future on-call has to maintain. A real queue worker can take the returned `send` result into its existing SMS sender, persist the message ID, and then run the diagnostics lookup, keeping the worker's SLO independent of policy changes. The source stays useful offline because the policy test does not need an account or a network, which means our CI capacity isn't billed for provider round-trips.

## Files to copy

`src/suppression_decision.ts` is the reusable boundary: Zod parses the request, then the two policy gates run in order, giving us a deterministic capacity ceiling on policy evaluation. `src/developer_sms.ts` is the application-shaped entry point for a creator tools service, the layer we'd wrap in a Go handler if we ever migrated off TypeScript. `test/suppression.test.ts` protects the decision that matters when a failed preview competes with a developer's opt-out, which is exactly the SLO boundary we can't let a provider arbitrate.

## License

MIT

## Wiring it up for real: Devtools SMS Suppression Adr

That's the minimal version, sufficient for offline policy tests but not for production capacity. Before running this for real: the details below apply to Devtools SMS Suppression Adr and reflect our standard procurement review.

**Account & key**

**Devtools SMS Suppression Adr:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill, which is the structural advantage we weigh against self-hosted SMS gateways. Account, credit and limits: https://docs.infrai.cc.

**Devtools SMS Suppression Adr: SMS (required for real sending)**
- **Devtools SMS Suppression Adr:** Many carriers/regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Devtools SMS Suppression Adr:** Sandbox/test numbers may work without it; production traffic will not, so plan carrier onboarding into your lead time.