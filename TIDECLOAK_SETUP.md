# TideCloak manual setup for the existing realm

Target realm: `nextjs-test`; OIDC client: `myclient`; Tide Console: `http://localhost:8080/realms/nextjs-test/tide-console/`.

The repo's `init/realm.json` is only an initialization template. Editing it will not update the already running realm. Perform live changes in Tide Console and approve each governed request.

The app's evidence screen uses `_tide_case001.selfencrypt` and `_tide_case001.selfdecrypt`. Those two roles are not in the starter realm. `offline_access`, `appUser`, and `_tide_message.*` do not unlock case 001. A role is live only after its QEA create request is authorized. Creating it does not assign it to anyone.

## 0. Check current configuration

1. Start the **existing** TideCloak Docker container and inspect logs. Do not remove the container/volume.
2. Confirm `http://localhost:8080/` loads and `nextjs-test` exists.
3. In Apps → `myclient`, check redirect URIs include `http://localhost:3000/*` and web origin is `http://localhost:3000`. If changed, QEA must approve the config request.
4. Confirm the Tide IDP and dev license are active, then test app login.

## 1. Make the case roles and demo users live

On the current dev realm these five requests may already be waiting in **QEA Approvals** at 0/1:

- Create role `_tide_case001.selfencrypt`
- Create role `_tide_case001.selfdecrypt`
- Create user `reviewer-b` (`reviewer-b@tidecloak.com`)
- Create user `reviewer-c` (`reviewer-c@tidecloak.com`)
- Create user `custodian-demo` (`custodian-demo@tidecloak.com`)

The users do not appear under People, and the roles return 404, until those requests commit. Do not add the same user or role again.

1. Open `http://localhost:8080/realms/nextjs-test/tide-console/` and sign in as the enrolled admin inside `nextjs-test`. On this realm that account is `admin` and already holds `tide-realm-admin`. This is not the bootstrap login of the `master` realm.
2. Open **QEA Approvals**. For each request above, click **View**, review the target, then click **Authorize**.
3. With one holder of `tide-realm-admin`, the threshold is 1, so Authorize commits the change immediately. After the inbox no longer lists them, both case roles exist and the three users appear in People.

If that inbox is empty and the two case roles are still missing, create them under Advanced → Roles → Realm roles, and create the three users under People → Add a user. Authorize the new requests the same way.

A master-admin REST call does not replace Authorize. On this realm the enrolled admin completes the approval in Tide Console; the Tide enclave signs it. Authorize records the approval and commits when the count reaches the threshold.

Committing a role does not grant it. Leave both case roles unassigned until section 3.

## 2. Enroll B and the custodian

`tide-realm-admin` is the existing realm-management client role. Assign that role. Do not create a second role with the same name. The console lists it under Advanced → Roles.

1. Stay signed in as Admin A. In People, open `reviewer-b` and copy the one-time Tide enrollment link. Open it in a separate browser profile and enroll a distinct Tide account for B. The link uses `localhost:8080`, so open it on the machine running TideCloak.
2. Assign `tide-realm-admin` to B. In **QEA Approvals**, Admin A clicks **View** then **Authorize**. With only A and B, the threshold is still 1, so the grant commits.
3. Enroll `custodian-demo` with its own Tide account, separate from A and B. Leave `reviewer-c` unenrolled until section 3 finishes, so the encrypt grant still commits with one approval.

## 3. Grant encrypt only, then add admin C

Grant **only** `_tide_case001.selfencrypt` to `custodian-demo`, then Authorize that request. Check that `_tide_case001.selfdecrypt` is not assigned to the custodian and is not a child of `default-roles-nextjs-test`. Do not use the starter `_tide_message.*` roles for this demo.

Then enroll `reviewer-c` and assign `tide-realm-admin`. Admin A authorizes that grant. After A, B, and C all hold the role, N=3 and the threshold is 2.

One admin has threshold 1. Two admins also have threshold 1. Do not start the 1/2 demonstration until N=3. In QEA Approvals, one Authorize of the decrypt grant must leave that request pending.

## 4. Live demonstration

1. Log in to the app as `custodian-demo`; seal synthetic evidence using tag `case001`.
2. Submit a purpose; try to open evidence. Confirm actual API 403.
3. Admin A uses People or Roles to assign `_tide_case001.selfdecrypt` to `custodian-demo`. This governed write enters QEA Pending.
4. Admin A Authorize: capture that one approval does not apply the role.
5. Admin B signs into the Tide Console separately and Authorize: the CR auto-commits at quorum.
6. Custodian signs out/in to get a fresh token. Open the evidence; show ciphertext returned by API and plaintext decrypted only in browser.

The app does **not** issue legal warrants. The administrators in this demo represent independent governance actors, not verified judicial office holders. Time expiry, cross-user decrypt, provider data integration and immutable application audit logs are not implemented.

References: https://docs.tide.org/Admin/SetupIGA and https://docs.tide.org/Admin/e2ee
