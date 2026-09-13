import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, CalendarBlank, ChatCircle, Clock, GraduationCap, Info, Leaf, MagnifyingGlass, MapPin, MapTrifold, PaintBrush, PersonSimpleRun, ShieldCheck, Storefront, Suitcase, X } from "@phosphor-icons/react";
import { ActivityCard } from "./Activities";
import CommunityScope from "./CommunityScope";
import { useKaki } from "./kaki-context";
import { Carousel } from "./mobile";
import { Badge, Busy, Button, Empty, ErrorText, IconButton, Input, SectionTitle } from "./ui";
import { getVisiblePartnerEvents, matchesPartnerSearch, partnerDate, partnerEvents, partnerReferenceTime, partnerRegistrationStatus, partnerTime, type PartnerEvent } from "./partner-events";
import "./neighbourhood.css";
import { compareActivities, isDiscoverableActivity, matchesActivitySearch } from "./discovery-model";
import { useDiscoveryClock } from "./use-discovery-clock";

const sources = [ { id: "all", label: "All plans" }, { id: "schools", label: "Student plans" }, { id: "mccy", label: "MCCY & partners" }, { id: "nyc", label: "NYC" } ];
const networkLabels: Record<string, string> = { secondary: "secondary school", jc_mi: "JC / MI", polytechnic: "polytechnic", university: "university" };
const eventIcon = (event: PartnerEvent) => event.theme === "sustainability" ? Leaf : event.theme === "creative" ? PaintBrush : event.theme === "sports" ? PersonSimpleRun : Suitcase;
const eventType = (event: PartnerEvent) => event.theme === "sustainability" ? "Sustainability" : event.theme === "creative" ? "Get creative" : event.theme === "sports" ? "Get moving" : "Career exploration";

export function PartnerEventCard({ event, now }: { event: PartnerEvent; now?: Date }) {
  const { go, data } = useKaki();
  const Icon = eventIcon(event);
  const status = partnerRegistrationStatus(event, now || partnerReferenceTime(data.meta));
  return <article className={`partner-card partner-${event.theme}`}>
    <button className="partner-card-top" onClick={() => go("partner-event", event.id)} aria-label={`View ${event.title}`}>
      <span className="partner-art" aria-hidden="true"><Icon size={39} weight="duotone" /></span>
      <span className="partner-card-source"><span>{event.source === "mccy" ? "MCCY & PARTNERS" : "NYC"}</span><strong>{eventType(event)}</strong></span>
      <span className="partner-date-tile"><strong>{new Date(event.startsAt).toLocaleDateString("en-SG", { day: "numeric", timeZone: "Asia/Singapore" })}</strong><span>{new Date(event.startsAt).toLocaleDateString("en-SG", { month: "short", timeZone: "Asia/Singapore" })}</span></span>
    </button>
    <div className="partner-card-body">
      <p className="partner-organizer">By {event.organizer}</p>
      <button className="title-button" onClick={() => go("partner-event", event.id)}><h3>{event.title}</h3></button>
      <div className="partner-metadata"><span><CalendarBlank size={16} />{event.scheduleLabel || `${partnerDate(event.startsAt)} · ${partnerTime(event.startsAt)}`}</span><span><MapPin size={16} />{event.location}</span></div>
      <div className="partner-status"><Badge tone={status === "upcoming" ? "purple" : "blue"}>{status === "upcoming" ? `Opens ${partnerDate(event.registrationOpens!)}` : "Check eligibility"}</Badge><span>{event.feeText}</span></div>
      <button className="partner-view" onClick={() => go("partner-event", event.id)}>Event details <ArrowRight size={17} /></button>
    </div>
  </article>;
}

