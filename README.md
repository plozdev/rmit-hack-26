# Proof/Gate

Prototype for RMIT Hackathon 2026 Challenge 2 (Tide UNLOCKED). A synthetic evidence custodian seals a record with Tide E2EE and requests permission to reopen it. TideCloak QEA governs the grant of the decrypt role: in a realm with three enrolled admins, one approval is insufficient and two approvals commit the change.

![Scope](https://img.shields.io/badge/scope-synthetic%20prototype-9dcdaa)

## What works

- Tide login through the existing `nextjs-test` realm and `myclient` OIDC client.
- Strict DPoP requests from `@tidecloak/nextjs`; the Next.js API verifies both Tide JWT and DPoP proof.
- One synthetic case, a browser-encrypted evidence payload, and access requests stored in local SQLite.
- A real `403` before the custodian receives `_tide_case001.selfdecrypt`; browser `doDecrypt` after the role is approved and the session is refreshed.
- Tide Console handles the actual QEA role assignment and approvals. The app does not fake or bypass the approval flow.

## Stack and boundaries

Next.js 16, React 19, TypeScript, `@tidecloak/nextjs`, TideCloak development container, Node 24 `node:sqlite`. The app DB is `app-data/gateway.sqlite` and is separate from TideCloak's H2 data in `data/`. Only ciphertext is sent to the evidence API. Case metadata and access-request purposes remain readable in SQLite.

The current Tide SDK `selfencrypt/selfdecrypt` flow is used by the **same custodian account** to seal and later reopen data. This prototype does not share ciphertext with a different user, issue a legal warrant, implement expiry, or claim immutable application logs. See [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for the full trust boundary.

## Start locally

Requires Node 24 and the existing TideCloak container on port 8080. On a fresh checkout, first provision TideCloak and generate `tidecloak.json` using the repository's original `npm run init` script. On the already configured development machine, **do not rerun init**; keep the existing realm and adapter.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. The public OIDC client must allow `http://localhost:3000/*` as redirect URI and `http://localhost:3000` as web origin. Follow [TIDECLOAK_SETUP.md](TIDECLOAK_SETUP.md) to create the demo custodian, three admins, and exact encrypt/decrypt roles.

`APP_DB_PATH` can override the local DB path. Never commit `.env`, `tidecloak.json`, `app-data/`, `data/` or credentials.

## Demo flow

1. Login as the custodian with `_tide_case001.selfencrypt` but without `_tide_case001.selfdecrypt`.
2. Seal the synthetic case in the UI; the browser calls Tide `doEncrypt`, then stores ciphertext through `PUT /api/cases/case-001/evidence`.
3. Submit the purpose in the app, then click **Thử mở chứng cứ**. Show the real API `403`.
4. In Tide Console, Admin A proposes the decrypt role grant and approves once. It remains pending at 1/2.
5. Admin B approves the same QEA change request. Custodian signs out/in for a fresh role claim.
6. Click **Thử mở chứng cứ** again. The API returns ciphertext and the browser calls `doDecrypt` to show the sample text.

The app request and QEA change request are distinct records. The former provides context; the latter governs the actual role change.

## Project docs

- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md): work split, sequence, risks, MCP prompts.
- [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md): actors, architecture, API contract, trust boundaries.
- [TIDECLOAK_SETUP.md](TIDECLOAK_SETUP.md): manual realm/client/user/role setup and replay script.

The configured Tide Raziel MCP supplies read-only guidance and review, not direct writes to this local realm. See [Raziel docs](https://docs.tide.org/ai-agent-pack), [QEA docs](https://docs.tide.org/Admin/SetupIGA), and [E2EE docs](https://docs.tide.org/Admin/e2ee).
