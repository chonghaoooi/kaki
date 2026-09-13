import { useEffect, useState, type ComponentProps } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, BookOpen, CalendarBlank, Clock, GraduationCap, Heart, MagnifyingGlass, SlidersHorizontal, X } from "@phosphor-icons/react";
import { useKaki, type Route } from "./kaki-context";
import { BottomSheet, Carousel } from "./mobile";
import { Avatar, Badge, Busy, Button, Empty, IconButton, Input, PageHeading } from "./ui";
import { MentorBadge, MentorStats } from "./MentorStats";
import "./mentors.css";

type Person = Record<string, any>;

function MentorFilters({ children, ...props }: ComponentProps<typeof BottomSheet>) {
  const { desktop } = useKaki();
  if (!desktop) return <BottomSheet {...props}>{children}</BottomSheet>;
  return <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}><Dialog.Portal><Dialog.Overlay className="mentor-filter-overlay"/><Dialog.Content className="mentor-filter-dialog" onCloseAutoFocus={event => { event.preventDefault(); document.querySelector<HTMLButtonElement>(".mentor-filter-trigger")?.focus(); }}><Dialog.Title>{props.title}</Dialog.Title><Dialog.Description>{props.description}</Dialog.Description><Dialog.Close className="mentor-filter-close" aria-label="Close mentor filters"><X size={20}/></Dialog.Close>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}

