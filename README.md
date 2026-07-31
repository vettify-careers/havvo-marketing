# Havvo marketing site

Public website for `havvo.co.uk`. The signed-in product is hosted separately at `app.havvo.co.uk`.

## Run locally

```bash
npm install
npm run dev
```

## Deploy

Pushes to `main` run the deployment workflow. Before enabling it, add an `AZURE_CREDENTIALS` GitHub Actions secret with an Azure service principal that has **Storage Blob Data Contributor** on `havvomktdev24112` and permission to sign in through `azure/login`.

The live origin is an Azure static website and is routed through Azure Front Door at `havvo.co.uk`.
