// Renders each route in ROUTES to its own static HTML file, then writes
// sitemap.xml and robots.txt. Runs after `vite build`.
//
// This is prerendering, not SSR: the output is plain files any static host can
// serve, so /pricing returns real HTML with its own title even to a crawler
// that never runs JavaScript. React then hydrates the same markup.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");

// A Vite dev server in middleware mode compiles the TSX for Node, so the
// prerender renders the same components the browser does rather than a copy
// that could drift out of step.
const vite = await createServer({
  root,
  logLevel: "error",
  server: { middlewareMode: true },
  appType: "custom",
});

try {
  // react and react-dom/server are imported by Node directly: they are already
  // built for this runtime, and routing them through Vite's SSR loader breaks
  // on their CommonJS internals.
  // renderToString, not renderToStaticMarkup: the latter strips the hydration
  // markers React needs to attach to existing markup, which shows up as a
  // hydration mismatch (React error #418) and a full client re-render.
  const { renderToString } = await import("react-dom/server");
  const { createElement } = await import("react");
  const { App } = await vite.ssrLoadModule("/src/app.tsx");
  const { ROUTES, SITE_URL } = await vite.ssrLoadModule("/src/routes.ts");

  const template = await readFile(join(dist, "index.html"), "utf8");
  const escape = (value) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  for (const route of ROUTES) {
    const canonical = new URL(route.path, SITE_URL).href;
    const body = renderToString(createElement(App, { initialPage: route.page }));

    // Swap the per-page tags into the built template. The template carries the
    // home page's values, so every route needs its own substituted in.
    const html = template
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(route.title)}</title>`)
      .replace(
        /<meta name="description" content="[^"]*" \/>/,
        `<meta name="description" content="${escape(route.description)}" />`,
      )
      .replace(
        /<link rel="canonical" href="[^"]*" \/>/,
        `<link rel="canonical" href="${canonical}" />`,
      )
      .replace(
        /<meta property="og:title" content="[^"]*" \/>/,
        `<meta property="og:title" content="${escape(route.title)}" />`,
      )
      .replace(
        /<meta property="og:description" content="[^"]*" \/>/,
        `<meta property="og:description" content="${escape(route.description)}" />`,
      )
      .replace(
        /<meta property="og:url" content="[^"]*" \/>/,
        `<meta property="og:url" content="${canonical}" />`,
      )
      .replace('<div id="root"></div>', `<div id="root">${body}</div>`);

    // "/" is dist/index.html; "/pricing" is dist/pricing/index.html, so a host
    // serving directory indexes resolves the clean URL with no rewrite rules.
    const file = route.path === "/" ? join(dist, "index.html") : join(dist, route.path, "index.html");
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, html);
    console.log(`  prerendered ${route.path.padEnd(20)} -> ${file.replace(dist, "dist")}`);
  }

  const urls = ROUTES.map((route) => {
    const loc = new URL(route.path, SITE_URL).href;
    return `  <url><loc>${loc}</loc><priority>${route.priority}</priority></url>`;
  }).join("\n");
  await writeFile(
    join(dist, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  );

  // The legal pages are static files rather than routes, so they are listed
  // separately. Nothing is disallowed; the app lives on another host.
  await writeFile(
    join(dist, "robots.txt"),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
  );
  console.log(`  wrote sitemap.xml (${ROUTES.length} urls) and robots.txt`);
} finally {
  await vite.close();
}
