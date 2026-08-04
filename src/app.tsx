import { useEffect, useState } from "react";
import { type Page, SITE_URL, pageForPath, routeFor } from "./routes";
import "./styles.css";
import "./launch.css";

const APP_URL = "https://app.havvo.co.uk";
const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:3001").replace(/\/$/, "");

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

function PageView({ page, go, sent, setSent }: { page: Page; go: Go; sent: boolean; setSent: (value: boolean) => void }) {
  const [formError, setFormError] = useState("");
  if (page === "contact") return <main className="simple"><p className="kicker">EARLY ACCESS</p><h1>Let’s make property work feel simpler.</h1><p className="lede">Tell us a little about your work. We’ll be in touch about the Havvo launch programme.</p>{sent ? <div className="success"><b>You’re on the list.</b><p>Thanks — we’ll be in touch soon.</p></div> : <form onSubmit={async (event) => { event.preventDefault(); setFormError(""); const fields = new FormData(event.currentTarget); try { const res = await fetch(`${API_URL}/enquiries`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: fields.get("name"), email: fields.get("email"), role: fields.get("role"), message: fields.get("message") }) }); if (!res.ok) throw new Error("Could not submit"); setSent(true); } catch { setFormError("Something went wrong — please try again or email us directly."); } }}>{formError && <p className="error">{formError}</p>}<label>Your name<input name="name" required placeholder="Name" /></label><label>Work email<input name="email" required type="email" placeholder="you@company.co.uk" /></label><label>I am a<select name="role" required defaultValue=""><option value="" disabled>Select one</option><option>Property manager</option><option>Trade professional</option><option>Landlord</option><option>Other</option></select></label><label>What would you like Havvo to help with?<textarea name="message" rows={4} placeholder="A little context helps us make the launch useful." /></label><button className="primary">Request early access <span>→</span></button></form>}</main>;
  const meta: Record<Exclude<Page,"home"|"contact">, [string,string,string[]]> = { how: ["HOW HAVVO WORKS", "The simple way to keep every repair moving.", ["Report an issue with photos and clear context.", "Bring the right trade into a shared job conversation.", "Approve evidence and capture payment only when work is accepted."]], managers: ["FOR PROPERTY TEAMS", "A calmer control room for every property job.", sections.managers], trades: ["FOR TRADES", "Spend less time chasing. More time doing great work.", sections.trades], pricing: ["PRICING", "Straightforward pricing for a healthier property workflow.", ["Free early-access accounts during the pilot.", "Trade-managed Stripe payments; Havvo never holds your card details.", "Simple platform fees are shown before approval."]], safety: ["SAFETY & TRUST", "Clear records. Human decisions. Safer property work.", ["Urgent hazards always need qualified professional or emergency support.", "AI triage supports the workflow — it never replaces safety judgement.", "Photos, messages, approvals and payments remain attached to the job."]] };
  const [kicker,title,points] = meta[page as Exclude<Page,"home"|"contact">];
  return <main className="simple"><p className="kicker">{kicker}</p><h1>{title}</h1><p className="lede">Havvo gives everyone involved in a repair one reliable place to coordinate the work and see its outcome.</p><div className="point-list">{points.map((point, index) => <div key={point}><span>0{index + 1}</span><p>{point}</p></div>)}</div><Link to="contact" go={go} className="primary">{page === "pricing" ? "Talk about the pilot" : "Request early access"} <span>→</span></Link></main>;
}
function Step({ number,title,text }: { number:string;title:string;text:string }) { return <article><span>{number}</span><div className="step-icon">↗</div><h3>{title}</h3><p>{text}</p></article> }
