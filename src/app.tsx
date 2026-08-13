import { useEffect, useState } from "react";
import { type Page, SITE_URL, pageForPath, routeFor } from "./routes";
import "./styles.css";
import "./launch.css";

const APP_URL = "https://app.havvo.co.uk";
const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:3001").replace(/\/$/, "");

/* Where a visitor came from, captured once at load and held for the session.

   Read here rather than inside the form, because navigation is client-side: by
   the time someone reaches the contact page, the `?utm_source=` that brought
   them to the home page has gone from the URL. Session storage rather than a
   cookie — this is attribution for our own funnel, it expires with the tab, and
   it needs no consent banner to be lawful. */
const ATTRIBUTION_KEY = "havvo.attribution";

type Attribution = { referrer?: string | null; utmSource?: string | null; utmMedium?: string | null; utmCampaign?: string | null };

function captureAttribution() {
  // This module is loaded in Node by scripts/prerender.mjs, where there is no
  // window at all. Checked rather than left to the catch below, because a
  // ReferenceError swallowed by a `catch {}` is indistinguishable from storage
  // being unavailable, and only one of those is worth investigating.
  if (typeof window === "undefined") return;
  try {
    // First touch wins. A second page view carries no parameters, and letting it
    // write would erase the campaign that actually delivered the visit.
    if (sessionStorage.getItem(ATTRIBUTION_KEY)) return;
    const params = new URLSearchParams(window.location.search);
    const referrer = document.referrer;
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify({
      // Our own pages are not a referrer; recording them would bury the real
      // source under a list of internal hops.
      referrer: referrer && !referrer.includes(window.location.host) ? referrer : null,
      utmSource: params.get("utm_source"), utmMedium: params.get("utm_medium"), utmCampaign: params.get("utm_campaign"),
    } satisfies Attribution));
  } catch { /* private mode can refuse storage entirely; knowing the channel is not worth an exception on page load */ }
}

function attribution(): Attribution {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) ?? "{}") as Attribution; } catch { return {}; }
}

captureAttribution();

/* The trades a job can need. Lower case because these words are used in prose in
   outreach subject lines ("Reliable plumbing work in Manchester"), and because
   the API normalises them to match `outreach_contacts.trades`. */
const TRADE_OPTIONS = ["plumbing", "electrical", "heating and gas", "carpentry", "painting and decorating", "roofing", "locksmith", "appliance repair", "drainage", "glazing", "grounds and cleaning", "general maintenance"];

/* Suggestions, not a fixed list — the field stays free text through `datalist`,
   because the answer we most need is the one nobody thought to offer. This is
   what decides the integration roadmap, so naming the common systems raises the
   chance of a usable answer over an empty box. */
const MANAGER_SOFTWARE = ["Fixflo", "Arthur", "Reapit", "Alto", "Jupix", "MRI Qube", "Yardi", "PropertyFile", "PlanRadar", "PayProp", "Goodlord", "Spreadsheets and email"];
const TRADE_SOFTWARE = ["Jobber", "Tradify", "ServiceM8", "Simpro", "Commusoft", "Joblogic", "Powered Now", "Xero", "QuickBooks", "Paper and phone calls"];

const sections = {
  managers: ["One clear queue for every property", "Approve quotes, visits and completed work", "A complete record for every decision"],
  trades: ["Win well-scoped local work", "Keep photos, messages and sign-off in one job", "Get paid through your own connected Stripe account"],
};

/** Navigate without a reload, the way a router would. */
type Go = (page: Page) => void;

/* A real anchor rather than a button: crawlers follow it, and it can be
   middle-clicked, copied or opened in a new tab. The click handler only takes
   over for plain left-clicks, so modified clicks keep their native behaviour. */
