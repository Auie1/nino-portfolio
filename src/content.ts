/**
 * All real content — audited from https://ninoneri.my.canva.site/personal-portfolio.
 * Nothing here is invented; phrasing may be lightly edited for clarity.
 */

export const identity = {
  name: "Niu Neri",
  handle: "NINO",
  role: "Social Media Marketing & Systems",
  location: "Cagayan de Oro, PH",
  coords: "08.4822° N — 124.6472° E",
  instagram: "https://www.instagram.com/",
};

export const about = {
  education: {
    school: "Xavier University Senior High School",
    period: "2025 — present",
    detail:
      "Accountancy, Business, and Management · El Camino St., Pueblo de Oro, Cagayan de Oro City, Philippines",
  },
};

export const traits = [
  {
    title: "Strategic",
    note: "I think in systems and see the big picture.",
  },
  {
    title: "Organized",
    note: "I structure workflows and manage processes efficiently.",
  },
  {
    title: "Analytical",
    note: "I assess performance, spot gaps, and optimize systems.",
  },
  {
    title: "Proactive",
    note: "I take initiative and drive growth, not just follow instructions.",
  },
];

export const services = [
  "Graphic Designer",
  "Web Development",
  "Social Media Marketing",
  "Algorithm Positioning",
];

export const tools: { group: string; items: string[] }[] = [
  { group: "Platforms", items: ["Instagram", "Facebook", "LinkedIn", "CapCut"] },
  { group: "Design & Video", items: ["Canva", "After Effects", "Premiere Pro", "Photoshop", "Illustrator"] },
  { group: "AI", items: ["ChatGPT", "Zcode AI", "Claude"] },
];

export type CaseStudy = {
  eyebrow: string;
  chapter: string;
  statsLine: string;
  stats: { value: string; label: string }[];
  outcomes: string[];
  paragraph: string;
  beforeLabel: string[];
  afterLabel: string;
  handle: string;
  cta: string;
};

export type Project = {
  id: string;
  index: string;
  title: string;
  category: string;
  blurb: string;
  image?: string;
  alt?: string;
  cssMock?: "phones" | "system";
  span: "wide" | "tall" | "normal";
  detail: {
    heading: string;
    body: string;
    caption: string;
  };
  caseStudy?: CaseStudy;
};

export const projects: Project[] = [
  {
    id: "nrg-tattoo",
    index: "001",
    title: "NRG Tattoo",
    category: "Case Study · Social Media Management",
    blurb:
      "Full case study — content creation, branding, and growth for a tattoo studio. Click to open the before & after.",
    image: "/assets/nrg-asset-2.png",
    alt: "Branded social media post mockup for NRG Tattoo",
    span: "tall",
    detail: {
      heading: "NRG Tattoo",
      body: "Social media management for a tattoo studio: content that reflects the work, a full branding pass, and the systems to grow it.",
      caption: "Case study — figures from the original portfolio.",
    },
    caseStudy: {
      eyebrow: "one of my projects",
      chapter: "/ 01 — social media management",
      statsLine: "See results from all platforms.",
      stats: [
        { value: "23K", label: "total views" },
        { value: "425", label: "followers gained" },
        { value: "292", label: "accounts reached" },
      ],
      outcomes: [
        "Organic followers increase across all platforms within 2 months",
        "Increase in inbound inquiries and direct leads from social channels",
        "Average engagement per post compared to pre-campaign baseline",
        "Consistent weekly content cadence established vs irregular posting before",
      ],
      paragraph:
        "Through the services I provided, the brand strengthened its presence expanding from local collaborations to international partnerships, including Brazil. I also managed bulk order coordination and supported the growth of its social media presence.",
      beforeLabel: [
        "before social media presence curation",
        "leads to low sales traction",
      ],
      afterLabel: "after social media curation",
      handle: "nrg.tattoo",
      cta: "See the difference?",
    },
  },
  {
    id: "content-system",
    index: "002",
    title: "One of My Projects",
    category: "Social Media · Content Systems",
    blurb:
      "A designed content system — branding, structured content, and inquiry-to-conversion flows presented as one kit.",
    cssMock: "system",
    span: "normal",
    detail: {
      heading: "Content system mockups",
      body: "A designed set of mockups from the original portfolio: mobile page layouts, a desktop website presentation, and a social feed grid — showing how branding, structured content strategy, and conversion workflows come together as one system.",
      caption: "From the original portfolio — “ONE OF MY PROJECTS”.",
    },
  },
];

export const contact = {
  cta: "let's keep in touch",
};