export default function Neighbourhood() {
  const { api, data, user, go, route, setRouteParams } = useKaki();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const source = route.params?.source || "all", search = route.params?.q || "", category = route.params?.category || "all";
  const setSource = (value: string) => setRouteParams({source: value === "all" ? undefined : value});
  const setSearch = (value: string) => setRouteParams({q: value});
  const now = useDiscoveryClock();
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    api("/neighbourhood/events").then(result => { if (active) setActivities(result.activities || []); }).catch(e => { if (active) setError(e instanceof Error ? e.message : "Student plans could not be loaded."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, user.id, data.activities, retry]);
  const query = search.trim().toLowerCase();
  const upcomingStudentEvents = activities.filter(a => isDiscoverableActivity(a, now) && (category === "all" || a.category === category) && matchesActivitySearch(a, query)).sort(compareActivities);
  const shownStudentEvents = source === "all" && !query ? upcomingStudentEvents.slice(0,6) : upcomingStudentEvents;
  const officialEvents = getVisiblePartnerEvents(now).filter(event => (source === "all" || source === event.source) && (category === "all" || event.category === category) && matchesPartnerSearch(event, query)).sort((a,b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const showSchools = source === "all" || source === "schools";
  const showPartners = source !== "schools";
  const anyResults = (showSchools && upcomingStudentEvents.length > 0) || (showPartners && officialEvents.length > 0);
  return <div className="neighbourhood-screen">
    <div className="discovery-header neighbourhood-header"><div><div className="mobile-wordmark wordmark">kaki</div><CommunityScope scope="neighbourhood" /><p className="campus-name">Around Singapore · Your wider community</p></div><IconButton label="Open messages" onClick={() => go("messages")}><ChatCircle size={27} />{(data.conversations || []).some((c: any) => c.unreadCount > 0) && <span className="notification-dot" />}</IconButton></div>
    <section className="neighbourhood-hero"><div><p className="eyebrow">A LITTLE BEYOND CAMPUS</p><h1>Good company,<br />around Singapore.</h1><p>Meet through a shared interest, a creative afternoon or a new place to explore.</p></div><div className="neighbourhood-hero-art" aria-hidden="true"><MapTrifold size={70} weight="duotone" /><span><MapPin size={21} weight="fill" /></span></div></section>
    <div className="discovery-search-row neighbourhood-search"><div className="search-bar"><MagnifyingGlass size={22} /><Input aria-label="Search neighbourhood events" placeholder="Find your next little plan" value={search} onChange={e => setSearch(e.target.value)} />{search && <IconButton label="Clear search" onClick={() => setSearch("")}><X size={18} /></IconButton>}</div><button className="discover-map-button" onClick={() => go("event-map", "neighbourhood", {q: search, source, category})} aria-label="Explore neighbourhood event map"><MapTrifold size={23} weight="duotone" /><span>Map</span></button></div>
    <Carousel className="neighbourhood-source-rail" contentClassName="neighbourhood-source-chips" ariaLabel="Filter events by source">{sources.map(option => <button key={option.id} className={source === option.id ? "active" : ""} aria-pressed={source === option.id} onClick={() => setSource(option.id)}>{option.label}</button>)}</Carousel>
    {category !== "all" && <Button variant="secondary" className="neighbourhood-category-reset" onClick={() => setRouteParams({category: undefined})}>Category: {category}<X size={16} aria-label="Clear category filter" /></Button>}
    <div className="neighbourhood-scope-note"><ShieldCheck size={20} /><p>Student plans are shared by hosts with your {networkLabels[user.network] || "education"} and age community. Partner events follow each organiser’s own eligibility rules.</p></div>
    {showSchools && <section className="neighbourhood-section"><SectionTitle action={<Badge tone="blue">Host opted in</Badge>}>Shared student plans</SectionTitle><p className="neighbourhood-section-copy">{upcomingStudentEvents.length} small meetups shared beyond campus.{data.meta?.demoMode ? " Fictional plans for your demo." : ""}</p>{loading ? <Busy text="Finding student plans…" /> : error ? <div className="neighbourhood-error"><ErrorText>{error}</ErrorText><Button variant="secondary" onClick={() => setRetry(n => n + 1)}>Try again</Button></div> : upcomingStudentEvents.length > 0 ? <div className="neighbourhood-student-grid">{shownStudentEvents.map(activity => <div className="neighbourhood-student-card" key={activity.id}><div className="neighbourhood-institution"><GraduationCap size={16} /><span>{activity.institutionLabel || activity.hostInstitution || activity.host?.institution || "Student-hosted plan"}</span>{activity.demoSample && <small>Demo</small>}</div><ActivityCard activity={activity} /></div>)}</div> : <div className="neighbourhood-small-empty"><GraduationCap size={24} /><div><strong>{query ? "No student plans match yet." : "A little room for a new plan."}</strong><p>{query ? "Try another activity, school or place." : "Shared student plans will appear here when hosts opt in."}</p></div></div>}</section>}
    {showSchools && source === "all" && !query && upcomingStudentEvents.length > 6 && <Button className="full neighbourhood-show-more" variant="secondary" onClick={() => setSource("schools")}>See all {upcomingStudentEvents.length} student plans<ArrowRight size={17}/></Button>}
    {showPartners && officialEvents.length > 0 && <section className="neighbourhood-section"><SectionTitle>{source === "mccy" ? "Culture, community & a little curiosity" : source === "nyc" ? "Discover something with NYC" : "From MCCY & NYC"}</SectionTitle><p className="neighbourhood-section-copy">Official programmes and partner listings. Check eligibility with the organiser.</p><div className="partner-grid">{officialEvents.map(event => <PartnerEventCard key={event.id} event={event} now={now} />)}</div></section>}
    {!loading && !anyResults && !(showSchools && error) && <Empty title="No plans match this view." text="Try another source or a different search. New student plans can appear as hosts share them." action={<Button variant="secondary" onClick={() => { setRouteParams({source: undefined, q: undefined, category: undefined}); }}>Reset filters</Button>} />}
    <div className="neighbourhood-official-sources"><span>Explore the official sources</span><a href="https://www.mccy.gov.sg/" target="_blank" rel="noopener noreferrer">MCCY <ArrowUpRight size={14}/></a><a href="https://www.nyc.gov.sg/" target="_blank" rel="noopener noreferrer">NYC <ArrowUpRight size={14}/></a></div>
    {showPartners && <aside className="neighbourhood-source-note"><Info size={18} /><p>Partner listings checked on 13 Sep 2026. Availability and prices may change. Registration takes place on the official site.</p></aside>}
  </div>;
}

export function PartnerEventDetail({ id }: { id: string }) {
  const { go, data } = useKaki();
  const event = partnerEvents.find(item => item.id === id);
  const now = useDiscoveryClock();
  if (!event) return <Empty title="This listing could not be found." text="Explore the other plans in your neighbourhood." action={<Button onClick={() => go("neighbourhood")}>Back to neighbourhood</Button>} />;
  const Icon = eventIcon(event);
  const status = partnerRegistrationStatus(event, now);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.location}, ${event.address}`)}`;
  return <div className={`partner-detail partner-${event.theme}`}>
    <div className="partner-detail-hero"><div className="partner-detail-icon"><Icon size={52} weight="duotone" /></div><Badge tone={event.source === "mccy" ? "purple" : "blue"}>{event.source === "mccy" ? "MCCY & partners" : "NYC"}</Badge><h1>{event.title}</h1><p>Organised by {event.organizer}</p></div>
    <div className="partner-detail-facts"><div><CalendarBlank size={23} /><span><strong>{new Date(event.startsAt).toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Singapore" })}</strong><small>{event.scheduleLabel || `${partnerTime(event.startsAt)} – ${partnerTime(event.endsAt)}`} · Singapore time</small></span></div><a href={mapsUrl} target="_blank" rel="noopener noreferrer"><MapPin size={23} /><span><strong>{event.location}</strong><small>{event.address}</small><b>Open map & directions <ArrowUpRight size={14} /></b></span></a><div><Storefront size={23} /><span><strong>{event.feeText}</strong><small>As listed on the official event page. Availability is confirmed by the organiser.</small></span></div></div>
    {event.locationDetails?.locationNote && <p className="map-note">{event.locationDetails.locationNote}</p>}
    <section className="partner-detail-section"><h2>A little about the plan</h2><p>{event.description}</p>{event.preparation && <p>{event.preparation}</p>}</section>
    <section className="partner-eligibility"><ShieldCheck size={24} /><div><h2>Check eligibility</h2><p>{event.eligibilityText}</p>{event.source === "nyc" && <p className="partner-small-print">Discover NYC serves youths aged 15–35. Individual event requirements may differ.</p>}</div></section>
    <section className="partner-detail-section partner-registration"><Clock size={23} /><div><h2>Registration</h2>{status === "ended" ? <p>This event has ended. The official listing is available for reference.</p> : status === "closed" ? <p>The published registration deadline has passed. Check the official page for any organiser updates.</p> : status === "upcoming" ? <p>Registration opens on <strong>{partnerDate(event.registrationOpens!, true)}</strong>.</p> : <p>Check current availability and complete your registration on {event.sourceName}.</p>}{event.registrationCloses && <p>Published closing date: <strong>{partnerDate(event.registrationCloses, true)}{event.registrationCloseTimeKnown ? `, ${partnerTime(event.registrationCloses)} SGT` : ""}</strong>.</p>}<p className="partner-small-print">Opening this listing in kaki does not reserve a place.</p></div></section>
    <a className="btn btn-primary partner-source-cta" href={event.sourceUrl} target="_blank" rel="noopener noreferrer">View on {event.sourceName}<ArrowUpRight size={19} /></a>
    <p className="partner-attribution">Source: <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer">{event.sourceName}</a> · Via <a href={event.providerUrl || (event.source === "mccy" ? "https://www.mccy.gov.sg/" : "https://www.nyc.gov.sg/")} target="_blank" rel="noopener noreferrer">{event.source === "mccy" ? "MCCY" : "NYC"}</a> · Checked {partnerDate(event.checkedAt, true)}. Event details and availability are managed by the organiser.</p>
  </div>;
}