function upcomingSessions(data: any, id: string): Person[] {
  const now = Date.now();
  return (data.activities || []).filter((a: Person) => !a.demoHistorical && a.category === "study" && a.participantRoles?.[id] === "mentor" && Date.parse(`${a.date}T${a.time}:00+08:00`) + 2 * 3600000 > now).sort((a: Person, b: Person) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

function canJoin(session: Person, userId: string) {
  return (session.participants || []).includes(userId) || (session.participantCount ?? session.participants?.length ?? 0) < session.capacity;
}

function sessionTime(session: Person) {
  const value = new Date(`${session.date}T${session.time}:00+08:00`);
  return `${value.toLocaleDateString("en-SG", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Singapore" })} · ${value.toLocaleTimeString("en-SG", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Singapore" })}`;
}

function MentorDirectory() {
  const { api, data, go, user } = useKaki();
  const [mentors, setMentors] = useState<Person[]>([]), [query, setQuery] = useState(""), [loading, setLoading] = useState(true), [error, setError] = useState(""), [attempt, setAttempt] = useState(0);
  const [view, setView] = useState("all"), [subject, setSubject] = useState("all"), [availability, setAvailability] = useState("all"), [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    let live = true;
    setLoading(true); setError("");
    api("/mentors").then((r) => { if (live) setMentors(r.mentors || []); }).catch((e) => { if (live) setError(e.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [api, attempt, user.id, data.activities, data.people]);
  const subjects = [...new Set<string>(mentors.flatMap(p => p.subjects || []))].sort();
  const times = [...new Set<string>(mentors.flatMap(p => p.availability || []))].sort();
  const mentorSessions = new Map(mentors.map(p => [p.id, upcomingSessions(data, p.id)]));
  const results = mentors.filter(p => [p.name, p.institution, p.course, ...(p.subjects || [])].join(" ").toLowerCase().includes(query.trim().toLowerCase()) && (subject === "all" || p.subjects?.includes(subject)) && (availability === "all" || p.availability?.includes(availability)) && (view !== "new" || p.mentorStats?.isNew) && (view !== "sessions" || mentorSessions.get(p.id)?.some(a => canJoin(a, user.id)))).sort((a,b) => a.name.localeCompare(b.name));
  const filterCount = Number(subject !== "all") + Number(availability !== "all");
  const reset = () => { setQuery(""); setView("all"); setSubject("all"); setAvailability("all"); };
  return <div className="mentor-directory">
    <PageHeading eyebrow="LEARN A LITTLE. GROW TOGETHER." title="Meet the mentors." subtitle="A familiar subject. A friendly face. Your next study kaki." />
    <nav className="mentor-paths" aria-label="Ways to get study support"><span aria-current="page"><GraduationCap size={17}/>Mentors</span><button onClick={() => go("tutoring")}>1:1 peer support<ArrowRight size={16}/></button></nav>
    <div className="mentor-search-row"><div className="search-bar mentor-search"><MagnifyingGlass size={21} /><Input aria-label="Search mentors" placeholder="Name, subject or school" value={query} onChange={e => setQuery(e.target.value)} />{query && <IconButton label="Clear mentor search" onClick={() => setQuery("")}><X size={17}/></IconButton>}</div><IconButton className={`mentor-filter-trigger ${filterCount ? "has-filters" : ""}`} label={`Filter mentors${filterCount ? `, ${filterCount} active` : ""}`} onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={22}/>{filterCount > 0 && <small>{filterCount}</small>}</IconButton></div>
    <Carousel className="mentor-views" ariaLabel="Mentor availability">{[{id:"all",label:"All mentors"},{id:"sessions",label:"Sessions to join"},{id:"new",label:"New mentors"}].map(option => <button key={option.id} className={`chip ${view === option.id ? "active" : ""}`} aria-pressed={view === option.id} onClick={() => setView(option.id)}>{option.label}</button>)}</Carousel>
    {filterCount > 0 && <div className="mentor-applied-filters">{subject !== "all" && <button aria-label={`Remove subject filter ${subject}`} onClick={() => setSubject("all")}>{subject}<X size={13}/></button>}{availability !== "all" && <button aria-label={`Remove availability filter ${availability}`} onClick={() => setAvailability("all")}>{availability}<X size={13}/></button>}</div>}
    {loading ? <Busy text="Finding your study kakis…" /> : error ? <Empty title="We couldn’t load the mentors." text={error} action={<Button onClick={() => setAttempt(a => a + 1)}>Try again</Button>} /> : <>
      <div className="mentor-results-heading"><p className="results-count" role="status">{results.length} {results.length === 1 ? "mentor" : "mentors"} in your community</p>{(query || filterCount > 0 || view !== "all") && <button className="text-link" onClick={reset}>Reset</button>}</div>
      <div className="mentor-directory-grid">{results.map(p => {
        const sessions = mentorSessions.get(p.id) || [];
        const next = sessions.find(a => canJoin(a,user.id));
        return <article key={p.id} className="card mentor-directory-card">
          <div className="mentor-person-heading"><Avatar person={p} size={64}/><div><h2>{p.name}</h2><p>{p.institution}</p></div><MentorBadge person={p}/></div>
          <div className="chips mentor-subjects">{(p.subjects || []).slice(0,3).map((s: string) => <Badge key={s} tone="blue">{s}</Badge>)}</div>
          <p className="mentor-card-bio">{p.bio || "Happy to work through a tricky question together."}</p>
          <MentorStats person={p} compact showLike={false} showHeading={false} publicView/>
          <div className="mentor-next-session"><CalendarBlank size={18}/><span>{next ? <><strong>{sessionTime(next)}</strong><small>{(next.participants || []).includes(user.id) ? "You’re in this study session" : `${next.capacity - (next.participantCount ?? next.participants?.length ?? 0)} spots in their next listed session`}</small></> : <><strong>{p.mentorStats?.isNew ? "A new face in your community" : "No open sessions shared here"}</strong><small>View their profile to learn more</small></>}</span></div>
          <Button variant="secondary" className="full" aria-label={`View ${p.name}’s mentor profile`} onClick={() => go("mentor-profile",p.id)}>Meet {p.name.split(" ")[0]}<ArrowRight size={17}/></Button>
        </article>;
      })}</div>
      {!results.length && <Empty title={mentors.length ? "Let’s try a different match." : "Your next mentor is a kaki away."} text={mentors.length ? "Try another subject or time, or see everyone in your community." : "Mentors appear here when they join a study session as a mentor."} action={<Button onClick={() => mentors.length ? reset() : go("category","study")}>{mentors.length ? "See all mentors" : "Explore study sessions"}</Button>}/>}
    </>}
    <div className="mentor-heart-explainer"><Heart size={18} weight="fill"/><p>Hearts are little thank-yous from students who have learned together. Sessions shown follow each mentor’s sharing settings.</p></div>
    {data.meta?.demoMode && <p className="mentor-demo-label">Demo community · Fictional students and sample session history</p>}
    <MentorFilters open={filtersOpen} onOpenChange={setFiltersOpen} title="Find your study kaki" description="Choose a subject and a time that suits you."><div className="mentor-filter-sheet"><h3>Subject</h3><div className="mentor-filter-options" role="group" aria-label="Filter by subject">{["all",...subjects].map(s => <button key={s} aria-pressed={subject === s} onClick={() => setSubject(s)}>{s === "all" ? "Any subject" : s}</button>)}</div><h3>Usually around</h3><div className="mentor-filter-options" role="group" aria-label="Filter by availability">{["all",...times].map(t => <button key={t} aria-pressed={availability === t} onClick={() => setAvailability(t)}>{t === "all" ? "Any time" : t}</button>)}</div><div className="mentor-filter-actions"><Button variant="ghost" onClick={() => { setSubject("all");setAvailability("all"); }}>Clear</Button><Button onClick={() => setFiltersOpen(false)}>Show {results.length} {results.length === 1 ? "mentor" : "mentors"}<ArrowRight size={17}/></Button></div></div></MentorFilters>
  </div>;
}

function PublicMentorProfile({ id }: { id: string }) {
  const { api, user, data, go } = useKaki();
  const [mentor, setMentor] = useState<Person | null>(null), [error, setError] = useState("");
  useEffect(() => { let live = true; api(`/mentors/${encodeURIComponent(id)}`).then(r => { if (live) setMentor(r.mentor); }).catch(e => { if (live) setError(e.message); }); return () => { live = false; }; }, [api,id]);
  if (error) return <Empty title="This mentor profile isn’t available." text={error} action={<Button onClick={() => go("mentors")}>Explore mentors</Button>}/>;
  if (!mentor) return <Busy text="Opening the mentor profile…"/>;
  const self = mentor.id === user.id;
  const firstName = mentor.name.split(" ")[0];
  const sessions = upcomingSessions(data,mentor.id);
  const next = sessions.find(a => canJoin(a,user.id));
  const tutor = (data.tutors || []).find((t: Person) => t.personId === mentor.id);
  return <div className="public-mentor-profile">
    <div className="card mentor-profile-hero"><p className="eyebrow">{self ? "YOUR PUBLIC MENTOR PROFILE" : "A FELLOW STUDENT. A LITTLE GUIDANCE."}</p><div className="mentor-person-heading"><Avatar person={mentor} size={82}/><div><h1>{mentor.name}</h1><MentorBadge person={mentor}/></div></div><p className="mentor-school"><GraduationCap size={17}/>{mentor.institution}</p><p className="mentor-course">{mentor.course}{mentor.year ? ` · ${mentor.year}` : ""}</p><div className="chips mentor-subjects">{(mentor.subjects || []).map((subject: string) => <Badge tone="blue" key={subject}>{subject}</Badge>)}</div><p className="mentor-availability"><Clock size={16}/>{(mentor.availability || []).join(" · ") || "Ask about a good time to study"}</p>
      <div className="mentor-profile-actions">{next ? <><Button className="full" onClick={() => go("activity",next.id)}>{(next.participants || []).includes(user.id) ? "View your study session" : `Study with ${self ? "your group" : firstName}`}<ArrowRight size={18}/></Button><small>Next session · {sessionTime(next)}</small></> : <Button className="full" variant="secondary" onClick={() => go("category","study")}>Explore study sessions<ArrowRight size={18}/></Button>}{!self && tutor && <button className="mentor-request-link" onClick={() => go("tutoring",mentor.id)}>Prefer 1:1 help? Request a session<ArrowRight size={15}/></button>}</div>
    </div>
    {self && <p className="mentor-preview-note">Your profile and stats are visible to eligible students in your community. Which sessions they can see depends on your sharing settings.</p>}
    <MentorStats person={mentor} publicView showLike={!self} showHeading={false}/>
    <section className="card mentor-profile-about"><h2>A little about {self ? "you" : firstName}</h2><p>{mentor.bio || "Happy to help other students learn together."}</p>{mentor.languages?.length > 0 && <div className="mentor-about-detail"><span>Comfortable speaking</span><strong>{mentor.languages.join(" · ")}</strong></div>}</section>
    <section className="mentor-upcoming"><div className="mentor-upcoming-heading"><h2>Study together</h2><span>{sessions.length} listed</span></div>{sessions.length ? sessions.map(a => <button key={a.id} className="card mentor-session-link" onClick={() => go("activity",a.id)}><span className="mentor-session-icon"><BookOpen size={22} weight="duotone"/></span><span><strong>{a.title}</strong><small>{sessionTime(a)}</small><small>{a.location}</small><b>{(a.participants || []).includes(user.id) ? "You’re going" : canJoin(a,user.id) ? `${a.capacity - (a.participantCount ?? a.participants?.length ?? 0)} spots left` : "Session full"}</b></span><ArrowRight size={18}/></button>) : <div className="mentor-no-sessions"><CalendarBlank size={24}/><p>No upcoming sessions are shared on this profile. Session visibility follows the mentor’s privacy settings; you can still explore other study plans.</p></div>}</section>
    <Button variant="secondary" className="full" onClick={() => go("mentors")}>Explore other mentors<ArrowRight size={17}/></Button>
    {mentor.verificationMethod === "demo" && <p className="mentor-demo-label mentor-profile-demo">Demo student · Fictional profile and sample session history</p>}
  </div>;
}

export default function Mentors({ route }: { route: Route }) {
  return route.name === "mentor-profile" ? <PublicMentorProfile key={route.id} id={route.id || ""}/> : <MentorDirectory/>;
}
