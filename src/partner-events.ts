export type PartnerEvent = {
  id: string;
  title: string;
  shortTitle: string;
  source: "mccy" | "nyc";
  sourceName: "*SCAPE" | "Discover NYC";
  sourceUrl: string;
  providerUrl?: string;
  providerContextUrl?: string;
  organizer: string;
  category: "interests" | "events" | "sports";
  theme: "sustainability" | "career" | "creative" | "sports";
  startsAt: string;
  endsAt: string;
  scheduleLabel?: string;
  location: string;
  address: string;
  postalCode: string;
  locationDetails?: { lat: number; lng: number; precision: "venue" | "campus"; sourceUrl: string; locationNote?: string };
  feeText: string;
  eligibilityText: string;
  ageMin: number | null;
  ageMax: number | null;
  registrationOpens?: string;
  registrationCloses?: string;
  registrationCloseTimeKnown?: boolean;
  description: string;
  preparation?: string;
  checkedAt: string;
};

// Curated facts checked against the linked official pages. These records are not a live booking feed.
export const partnerEvents: PartnerEvent[] = [
  {
    id: "nyc-plastify-2026-09-19",
    title: "Reimagining Plastic: Inside a Sustainability Startup with Plastify",
    shortTitle: "Turn plastic into possibility",
    source: "nyc", sourceName: "Discover NYC",
    providerUrl: "https://www.nyc.gov.sg/",
    sourceUrl: "https://discover.nyc.gov.sg/events/reimagining-plastic-inside-a-sustainability-startup-with-plastify-mt6zddyu",
    organizer: "Scoop Social", category: "interests", theme: "sustainability",
    startsAt: "2026-09-19T14:00:00+08:00", endsAt: "2026-09-19T17:00:00+08:00",
    location: "Mayfair Industrial Building",
    address: "#05-04, 51 Jalan Pemimpin, Singapore 577206", postalCode: "577206",
    feeText: "Free", ageMin: null, ageMax: null,
    eligibilityText: "The event page does not publish a specific age range. Check the organiser’s registration requirements before signing up.",
    description: "Explore how a sustainability startup gives plastic a second life. Learn about recycling, work with others to sort and process plastic, and make a recycled product to take home.",
    checkedAt: "2026-09-13",
  },
  {
    id: "nyc-iras-2026-09-23",
    title: "Learning Journey: Tax & Careers at IRAS", shortTitle: "A look inside public service",
    source: "nyc", sourceName: "Discover NYC",
    providerUrl: "https://www.nyc.gov.sg/",
    sourceUrl: "https://discover.nyc.gov.sg/events/learning-journey-tax-careers-at-iras-mssqcl5d",
    organizer: "Inland Revenue Authority of Singapore", category: "events", theme: "career",
    startsAt: "2026-09-23T15:00:00+08:00", endsAt: "2026-09-23T17:00:00+08:00",
    location: "Revenue House",
    address: "Courage Meeting Room, B1, 55 Newton Road, Singapore 307987", postalCode: "307987",
    locationDetails: { lat: 1.31951800264427, lng: 103.842154838338, precision: "venue", sourceUrl: "https://www.iras.gov.sg/contact-us/locate-us", locationNote: "Revenue House reference pin from IRAS’s official OneMap link. The event is in Courage Meeting Room, B1; follow the organiser’s arrival instructions." },
    feeText: "Free", ageMin: null, ageMax: null,
    eligibilityText: "For youths curious about tax, public service and career possibilities. A specific age range is not published; check the organiser’s registration requirements.",
    registrationCloses: "2026-09-16T12:00:00+08:00", registrationCloseTimeKnown: true,
    description: "Visit IRAS to discover how Singapore’s tax system works, hear from officers in an informal conversation, and explore careers in tax and public service.",
    checkedAt: "2026-09-13",
  },
  {
    id: "mccy-scape-threads-2026-09-19",
    title: "Threads Connecting Nature (Workshop)", shortTitle: "A little batik, a shared story",
    source: "mccy", sourceName: "*SCAPE",
    sourceUrl: "https://www.scape.sg/whats-on/whats-on-sep-2026/",
    providerUrl: "https://www.mccy.gov.sg/", providerContextUrl: "https://www.mccy.gov.sg/get-involved/all-opportunities/",
    organizer: "Youth-led programme listed by *SCAPE", category: "interests", theme: "creative",
    startsAt: "2026-09-19T12:00:00+08:00", endsAt: "2026-09-20T20:00:00+08:00",
    scheduleLabel: "19–20 Sep 2026 · 12–8 PM daily",
    location: "*SCAPE Commune, Level 1", address: "2 Orchard Link, Singapore 237978", postalCode: "237978",
    feeText: "Check price with *SCAPE", ageMin: null, ageMax: null,
    eligibilityText: "Age and ticket conditions are not specified. Check the linked workshop registration.",
    description: "Explore Singapore’s identity through batik, design and cultural storytelling in this youth-led workshop.",
    checkedAt: "2026-09-13",
  },
  {
    id: "nyc-officer-2026-11-21",
    title: "POV: You’re an NYC Officer (Run 2)", shortTitle: "Try a day in youth development",
    source: "nyc", sourceName: "Discover NYC",
    providerUrl: "https://www.nyc.gov.sg/",
    sourceUrl: "https://discover.nyc.gov.sg/events/pov-youre-an-nyc-officer-run-2-mrndeou4",
    organizer: "National Youth Council", category: "events", theme: "career",
    startsAt: "2026-11-21T09:30:00+08:00", endsAt: "2026-11-21T13:00:00+08:00",
    location: "National Youth Council Singapore", address: "National Youth Council Singapore, Singapore 310490", postalCode: "310490",
    feeText: "Free", ageMin: null, ageMax: null,
    eligibilityText: "For current secondary, pre-university, ITE, polytechnic and university students interested in public service. Confirm all registration requirements with NYC.",
    registrationOpens: "2026-10-01T00:00:00+08:00", registrationCloses: "2026-11-14T12:00:00+08:00", registrationCloseTimeKnown: true,
    description: "Explore youth development through workplace challenges and job tasters. Meet NYC professionals and discover how public service roles help create opportunities for young people.",
    checkedAt: "2026-09-13",
  },
  {
    id: "nyc-science-panel-2026-09-19",
    title: "Career Panel: Science & Research", shortTitle: "Curious minds, real careers",
    source: "nyc", sourceName: "Discover NYC", providerUrl: "https://www.nyc.gov.sg/",
    sourceUrl: "https://discover.nyc.gov.sg/events/career-panel-science-research-mrss7pw4",
    organizer: "Praxium", category: "events", theme: "career",
    startsAt: "2026-09-19T14:00:00+08:00", endsAt: "2026-09-19T16:00:00+08:00",
    location: "National Library, Level 7", address: "100 Victoria Street, Singapore 188064", postalCode: "188064",
    locationDetails: { lat: 1.2974201806193, lng: 103.854234798536, precision: "venue", sourceUrl: "https://data.gov.sg/datasets/d_27b8dae65d9ca1539e14d09578b17cbf/view", locationNote: "National Library Building reference pin. The event is on Level 7; check the organiser’s room instructions." },
    feeText: "Free", ageMin: null, ageMax: 29,
    eligibilityText: "Intended for youths under 30 and students curious about science and research careers. Confirm registration requirements with the organiser.",
    description: "Hear from science and research professionals about their work, study pathways and skills. Explore careers from laboratory research to environmental science and ask questions about entering the sector.",
    checkedAt: "2026-09-13",
  },
  {
    id: "nyc-career-summit-2026-09-18",
    title: "Singapore Career Summit 2026", shortTitle: "Explore your next chapter",
    source: "nyc", sourceName: "Discover NYC", providerUrl: "https://www.nyc.gov.sg/",
    sourceUrl: "https://discover.nyc.gov.sg/events/singapore-career-summit-2026-ms8i9p8z",
    organizer: "BestTop", category: "events", theme: "career",
    startsAt: "2026-09-18T10:00:00+08:00", endsAt: "2026-09-18T12:00:00+08:00",
    location: "SQ Collective × Gen-AI Labs, Level 4", address: "65 Mohamed Sultan Road, Singapore 239003", postalCode: "239003",
    feeText: "Free", ageMin: null, ageMax: null,
    eligibilityText: "Designed for undergraduates, Master’s and PhD students, and young professionals. No numeric age range is published. Check registration requirements with BestTop.",
    description: "Meet industry professionals and explore career pathways, the changing workplace and practical preparation for internships or graduate recruitment.",
    checkedAt: "2026-09-13",
  },
  {
    id: "mccy-scape-skate-2026-09-24",
    title: "SSC Somerset 2026", shortTitle: "A little street-sport energy",
    source: "mccy", sourceName: "*SCAPE",
    sourceUrl: "https://www.scape.sg/whats-on/whats-on-sep-2026/",
    providerUrl: "https://www.mccy.gov.sg/", providerContextUrl: "https://www.mccy.gov.sg/get-involved/all-opportunities/",
    organizer: "SkateSG · Singapore Rollersports Federation", category: "sports", theme: "sports",
    startsAt: "2026-09-24T12:00:00+08:00", endsAt: "2026-09-27T21:00:00+08:00",
    scheduleLabel: "24–27 Sep 2026 · 12–9 PM daily",
    location: "Somerset Skate Park", address: "Somerset Skate Park, Somerset Road, Singapore", postalCode: "",
    locationDetails: { lat: 1.300008111830785, lng: 103.8385732992991, precision: "venue", sourceUrl: "https://www.onemap.gov.sg/api/common/elastic/search?searchVal=Somerset%20Skate%20Park&returnGeom=Y&getAddrDetails=Y", locationNote: "Somerset Skate Park reference point from OneMap. Confirm event access and the exact meeting area with the organiser." },
    feeText: "Check entry with organiser", ageMin: null, ageMax: null,
    eligibilityText: "Check spectator access, entry fees and competition eligibility with the organiser.",
    description: "The street stop of the Singapore Skateboarding Championship, delivered by SkateSG and sanctioned by the Singapore Rollersports Federation.",
    checkedAt: "2026-09-13",
  },
  {
    id: "mccy-scape-nofilter-2026-09-26",
    title: "NoFilter Urban Art Jam", shortTitle: "Make room for creative voices",
    source: "mccy", sourceName: "*SCAPE",
    sourceUrl: "https://www.scape.sg/whats-on/whats-on-sep-2026/",
    providerUrl: "https://www.mccy.gov.sg/", providerContextUrl: "https://www.mccy.gov.sg/get-involved/all-opportunities/",
    organizer: "*SCAPE", category: "interests", theme: "creative",
    startsAt: "2026-09-26T13:00:00+08:00", endsAt: "2026-09-27T21:00:00+08:00",
    scheduleLabel: "26–27 Sep 2026 · 1–9 PM daily",
    location: "Somerset Youth Park", address: "Somerset Youth Park, Somerset Road, Singapore", postalCode: "",
    feeText: "Check entry with *SCAPE", ageMin: null, ageMax: null,
    eligibilityText: "Age and entry conditions are not specified; confirm with *SCAPE.",
    description: "A community urban-art gathering that makes space for underrepresented voices. Also at *SCAPE Commune, Level 1, on 26 September.",
    checkedAt: "2026-09-13",
  },
];

