import { useEffect, useRef, useState, type ComponentProps, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, ArrowRight, CalendarBlank, ChatCircleDots, Check, CheckCircle, Ear, Heart, Leaf, MagnifyingGlass, MapPin, PaperPlaneTilt, ShieldCheck, SlidersHorizontal, Sparkle, User, UsersThree, VideoCamera, X } from "@phosphor-icons/react";
import { useKaki, type Route } from "./kaki-context";
import { BottomSheet, Carousel } from "./mobile";
import { Badge, Busy, Button, Empty, IconButton, Input, Textarea } from "./ui";
import "./support.css";

type Need = "settling-in" | "study-pressure" | "friendships" | "confidence" | "life-changes";
type Format = "small-group" | "large-group" | "one-to-one";
type Membership = "joined" | "waitlisted" | "requested" | null;
type SupportGroup = {
  id: string; title: string; summary: string; description: string; need: Need; needLabel: string;
  leaderType: "student" | "professional"; format: Format; mode: "in-person" | "online";
  capacity: number; memberCount: number; spotsLeft: number; status: "open" | "full";
  date: string; time: string; durationMinutes: number; location: string;
  host: { name: string; role: string; credentials: string; bio: string; verification: "demo" | "verified" };
  topics: string[]; expectations: string[]; myMembership: Membership; demoSample: boolean; isHost: boolean; isEnded: boolean;
};
type ListenerApplication = { id: string; topics: Need[]; formats: Format[]; availability: string; experience: string; status: "pending"; createdAt: string };
type Message = { id: string; text: string; senderName: string; mine: boolean; createdAt: string };
const needs: { id: Need; label: string }[] = [{ id: "settling-in", label: "Settling in" }, { id: "study-pressure", label: "Study pressure" }, { id: "friendships", label: "Friendships" }, { id: "confidence", label: "Confidence" }, { id: "life-changes", label: "Life changes" }];
const formats: { id: Format; label: string }[] = [{ id: "small-group", label: "Small groups" }, { id: "large-group", label: "Large groups" }, { id: "one-to-one", label: "1:1 support" }];
const formatName = (format: Format) => format === "small-group" ? "Small group" : format === "large-group" ? "Large group" : "1:1 support";
const membershipName = (membership: Membership) => membership === "joined" ? "You’re in" : membership === "requested" ? "Request pending" : membership === "waitlisted" ? "On the waitlist" : "";
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Something went wrong. Please try again.";