function Link({ to, go, className, children, ...rest }: {
  to: Page; go: Go; className?: string; children: React.ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return <a href={routeFor(to).path} className={className} onClick={(event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    go(to);
  }} {...rest}>{children}</a>;
}

export function App({ initialPage }: { initialPage: Page }) {
  const [page, setPage] = useState<Page>(initialPage);
  const [menu, setMenu] = useState(false);
  const [sent, setSent] = useState(false);
  const go: Go = (next) => {
    if (next !== page) history.pushState({}, "", routeFor(next).path);
    setPage(next);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  // Back and forward must move between pages, not out of the site.
  useEffect(() => {
    const onPop = () => setPage(pageForPath(location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  // Keep the head in step with the page. The prerendered HTML already carries
  // the right tags for a cold load; this covers client-side navigation, which
  // is what a visitor sharing a URL or a crawler re-rendering the page reads.
  useEffect(() => {
    const route = routeFor(page);
    document.title = route.title;
    for (const [selector, attribute] of [
      ['meta[name="description"]', "content"],
      ['meta[property="og:title"]', "content"],
      ['meta[property="og:description"]', "content"],
      ['meta[property="og:url"]', "content"],
      ['link[rel="canonical"]', "href"],
    ] as const) {
      const element = document.head.querySelector(selector);
      if (!element) continue;
      // Canonical URLs are absolute against the production origin, not
      // location.origin: a preview or staging host must still point search
      // engines at havvo.co.uk rather than canonicalising itself.
      const value = selector.includes("canonical") || selector.includes("og:url")
        ? new URL(route.path, SITE_URL).href
        : selector.includes("title") ? route.title : route.description;
      element.setAttribute(attribute, value);
    }
  }, [page]);
  const nav: Array<[Page, string]> = [["how", "How it works"], ["managers", "For property teams"], ["trades", "For trades"], ["pricing", "Pricing"], ["safety", "Safety"]];
  const hero = page === "home";
  return <><header className="nav"><Link to="home" go={go} className="brand">havvo<span>.</span></Link><nav className={menu ? "open" : ""}>{nav.map(([id,label]) => <Link key={id} to={id} go={go} className={page === id ? "active" : undefined} aria-current={page === id ? "page" : undefined}>{label}</Link>)}</nav><div className="nav-actions">{/* nofollow: the app is private and carries its own noindex, but this is
              the one followable link into it from an indexed page — no reason to
              send a crawler down a path that only ends at a login screen. */}
          <a className="login" href={APP_URL} rel="nofollow">Sign in</a><Link to="contact" go={go} className="primary compact">Join Havvo</Link></div><button className="menu" aria-label="Open menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>☰</button></header>
  {hero ? <><Home go={go} /><LaunchSections go={go} /></> : <PageView page={page} go={go} sent={sent} setSent={setSent} />}
  <footer><div><Link to="home" go={go} className="brand">havvo<span>.</span></Link><p>Property work, kept moving.</p></div><div className="footer-links"><div className="footer-link-row">{nav.map(([id,label]) => <Link key={id} to={id} go={go}>{label}</Link>)}<Link to="contact" go={go}>Contact</Link></div><div className="footer-link-row footer-legal"><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a><a href="/cookies.html">Cookies</a><a href="/legal-identity.html">Legal identity</a></div></div><small>© {new Date().getFullYear()} Zweet Limited · Company No. 16227815</small></footer></>;
}

function Home({ go }: { go: Go }) { return <main><section className="hero"><div className="hero-copy"><p className="kicker">UK PROPERTY OPERATIONS</p><h1>Every property repair, <em>kept moving.</em></h1><p className="lede">Havvo brings tenants, property teams and trusted trades into one calm, accountable workspace — from first report to final sign-off.</p><div className="cta"><Link to="contact" go={go} className="primary">Join the early access list <span>→</span></Link><Link to="how" go={go} className="text-button">See how it works <span>↓</span></Link></div><p className="fine">Built for residential property teams and independent trades across the UK.</p></div><div className="hero-visual"><div className="glow" /><div className="device"><div className="device-top"><b>18 King Street</b><span>•••</span></div><div className="job-title"><i>⌂</i><div><small>ACTIVE REPAIR</small><b>Kitchen sink leak</b><span>Today · 15:30–16:00</span></div></div><div className="timeline"><p><i className="done" />Issue reported <span>09:12</span></p><p><i className="done" />Jordan confirmed visit <span>09:24</span></p><p><i className="live" />Trade is on the way <span>Now</span></p></div><div className="message"><b>Jordan · Plumber</b><p>I’ll ring the bell when I arrive.</p><small>14:58 ✓✓</small></div><div className="approval"><span>✓</span><div><b>Everything in one place</b><small>Chat, photos, approval and payment</small></div></div></div><div className="floating quote"><small>QUOTE APPROVED</small><b>£148.00</b><span>Ready for authorisation</span></div></div></section>
  <section className="logos"><p>MADE FOR THE PEOPLE WHO KEEP HOMES RUNNING</p><div><span>Property managers</span><span>Independent trades</span><span>Build-to-rent teams</span><span>Lettings teams</span></div></section>
  <section className="split intro"><div><p className="kicker">ONE SHARED WORKSPACE</p><h2>From “something’s wrong” to “it’s sorted”.</h2></div><p>Most repair work gets slowed down by missed messages, unclear scope and no reliable proof of completion. Havvo creates one shared timeline so every person knows what happens next.</p></section>
  <section className="steps"><Step number="01" title="Report clearly" text="Tenants share the issue, location and photos in seconds. Smart triage helps the right person see the right context." /><Step number="02" title="Plan with confidence" text="Property teams compare quotes, confirm visits and keep everyone in the same job conversation." /><Step number="03" title="Sign off properly" text="Trades share work evidence. Customers or managers approve the result — in person or remotely — before payment is captured." /></section>
  <section className="audiences"><article className="manager-card"><p className="kicker">FOR PROPERTY TEAMS</p><h2>Less chasing.<br />More control.</h2><p>See every job across your properties, keep approval trails tidy and give residents a much better repair experience.</p><Link to="managers" go={go}>Explore for property teams <span>→</span></Link></article><article className="trade-card"><p className="kicker">FOR TRADES</p><h2>Good work deserves a smoother way to run.</h2><p>Receive clear jobs, manage the visit from your phone and keep sign-off and payment connected to the work you do.</p><Link to="trades" go={go}>Explore for trades <span>→</span></Link></article></section>
  <section className="final"><p className="kicker">EARLY ACCESS</p><h2>A better rhythm for property work.</h2><p>Join the Havvo launch list and help shape the first UK release.</p><Link to="contact" go={go} className="primary">Request access <span>→</span></Link></section></main> }

function LaunchSections({ go }: { go: Go }) { const [open, setOpen] = useState<number | null>(0); const faqs = [["Who is Havvo for?", "Havvo is being built for UK residential property teams, landlords, residents and independent trades who want one clear repair workflow."], ["How does payment work?", "A customer authorises the agreed job amount before work begins. Payment is captured only after completion evidence is approved. Trades connect their own Stripe account."], ["What happens if the resident is not home?", "The trade can share arrival and completion photos in the job chat. The resident or manager can review the evidence and approve remotely."], ["Does Havvo replace emergency services?", "No. Gas, fire, electrical danger, flooding, structural risk or immediate health and safety concerns must be escalated to an appropriate emergency service or qualified professional."]]; return <main className="launch-more"><section className="launch-proof"><div><p className="kicker">BUILT FOR THE WHOLE JOB</p><h2>A job record that does the chasing for you.</h2></div><div className="proof-grid"><article><span>01</span><b>One shared conversation</b><p>No forwarding screenshots or digging through inboxes. Every update remains with the property job.</p></article><article><span>02</span><b>Proof when it matters</b><p>Photos, completion notes and clear approval create a defensible record of the work.</p></article><article><span>03</span><b>Payment without the loopholes</b><p>Agreed work is authorised before the visit, then captured once the approved work is complete.</p></article></div></section><section className="launch-band"><div><p className="kicker">A BETTER EXPERIENCE FOR RESIDENTS</p><h2>Clear updates replace the “when will someone come?” call.</h2></div><ul><li><span>✓</span> Report an issue with photos from a phone</li><li><span>✓</span> See visits and chat updates in one place</li><li><span>✓</span> Review and sign off work remotely</li></ul></section><section className="launch-plan"><div><p className="kicker">LAUNCH PROGRAMME</p><h2>Start with the work you already manage.</h2><p>We are onboarding a limited number of property teams and trade professionals as we expand across the UK.</p></div><div className="plan-card"><small>EARLY ACCESS</small><h3>Shape the first release</h3><p>Get pilot access, guided onboarding and a direct line to the team building Havvo.</p><Link to="contact" go={go} className="primary">Apply for access <span>→</span></Link><em>No long contracts during the pilot.</em></div></section><section className="faq"><p className="kicker">QUESTIONS, ANSWERED</p><h2>Everything you need to know before joining.</h2><div>{faqs.map(([question, answer], index) => <article key={question}><button onClick={() => setOpen(open === index ? null : index)}><span>{question}</span><b>{open === index ? "−" : "+"}</b></button>{open === index && <p>{answer}</p>}</article>)}</div></section><section className="launch-close"><p className="kicker">HAVVO IS COMING</p><h2>Property work should feel more certain.</h2><p>Bring the people, evidence and decisions into one shared flow.</p><Link to="contact" go={go} className="primary">Join the launch list <span>→</span></Link></section></main> }

/* The early-access form.

   Longer than a name-and-email box on purpose. Every answer here is either how a
   lead gets prioritised (portfolio size, monthly repair volume, whether they want
   a pilot now) or what gets built next (the software they already run). Asking
   later means an email round trip that most people never complete.

   Two things keep the length from costing submissions. Only name and email are
   required — everything else is optional and the API stores nulls happily. And the
   questions are gated on the role, so a sole-trader plumber is never shown
   "how many properties do you manage": each person sees around eight fields, not
   all sixteen. */
/* A labelled field, with the "optional" marker on the same line as its label.

   `label` is a grid, so a bare `<em>` beside the label text becomes a row of its
   own and pushes the input down. Over thirteen fields that is most of a screen of
   height spent saying "optional" — hence one wrapper rather than a span repeated
   at every call site. The input stays inside the label, so it is still associated
   with it without needing matching id attributes. */
function Ask({ text, optional, children }: { text: string; optional?: boolean; children: React.ReactNode }) {
  return <label><span className="ask">{text}{optional && <em>optional</em>}</span>{children}</label>;
}

function EarlyAccessForm({ sent, setSent }: { sent: boolean; setSent: (value: boolean) => void }) {
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState("");
  const [trades, setTrades] = useState<string[]>([]);
  const isTrade = role === "Trade professional";
  // A landlord with a portfolio has the same question to answer as a managing
  // agent, just at a different scale.
  const holdsProperties = role === "Property manager" || role === "Landlord";

  if (sent) return <div className="success"><b>You’re on the list.</b><p>Thanks — we’ll read this properly and come back to you about the launch programme. If you asked about a pilot, expect a reply from a person rather than an autoresponder.</p></div>;

  return <form onSubmit={async (event) => {
    event.preventDefault();
    setFormError(""); setBusy(true);
    const fields = new FormData(event.currentTarget);
    // Empty strings are dropped rather than sent: the API stores what it is given,
    // and "" in a column is indistinguishable from an answer once it is stored,
    // where null plainly means unanswered.
    const text = (key: string) => { const value = fields.get(key); return typeof value === "string" && value.trim() ? value.trim() : undefined; };
    try {
      const res = await fetch(`${API_URL}/enquiries`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: text("name"), email: text("email"), role, message: text("message"),
          organisation: text("organisation"), organisationSize: text("organisationSize"),
          portfolioSize: text("portfolioSize"), trades: trades.length ? trades : undefined,
          phone: text("phone"), serviceArea: text("serviceArea"), postcode: text("postcode"), website: text("website"),
          currentSoftware: text("currentSoftware"), monthlyJobs: text("monthlyJobs"),
          biggestChallenge: text("biggestChallenge"), pilotInterest: text("pilotInterest"),
          marketingConsent: fields.get("marketingConsent") === "on",
          ...attribution(),
        }),
      });
      if (!res.ok) throw new Error("Could not submit");
      setSent(true);
    } catch {
      setFormError("Something went wrong — please try again, or email hello@havvo.co.uk and we’ll add you by hand.");
    } finally { setBusy(false); }
  }}>
    {formError && <p className="error">{formError}</p>}

    <Ask text="Your name"><input name="name" required placeholder="Name" autoComplete="name" /></Ask>
    <Ask text="Work email"><input name="email" required type="email" placeholder="you@company.co.uk" autoComplete="email" /></Ask>
    <Ask text="I am a"><select name="role" required value={role} onChange={(event) => setRole(event.target.value)}><option value="" disabled>Select one</option><option>Property manager</option><option>Trade professional</option><option>Landlord</option><option>Tenant or resident</option><option>Other</option></select></Ask>

    {/* Held back until the role is chosen. Showing sixteen fields at once is what
        makes a form look like work; revealing the relevant half after one click
        makes the same questions feel answerable. */}
    {role && <>
      <Ask text="Company or trading name" optional><input name="organisation" placeholder={isTrade ? "e.g. Okafor Plumbing Ltd" : "e.g. Northern Lettings"} autoComplete="organization" /></Ask>

      {/* Not vanity sizing: a limited company is a corporate subscriber under
          PECR and a sole trader is not, which changes what we may lawfully send.
          Asked plainly rather than inferred from whether a name ends in "Ltd". */}
      {role !== "Tenant or resident" && <Ask text="Size of your business" optional><select name="organisationSize" defaultValue=""><option value="">Prefer not to say</option><option value="sole_trader">Sole trader or just me</option><option value="small">2–10 people</option><option value="medium">11–50 people</option><option value="large">50+ people</option></select></Ask>}

      {holdsProperties && <Ask text="Properties you look after" optional><select name="portfolioSize" defaultValue=""><option value="">Prefer not to say</option><option value="1-10">1–10</option><option value="11-50">11–50</option><option value="51-200">51–200</option><option value="201-1000">201–1,000</option><option value="1000+">1,000+</option></select></Ask>}

      {isTrade && <fieldset className="chips"><legend><span className="ask">What work do you do?<em>optional</em></span></legend><div>{TRADE_OPTIONS.map((trade) => <label key={trade} className={trades.includes(trade) ? "chip on" : "chip"}><input type="checkbox" checked={trades.includes(trade)} onChange={(event) => setTrades((current) => event.target.checked ? [...current, trade] : current.filter((item) => item !== trade))} />{trade}</label>)}</div></fieldset>}

      <div className="row">
        <Ask text={isTrade ? "Areas you cover" : "Where your properties are"} optional><input name="serviceArea" placeholder="e.g. Greater Manchester" /></Ask>
        <Ask text="Postcode" optional><input name="postcode" placeholder="M1 1AA" autoComplete="postal-code" /></Ask>
      </div>

      <div className="row">
        <Ask text="Phone" optional><input name="phone" type="tel" placeholder="For a quick pilot call" autoComplete="tel" /></Ask>
        <Ask text="Website" optional><input name="website" type="url" placeholder="https://" /></Ask>
      </div>

      {role !== "Tenant or resident" && <>
        {/* The single most useful question on this form. Which integrations get
            built is a question about what people already run, and a free-text
            box with suggestions gets a real answer where a fixed list only
            confirms our own guesses. */}
        <Ask text="What software do you use today?" optional><input name="currentSoftware" list="software-options" placeholder={isTrade ? "e.g. Tradify, Xero, or none" : "e.g. Fixflo, Reapit, or spreadsheets"} /><datalist id="software-options">{(isTrade ? TRADE_SOFTWARE : MANAGER_SOFTWARE).map((item) => <option key={item} value={item} />)}</datalist></Ask>

        <Ask text={isTrade ? "Jobs you take on in a month" : "Repairs you handle in a month"} optional><select name="monthlyJobs" defaultValue=""><option value="">Prefer not to say</option><option value="0-10">Up to 10</option><option value="11-50">11–50</option><option value="51-200">51–200</option><option value="200+">200+</option></select></Ask>

        <Ask text="What slows you down most today?" optional><textarea name="biggestChallenge" rows={3} placeholder="The specific thing that costs you time or money. This is what we build against." /></Ask>

        {/* Separates a lead to call this week from a name on a launch list. Both
            are worth having; treating them the same wastes the first. */}
        <Ask text="How soon would you want to start?" optional><select name="pilotInterest" defaultValue=""><option value="">Not sure yet</option><option value="ready_now">Ready to pilot now</option><option value="few_months">In the next few months</option><option value="just_following">Just following along</option></select></Ask>
      </>}

      <Ask text="Anything else?" optional><textarea name="message" rows={3} placeholder="A little context helps us make the launch useful." /></Ask>

      {/* Unticked by default, and it must stay that way. Submitting this form is a
          soft opt-in for a reply about the pilot; an ongoing marketing list needs
          consent that was actually given, and a pre-ticked box is not consent. */}
      <label className="consent"><input type="checkbox" name="marketingConsent" /><span>Email me occasional Havvo product updates. We’ll reply about your enquiry either way, and you can unsubscribe from any email in one click.</span></label>
    </>}

    <button className="primary" disabled={busy}>{busy ? "Sending…" : <>Request early access <span>→</span></>}</button>
    <p className="fine">We’ll only use this to talk to you about Havvo. No lists are sold or shared.</p>
  </form>;
}

function PageView({ page, go, sent, setSent }: { page: Page; go: Go; sent: boolean; setSent: (value: boolean) => void }) {
  if (page === "contact") return <main className="simple"><p className="kicker">EARLY ACCESS</p><h1>Let’s make property work feel simpler.</h1><p className="lede">Tell us about your work — the more you share, the more useful we can make your pilot. Only your name and email are required.</p><EarlyAccessForm sent={sent} setSent={setSent} /></main>;
  const meta: Record<Exclude<Page,"home"|"contact">, [string,string,string[]]> = { how: ["HOW HAVVO WORKS", "The simple way to keep every repair moving.", ["Report an issue with photos and clear context.", "Bring the right trade into a shared job conversation.", "Approve evidence and capture payment only when work is accepted."]], managers: ["FOR PROPERTY TEAMS", "A calmer control room for every property job.", sections.managers], trades: ["FOR TRADES", "Spend less time chasing. More time doing great work.", sections.trades], pricing: ["PRICING", "Straightforward pricing for a healthier property workflow.", ["Free early-access accounts during the pilot.", "Trade-managed Stripe payments; Havvo never holds your card details.", "Simple platform fees are shown before approval."]], safety: ["SAFETY & TRUST", "Clear records. Human decisions. Safer property work.", ["Urgent hazards always need qualified professional or emergency support.", "AI triage supports the workflow — it never replaces safety judgement.", "Photos, messages, approvals and payments remain attached to the job."]] };
  const [kicker,title,points] = meta[page as Exclude<Page,"home"|"contact">];
  return <main className="simple"><p className="kicker">{kicker}</p><h1>{title}</h1><p className="lede">Havvo gives everyone involved in a repair one reliable place to coordinate the work and see its outcome.</p><div className="point-list">{points.map((point, index) => <div key={point}><span>0{index + 1}</span><p>{point}</p></div>)}</div><Link to="contact" go={go} className="primary">{page === "pricing" ? "Talk about the pilot" : "Request early access"} <span>→</span></Link></main>;
}
function Step({ number,title,text }: { number:string;title:string;text:string }) { return <article><span>{number}</span><div className="step-icon">↗</div><h3>{title}</h3><p>{text}</p></article> }
