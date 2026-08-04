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

## Routes and SEO

`npm run build` compiles the bundle and then prerenders one real HTML file per
route, so `/pricing` is served as `dist/pricing/index.html` with its own
`<title>`, meta description and canonical URL. React hydrates that markup rather
than replacing it, which is what makes the pages crawlable without JavaScript.
The build also writes `sitemap.xml` and `robots.txt`.

Add a page by adding an entry to `src/routes.ts` — the prerender, the sitemap and
the client router all read from it.

**Hosting requirement.** Clean URLs depend on the origin resolving a directory to
its `index.html`. Azure Blob static website hosting only applies the index
document to the root, so `/pricing` alone returns 404 there. Either configure
Front Door to rewrite `/<path>` to `/<path>/index.html`, or serve the site from
Azure Static Web Apps, which resolves directory indexes natively. Verify after
deploying that `https://havvo.co.uk/pricing` returns 200 with its own title, and
that an unknown path returns 404 rather than the home page — a soft 404 gets the
whole site treated as duplicate content.
