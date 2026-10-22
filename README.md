# RMIT Hack 26 app

Next.js app using TideCloak for authentication.

## Local setup (WSL)

Run these commands inside WSL from this directory:

```bash
npm ci
npm run init
npm run dev
```

`npm run init` provisions a local TideCloak realm and writes `tidecloak.json`.
It expects TideCloak at `http://localhost:8080` and the app at
`http://localhost:3000` by default. Override those URLs and other setup
values through environment variables or `init/.env.example` as needed.

The generated `tidecloak.json` is local and ignored by Git. If you start the
app before provisioning the realm, a placeholder config is created and the
page explains that setup is required. Restart Next.js after running init.

The Keycloak database files in the sibling `data/` directory are local runtime
data and are not part of this repository.