export function getVisiblePartnerEvents(now: Date): PartnerEvent[] {
  const timestamp = now.getTime();
  return partnerEvents.filter(event => Date.parse(event.endsAt) > timestamp && (!event.registrationCloses || Date.parse(event.registrationCloses) > timestamp));
}

export function matchesPartnerSearch(event: PartnerEvent, query: string): boolean {
  return [event.title, event.description, event.organizer, event.location, event.sourceName, event.source, event.category, event.theme].join(" ").toLowerCase().includes(query.trim().toLowerCase());
}

export function partnerReferenceTime(_meta?: { demoMode?: boolean; anchorDate?: string }): Date {
  return new Date();
}

export function partnerRegistrationStatus(event: PartnerEvent, now: Date): "ended" | "closed" | "upcoming" | "check" {
  if (now.getTime() >= Date.parse(event.endsAt)) return "ended";
  if (event.registrationCloses && now.getTime() >= Date.parse(event.registrationCloses)) return "closed";
  if (event.registrationOpens && now.getTime() < Date.parse(event.registrationOpens)) return "upcoming";
  return "check";
}

export function partnerDate(value: string, year = false): string {
  return new Date(value.length === 10 ? `${value}T12:00:00+08:00` : value).toLocaleDateString("en-SG", { day: "numeric", month: "short", ...(year ? { year: "numeric" } : {}), timeZone: "Asia/Singapore" });
}

export function partnerTime(value: string): string {
  return new Date(value).toLocaleTimeString("en-SG", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Singapore" });
}