function sessionDate(group: SupportGroup) {
  const date = new Date(`${group.date}T${group.time}:00+08:00`);
  if (Number.isNaN(date.getTime())) return "Schedule to be confirmed";
  return date.toLocaleDateString("en-SG", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Singapore" });
}
function sessionTime(group: SupportGroup) {
  const date = new Date(`${group.date}T${group.time}:00+08:00`);
  if (Number.isNaN(date.getTime())) return "Time to be confirmed";
  return date.toLocaleTimeString("en-SG", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Singapore" });
}
function NeedIcon({ need, size = 25 }: { need: Need; size?: number }) {
  if (need === "study-pressure") return <Leaf size={size} weight="duotone" />;
  if (need === "friendships") return <ChatCircleDots size={size} weight="duotone" />;
  if (need === "confidence") return <Sparkle size={size} weight="duotone" />;
  if (need === "life-changes") return <Heart size={size} weight="duotone" />;
  return <UsersThree size={size} weight="duotone" />;
}
function useResource<T,>(path: string) {
  const { api, user } = useKaki();
  const [value, setValue] = useState<T | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(""), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true); setError(""); setValue(null);
    api(path).then(result => { if (live) setValue(result); }).catch(err => { if (live) setError(errorMessage(err)); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [api, path, user.id, attempt]);
  return { value, setValue, loading, error, reload: () => setAttempt(n => n + 1) };
}
function SupportDialog({ children, ...props }: ComponentProps<typeof BottomSheet>) {
  const { desktop } = useKaki();
  if (!desktop) return <BottomSheet {...props}>{children}</BottomSheet>;
  return <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}><Dialog.Portal><Dialog.Overlay className="support-dialog-overlay" /><Dialog.Content className="support-dialog" onCloseAutoFocus={event => { event.preventDefault(); document.querySelector<HTMLButtonElement>(".support-filter-trigger")?.focus(); }}><Dialog.Title>{props.title}</Dialog.Title><Dialog.Description>{props.description}</Dialog.Description><Dialog.Close className="support-dialog-close" aria-label="Close support filters"><X size={20} /></Dialog.Close>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}
function SupportFootnote() {
  const { go } = useKaki();
  return <div className="support-footnote"><p>Student listeners offer peer support, not counselling.</p><button className="text-link" onClick={() => go("support-help")}>Need support now?<ArrowRight size={15} /></button></div>;
}
function SupportBack() {
  const { go } = useKaki();
  return <button className="support-back" onClick={() => go("support")}><ArrowLeft size={17} />All support spaces</button>;
}

function CareWelcome({ listener = false, pending = false }: { listener?: boolean; pending?: boolean }) {
  const { go } = useKaki();
  return <header className={`support-care-welcome ${listener ? "support-care-listener" : ""}`}>
    {!listener && <div className="support-welcome-top"><p className="support-care-eyebrow">SUPPORT, AT YOUR PACE</p><button onClick={() => go("support-help")}>Need help now?<ArrowRight size={13} /></button></div>}
    <div className="support-care-copy">{listener && <p className="support-care-eyebrow">A LITTLE TIME. A KIND PRESENCE.</p>}<h1>{pending ? "Thanks for showing up." : listener ? "Be someone’s listening ear." : <>A little care.<br />A little company.</>}</h1></div>
    <img className="support-company-art" src="/assets/kaki/support-company.webp" alt="" width={150} height={150} draggable={false} onError={event => { event.currentTarget.style.visibility = "hidden"; }} onLoad={event => { event.currentTarget.style.visibility = "visible"; }} />
    <p className="support-care-intro">{pending ? "A thoughtful first step. Your application is pending review." : listener ? "You don’t need the perfect words. Start with a little time and an open mind." : "Whatever’s on your mind, find people who’ll listen. Start by just being here."}</p>
  </header>;
}

function FacilitatorIdentity({ group, detailed = false }: { group: SupportGroup; detailed?: boolean }) {
  const initials = group.host.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("");
  return <div className={`support-facilitator ${detailed ? "support-facilitator-detailed" : ""}`}><span className="support-facilitator-avatar" aria-hidden="true">{initials}</span><div><strong>{detailed ? group.host.name : `With ${group.host.name}`}</strong><span>{group.leaderType === "professional" ? <User size={13} /> : <Heart size={13} />}{group.leaderType === "professional" ? "Professional-led" : "Student listener"}{group.host.verification === "demo" && " · Demo"}</span></div></div>;
}

function GroupCard({ group }: { group: SupportGroup }) {
  const { go } = useKaki();
  const full = group.status === "full" || group.spotsLeft <= 0;
  return <article className={`card support-group-card support-tone-${group.need}`}>
    <div className="support-card-top"><span className="support-need-name"><NeedIcon need={group.need} size={17} />{group.needLabel}</span>{group.demoSample && <span className="support-demo-tag">Demo space</span>}</div>
    <div className="support-card-title"><h2>{group.title}</h2><p>{group.summary}</p></div>
    <FacilitatorIdentity group={group} />
    <div className="support-card-specs"><span><UsersThree size={16} />{formatName(group.format)}{group.format !== "one-to-one" && ` · up to ${group.capacity}`}</span><span>{group.mode === "online" ? <VideoCamera size={16} /> : <MapPin size={16} />}{group.mode === "online" ? "Online" : "In person"}</span></div>
    <div className="support-card-schedule"><CalendarBlank size={17} /><span>{sessionDate(group)} · {sessionTime(group)}</span></div>
    <div className="support-card-bottom"><span className={group.myMembership || group.isHost ? "support-member-status" : full || group.isEnded ? "support-full-status" : "support-open-status"}>{group.isHost ? <><User size={15} />Hosting</> : group.myMembership ? <><CheckCircle size={15} weight="fill" />{membershipName(group.myMembership)}</> : group.isEnded ? "Session ended" : full ? "Full · waitlist available" : `${group.spotsLeft} ${group.spotsLeft === 1 ? "spot" : "spots"} available`}</span><Button variant="secondary" aria-label={`View ${group.title}`} onClick={() => go("support-group", group.id)}>{group.format === "one-to-one" ? "See this space" : "Meet the group"}<ArrowRight size={16} /></Button></div>
  </article>;
}

function SupportDirectory() {
  const { go } = useKaki();
  const resource = useResource<{ groups: SupportGroup[]; listenerApplication: ListenerApplication | null }>("/support/groups");
  const [query, setQuery] = useState(""), [leader, setLeader] = useState("all"), [format, setFormat] = useState("all"), [need, setNeed] = useState("all"), [availability, setAvailability] = useState("open"), [view, setView] = useState("browse"), [filtersOpen, setFiltersOpen] = useState(false);
  const groups = resource.value?.groups || [];
  const joinedCount = groups.filter(group => group.myMembership || group.isHost).length;
  const filters = Number(format !== "all") + Number(need !== "all") + Number(availability !== "open");
  const results = groups.filter(group => (view !== "mine" || group.myMembership || group.isHost) && (view === "mine" || availability === "all" || (!group.isEnded && group.status === "open") || group.myMembership || group.isHost) && (leader === "all" || group.leaderType === leader) && (format === "all" || group.format === format) && (need === "all" || group.need === need) && [group.title, group.summary, group.needLabel, group.host.name, ...group.topics].join(" ").toLowerCase().includes(query.trim().toLowerCase()));
  const reset = () => { setQuery(""); setLeader("all"); setFormat("all"); setNeed("all"); setAvailability("open"); };
  return <div className="support-directory">
    <CareWelcome />
    <div className="support-care-shortcuts"><button aria-pressed={format === "one-to-one" && view === "browse"} onClick={() => { reset(); setView("browse"); setFormat("one-to-one"); }}><ChatCircleDots size={18} />Talk 1:1<ArrowRight size={14} /></button><button onClick={() => go("listening-ear")}><Ear size={18} />{resource.value?.listenerApplication ? "Your application" : "Be a listening ear"}<ArrowRight size={14} /></button></div>
    <div className="support-view-switch" role="group" aria-label="Support spaces"><button aria-pressed={view === "browse"} onClick={() => { setView("browse"); reset(); }}>Find a space</button><button aria-pressed={view === "mine"} onClick={() => { setView("mine"); reset(); }}>My spaces{joinedCount > 0 && <span>{joinedCount}</span>}</button></div>
    <div className="support-search-row"><div className="search-bar support-search"><MagnifyingGlass size={20} /><Input aria-label="Search support spaces" value={query} onChange={event => setQuery(event.target.value)} placeholder="What’s on your mind?" />{query && <IconButton label="Clear support search" onClick={() => setQuery("")}><X size={17} /></IconButton>}</div><IconButton className={`support-filter-trigger ${filters > 0 ? "has-filters" : ""}`} label={`Filter support spaces${filters ? `, ${filters} active` : ""}`} onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={22} />{filters > 0 && <small>{filters}</small>}</IconButton></div>
    <Carousel className="support-leader-filters" ariaLabel="Who leads the space">{[{ id: "all", label: "All facilitators" }, { id: "student", label: "Student-led" }, { id: "professional", label: "Professional-led" }].map(option => <button key={option.id} className={`chip ${leader === option.id ? "active" : ""}`} aria-pressed={leader === option.id} onClick={() => setLeader(option.id)}>{option.label}</button>)}</Carousel>
    {(format !== "all" || need !== "all" || availability === "all") && <div className="support-applied-filters">{format !== "all" && <button onClick={() => setFormat("all")} aria-label="Remove group format filter">{formats.find(f => f.id === format)?.label}<X size={13} /></button>}{need !== "all" && <button onClick={() => setNeed("all")} aria-label="Remove support need filter">{needs.find(n => n.id === need)?.label}<X size={13} /></button>}{availability === "all" && view !== "mine" && <button onClick={() => setAvailability("open")} aria-label="Show open support spaces only">Including full spaces<X size={13} /></button>}</div>}
    <div className="support-results-heading"><p role="status">{resource.loading ? "Finding your spaces…" : `${results.length} ${results.length === 1 ? "space" : "spaces"}${view === "mine" ? " for you" : availability === "open" ? " open to explore" : " to explore"}`}</p>{(query || leader !== "all" || filters > 0) && <button className="text-link" onClick={reset}>Reset</button>}</div>
    {resource.loading ? <Busy text="Finding a space for you…" /> : resource.error ? <Empty title="We couldn’t load your spaces." text={resource.error} action={<Button onClick={resource.reload}>Try again</Button>} /> : results.length ? <div className="support-groups-grid">{results.map(group => <GroupCard key={group.id} group={group} />)}</div> : <Empty title={view === "mine" && !joinedCount ? "Your space is waiting." : "Let’s try a different space."} text={view === "mine" && !joinedCount ? "Joined groups, waitlists and 1:1 requests will be kept here. Your memberships aren’t shown on your public profile." : "Try another need, facilitator or format. You can also include full groups and join a waitlist."} action={<Button onClick={() => { reset(); if (view === "mine") setView("browse"); else setAvailability("all"); }}>{view === "mine" ? "Find a space" : "See all spaces"}<ArrowRight size={16} /></Button>} />}
    {groups.some(group => group.demoSample) && <p className="support-demo-note">Demo spaces and fictional facilitators. No real session or professional service is booked here.</p>}
    <SupportFootnote />
    <SupportDialog open={filtersOpen} onOpenChange={setFiltersOpen} title="Find your kind of space" description="Choose the setting that feels comfortable for you."><div className="support-filter-content"><h3>What would help?</h3><div className="support-filter-options" role="group" aria-label="Support needs">{[{ id: "all", label: "Anything on your mind" }, ...needs].map(option => <button key={option.id} aria-pressed={need === option.id} onClick={() => setNeed(option.id)}>{option.label}</button>)}</div><h3>Group size</h3><div className="support-filter-options" role="group" aria-label="Support format">{[{ id: "all", label: "Any format" }, ...formats].map(option => <button key={option.id} aria-pressed={format === option.id} onClick={() => setFormat(option.id)}>{option.label}</button>)}</div>{view !== "mine" && <><h3>Availability</h3><div className="support-filter-options" role="group" aria-label="Support availability"><button aria-pressed={availability === "open"} onClick={() => setAvailability("open")}>Spaces with a spot</button><button aria-pressed={availability === "all"} onClick={() => setAvailability("all")}>All, including full</button></div></>}<div className="support-filter-actions"><Button variant="ghost" onClick={() => { setNeed("all"); setFormat("all"); setAvailability("open"); }}>Clear</Button><Button onClick={() => setFiltersOpen(false)}>Show {results.length} {results.length === 1 ? "space" : "spaces"}<ArrowRight size={17} /></Button></div></div></SupportDialog>
  </div>;
}

function SupportGroupDetail({ id }: { id: string }) {
  const { api, go, toast } = useKaki();
  const resource = useResource<{ group: SupportGroup }>(`/support/groups/${encodeURIComponent(id)}`);
  const [consent, setConsent] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(""), [confirmLeave, setConfirmLeave] = useState(false);
  const pending = useRef(false), live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  const group = resource.value?.group;
  async function changeMembership(leave = false) {
    if (!group || pending.current || group.isHost || (!leave && (!consent || group.isEnded))) return;
    pending.current = true; setBusy(true); setError("");
    try {
      const result = await api(`/support/groups/${encodeURIComponent(id)}/${leave ? "membership" : "join"}`, leave ? "DELETE" : "POST", leave ? undefined : { acceptGuidelines: true, waitlist: group.status === "full" || group.spotsLeft <= 0 });
      if (!live.current) return;
      resource.setValue({ group: result.group }); setConfirmLeave(false); setConsent(false);
      toast(leave ? "Your place has been released." : result.group.myMembership === "requested" ? "Your 1:1 request is pending." : result.group.myMembership === "waitlisted" ? "You’re on the waitlist." : "You’re in. Take it at your pace.");
    } catch (err) {
      if (live.current) setError(errorMessage(err));
      if ([409, 422].includes((err as { status?: number }).status || 0)) {
        try { const latest = await api(`/support/groups/${encodeURIComponent(id)}`); if (live.current) resource.setValue(latest); } catch { /* Keep the original actionable error visible. */ }
      }
    } finally { pending.current = false; if (live.current) setBusy(false); }
  }
  if (resource.loading) return <Busy text="Opening your support space…" />;
  if (resource.error || !group) return <><SupportBack /><Empty title="This space isn’t available right now." text={resource.error} action={<Button onClick={resource.reload}>Try again</Button>} /></>;
  const full = group.status === "full" || group.spotsLeft <= 0;
  const membership = group.myMembership;
  const ended = group.isEnded || Date.parse(`${group.date}T${group.time}:00+08:00`) + group.durationMinutes * 60000 <= Date.now();
  const cancelLabel = membership === "joined" ? "Leave this group" : membership === "waitlisted" ? "Leave the waitlist" : "Cancel my request";
  return <div className={`support-detail support-tone-${group.need}`}>
    <SupportBack />
    <section className="card support-detail-hero"><div className="support-detail-top"><span className="support-need-icon"><NeedIcon need={group.need} size={32} /></span><div><Badge tone="purple">{group.needLabel}</Badge>{group.demoSample && <span className="support-demo-tag">Demo space</span>}</div></div><h1>{group.title}</h1><p>{group.summary}</p><div className="support-detail-tags"><span><UsersThree size={16} />{formatName(group.format)}</span><span>{group.leaderType === "professional" ? <User size={16} /> : <Heart size={16} />}{group.leaderType === "professional" ? "Professional-led" : "Student-led"}</span></div></section>
    {(membership || group.isHost) && <section className="support-membership-panel" aria-live="polite"><CheckCircle size={26} weight="duotone" /><div><h2>{group.isHost ? "You’re hosting this space." : membership === "joined" ? "There’s a place for you here." : membership === "requested" ? "Your request is in." : "You’re on the waitlist."}</h2><p>{group.isHost ? "Give people a warm welcome and help everyone feel comfortable participating at their own pace." : membership === "joined" ? "Say hello in the group chat, or just read along until you feel ready." : membership === "requested" ? "This is a pending 1:1 request, not a confirmed appointment. The facilitator needs to confirm before a session can take place." : ended ? "This session has ended. Your waitlist entry did not confirm a place; you can leave it and explore upcoming spaces." : full ? "This space is full. A waitlist entry doesn’t confirm a place or a session." : "A place has opened up. Read the guidelines below to take the available spot; your waitlist entry alone does not confirm a session."}</p>{(membership === "joined" || (group.isHost && group.format !== "one-to-one")) && <Button onClick={() => go("support-chat", id)}><ChatCircleDots size={18} />Open group chat<ArrowRight size={17} /></Button>}</div></section>}
    <section className="card support-schedule"><h2>{ended ? "Session details" : "The next session"}</h2><div><CalendarBlank size={20} /><span><strong>{sessionDate(group)}</strong><small>{sessionTime(group)} · {group.durationMinutes} minutes · Singapore time</small></span></div><div>{group.mode === "online" ? <VideoCamera size={20} /> : <MapPin size={20} />}<span><strong>{group.mode === "online" ? "Online" : "Meet in person"}</strong><small>{group.location}</small>{group.mode === "in-person" && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(group.location)}`} target="_blank" rel="noreferrer">View location<ArrowRight size={14} /></a>}</span></div><div><UsersThree size={20} /><span><strong>{group.format === "one-to-one" ? "One person, one facilitator" : `${group.memberCount} of ${group.capacity} places taken`}</strong><small>{group.isHost ? "You’re hosting" : membership ? membershipName(membership) : ended ? "This session has ended" : full ? "Full · you can join the waitlist" : `${group.spotsLeft} ${group.spotsLeft === 1 ? "spot" : "spots"} available`}</small></span></div>{group.demoSample && <p className="support-inline-demo">Sample schedule only. {group.mode === "online" ? "No live meeting link is provided." : "The meeting point does not indicate a booked venue."}</p>}</section>
    <section className="card support-host"><div className="support-section-label"><Ear size={21} /><h2>Your facilitator</h2></div><FacilitatorIdentity group={group} detailed /><p className="support-host-role">{group.host.role}</p>{group.host.credentials && <p className="support-host-credentials">{group.host.credentials}</p>}<p>{group.host.bio}</p>{group.host.verification === "demo" ? <span className="support-host-demo">Fictional demo facilitator · credentials unverified</span> : <span className="support-host-demo"><ShieldCheck size={14} />Credentials checked by kaki</span>}</section>
    <section className="card support-about"><h2>A little about this space</h2><p>{group.description}</p><div className="support-topic-tags">{group.topics.map(topic => <Badge key={topic} tone="blue">{topic}</Badge>)}</div><h3>What to expect</h3><ul>{group.expectations.map((expectation, index) => <li key={index}><Check size={17} /><span>{expectation}</span></li>)}</ul></section>
    <section className="card support-guidelines"><div className="support-section-label"><ShieldCheck size={21} /><h2>Make room for each other</h2></div><p>Listen without judging. Sharing is always your choice. Respect everyone’s boundaries and don’t share another person’s story or messages.</p><p>Your membership isn’t displayed on your public profile. Group members can see messages you post; privacy depends on everyone respecting these guidelines.</p></section>
    {membership === "waitlisted" && !full && !ended && <section className="support-waitlist-opening"><h2>A place has opened up.</h2><p>You can leave the waitlist and {group.format === "one-to-one" ? "request this available slot" : "join this group"}.</p><label className="support-consent"><input type="checkbox" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} /><span>I agree to respect the group’s guidelines.</span></label><Button className="full" disabled={!consent || busy} onClick={() => changeMembership()}>{busy ? "Updating your place…" : group.format === "one-to-one" ? "Request the available slot" : "Take the available spot"}<ArrowRight size={17} /></Button></section>}
    {membership === "joined" && <Button className="full" onClick={() => go("support-chat", id)}>Continue to group chat<ArrowRight size={17} /></Button>}
    {(membership === "requested" || membership === "waitlisted") && <p className="support-pending-status" role="status">{membership === "requested" ? "Your 1:1 request is pending. No appointment is confirmed yet." : "Your waitlist place is saved. It does not confirm a session."}</p>}
    <section className="support-join-panel">{group.isHost ? <p>You’re the facilitator. You don’t need to book a place in your own space.</p> : !membership && ended ? <><Button className="full" disabled>Session ended</Button><p>You can explore other support spaces with upcoming sessions.</p><Button variant="secondary" className="full" onClick={() => go("support")}>Find another space<ArrowRight size={17} /></Button></> : !membership ? <><label className="support-consent"><input type="checkbox" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} /><span>I’ve read the expectations and agree to respect the group’s guidelines.</span></label><Button className="full" disabled={!consent || busy} onClick={() => changeMembership()}>{busy ? "Saving your place…" : full ? "Join the waitlist" : group.format === "one-to-one" ? "Request 1:1 support" : "Join this group"}<ArrowRight size={18} /></Button><p>{group.demoSample ? "You’re trying a demo. " : ""}{full ? "We’ll keep your interest on the waitlist; a place isn’t guaranteed." : group.format === "one-to-one" ? "A request needs facilitator confirmation before an appointment is made." : "No need to have the right words. You can start by listening."}</p></> : confirmLeave ? <div className="support-leave-confirm"><h3>{cancelLabel}?</h3><p>{membership === "joined" ? "You’ll lose access to this group’s chat. Messages you’ve already shared stay in the conversation." : "You can make another request later if the space is available."}</p><div><Button variant="secondary" disabled={busy} onClick={() => setConfirmLeave(false)}>Keep my place</Button><Button variant="danger" disabled={busy} onClick={() => changeMembership(true)}>{busy ? "Updating…" : "Confirm"}</Button></div></div> : <button className="support-cancel-link" onClick={() => setConfirmLeave(true)}>{cancelLabel}</button>}{error && <p className="support-error" role="alert">{error}</p>}</section>
    <button className="support-report-link" onClick={() => go("report", id)}>Report a concern about this space</button>
    <SupportFootnote />
  </div>;
}

function SupportChat({ id }: { id: string }) {
  const { api, go } = useKaki();
  const resource = useResource<{ group: SupportGroup }>(`/support/groups/${encodeURIComponent(id)}`);
  const [messages, setMessages] = useState<Message[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(""), [text, setText] = useState(""), [busy, setBusy] = useState(false), [attempt, setAttempt] = useState(0);
  const pending = useRef(false), live = useRef(true), messagesRevision = useRef(0);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  const group = resource.value?.group;
  useEffect(() => {
    if (!group || (group.myMembership !== "joined" && !(group.isHost && group.format !== "one-to-one"))) return;
    let active = true;
    const requestRevision = messagesRevision.current;
    setLoading(true); setError("");
    api(`/support/groups/${encodeURIComponent(id)}/messages`).then(result => { if (active && requestRevision === messagesRevision.current && !pending.current) setMessages(result.messages || []); }).catch(err => { if (active && requestRevision === messagesRevision.current && !pending.current) setError(errorMessage(err)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, id, group?.myMembership, group?.isHost, group?.format, attempt]);
  async function send(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() || pending.current) return;
    pending.current = true;
    // A read begun before this send must not replace its newer conversation.
    messagesRevision.current += 1;
    setBusy(true); setError("");
    try { const result = await api(`/support/groups/${encodeURIComponent(id)}/messages`, "POST", { text: text.trim() }); if (live.current) { messagesRevision.current += 1; setMessages(result.messages || []); setLoading(false); setText(""); } }
    catch (err) { if (live.current) setError(errorMessage(err)); }
    finally { pending.current = false; if (live.current) setBusy(false); }
  }
  if (resource.loading) return <Busy text="Opening the group conversation…" />;
  if (resource.error || !group) return <Empty title="We couldn’t open this conversation." text={resource.error} action={<Button onClick={resource.reload}>Try again</Button>} />;
  if (group.myMembership !== "joined" && !(group.isHost && group.format !== "one-to-one")) return <Empty title="This chat is for group members." text="A waitlist place or pending 1:1 request doesn’t give access to the group conversation." action={<Button onClick={() => go("support-group", id)}>View the support space</Button>} />;
  return <div className="support-chat"><button className="support-back" onClick={() => go("support-group", id)}><ArrowLeft size={17} />About this space</button><div className="support-chat-heading"><span className={`support-need-icon support-tone-${group.need}`}><NeedIcon need={group.need} /></span><div><h1>{group.title}</h1><p>Members only · {group.memberCount} participants</p></div></div><p className="support-chat-privacy"><ShieldCheck size={17} />Share at your own pace. Group members can read your messages. Please keep each other’s stories private.</p><div className="support-chat-toolbar"><span>Group conversation</span><button className="text-link" disabled={loading || busy} onClick={() => setAttempt(n => n + 1)}>Refresh</button></div>{loading ? <Busy text="Loading messages…" /> : <div className="support-messages" role="log" aria-label="Support group messages" aria-live="polite">{messages.length ? messages.map(message => <article key={message.id} className={`support-message ${message.mine ? "is-mine" : ""}`}><div><strong>{message.mine ? "You" : message.senderName}</strong><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString("en-SG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Singapore" })}</time></div><p>{message.text}</p></article>) : <div className="support-chat-empty"><ChatCircleDots size={32} weight="duotone" /><h2>A quiet place to begin.</h2><p>A hello is enough. You can also read along and join in when you’re ready.</p></div>}</div>}{error && <p className="support-error" role="alert">{error}</p>}<form className="support-composer" onSubmit={send} aria-busy={busy}><label htmlFor="support-message">Your message</label><Textarea id="support-message" value={text} onChange={event => setText(event.target.value)} placeholder="Say hello, or share a little…" rows={3} maxLength={1200} required disabled={busy} /><div><span>{text.length}/1200</span><Button type="submit" disabled={!text.trim() || busy}>{busy ? "Sending…" : "Send"}<PaperPlaneTilt size={17} /></Button></div></form>{group.demoSample && <p className="support-demo-note">Demo conversation. Fictional facilitators won’t send live replies.</p>}<button className="support-report-link" onClick={() => go("report", id)}>Report a concern</button><SupportFootnote /></div>;
}

function ListeningEar() {
  const { api, toast, go } = useKaki();
  const resource = useResource<{ application: ListenerApplication | null }>("/support/listener-application");
  const [topics, setTopics] = useState<Need[]>([]), [selectedFormats, setFormats] = useState<Format[]>([]), [availability, setAvailability] = useState(""), [experience, setExperience] = useState(""), [consent, setConsent] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(""), [withdraw, setWithdraw] = useState(false);
  const pending = useRef(false), live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  const application = resource.value?.application;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    if (!topics.length || !selectedFormats.length) { setError("Choose at least one topic and one format you’re comfortable supporting."); return; }
    if (!consent) { setError("Please read and accept the listening ear boundaries."); return; }
    pending.current = true; setBusy(true); setError("");
    try { const result = await api("/support/listener-application", "POST", { topics, formats: selectedFormats, availability: availability.trim(), experience: experience.trim(), acceptBoundaries: true }); if (live.current) { resource.setValue(result); toast("Your listening ear application is pending."); } }
    catch (err) { if (live.current) setError(errorMessage(err)); }
    finally { pending.current = false; if (live.current) setBusy(false); }
  }
  async function withdrawApplication() {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError("");
    try { const result = await api("/support/listener-application", "DELETE"); if (live.current) { resource.setValue(result); setWithdraw(false); setTopics([]); setFormats([]); setAvailability(""); setExperience(""); setConsent(false); toast("Application withdrawn."); } }
    catch (err) { if (live.current) setError(errorMessage(err)); }
    finally { pending.current = false; if (live.current) setBusy(false); }
  }
  if (resource.loading) return <Busy text="Getting your application ready…" />;
  if (resource.error) return <><SupportBack /><Empty title="We couldn’t load your application." text={resource.error} action={<Button onClick={resource.reload}>Try again</Button>} /></>;
  return <div className="support-listener"><SupportBack /><CareWelcome listener pending={!!application} /><ol className="support-listener-steps" aria-label="Becoming a listening ear"><li className="is-current"><span>1</span><strong>Apply</strong><small>{application ? "Pending review" : "Tell us a little"}</small></li><li><span>2</span><strong>Preparation</strong><small>After review</small></li><li><span>3</span><strong>Support others</strong><small>When approved</small></li></ol>{application ? <><section className="card support-application-summary"><Badge tone="purple">Application pending</Badge><h2>Your offer to help</h2><dl><div><dt>Comfortable supporting</dt><dd>{application.topics.map(topic => needs.find(n => n.id === topic)?.label || topic).join(" · ")}</dd></div><div><dt>Preferred settings</dt><dd>{application.formats.map(format => formatName(format)).join(" · ")}</dd></div><div><dt>When you’re around</dt><dd>{application.availability}</dd></div><div><dt>Your experience</dt><dd>{application.experience}</dd></div></dl><p className="support-application-status">Submitting this form doesn’t approve you as a listener or grant access to private groups. A review and appropriate preparation are needed before you can help.</p></section><p className="support-demo-note">Demo application only. There is no live review or placement service in this prototype.</p>{withdraw ? <div className="support-leave-confirm"><h3>Withdraw your application?</h3><p>Your pending application details will be removed. You can apply again later.</p><div><Button variant="secondary" disabled={busy} onClick={() => setWithdraw(false)}>Keep application</Button><Button variant="danger" disabled={busy} onClick={withdrawApplication}>{busy ? "Withdrawing…" : "Withdraw"}</Button></div></div> : <button className="support-cancel-link" onClick={() => setWithdraw(true)}>Withdraw application</button>}<Button className="full" variant="secondary" onClick={() => go("support")}>Explore support spaces<ArrowRight size={17} /></Button></> : <><div className="support-listener-boundaries"><Heart size={24} weight="duotone" /><div><h2>Being there starts with listening.</h2><p>You can be new to this. Student listeners offer peer support, not counselling. Preparation and a review come before supporting others.</p></div></div><form className="support-listener-form" onSubmit={submit} aria-busy={busy}><fieldset disabled={busy}><legend>What feels close to your heart?</legend><p>Choose the topics you’d feel comfortable listening to.</p><div className="support-choice-buttons">{needs.map(need => <button type="button" key={need.id} aria-pressed={topics.includes(need.id)} onClick={() => setTopics(current => current.includes(need.id) ? current.filter(value => value !== need.id) : [...current, need.id])}>{need.label}{topics.includes(need.id) && <Check size={15} />}</button>)}</div></fieldset><fieldset disabled={busy}><legend>How would you like to show up?</legend><div className="support-choice-buttons">{formats.map(format => <button type="button" key={format.id} aria-pressed={selectedFormats.includes(format.id)} onClick={() => setFormats(current => current.includes(format.id) ? current.filter(value => value !== format.id) : [...current, format.id])}>{format.label}{selectedFormats.includes(format.id) && <Check size={15} />}</button>)}</div></fieldset><label className="field"><span>When could you make a little time?</span><Input value={availability} onChange={event => setAvailability(event.target.value)} placeholder="e.g. Wednesday afternoons, 1 hour a week" required minLength={2} maxLength={300} disabled={busy} /></label><label className="field"><span>What brings you here?</span><Textarea value={experience} onChange={event => setExperience(event.target.value)} placeholder="Tell us why you’d like to listen. If you have volunteering or training experience, you can share it here. It’s okay to be new." required minLength={10} maxLength={1500} rows={5} disabled={busy} /><small>Please avoid sharing private stories or personal health details about yourself or others.</small></label><div className="support-listener-guidelines"><h3>A listening ear agrees to…</h3><ul><li>Listen without judgement and let the other person choose what to share.</li><li>Respect privacy, personal boundaries and the limits of peer support.</li><li>Avoid diagnosis or treatment advice and seek facilitator guidance when needed.</li><li>Complete a review and any required preparation before supporting others.</li></ul></div><label className="support-consent"><input type="checkbox" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} required /><span>I understand these boundaries and that applying does not approve me as a listener.</span></label><Button type="submit" className="full" disabled={busy}>{busy ? "Sending your application…" : "Send application"}<ArrowRight size={17} /></Button><p className="support-form-private"><ShieldCheck size={15} />Your application is private and isn’t added to your public profile.</p><p className="support-demo-note">Demo application only. There is no live review or placement service in this prototype.</p></form></>}{error && <p className="support-error" role="alert">{error}</p>}<SupportFootnote /></div>;
}

export default function Support({ route }: { route: Route }) {
  if (route.name === "support-group" && route.id) return <SupportGroupDetail key={route.id} id={route.id} />;
  if (route.name === "support-chat" && route.id) return <SupportChat key={route.id} id={route.id} />;
  if (route.name === "listening-ear") return <ListeningEar />;
  return <SupportDirectory />;
}
