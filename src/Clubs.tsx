import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight, CalendarBlank, ChatCircle, Check, CheckCircle, Clock,
  GlobeHemisphereWest, LockKey, MagnifyingGlass, MapPin, PaperPlaneTilt,
  Plus, Repeat, ShieldCheck, Sparkle, Trash, UsersThree, X,
} from "@phosphor-icons/react";
import { useKaki, networkNames, type Route } from "./kaki-context";
import { useKeyboard } from "./mobile";
import { Avatar, Badge, Busy, Button, Empty, ErrorText, Field, IconButton, Input, PageHeading, SectionTitle, Textarea } from "./ui";
import { VenueMap } from "./EventMap";
import "./clubs.css";

type Item = Record<string, any>;
type Club = Item & { id: string; name: string; members: string[]; joined: boolean };
type Venue = { id: string; name: string; lat: number; lng: number; address?: string; maxDistanceKm?: number; averageDistanceKm?: number };
const errorMessage = (e: unknown) => e instanceof Error ? e.message : "Something went wrong. Please try again.";
const imageForClub = (club: Item) => club.image || `/assets/kaki/${/sport|badminton|run/i.test(club.interest || club.name) ? "badminton" : /stud|coding|learn/i.test(club.interest || club.name) ? "study" : /game/i.test(club.interest || club.name) ? "games" : /lunch|food/i.test(club.interest || club.name) ? "lunch" : "photography"}.webp`;
const formatDate = (date: string) => {
  const value = new Date(`${String(date).slice(0, 10)}T12:00:00+08:00`);
  return Number.isNaN(value.getTime()) ? "Date to be confirmed" : value.toLocaleDateString("en-SG", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Singapore" });
};
const formatTime = (time: string) => {
  if (!time || /[ap]m/i.test(time)) return time || "";
  const [hours, minutes] = time.split(":").map(Number);
  return `${hours % 12 || 12}:${String(minutes || 0).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
};
const timeSent = (date: string) => {
  const value = new Date(date);
  return Number.isNaN(value.getTime()) ? "" : value.toLocaleTimeString("en-SG", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Singapore" });
};
const categories = [ ["study", "Study"], ["sports", "Sports"], ["games", "Games"], ["lunch", "Lunch"], ["interests", "Interests"], ["events", "Events"] ];
const distance = (n?: number) => typeof n === "number" && Number.isFinite(n) ? `${n.toFixed(1)} km` : "—";
const singaporeDay = () => new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(value.getTime())) return "";
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};
const validSlot = (date: string, time: string, minimum: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(time) && date >= minimum && addDays(date, 0) === date;
const tabKeys = (event: KeyboardEvent<HTMLButtonElement>) => {
  const tabs = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') || []);
  const index = tabs.indexOf(event.currentTarget);
  const target = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
  if (target < 0) return;
  event.preventDefault(); tabs[target]?.focus(); tabs[target]?.click();
};

function ClubDirectory() {
  const { api, data, user, refresh, go, toast } = useKaki();
  const keyboard = useKeyboard();
  const [clubs, setClubs] = useState<Club[]>(data.circles || []);
  const [query, setQuery] = useState("");
  const [view, setView] = useState("all");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [interest, setInterest] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api("/circles").then(r => { if (active) setClubs(r.circles || []); }).catch(e => { if (active) setError(errorMessage(e)); });
    return () => { active = false; };
  }, [api]);
  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const result = await api("/circles", "POST", { name: name.trim(), interest: interest.trim(), description: description.trim() });
      await refresh();
      go("club", result.circle.id);
      toast("Your club is ready. Make the first introduction!");
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  const filtered = clubs.filter(c => (view !== "joined" || c.joined) && `${c.name} ${c.interest} ${c.description}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="clubs-screen">
    <PageHeading eyebrow="FIND YOUR REGULARS" title="Your people, every week." subtitle="A shared interest. A group chat. A reason to meet again." action={<IconButton label={creating ? "Close create club" : "Create a club"} onClick={() => { keyboard.hide(); setCreating(!creating); setError(""); }}>{creating ? <X size={22} /> : <Plus size={22} />}</IconButton>} />
    <div className="clubs-community-note"><ShieldCheck size={19} weight="duotone" /><span>Public clubs in your {networkNames[user.network]?.toLowerCase() || "student community"}</span></div>
    {creating && <form className="card clubs-create" onSubmit={create}>
      <div className="clubs-section-label"><Sparkle size={22} weight="duotone" /><h2>Start a little community.</h2></div>
      <Field label="Club name"><Input required minLength={3} maxLength={70} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. The after-class badminton club" /></Field>
      <Field label="Shared interest"><Input required minLength={2} maxLength={60} value={interest} onChange={e => setInterest(e.target.value)} placeholder="e.g. Badminton" /></Field>
      <Field label="What brings you together?"><Textarea required minLength={10} maxLength={800} rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Tell people what you enjoy and what a typical meetup looks like." /></Field>
      <p className="clubs-fine">Students in your education and age community can discover the club and read its chat. Members can post and plan meetups.</p>
      <Button type="submit" disabled={busy}>{busy ? "Creating your club…" : "Create club"}<ArrowRight size={18} /></Button>
    </form>}
    <ErrorText>{error}</ErrorText>
    <div className="clubs-search"><MagnifyingGlass size={21} /><Input aria-label="Search clubs" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a hobby, sport or study group" /></div>
    <div className="clubs-tabs" role="tablist" aria-label="Club directory views">{[["all", "Discover clubs"], ["joined", "My clubs"]].map(([key, label]) => <button key={key} role="tab" aria-selected={view === key} aria-controls="clubs-directory-results" tabIndex={view === key ? 0 : -1} onKeyDown={tabKeys} className={view === key ? "active" : ""} onClick={() => setView(key)}>{label}</button>)}</div>
    <div className="clubs-grid" id="clubs-directory-results" role="tabpanel" aria-label={view === "all" ? "Discover clubs" : "My clubs"}>{filtered.map(club => <button key={club.id} className="card clubs-card" onClick={() => go("club", club.id)}>
      <div className="clubs-card-image"><img src={imageForClub(club)} alt="" loading="lazy" width="600" height="350" /><Badge tone="purple">{club.interest || "Shared interests"}</Badge></div>
      <div className="clubs-card-copy"><h2>{club.name}</h2><p>{club.description}</p><div className="clubs-card-meta"><span><UsersThree size={17} />{club.memberCount ?? club.members?.length ?? 0} {(club.memberCount ?? club.members?.length ?? 0) === 1 ? "member" : "members"}</span>{club.joined ? <span className="clubs-joined"><CheckCircle size={16} weight="fill" />Joined</span> : <ArrowRight size={19} />}</div></div>
    </button>)}</div>
    {!filtered.length && <Empty title={view === "joined" ? "Your regulars are waiting." : "There’s room for a new club."} text={view === "joined" ? "Join a club to keep its people, conversations and plans close." : "Try another search, or start a club around something you love."} action={<Button variant="secondary" onClick={() => { keyboard.hide(); setCreating(true); setQuery(""); }}>Start a club<Plus size={17} /></Button>} />}
  </div>;
}

function ClubEventCard({ activity }: { activity: Item }) {
  const { go } = useKaki();
  return <article className="clubs-event-card">
    <span className="clubs-event-icon"><CalendarBlank size={25} weight="duotone" /></span>
    <div className="clubs-event-body">{activity.weekly && <span className="clubs-event-repeat"><Repeat size={12} />Weekly meetup{activity.occurrence ? ` · ${activity.occurrence}/${activity.occurrences}` : ""}</span>}<button className="clubs-event-title" onClick={() => go("activity", activity.id)}>{activity.title}</button><span>{formatDate(activity.date)} · {formatTime(activity.time)} SGT</span><button className="clubs-event-location" onClick={() => go("activity-location", activity.id)} aria-label={`View meeting spot: ${activity.location || "public meeting point"}`}><MapPin size={14} />{activity.locationDetails?.venueName || activity.location || activity.venue?.name || "Public meeting point"}</button><button className="clubs-event-open" onClick={() => go("activity", activity.id)}>{activity.participantCount ?? activity.participants?.length ?? 0}/{activity.capacity} going · View event<ArrowRight size={12} /></button></div>
  </article>;
}

function ClubChat({ club, plans, onJoin, onPlan, busy }: { club: Club; plans: Item[]; onJoin: () => Promise<void>; onPlan: () => Promise<void>; busy: boolean }) {
  const { api, user, desktop, go } = useKaki();
  const [messages, setMessages] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sendError, setSendError] = useState("");
  const [revealMessageId, setRevealMessageId] = useState("");
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const sentRevision = useRef(0);
  const messageList = useRef<HTMLDivElement>(null);
  const composerSurface = useRef<HTMLDivElement>(null);
  useEffect(() => { setSlot(document.getElementById("club-composer-slot")); }, [desktop]);
  useEffect(() => {
    if (!revealMessageId) return;
    const frame = window.requestAnimationFrame(() => {
      const message = Array.from(messageList.current?.children || []).find(node => (node as HTMLElement).dataset.messageId === revealMessageId) as HTMLElement | undefined;
      if (!message) return;
      const scroll = message.closest<HTMLElement>(".mobile-scroll");
      const composerTop = composerSurface.current?.getBoundingClientRect().top;
      if (scroll) {
        const bounds = scroll.getBoundingClientRect();
        const scale = bounds.height / scroll.clientHeight || 1;
        const visibleBottom = Math.min(bounds.bottom, composerTop ?? bounds.bottom);
        const delta = (message.getBoundingClientRect().bottom - visibleBottom) / scale + 14;
        if (delta > 0) scroll.scrollTo({ top: scroll.scrollTop + delta });
      } else {
        const visibleBottom = Math.min(window.innerHeight, composerTop ?? window.innerHeight);
        const delta = message.getBoundingClientRect().bottom - visibleBottom + 16;
        if (delta > 0) window.scrollTo({ top: window.scrollY + delta });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [revealMessageId]);
  useEffect(() => {
    let active = true;
    const load = () => {
      const revision = sentRevision.current;
      return api(`/circles/${club.id}/messages`).then(r => { if (active && revision === sentRevision.current) { setMessages(r.messages || []); setError(""); } }).catch(e => { if (active) setError(errorMessage(e)); }).finally(() => { if (active) setLoading(false); });
    };
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 10000);
    return () => { active = false; window.clearInterval(timer); };
  }, [api, club.id]);
  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true); setSendError("");
    try {
      const r = await api(`/circles/${club.id}/messages`, "POST", { text: text.trim() });
      sentRevision.current += 1;
      setMessages(previous => previous.some(m => m.id === r.message.id) ? previous : [...previous, r.message]); setText("");
      setRevealMessageId(r.message.id);
    } catch (e) { setSendError(errorMessage(e)); } finally { setSending(false); }
  };
  const composer = <div ref={composerSurface} className="clubs-composer-surface">{(sendError || error) && <div className="clubs-composer-error"><ErrorText>{sendError || error}</ErrorText>{sendError && <p>Your message is still here. Edit it or tap Send to try again.</p>}</div>}{club.joined ? <form className="clubs-composer" onSubmit={send}><Input aria-label={`Message ${club.name}`} placeholder="Say something to the club…" value={text} maxLength={2000} onChange={e => setText(e.target.value)} /><IconButton label={sending ? "Sending message" : "Send message"} type="submit" onPointerDown={event => event.preventDefault()} disabled={!text.trim() || sending}><PaperPlaneTilt size={21} weight="fill" /></IconButton></form> : <div className="clubs-join-composer"><span>Join the club to join the conversation.</span><Button disabled={busy} onClick={onJoin}>Join club<Plus size={17} /></Button></div>}</div>;
  return <div className="clubs-chat">
    <div className="clubs-chat-notice"><GlobeHemisphereWest size={18} /><span>Public to your student community. Be kind, and keep personal details private.</span></div>
    {club.joined && <button className="clubs-plan-prompt" onClick={onPlan} disabled={busy}><span className="clubs-plan-icon"><MapPin size={24} weight="duotone" /></span><span><strong>Plan an event</strong><small>Turn the chat into a meetup. Find a spot for everyone.</small></span><Plus size={22} /></button>}
    {loading ? <Busy text="Opening the club chat…" /> : <div ref={messageList} className="clubs-messages" role="log" aria-label="Club messages" aria-live="polite" aria-relevant="additions text">
      {messages.map(message => {
        const own = message.senderId === user.id;
        const plan = plans.find(p => p.id === message.planId);
        return <article key={message.id} data-message-id={message.id} className={`clubs-message ${own ? "own" : ""}`}>
          {!own && <Avatar person={message.author} size={32} />}
          <div className="clubs-message-content"><span className="clubs-message-author">{own ? "You" : message.author?.name || "Club member"}<time>{timeSent(message.createdAt)}</time></span>
            {message.text && <p className="clubs-bubble">{message.text}</p>}
            {message.type === "event" && message.activity && <ClubEventCard activity={message.activity} />}
            {message.type === "event" && !message.activity && message.activityId && <Button variant="secondary" onClick={() => go("activity", message.activityId)}>View event<CalendarBlank size={17} /></Button>}
            {message.type === "plan" && message.planId && <button className="clubs-shared-plan" disabled={busy} onClick={() => club.joined ? go("plan-meetup", message.planId) : onJoin()}><span className="clubs-plan-icon"><MapPin size={24} weight="duotone" /></span><strong>{plan?.title || "Let’s find a place to meet"}</strong><span>{plan?.status === "published" ? "The meetup is published. See the plan." : "Add your starting area privately to help find a fair meeting spot."}</span><span className="clubs-plan-link">{!club.joined ? "Join the club to view this plan" : plan?.status === "published" ? "View plan" : "Help plan this meetup"}<ArrowRight size={16} /></span></button>}
          </div>
        </article>;
      })}
      {!messages.length && <Empty title="Make the first introduction." text="A hello, a shared idea, a little plan. This is your club’s space." />}
    </div>}
    {slot ? createPortal(composer, slot) : desktop ? composer : null}
  </div>;
}

function ClubDetail({ id, chat = false }: { id: string; chat?: boolean }) {
  const { api, data, user, refresh, go, toast } = useKaki();
  const keyboard = useKeyboard();
  const [club, setClub] = useState<Club | null>((data.circles || []).find((c: Club) => c.id === id) || null);
  const [plans, setPlans] = useState<Item[]>([]);
  const [tab, setTab] = useState(chat ? "chat" : "about");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const membershipRevision = useRef(0);
  useEffect(() => {
    let active = true;
    const revision = membershipRevision.current;
    api(`/circles/${id}`).then(r => { if (active && revision === membershipRevision.current) { setClub(r.circle); setPlans(r.plans || []); } }).catch(e => { if (active) setError(errorMessage(e)); });
    return () => { active = false; };
  }, [id, api]);
  useEffect(() => { setTab(chat ? "chat" : "about"); }, [chat, id]);
  const membership = async (action: "join" | "leave") => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const r = await api(`/circles/${id}/${action}`, "POST");
      membershipRevision.current += 1;
      setClub(r.circle); setConfirmLeave(false); await refresh();
      toast(action === "join" ? "You’re in. Say hello to your club!" : "You’ve left the club.");
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  const startPlan = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try { const r = await api(`/circles/${id}/plans`, "POST", { title: `${club?.name || "Club"} meetup` }); go("plan-meetup", r.plan.id); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  if (!club) return error ? <Empty title="This club isn’t available" text={error} action={<Button onClick={() => go("clubs")}>Browse clubs</Button>} /> : <Busy text="Finding your club…" />;
  const activities: Item[] = [...new Map([...(club.weeklyEvents || []), ...(data.activities || []).filter((a: Item) => a.circleId === id || (club.activityIds || []).includes(a.id))].map((activity: Item) => [activity.id, activity])).values()].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const members = (club.members || []).map(memberId => [data.user, ...(data.people || [])].find(p => p.id === memberId)).filter(Boolean);
  return <div className={`clubs-screen clubs-detail ${tab === "chat" ? "clubs-chat-view" : ""}`}>
    <div className={`clubs-hero card ${tab === "chat" ? "compact" : ""}`}>
      <img src={imageForClub(club)} alt="" width="900" height="400" />
      <div className="clubs-hero-copy"><Badge tone="purple">{club.interest || "Shared interests"}</Badge><h1>{club.name}</h1><p><UsersThree size={16} />{club.memberCount ?? club.members?.length ?? 0} {(club.memberCount ?? club.members?.length ?? 0) === 1 ? "member" : "members"}<span>·</span>Public community club</p>{tab !== "chat" && <div className="clubs-hero-actions">{club.joined ? <Badge tone="green"><CheckCircle weight="fill" size={16} />You’re a member</Badge> : <Button disabled={busy} onClick={() => membership("join")}>{busy ? "Joining…" : "Join the club"}<Plus size={17} /></Button>}<Button variant="secondary" onClick={() => go("club-chat", id)}><ChatCircle size={18} />Open chat</Button></div>}</div>
    </div>
    <div className="clubs-tabs" role="tablist" aria-label="Club sections">{[["about", "About"], ["chat", "Chat"], ["events", "Events"]].map(([value, label]) => <button key={value} role="tab" aria-selected={tab === value} aria-controls="club-tab-content" tabIndex={tab === value ? 0 : -1} onKeyDown={tabKeys} className={tab === value ? "active" : ""} onClick={() => { keyboard.hide(); if (value === "chat") go("club-chat", id); else { setTab(value); setConfirmLeave(false); } }}>{label}{value === "events" && activities.length > 0 && <span>{activities.length}</span>}</button>)}</div>
    <ErrorText>{error}</ErrorText>
    <div id="club-tab-content" role="tabpanel" aria-label={tab}>
    {tab === "about" && <div className="clubs-about-layout"><div className="clubs-about-main"><section className="card clubs-section"><h2>A little about us</h2><p>{club.description}</p><div className="clubs-community-note"><ShieldCheck size={20} /><span>Visible to your education and age community. Meet in public places and make everyone feel welcome.</span></div></section><section className="card clubs-section"><SectionTitle>Meet your club</SectionTitle><div className="clubs-member-list">{members.slice(0, 12).map((person: Item) => <div key={person.id}><Avatar person={person} size={42} /><span>{person.name}<small>{person.institution}</small></span></div>)}</div>{!members.length && <p className="muted">Join and be part of this growing club.</p>}</section></div><aside className="card clubs-section clubs-weekly-invite"><span className="clubs-large-icon"><Repeat size={32} weight="duotone" /></span><h2>Make it a regular thing.</h2><p>From one good meetup to a weekly ritual. Find a public spot together, then put a date in the chat.</p><Button disabled={busy} onClick={club.joined ? startPlan : () => membership("join")}>{club.joined ? "Plan an event" : "Join to make plans"}<ArrowRight size={17} /></Button><Button variant="ghost" onClick={() => go("club-chat", id)}>See what’s happening<ChatCircle size={17} /></Button></aside></div>}
    {tab === "chat" && <ClubChat key={id} club={club} plans={plans} busy={busy} onJoin={() => membership("join")} onPlan={startPlan} />}
    {tab === "events" && <section className="clubs-events"><SectionTitle action={club.joined && <Button variant="secondary" disabled={busy} onClick={startPlan}><Plus size={17} />Plan an event</Button>}>The next get-together</SectionTitle><div className="clubs-event-grid">{activities.map(activity => <ClubEventCard key={activity.id} activity={activity} />)}</div>{!activities.length && <Empty title="The next plan could be yours." text="Suggest a meetup and help your club find a regular rhythm." action={club.joined && <Button disabled={busy} onClick={startPlan}>Plan an event<Plus size={17} /></Button>} />}</section>}
    </div>
    {club.joined && club.ownerId !== user.id && tab === "about" && <div className="clubs-leave">{confirmLeave ? <><p>Leave {club.name}? You can still read public club chat and rejoin later.</p><div className="row"><Button variant="secondary" onClick={() => setConfirmLeave(false)}>Stay in club</Button><Button variant="danger" disabled={busy} onClick={() => membership("leave")}>Leave club</Button></div></> : <Button variant="ghost" onClick={() => { keyboard.hide(); setConfirmLeave(true); }}>Leave club</Button>}</div>}
  </div>;
}

function MeetupPlanner({ id }: { id: string }) {
  const { api, data, user, go, refresh, toast } = useKaki();
  const keyboard = useKeyboard();
  const [plan, setPlan] = useState<Item | null>(null);
  const [postalCode, setPostalCode] = useState("");
  const [venueId, setVenueId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("interests");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("16:00");
  const [capacity, setCapacity] = useState(8);
  const [weekly, setWeekly] = useState(true);
  const [neighbourhoodOptIn, setNeighbourhoodOptIn] = useState(false);
  const [occurrences, setOccurrences] = useState(4);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const initialized = useRef(false);
  const planRevision = useRef(0);
  const postalDraft = useRef(false);
  const minimumDate = data.meta?.demoMode && data.meta?.anchorDate ? data.meta.anchorDate : singaporeDay();
  useEffect(() => {
    let active = true; initialized.current = false;
    const load = () => {
      const revision = planRevision.current;
      return api(`/plans/${id}`).then(r => {
        if (!active || revision !== planRevision.current) return;
        setPlan(r.plan);
        if (!postalDraft.current || r.plan.status === "published") setPostalCode(r.plan.myPostalCode || "");
        if (!initialized.current) {
          initialized.current = true; setTitle(r.plan.title || "Our next meetup"); setCategory(r.plan.category || "interests");
          setDate(addDays(minimumDate, 1)); setVenueId(r.plan.suggestions?.[0]?.id || "");
        }
      }).catch(e => { if (active) setError(errorMessage(e)); });
    };
    void load(); const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 12000);
    return () => { active = false; window.clearInterval(timer); };
  }, [id, api, minimumDate]);
  const updateOrigin = async (remove = false) => {
    if (busy) return;
    setBusy(remove ? "remove" : "origin"); setError("");
    try {
      const r = await api(`/plans/${id}/origin`, remove ? "DELETE" : "POST", remove ? undefined : { postalCode });
      planRevision.current += 1; postalDraft.current = false;
      setPlan(r.plan); setPostalCode(r.plan.myPostalCode || "");
      setVenueId(current => r.plan.suggestions?.some((v: Venue) => v.id === current) ? current : r.plan.suggestions?.[0]?.id || "");
      toast(remove ? "Your starting area has been removed." : "Your starting area is added privately.");
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(""); }
  };
  const publish = async () => {
    if (busy) return;
    setBusy("publish"); setError("");
    try {
      const r = await api(`/plans/${id}/publish`, "POST", { venueId, title: title.trim(), description: description.trim(), category, date, time, capacity, weekly, occurrences: weekly ? occurrences : 1, neighbourhoodOptIn });
      planRevision.current += 1; postalDraft.current = false; setPostalCode("");
      setPlan(r.plan); await refresh(); go("club-chat", r.plan.circleId); toast(weekly ? "Your weekly meetups are in the club chat!" : "Your meetup is in the club chat!");
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(""); }
  };
  if (!plan) return error ? <Empty title="We couldn’t open this plan" text={error} action={<Button onClick={() => go("clubs")}>Back to clubs</Button>} /> : <Busy text="Finding a place for everyone…" />;
  const owner = plan.creatorId === user.id;
  const published = plan.status === "published";
  const suggestions: Venue[] = plan.suggestions || [];
  const selected = suggestions.find(v => v.id === venueId);
  const club = (data.circles || []).find((c: Club) => c.id === plan.circleId);
  const examples: Item[] = data.meta?.postalExamples || [];
  const hasGroupComparison = Number(plan.contributionCount) >= 2;
  const detailsValid = !!selected && title.trim().length >= 4 && description.trim().length >= 10 && validSlot(date, time, minimumDate) && Number.isInteger(capacity) && capacity >= 2 && capacity <= 50 && (!weekly || (Number.isInteger(occurrences) && occurrences >= 2 && occurrences <= 8));
  return <div className="clubs-screen clubs-planner">
    <PageHeading eyebrow={club?.name || "PLAN TOGETHER"} title={published ? "It’s in the calendar." : review ? "One good plan, ready to go." : "Somewhere that works for everyone."} subtitle={published ? "Your public meeting point and dates are shared in the club chat." : review ? "Check the place and dates before sharing with your club." : "Add your starting area privately. Pick a public place, then make it a date."} />
    <div className="clubs-plan-status"><Badge tone={published ? "green" : "purple"}>{published ? <><CheckCircle size={15} weight="fill" />Published</> : <><UsersThree size={15} />{plan.contributionCount || 0} starting {plan.contributionCount === 1 ? "area" : "areas"} added</>}</Badge><Button variant="ghost" onClick={() => go("club-chat", plan.circleId)}><ChatCircle size={16} />Back to club chat</Button></div>
    <ErrorText>{error}</ErrorText>
    {review && !published && !selected && <div className="clubs-distance-note" role="status">The group suggestions have changed. Return to the details and choose a public venue before publishing.</div>}
    {review && weekly && !published && <div className="clubs-occurrence-preview"><span className="eyebrow">YOUR WEEKLY DATES</span><ol>{Array.from({ length: occurrences }, (_, index) => { const eventDate = addDays(date, index * 7); return <li key={eventDate}><CalendarBlank size={15} /><time dateTime={`${eventDate}T${time}:00+08:00`}>{formatDate(eventDate)} {eventDate.slice(0, 4)}</time><span>{formatTime(time)} SGT</span></li>; })}</ol></div>}
    {plan.demoOrigins && !published && <div className="clubs-distance-note"><UsersThree size={17} /><span>This demo plan includes sample starting areas at public libraries. They are not anyone’s home address.</span></div>}
    {published ? <div className="card clubs-section"><span className="clubs-large-icon"><CheckCircle size={38} weight="duotone" /></span><h2>{plan.title}</h2><p>{plan.weekly ? `${plan.occurrences || 4} weekly meetups are ready for your club.` : "Your meetup is ready for your club."}</p><div className="clubs-event-grid">{(data.activities || []).filter((a: Item) => (plan.activityIds || []).includes(a.id)).map((a: Item) => <ClubEventCard key={a.id} activity={a} />)}</div><Button onClick={() => go("club-chat", plan.circleId)}>See the event in chat<ArrowRight size={17} /></Button></div> : review ? <div className="clubs-review-layout"><article className="card clubs-section clubs-review"><Badge tone="purple">{categories.find(([value]) => value === category)?.[1]}</Badge><h2>{title}</h2><p>{description}</p>{selected && <VenueMap locations={[selected]} selectedId={selected.id} height={230} interactive={false} />}<div className="clubs-review-details"><span><MapPin size={21} /><strong>{selected?.name}<small>{selected?.address}</small></strong></span><span><CalendarBlank size={21} /><strong>{formatDate(date)}<small>{formatTime(time)} SGT</small></strong></span><span><Repeat size={21} /><strong>{weekly ? `Every week, for ${occurrences} meetups` : "One meetup"}<small>{weekly ? "Same day and time each week" : "A small plan. A good beginning."}</small></strong></span><span><UsersThree size={21} /><strong>{capacity} spots<small>Including you · Open to your student community</small></strong></span><span><GlobeHemisphereWest size={21} /><strong>{neighbourhoodOptIn ? "Listed in Neighbourhood" : "Not listed in Neighbourhood"}<small>{neighbourhoodOptIn ? "Open to other schools in your education and age community. Check that the venue welcomes visitors." : "This event will not appear in the Neighbourhood feed."}</small></strong></span></div><div className="clubs-community-note"><LockKey size={18} /><span>Only the public venue and event details will appear in chat. Starting areas stay private.</span></div></article><div className="clubs-publish-actions"><Button variant="secondary" disabled={!!busy} onClick={() => { keyboard.hide(); setReview(false); }}>Edit details</Button><Button disabled={!!busy || !detailsValid} onClick={publish}>{busy === "publish" ? "Publishing…" : "Publish to club chat"}<PaperPlaneTilt size={18} /></Button></div></div> : <>
      <div className="clubs-planning-layout"><div className="clubs-planning-main">
        <section className="card clubs-section clubs-origin"><div className="clubs-section-label"><span className="clubs-step-number">1</span><h2>Your starting area</h2><LockKey size={20} /></div><p>Use a public place near your starting area, such as a library. Only you can see the postal code you add.</p><form onSubmit={e => { e.preventDefault(); void updateOrigin(); }}><Field label="Singapore postal code"><Input inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" maxLength={6} required value={postalCode} onChange={e => { postalDraft.current = true; setPostalCode(e.target.value.replace(/\D/g, "")); }} placeholder={examples[0]?.postalCode || "6-digit postal code"} /></Field><Button type="submit" disabled={!!busy || !/^\d{6}$/.test(postalCode)}>{busy === "origin" ? "Finding public places…" : plan.myPostalCode ? "Update my starting area" : "Add my starting area"}<MapPin size={17} /></Button></form>{plan.myPostalCode && <div className="clubs-origin-saved"><span><CheckCircle size={16} weight="fill" />Your area is included privately</span><Button variant="ghost" disabled={!!busy} onClick={() => updateOrigin(true)}><Trash size={15} />Remove</Button></div>}{examples.length > 0 && <details className="clubs-postal-help"><summary>Try a public starting place</summary><div>{examples.slice(0, 8).map(example => <button key={example.postalCode} onClick={() => { postalDraft.current = true; setPostalCode(example.postalCode); }}><span>{example.label}</span><strong>{example.postalCode}</strong></button>)}</div></details>}<p className="clubs-fine"><ShieldCheck size={14} />Other members only see the number of contributions and public venue suggestions.</p></section>
        <section className="card clubs-section clubs-venue-section"><div className="clubs-section-label"><span className="clubs-step-number">2</span><h2>A fair place to meet</h2></div><p>{hasGroupComparison ? "Public places ranked to reduce the longest straight-line distance from the contributed areas." : "Add at least two starting areas to compare public venues fairly."}</p><div className="clubs-distance-note"><Clock size={17} /><span>{hasGroupComparison ? "Approximate straight-line distances, not travel time or route estimates." : "Public places will be compared once two members have contributed. Starting areas stay private."}</span></div>{suggestions.length ? <><VenueMap locations={suggestions} selectedId={selected?.id} onSelect={setVenueId} height={260} /><div className="clubs-venue-list" role="group" aria-label="Suggested public meeting places">{suggestions.map((venue, index) => <button key={venue.id} className={`clubs-venue ${venueId === venue.id ? "selected" : ""}`} onClick={() => setVenueId(venue.id)} aria-pressed={venueId === venue.id}><span className="clubs-venue-rank">{hasGroupComparison ? index === 0 ? <Sparkle size={18} weight="fill" /> : index + 1 : <MapPin size={18} />}</span><span><strong>{venue.name}</strong>{hasGroupComparison && index === 0 && <small className="clubs-recommended">Best balance for the group</small>}<small>{venue.address}</small>{hasGroupComparison && typeof venue.maxDistanceKm === "number" && <span className="clubs-distance-pair">Longest: {distance(venue.maxDistanceKm)}{typeof venue.averageDistanceKm === "number" && <span>Average: {distance(venue.averageDistanceKm)}</span>}</span>}</span><span className="clubs-venue-check">{venueId === venue.id && <Check size={15} weight="bold" />}</span></button>)}</div></> : <div className="clubs-no-venues"><MapPin size={35} weight="duotone" /><h3>Find your meeting spot together.</h3><p>Add at least two starting areas to compare public venues fairly. Members can contribute privately from the plan in chat.</p></div>}</section>
      </div><aside className="clubs-planning-side">
        {owner ? <form className="card clubs-section clubs-event-form" onSubmit={e => { e.preventDefault(); if (detailsValid) { keyboard.hide(); setReview(true); } }}><div className="clubs-section-label"><span className="clubs-step-number">3</span><h2>Make it a date</h2></div><Field label="Event name"><Input required minLength={4} maxLength={90} value={title} onChange={e => setTitle(e.target.value)} placeholder="A little plan for our club" /></Field><Field label="The plan"><Textarea required minLength={10} maxLength={1200} rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="What will you do? What should people bring?" /></Field><Field label="Category"><select className="input" value={category} onChange={e => setCategory(e.target.value)}>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><div className="clubs-form-grid"><Field label="First date"><Input required type="date" min={minimumDate} value={date} onChange={e => setDate(e.target.value)} /></Field><Field label="Time (SGT)"><Input required type="time" value={time} onChange={e => setTime(e.target.value)} /></Field></div><Field label="Total spots, including you"><Input required type="number" min={2} max={50} value={capacity} onChange={e => setCapacity(Number(e.target.value))} /></Field><button className={`clubs-weekly-toggle ${weekly ? "on" : ""}`} type="button" role="switch" aria-checked={weekly} onClick={() => setWeekly(!weekly)}><Repeat size={23} /><span><strong>Make it weekly</strong><small>A regular reason to get together.</small></span><span className="clubs-switch-track"><span /></span></button>{weekly && <Field label="Number of weekly meetups"><select className="input" value={occurrences} onChange={e => setOccurrences(Number(e.target.value))}>{[2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} meetups</option>)}</select></Field>}<button className={`clubs-weekly-toggle ${neighbourhoodOptIn ? "on" : ""}`} type="button" role="switch" aria-checked={neighbourhoodOptIn} aria-labelledby="clubs-neighbourhood-label" aria-describedby="clubs-neighbourhood-help" onClick={() => setNeighbourhoodOptIn(previous => !previous)}><GlobeHemisphereWest size={23} aria-hidden="true" /><span><strong id="clubs-neighbourhood-label">Share in Neighbourhood</strong><small id="clubs-neighbourhood-help">Students at other schools in your education and age community can find this event. Choose a venue that welcomes visitors.</small></span><span className="clubs-switch-track" aria-hidden="true"><span /></span></button><p className="clubs-fine">{selected ? <>Meeting at <strong>{selected.name}</strong>. </> : "Choose a public meeting place to continue. "}{weekly && "Each meetup gets its own event and RSVP list."}</p><Button type="submit" disabled={!detailsValid || !!busy}>Review event<ArrowRight size={18} /></Button></form> : <div className="card clubs-section clubs-contributor-note"><UsersThree size={36} weight="duotone" /><h2>Your input helps.</h2><p>Add your starting area to help the organizer choose a public venue that works for the group. The organizer will set the dates and share the event.</p><Button variant="secondary" onClick={() => go("club-chat", plan.circleId)}>Back to the conversation<ChatCircle size={17} /></Button></div>}
      </aside></div>
    </>}
  </div>;
}

export default function Clubs({ route }: { route: Route }) {
  if (route.name === "plan-meetup") return <MeetupPlanner key={route.id} id={route.id || ""} />;
  if (["club", "circle", "club-chat"].includes(route.name)) return <ClubDetail key={route.id} id={route.id || ""} chat={route.name === "club-chat"} />;
  return <ClubDirectory />;
}
