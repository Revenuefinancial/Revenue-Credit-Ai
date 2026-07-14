// Guided-tour catalog. Single source of truth for every in-app walkthrough,
// shared by the global Help launcher (client) and the admin Tutorials hub.
//
// Each tour is a list of steps. A step with `sel` spotlights that element on
// the page; a step without `sel` renders as a centered card (good for intros,
// summaries, or pages without a stable anchor). The render/measure logic lives
// in app/help-button.tsx — this file is pure data so a server component can
// list it without pulling in client code.

export type Step = {
  // CSS selector for the element to spotlight. Optional — when missing or not
  // found on the page, the step renders as a centered card instead.
  sel?: string;
  title: string;
  body: string;
};

export type Tour = {
  label: string; // shown on the launcher button + panel heading + hub
  blurb: string; // one-line description of the page
  audience: "client" | "admin"; // who the walkthrough is for
  steps: Step[];
};

export const TOURS: Record<string, Tour> = {
  "/": {
    label: "Tour the homepage",
    blurb: "The public landing page new clients see first.",
    audience: "client",
    steps: [
      {
        title: "Welcome — here's the 30-second tour",
        body: "This is the public page anyone lands on before signing up. I'll point out the key parts. Use Next to step through, or close anytime.",
      },
      {
        sel: "nav",
        title: "Top navigation",
        body: "Jump to How it works, Pricing, or Success stories. ‘Sign in’ is for returning clients; ‘Free score check’ starts a new account.",
      },
      {
        sel: "header h1",
        title: "The promise",
        body: "The headline sets the expectation: upload a report, get AI-drafted dispute letters, choose DIY or Done-For-You.",
      },
      {
        sel: "header aside",
        title: "Projected-score preview",
        body: "An illustrative score projection. It's a marketing preview — real projections appear inside a client's dashboard after they upload their report.",
      },
      {
        sel: "#how",
        title: "How it works",
        body: "The three-step explainer: pull your report, the AI drafts your disputes, then mail them your way.",
      },
      {
        sel: "#pricing",
        title: "Pricing",
        body: "Two plans — DIY (one-time) and Done-For-You (per round). Clicking a plan sends the visitor into signup with that plan pre-selected.",
      },
      {
        title: "That's the homepage",
        body: "Click ‘Free score check’ to create an account, and the dashboard takes it from there. Want to see the inside? Try the interactive demo from the Help panel.",
      },
    ],
  },
  "/dashboard": {
    label: "Tour the client dashboard",
    blurb: "Where a logged-in client manages their credit repair, start to finish.",
    audience: "client",
    steps: [
      {
        title: "Your dashboard — let's walk through it",
        body: "This is your home base. Everything you need to do is on this one page, top to bottom. I'll show you each part — it only takes a minute.",
      },
      {
        sel: '[data-tour="plan"]',
        title: "1. Choose your plan",
        body: "Until a plan is active, you pick DIY (you print and mail the letters) or Done-For-You (we certified-mail every round). Once you're set up, this section steps aside.",
      },
      {
        sel: '[data-tour="score"]',
        title: "2. Track your score",
        body: "Log your credit score over time and watch the chart climb as items get removed. Add a new reading whenever you check it.",
      },
      {
        sel: '[data-tour="step1"]',
        title: "3. Pull your credit report",
        body: "One button opens our SmartCredit partner link, where you pull all three bureaus in a couple of minutes — no hard inquiry.",
      },
      {
        sel: '[data-tour="step2"]',
        title: "4. Upload the report",
        body: "Drop the PDF you just pulled into Step 2. It's stored privately and encrypted — only you and our team can ever open it.",
      },
      {
        sel: '[data-tour="verify"]',
        title: "5. Verify your identity",
        body: "Upload three documents — a photo ID, proof of address, and proof of your SSN. The ‘X of 3 approved’ bar shows your progress; our team reviews each one.",
      },
      {
        sel: '[data-tour="address"]',
        title: "6. Confirm your mailing address",
        body: "This is the return address printed on every dispute letter, so make sure it's current.",
      },
      {
        sel: '[data-tour="journey"]',
        title: "7. Follow your disputes",
        body: "Every item we challenge shows here with its live 35-day bureau clock, so you always know exactly where each dispute stands.",
      },
      {
        sel: '[data-tour="step3"]',
        title: "8. Your dispute letters",
        body: "When your letters are approved they appear here to view and print, round by round. We email and text you the moment a new round is posted.",
      },
      {
        title: "You're all set",
        body: "That's the whole flow: sign, upload, verify, then track. You can reopen this walkthrough anytime from the Help button in the corner.",
      },
    ],
  },
  "/admin": {
    label: "Tour the admin panel",
    blurb: "The operator view: your worklist and every client at a glance.",
    audience: "admin",
    steps: [
      {
        title: "Your admin command center",
        body: "This is where you run the business day to day. Let me show you how it's organized so nothing slips through the cracks.",
      },
      {
        sel: '[data-tour="worklist"]',
        title: "Worklist — what needs you now",
        body: "The top row is your action queue, in priority order: documents to review, reports to draft, drafts to approve, overdue bureau responses, and disputes still inside the 35-day window. Each card lists exactly who's waiting.",
      },
      {
        sel: '[data-tour="stats"]',
        title: "At-a-glance stats",
        body: "Total clients, reports uploaded, and paid revenue across the whole platform.",
      },
      {
        sel: '[data-tour="clients"]',
        title: "Client table",
        body: "Every client with their plan, order status, agreement/compliance state, results vs. the refund window, and what they've paid. Click ‘Manage →’ to open one client and draft, review, or send letters.",
      },
      {
        title: "That's the admin panel",
        body: "Work the queue top to bottom and the rest takes care of itself. Open any client to use the AI letter drafting, review gate, and dispute tracking.",
      },
    ],
  },
  "/how-it-works": {
    label: "Tour this guide",
    blurb: "A plain-English walkthrough of the whole platform, both sides.",
    audience: "client",
    steps: [
      {
        title: "The full how-it-works guide",
        body: "This page lays out the entire platform in plain English — what clients do, and what your team does behind the scenes. Here's how it's split.",
      },
      {
        sel: '[data-tour="hiw-client"]',
        title: "The client journey",
        body: "Everything a client does, in order: sign up, pick a plan, pull and upload their report, verify their identity, then view and print finished letters.",
      },
      {
        sel: '[data-tour="hiw-admin"]',
        title: "Your journey",
        body: "What you do behind the scenes: open a client, let the AI draft their letters, review and approve each one — clients are notified automatically.",
      },
      {
        title: "Want to see it live?",
        body: "Open the interactive demo from the Help panel to click through real screens with sample data — no login needed.",
      },
    ],
  },
};

export function tourFor(pathname: string): Tour | null {
  if (TOURS[pathname]) return TOURS[pathname];
  if (pathname.startsWith("/admin")) return TOURS["/admin"];
  return null;
}

// Ordered list for the admin Tutorials hub — client walkthroughs first, then
// the operator one. `count` excludes intro/summary cards so it reads as the
// number of real on-screen stops.
export const TOUR_CATALOG: {
  path: string;
  label: string;
  blurb: string;
  audience: Tour["audience"];
  count: number;
}[] = [
  "/dashboard",
  "/",
  "/how-it-works",
  "/admin",
].map((path) => {
  const t = TOURS[path];
  return {
    path,
    label: t.label,
    blurb: t.blurb,
    audience: t.audience,
    count: t.steps.filter((s) => s.sel).length,
  };
});
