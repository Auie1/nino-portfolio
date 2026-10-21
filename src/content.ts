/**
 * All real content — audited from https://ninoneri.my.canva.site/personal-portfolio.
 * Nothing here is invented; phrasing may be lightly edited for clarity.
 */

export const identity = {
  name: "Nino Neri",
  handle: "NINO",
  role: "Social Media Marketing & Systems",
  location: "Cagayan de Oro, PH",
  coords: "08.4822° N — 124.6472° E",
  instagram: "https://www.instagram.com/io.nrunit/",
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

/** the face-down skill cards: professional services with their tools, personal traits */
export type SkillCard = {
  title: string;
  kicker: string;
  note?: string;
  tools?: string[];
};

export const skillDeck: { label: string; cards: SkillCard[] }[] = [
  {
    label: "what i do — professional",
    cards: [
      {
        title: "Graphic Designer",
        kicker: "design & video",
        note: "Branded visuals, layouts, and motion for a consistent identity.",
        tools: ["Canva", "Photoshop", "Illustrator", "After Effects", "Premiere Pro"],
      },
      {
        title: "Social Media Marketing",
        kicker: "platforms",
        note: "Content systems and campaigns where attention becomes inquiries.",
        tools: ["Instagram", "Facebook", "LinkedIn", "CapCut"],
      },
      {
        title: "Web Development",
        kicker: "build",
        note: "Interactive pages like this one — built, not templated.",
        tools: ["React", "TypeScript", "Vite"],
      },
      {
        title: "Algorithm Positioning",
        kicker: "ai-assisted",
        note: "Content shaped for reach — structured so the algorithm works for you.",
        tools: ["ChatGPT", "Zcode AI", "Claude"],
      },
    ],
  },
  {
    label: "how i work — personal",
    cards: traits.map((t) => ({
      title: t.title,
      kicker: "personal skill",
      note: t.note,
    })),
  },
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
  /**
   * Content that used to live in a screenshot of the original Canva case
   * study (nrg-asset-2.png), transcribed here as real text: the cover
   * headline/stats and the before & after table.
   */
  original: {
    title: string;
    intro: string;
    stats: { value: string; label: string }[];
    table: { aspect: string; before: string; after: string }[];
  };
};

export type Project = {
  id: string;
  index: string;
  title: string;
  category: string;
  blurb: string;
  image?: string;
  alt?: string;
  cssMock?: "phones" | "system" | "case";
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
    cssMock: "case",
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
      original: {
        title: "nrg machines",
        intro:
          "How a complete social media overhaul turned a dormant online presence into a consistently growing, inquiry-generating marketing system.",
        stats: [
          { value: "+340%", label: "Follower Growth" },
          { value: "+180%", label: "Sales Traction" },
          { value: "+5x", label: "Engagement Rate" },
          { value: "3x", label: "Content Output" },
        ],
        table: [
          {
            aspect: "Posting Frequency",
            before: "Irregular — 1 to 2 posts per month with no consistent schedule or strategy.",
            after: "Structured content calendar with 4 to 5 posts per week across Instagram and Facebook.",
          },
          {
            aspect: "Visual Identity",
            before: "Inconsistent imagery, mixed fonts and colors — no cohesive brand look.",
            after: "Unified visual system with brand colors, typography, and content templates.",
          },
          {
            aspect: "Audience Engagement",
            before: "Little to no responses to comments or DMs. Community felt inactive.",
            after: "Active inquiry management system — every comment and message responded to within hours.",
          },
          {
            aspect: "Content Strategy",
            before: "No strategy — posts were random product shots with minimal context or storytelling.",
            after: "Value-driven content mix: product showcases, behind-the-scenes, testimonials, and educational posts.",
          },
          {
            aspect: "Sales Conversion",
            before: "Social media generated almost zero measurable leads or conversions.",
            after: "Social channels became a primary source of inbound inquiries and warm leads.",
          },
        ],
      },
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

/** open, honestly-labelled slots: the section stays stacked while real work is in production */
export const labSlots: { code: string; title: string; blurb: string }[] = [
  {
    code: "002",
    title: "Next Case Study",
    blurb:
      "reserved — the next full campaign case study gets filed here once the numbers land.",
  },
  {
    code: "003",
    title: "Design Drop Vol. 01",
    blurb:
      "reserved — a curated pack of brand & content design work is being assembled.",
  },
];

export const contact = {
  cta: "let's keep in touch",
};
