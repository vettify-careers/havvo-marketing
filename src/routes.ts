// One place defining what exists at each URL. The build reads this to prerender
// a real HTML file per route and to generate the sitemap; the client reads it to
// resolve the current path. Adding a page here is enough to make it crawlable.
export type Page =
  | "home"
  | "managers"
  | "trades"
  | "how"
  | "pricing"
  | "safety"
  | "contact";

export type Route = {
  path: string;
  page: Page;
  /** Under ~60 characters, or Google truncates it in results. */
  title: string;
  /** Under ~155 characters, for the same reason. */
  description: string;
  /** Relative priority in the sitemap. The home page leads. */
  priority: string;
};

export const SITE_URL = "https://havvo.co.uk";

// Slugs are worded the way someone would search, rather than mirroring the
// internal page ids ("managers", "how").
export const ROUTES: Route[] = [
  {
    path: "/",
    page: "home",
    title: "Havvo — Property repairs, kept moving",
    description:
      "Havvo brings tenants, property teams and trusted trades into one accountable workspace — from first report to sign-off and payment.",
    priority: "1.0",
  },
  {
    path: "/how-it-works",
    page: "how",
    title: "How Havvo works — Report, plan, sign off",
    description:
      "See how a repair moves through Havvo: report an issue with photos, bring in the right trade, then approve the evidence before payment is captured.",
    priority: "0.9",
  },
  {
    path: "/for-property-teams",
    page: "managers",
    title: "Havvo for property teams and landlords",
    description:
      "One clear queue for every property. Approve quotes and visits, keep a tidy approval trail and give residents a better repair experience.",
    priority: "0.9",
  },
  {
    path: "/for-trades",
    page: "trades",
    title: "Havvo for trades — Win well-scoped local work",
    description:
      "Receive clear jobs, manage the visit from your phone, and keep photos, sign-off and payment attached to the work you do.",
    priority: "0.9",
  },
  {
    path: "/pricing",
    page: "pricing",
    title: "Havvo pricing — Free during the pilot",
    description:
      "Straightforward pricing for UK property work. Free early-access accounts during the pilot, with trade-managed Stripe payments.",
    priority: "0.8",
  },
  {
    path: "/safety",
    page: "safety",
    title: "Safety and trust at Havvo",
    description:
      "Clear records and human decisions. How Havvo handles urgent hazards, the limits of AI triage, and the evidence kept against every job.",
    priority: "0.7",
  },
  {
    path: "/contact",
    page: "contact",
    title: "Contact Havvo — Request early access",
    description:
      "Tell us about your property or trade work and we will be in touch about the Havvo UK launch programme.",
    priority: "0.6",
  },
];

const BY_PAGE = new Map(ROUTES.map((route) => [route.page, route]));

export function routeFor(page: Page): Route {
  // Every Page has a route by construction, so the fallback is unreachable —
  // it exists so callers get a Route rather than a possibly-undefined one.
  return BY_PAGE.get(page) ?? ROUTES[0];
}

/** The page at a URL path, defaulting to home for anything unrecognised. */
export function pageForPath(pathname: string): Page {
  // Trailing slashes are equivalent: /pricing and /pricing/ are one page, and
  // treating them as two would split ranking signals between them.
  const path = pathname.replace(/\/+$/, "") || "/";
  return ROUTES.find((route) => route.path === path)?.page ?? "home";
}
