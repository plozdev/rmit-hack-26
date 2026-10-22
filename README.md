# Proof/Gate

Prototype for RMIT Hackathon 2026 Challenge 2 (Tide UNLOCKED). A synthetic evidence custodian seals a record with Tide E2EE and requests permission to reopen it. TideCloak QEA (Quorum Enforced Administration) governs the grant of the decrypt role: in a realm with three enrolled admins, one approval is insufficient (1/2 pending) and two approvals commit the change.

![Scope](https://img.shields.io/badge/scope-synthetic%20prototype-9dcdaa)

---

## What Works

- **Tide Authentication**: Login through the existing `nextjs-test` realm and `myclient` OIDC client.
- **Strict DPoP Validation**: Implemented via `@tidecloak/nextjs`; the Next.js API strictly verifies both Tide JWT and DPoP proof.
- **Client-Side E2EE**: Evidence is encrypted in the browser using Tide SDK (`doEncrypt`) before transmission. The backend and database only store ciphertext.
- **Multi-Party Governance (QEA)**: A real `403 Forbidden` response is returned when attempting to decrypt before receiving `_tide_case001.selfdecrypt`. Browser `doDecrypt` succeeds once the role is approved by quorum (2/3 admins) and the session is refreshed.
- **Genuine Approval Flow**: Tide Console handles actual QEA role assignments and approvals. The application does not mock or bypass security policies.

---

## Architecture and Trust Boundaries

- **Stack**: Next.js 16, React 19, TypeScript, `@tidecloak/nextjs`, TideCloak development container, Node 24 (`node:sqlite`).
- **Data Isolation**: Application database is `app-data/gateway.sqlite`, strictly isolated from TideCloak's H2 database in `data/`.
- **Encryption Model**: The Tide SDK `selfencrypt/selfdecrypt` flow is used by the custodian account to seal and later reopen data. Case metadata and access-request logs are stored in SQLite; raw evidence text never touches the backend unencrypted.
- Refer to [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for full architecture and trust boundary specifications.

---

## Setup and Running Locally

### Prerequisites

- **Node.js**: v20+ (Node 24 recommended).
- **Docker**:
  - **Windows / macOS**: [Docker Desktop](https://www.docker.com/products/docker-desktop/) (must be running with WSL 2 backend on Windows).
  - **Linux**: Docker Engine with Docker Compose plugin.
- **Git** (optional: Git Bash on Windows for shell script execution).

---

### Step 1: Start TideCloak Container

Make sure **Docker Desktop is running** (verify that the engine status shows **"Engine running"** in green).

#### On Windows (PowerShell):
```powershell
docker run --name mytidecloak -d -v ${PWD}:/opt/keycloak/data/h2 -p 8080:8080 -e KC_BOOTSTRAP_ADMIN_USERNAME=admin -e KC_BOOTSTRAP_ADMIN_PASSWORD=password tideorg/tidecloak-dev:latest
```

#### On Windows (Command Prompt / CMD):
```cmd
docker run --name mytidecloak -d -v %cd%:/opt/keycloak/data/h2 -p 8080:8080 -e KC_BOOTSTRAP_ADMIN_USERNAME=admin -e KC_BOOTSTRAP_ADMIN_PASSWORD=password tideorg/tidecloak-dev:latest
```

#### On Linux / macOS / Git Bash:
```bash
docker run --name mytidecloak -d -v $(pwd):/opt/keycloak/data/h2 -p 8080:8080 -e KC_BOOTSTRAP_ADMIN_USERNAME=admin -e KC_BOOTSTRAP_ADMIN_PASSWORD=password tideorg/tidecloak-dev:latest
```

> **Note on Subsequent Runs**: If the container already exists, start it with:
> ```bash
> docker start mytidecloak
> ```
> Verify that TideCloak is ready by checking logs:
> ```bash
> docker logs -f mytidecloak
> ```
> Wait until you see `Bootstrap completed` and port `8080` is reachable.

---

### Step 2: Realm Configuration (`tidecloak.json`)

- **Already Configured Repositories**:
  If `tidecloak.json` is already present in your project root, **do NOT run `npm run init`**. The realm and cryptographic parameters are already initialized.
- **Fresh Setup Only** (if `tidecloak.json` does not exist):
  - On Linux/macOS/Git Bash:
    ```bash
    npm run init
    ```
  - On Windows: Run via Git Bash or WSL:
    ```bash
    bash init/tcinit.sh
    ```
    *(Requires `curl`, `jq`, `sed`, `mktemp`)*.

---

### Step 3: Run Next.js Application

1. Install dependencies:
   ```bash
   npm ci
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

> Ensure the public OIDC client (`myclient`) in Tide Console allows `http://localhost:3000/*` as Valid Redirect URIs and `http://localhost:3000` as Web Origins.

### Step 4: Make the case roles live

Login works before this step. The case roles do not. `_tide_case001.selfencrypt` and `_tide_case001.selfdecrypt` stay inactive until an enrolled admin authorizes them in Tide Console. Follow [TIDECLOAK_SETUP.md](TIDECLOAK_SETUP.md):

1. Sign in to Tide Console as the enrolled `nextjs-test` admin (`admin` on the current realm), not the master bootstrap account.
2. In **QEA Approvals**, **Authorize** the pending create-role and create-user requests if they are already listed. Do not create those users or roles a second time.
3. Enroll `reviewer-b` and `custodian-demo` in separate browser profiles. Grant `tide-realm-admin` to B and authorize it.
4. Grant only `_tide_case001.selfencrypt` to the custodian and authorize it. Then enroll `reviewer-c`, grant `tide-realm-admin`, and authorize that grant. Leave `_tide_case001.selfdecrypt` unassigned until the walkthrough below. With three enrolled admins, one approval of that decrypt grant stays pending and the second approval commits it.

---

## Demonstration Walkthrough

1. **Sign in as Custodian**:
   - Log in using a custodian account assigned the `_tide_case001.selfencrypt` role (without `_tide_case001.selfdecrypt`).
2. **Seal Evidence**:
   - Enter draft case notes in the UI and click **Mã hóa & niêm phong** (Encrypt & Seal).
   - The browser invokes Tide `doEncrypt` locally and transmits only the ciphertext via `PUT /api/cases/case-001/evidence`.
3. **Submit Access Request & Confirm Lock**:
   - Submit a justified access request purpose in the UI.
   - Click **Thử mở chứng cứ** (Test Open Evidence). The API denies access and returns an authentic `403 Forbidden` response.
4. **First Admin Approval (1/2 Quorum)**:
   - In Tide Console (`http://localhost:8080/realms/nextjs-test/tide-console/`), Admin A initiates granting `_tide_case001.selfdecrypt` to the custodian.
   - Admin A authorizes the request. In a 3-admin realm, the request remains in **Pending** status (1/2 threshold).
5. **Second Admin Approval (2/2 Quorum)**:
   - Admin B logs into Tide Console from an independent session and approves the same change request.
   - Quorum is satisfied; the role is automatically committed.
6. **Decrypt Evidence**:
   - Custodian signs out and logs back in to receive an updated token with the newly granted claim.
   - Click **Thử mở chứng cứ** again. The API returns the ciphertext, and the browser decrypts and renders the original plaintext via Tide `doDecrypt`.

---

## Troubleshooting on Windows

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified` | Docker Desktop is not running. | Launch **Docker Desktop** from the Start Menu and wait for the status to show **"Engine running"**. |
| `'next' is not recognized as an internal or external command` | Node dependencies have not been installed. | Run `npm ci` in your terminal to restore all project packages. |
| `Missing expression after unary operator '--'` | Unix line continuation backslash (`\`) used in PowerShell. | Run the single-line command or use PowerShell backtick (`` ` ``) for line continuations. |
| Port `8080` already in use | Another container or local process is bound to port 8080. | Stop conflicting containers with `docker stop <name>` or check running services. |

---

## Documentation Index

- [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md): Domain actors, architecture, API contract, and trust boundaries.
- [TIDECLOAK_SETUP.md](TIDECLOAK_SETUP.md): Step-by-step guide for realm, OIDC client, 3-admin quorum, and custodian role assignment.
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md): Implementation milestones, sequencing, and risk assessments.
