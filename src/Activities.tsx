import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Racquet,
  DiceFive,
  BowlFood,
  Palette,
  UsersThree,
  GraduationCap,
  CalendarBlank,
  MagnifyingGlass,
  CheckCircle,
  MapPin,
  MapTrifold,
  Clock,
  BookmarkSimple,
  DotsThree,
  SlidersHorizontal,
  Sparkle,
  Plant,
  ShieldCheck,
  X,
  Plus,
  ChatCircle,
  Heart,
} from "@phosphor-icons/react";
import { Carousel, useKeyboard } from "./mobile";
import { useKaki, networkNames } from "./kaki-context";
import { MentorStats } from "./MentorStats";
import CommunityScope from "./CommunityScope";
import "./audience.css";
import "./discover.css";
import { activityExperienceLabel, compareActivities, dateLabelFor, isDiscoverableActivity, matchesActivitySearch, singaporeDateKey } from "./discovery-model";
import { useDiscoveryClock } from "./use-discovery-clock";
import {
  Avatar,
  Badge,
  Button,
  Empty,
  ErrorText,
  Field,
  IconButton,
  Input,
  PageHeading,
  SectionTitle,
  Textarea,
} from "./ui";

export const categories = [
  { id: "study", label: "Study", icon: BookOpen, tone: "blue" },
  { id: "sports", label: "Sports", icon: Racquet, tone: "purple" },
  { id: "games", label: "Games", icon: DiceFive, tone: "orange" },
  { id: "lunch", label: "Lunch", icon: BowlFood, tone: "yellow" },
  { id: "interests", label: "Interests", icon: Palette, tone: "cyan" },
  { id: "people", label: "Meet", icon: UsersThree, tone: "indigo" },
  { id: "tutoring", label: "Tutoring", icon: GraduationCap, tone: "blue" },
  { id: "events", label: "Events", icon: CalendarBlank, tone: "purple" },
];
export const imageFor = (a: any) =>
  a.image ||
  `/assets/kaki/${({ sports: "badminton", sport: "badminton", study: "study", games: "games", lunch: "lunch", interests: "photography", events: "games" } as any)[a.category] || "study"}.webp`;
export function dateLabel(a: any) {
  return dateLabelFor(String(a.date || ""));
}
export function displayTime(time: string) {
  if (!time) return "";
  if (/[AP]M/i.test(time)) return time;
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m || 0).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
const total = (a: any) => a.participantCount ?? a.participants?.length ?? 0;
const joined = (a: any, id: string) =>
  a.joined === true ||
  (a.participants || []).some(
    (p: any) => (typeof p === "string" ? p : p.id) === id,
  );
export function AvatarStack({ activity }: { activity: any }) {
  const { data, user } = useKaki();
  const people = (activity.participants || [])
    .slice(0, 3)
    .map(
      (id: any) =>
        [user, ...(data.people || [])].find(
          (p: any) => p.id === (typeof id === "string" ? id : id.id),
        ) || { name: "Student" },
    );
  return (
    <div className="attendee-row">
      <div className="avatar-stack">
        {people.map((p: any, i: number) => (
          <Avatar key={i} person={p} size={28} />
        ))}
        {activity.participants?.length > 3 && (
          <span className="avatar more-avatar">
            +{activity.participants.length - 3}
          </span>
        )}
      </div>
      <span>
        {total(activity)} / {activity.capacity} joined
      </span>
    </div>
  );
}
export function ActivityCard({
  activity,
  compact = false,
  discovery,
}: {
  activity: any;
  compact?: boolean;
  discovery?: "hero" | "row";
}) {
  const { user, api, refresh, go, toast } = useKaki();
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const isJoined = joined(activity, user.id);
  const full = total(activity) >= activity.capacity;
  const ended = !isDiscoverableActivity(activity);
  const isHost = activity.hostId === user.id;
  const experienceLabel = activityExperienceLabel(activity);
  const action = async () => {
    if (pending.current) return;
    if (isJoined || activity.hostId === user.id) {
      go("activity", activity.id);
      return;
    }
    if (full || ended) return;
    if (activity.category === "study") {
      go("study-role", activity.id);
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      await api(`/activities/${activity.id}/join`, "POST", {});
      await refresh();
      toast("You’re in! Find the details in My Activities.");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  if (discovery) {
    const hero = discovery === "hero";
    const experience = experienceLabel;
    const campusPrefix = `${user.institution} · `;
    const venueLabel = activity.location?.startsWith(campusPrefix) ? activity.location.slice(campusPrefix.length) : activity.location;
    const welcome = (activity.tags || []).find((tag: string) => /everyone welcome|all are welcome|all welcome/i.test(tag));
    const actionLabel = busy ? "Joining…" : isHost ? "View your plan" : isJoined ? "Joined" : ended ? "Ended" : full ? "Full" : !hero ? "Join" : activity.category === "sports" || activity.category === "sport" ? "Join game" : activity.category === "lunch" ? "Join lunch" : activity.category === "events" ? "Reserve spot" : "Join session";
    return <article className={`discover-plan-card discover-plan-${discovery}`}>
      <button className="discover-plan-image" onClick={() => go("activity", activity.id)} aria-label={`View ${activity.title}`}><img src={imageFor(activity)} alt={activity.title} loading={hero ? "eager" : "lazy"} fetchPriority={hero ? "high" : "auto"} decoding="async" width={700} height={400} />{hero && experience && <span className="discover-plan-badge"><Plant size={13} />{experience}</span>}</button>
      <div className="discover-plan-content"><button className="discover-plan-title" onClick={() => go("activity", activity.id)}><h2>{activity.title}</h2></button><div className="discover-plan-metadata"><span><CalendarBlank size={17} />{dateLabel(activity)}, {displayTime(activity.time)}</span><button onClick={() => go("activity-location", activity.id)} aria-label={`See location for ${activity.title}`}><MapPin size={18} /><span>{venueLabel}</span></button></div><div className="discover-plan-status"><span className="discover-spots"><UsersThree size={18} />{isHost ? "You’re hosting" : isJoined ? "You’re in" : full ? "Group full" : `${Math.max(0, activity.capacity - total(activity))} spots left`}</span>{hero && welcome && <span className="discover-welcome"><ChatCircle size={17} />{welcome}</span>}</div><Button className="discover-join" variant={hero && !isJoined ? "primary" : "secondary"} disabled={busy || (!isJoined && !isHost && (full || ended))} onClick={action} aria-label={`${actionLabel}: ${activity.title}`}>{actionLabel}{hero && (isJoined ? <CheckCircle size={17} weight="fill" /> : <ArrowRight size={18} />)}</Button></div>
    </article>;
  }
  return (
    <article className={`activity-card ${compact ? "compact" : ""}`}>
      <button
        className="card-image-button"
        onClick={() => go("activity", activity.id)}
        aria-label={`View ${activity.title}`}
      >
        <img
          src={imageFor(activity)}
          alt={activity.title}
          loading="lazy"
          decoding="async"
          width="700"
          height="400"
        />
        <Badge tone={activity.category === "lunch" ? "orange" : experienceLabel ? "green" : "blue"}>
          {activity.category === "lunch" ? <BowlFood size={13} /> : experienceLabel ? <Plant size={13} /> : <CalendarBlank size={13} />}{" "}
          {experienceLabel || categories.find(category => category.id === activity.category)?.label || "Activity"}
        </Badge>
      </button>
      <div className="activity-card-body">
        <button
          className="title-button"
          onClick={() => go("activity", activity.id)}
        >
          <h3>{activity.title}</h3>
        </button>
        <div className="metadata">
          <span>
            <CalendarBlank size={16} />
            {dateLabel(activity)} · {displayTime(activity.time)}
          </span>
          <button className="location-link" onClick={() => go("activity-location", activity.id)} aria-label={`See location for ${activity.title}`}>
            <MapPin size={16} />
            {activity.location}
          </button>
        </div>
        <div className="activity-card-footer">
          <AvatarStack activity={activity} />
          <Button
            disabled={busy || (!isJoined && !isHost && (full || ended))}
            variant={isJoined ? "secondary" : "primary"}
            onClick={action}
          >
            {busy
              ? "Joining…"
              : isHost
                ? "View your plan"
                : isJoined
                  ? "Joined"
                  : ended
                    ? "Ended"
                    : full
                  ? "Full"
                  : activity.category === "sports"
                    ? "Join game"
                    : activity.category === "lunch"
                      ? "Join lunch"
                      : activity.category === "events"
                        ? "Reserve spot"
                        : "Join session"}
            {isJoined ? (
              <CheckCircle size={16} weight="fill" />
            ) : (
              <ArrowRight size={16} />
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}

export function Discover() {
  const { data, user, go, route, setRouteParams } = useKaki();
  const now = useDiscoveryClock();
  const search = route.params?.q || "";
  const setSearch = (value: string) => setRouteParams({ q: value || undefined });
  const query = search.trim();
  const results = (data.activities || []).filter((activity: any) => activity.institutionId === user.institutionId && isDiscoverableActivity(activity, now) && matchesActivitySearch(activity, search)).sort(compareActivities);
  const available = results.filter((activity: any) => total(activity) < activity.capacity && !joined(activity, user.id) && activity.hostId !== user.id);
  const preferred = query ? results[0] : available.find((activity: any) => activity.category === "sports" || activity.category === "sport") || available[0] || results[0];
  const [heroSelection, setHeroSelection] = useState<{ key: string; id: string } | null>(null);
  const heroKey = `${user.id}:${query}`;
  const featured = heroSelection?.key === heroKey ? results.find((activity: any) => activity.id === heroSelection.id) || preferred : preferred;
  useEffect(() => {
    if (featured && (heroSelection?.key !== heroKey || heroSelection.id !== featured.id)) setHeroSelection({ key: heroKey, id: featured.id });
  }, [featured?.id, heroKey, heroSelection]);
  const otherPlans = results.filter((activity: any) => activity.id !== featured?.id);
  const futurePlans = otherPlans.filter((activity: any) => compareActivities(activity, { startsAt: now.toISOString() }) >= 0);
  const comingUp = (query ? otherPlans : futurePlans.length ? futurePlans : otherPlans).slice(0, query ? 8 : 1);
  const hour = Number(new Intl.DateTimeFormat("en-SG", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Singapore" }).format(now));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const nextParams: Record<string, string> = search ? { q: search } : {};
  const moveCategory = (id: string) => {
    if (id === "people") go("people");
    else if (id === "all") go("browse", undefined, nextParams);
    else go("category", id, { ...nextParams, category: id });
  };
  return <div className="discover-v2">
    <header className="discover-topbar"><div className="discover-brand">kaki</div><CommunityScope scope="campus" compact /><IconButton label="Open messages" onClick={() => go("messages")}><ChatCircle size={25} />{(data.conversations || []).some((conversation: any) => conversation.unreadCount > 0) && <span className="notification-dot" />}</IconButton></header>
    <section className="discover-welcome-copy"><p>{greeting}, {user.name?.split(" ")[0] || "there"}</p><h1>Small plans.<br /><em>Good company.</em></h1></section>
    <div className="discover-find-row"><div className="discover-search-field"><MagnifyingGlass size={20} /><Input aria-label="Search activities" placeholder="What are you up for?" value={search} onChange={event => setSearch(event.target.value)} />{search && <IconButton label="Clear search" onClick={() => setSearch("")}><X size={17} /></IconButton>}</div><button className="discover-map-link" aria-label="Explore event map" onClick={() => go("event-map", undefined, nextParams)}><MapTrifold size={23} />Map</button></div>
    {query && <div className="discover-search-summary"><p role="status">{results.length} {results.length === 1 ? "plan" : "plans"} for “{query}”</p><button onClick={() => setSearch("")}>Clear</button></div>}
    {featured ? <ActivityCard key={featured.id} activity={featured} discovery="hero" /> : <Empty title={query ? "No plans match just yet." : "Your next plan starts here."} text={query ? "Try a different sport, subject or interest." : "There aren’t any upcoming campus activities to show. You can start a plan of your own."} action={<Button onClick={() => query ? setSearch("") : go("create")}>{query ? "Clear search" : "Create a plan"}<ArrowRight size={17} /></Button>} />}
    <section className="discover-category-section"><h2>Find your kind of plan</h2><Carousel className="discover-category-rail" contentClassName="discover-category-track" ariaLabel="Find your kind of plan">{[{ id: "study", label: "Study", icon: BookOpen, tone: "lilac" }, { id: "sports", label: "Sports", icon: Racquet, tone: "mint" }, { id: "games", label: "Games", icon: DiceFive, tone: "cream" }, { id: "people", label: "Meet", icon: UsersThree, tone: "cyan" }, { id: "all", label: "All", icon: DotsThree, tone: "lilac" }].map(category => <button key={category.id} className={`discover-category discover-category-${category.tone}`} onClick={() => moveCategory(category.id)}><category.icon size={24} weight="duotone" /><span>{category.label}</span></button>)}</Carousel></section>
    {comingUp.length > 0 && <section className="discover-coming-up"><div className="discover-section-title"><h2>{query || !futurePlans.length ? "More plans" : "Coming up"}</h2><button onClick={() => go("browse", undefined, nextParams)}>See all<ArrowRight size={14} /></button></div><div className="discover-coming-list">{comingUp.map((activity: any) => <ActivityCard key={activity.id} activity={activity} discovery="row" />)}</div></section>}
    <nav className="discover-gentle-links" aria-label="More ways to find company"><button onClick={() => go("mentors")}><GraduationCap size={22} />Mentors</button><button onClick={() => go("clubs")}><UsersThree size={22} />Clubs</button><button onClick={() => go("support")}><Heart size={23} />Need a hand?</button></nav>
  </div>;
}

export function ActivityBrowser({
  category,
  own = false,
  initialTab,
}: {
  category?: string;
  own?: boolean;
  initialTab?: string;
}) {
  const { data, user, go, desktop, route, setRouteParams } = useKaki();
  const now = useDiscoveryClock();
  const today = singaporeDateKey(now);
  const tomorrow = singaporeDateKey(new Date(now.getTime() + 86400000));
  const search = route.params?.q || "";
  const setSearch = (value: string) => setRouteParams({ q: value || undefined });
  const selected = route.params?.category || category || "all";
  const setSelected = (value: string) => setRouteParams({ category: value });
  const time = route.params?.when || "all", mode = route.params?.mode || "all", experience = route.params?.experience || "all", size = route.params?.size || "all";
  const setTime = (value: string) => setRouteParams({when: value === "all" ? undefined : value});
  const setMode = (value: string) => setRouteParams({mode: value === "all" ? undefined : value});
  const setExperience = (value: string) => setRouteParams({experience: value === "all" ? undefined : value});
  const setSize = (value: string) => setRouteParams({size: value === "all" ? undefined : value});
  const tab = route.params?.tab || initialTab || "joined";
  const setTab = (value: string) => setRouteParams({tab: value});
  const filters = route.params?.filters === "1";
  const setFilters = (value: boolean) => setRouteParams({filters: value ? "1" : undefined});
  const title = own
    ? "Your next good plan."
    : (
        {
          study: "Better together, book by book.",
          sports: "Find your next game.",
          games: "Pull up a chair.",
          lunch: "Good food. Better company.",
          events: "Something to look forward to.",
        } as any
      )[selected] || "What are you up for?";
  const activities = (data.activities || []).filter((a: any) => {
    const cat = a.category === "sport" ? "sports" : a.category;
    return (
      (own || (isDiscoverableActivity(a, now) && a.institutionId === user.institutionId)) && (selected === "all" || cat === selected) &&
      matchesActivitySearch(a, search) &&
      (time === "all" || a.date === time) &&
      (mode === "all" ||
        (mode === "online"
          ? /online/i.test(a.location)
          : !/online/i.test(a.location))) &&
      (experience === "all" || a.experience === experience) &&
      (size === "all" || a.capacity <= Number(size)) &&
      (!own ||
        (tab === "joined"
          ? joined(a, user.id)
          : tab === "hosting"
            ? a.hostId === user.id
            : (user.savedActivityIds || []).includes(a.id)))
    );
  }).sort(compareActivities);
  const chips = (
    <>
      {[
        { id: "all", label: "All", icon: Sparkle },
        ...categories.filter(
          (c) => !["people", "tutoring"].includes(c.id),
        ),
      ].map((c) => (
        <button
          key={c.id}
          className={`chip ${selected === c.id ? "selected" : ""}`}
          onClick={() => setSelected(c.id)}
        >
          <c.icon size={18} />
          {c.label}
        </button>
      ))}
    </>
  );
  return (
    <>
      <PageHeading
        eyebrow={own ? "MY ACTIVITIES" : networkNames[user.network]}
        title={title}
        subtitle={
          own
            ? "The sessions you’ve joined, saved, and made happen."
            : "Make a plan. Meet a few people. See where it goes."
        }
        action={
          desktop ? (
            <Button onClick={() => go("create")}>
              <Plus size={18} />
              Create activity
            </Button>
          ) : undefined
        }
      />
      {selected === "study" && <button className="study-mentor-discovery" onClick={() => go("mentors")}><GraduationCap size={28} weight="duotone" /><span><strong>Meet the mentors</strong><small>Hearts from peers. A little experience. A session together.</small></span><ArrowRight size={19} /></button>}
      {own && (
        <div className="segmented">
          {["joined", "hosting", "saved"].map((t) => (
            <button
              key={t}
              className={t === tab ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      )}
      <div className="search-filter-row">
        <div className="search-bar">
          <MagnifyingGlass size={20} />
          <Input
            aria-label="Search activities"
            placeholder={
              selected === "study"
                ? "Search a subject, module or topic"
                : "Search activities"
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <IconButton
          label="Activity filters"
          onClick={() => setFilters(!filters)}
        >
          <SlidersHorizontal size={22} />
        </IconButton>
      </div>
      {desktop ? (
        <div className="chips">{chips}</div>
      ) : (
        <Carousel
          ariaLabel="Activity categories"
          className="chip-carousel"
          contentClassName="chip-track"
        >
          {chips}
        </Carousel>
      )}
      {filters && (
        <div className="filter-panel card">
          <div className="form-grid">
            <Field label="When">
              <select
                className="input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              >
                <option value="all">Any time</option>
                <option value={today}>Today</option>
                <option value={tomorrow}>Tomorrow</option>
              </select>
            </Field>
            <Field label="Where">
              <select
                className="input"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="all">Anywhere</option>
                <option value="online">Online</option>
                <option value="inperson">In person</option>
              </select>
            </Field>
            <Field label="Experience">
              <select
                className="input"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
              >
                <option value="all">All levels</option>
                <option>Beginner</option>
                <option>Casual</option>
                <option>Intermediate</option>
                <option>Competitive</option>
              </select>
            </Field>
            <Field label="Group size">
              <select
                className="input"
                value={size}
                onChange={(e) => setSize(e.target.value)}
              >
                <option value="all">Any size</option>
                <option value="2">One-to-one</option>
                <option value="6">Up to 6 students</option>
                <option value="10">Up to 10 students</option>
              </select>
            </Field>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              setTime("all");
              setMode("all");
              setExperience("all");
              setSize("all");
            }}
          >
            Reset filters
          </Button>
        </div>
      )}
      {selected === "lunch" && (
        <button
          className={`lunch-now card ${time === today ? "selected" : ""}`}
          onClick={() => setTime(time === today ? "all" : today)}
        >
          <BowlFood size={32} weight="duotone" />
          <span>
            <strong>Lunch today</strong>
            <small>Find a friendly table on campus.</small>
          </span>
          <ArrowRight size={20} />
        </button>
      )}
      <p className="results-count">
        {activities.length}{" "}
        {activities.length === 1 ? "activity" : "activities"} ·{" "}
        {networkNames[user.network]?.toLowerCase()}
      </p>
      <div className="activity-grid">
        {activities.map((a: any) => (
          <ActivityCard key={a.id} activity={a} />
        ))}
        {!activities.length && (
          <Empty
            title={own ? "Your next plan starts here." : "No plans match yet."}
            text={
              own
                ? "Join an activity or create something you’d enjoy."
                : "Try widening your filters, or start your own small gathering."
            }
            action={
              <Button onClick={() => go(own ? "browse" : "create")}>
                {own ? "Find something to do" : "Create an activity"}
                <ArrowRight size={16} />
              </Button>
            }
          />
        )}
      </div>
    </>
  );
}

export function ActivityDetail({ id }: { id: string }) {
  const { data, user, api, refresh, go, toast } = useKaki();
  const [activity, setActivity] = useState<any>(
      (data.activities || []).find((a: any) => a.id === id),
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [audienceBusy, setAudienceBusy] = useState(false),
    [members, setMembers] = useState<any[]>([]);
  useEffect(() => {
    let live = true;
    api("/activities/" + id)
      .then((r) => {
        if (live) { setActivity(r.activity || r); setMembers(r.members || []); }
      })
      .catch((e) => setError(e.message));
    return () => {
      live = false;
    };
  }, [id, api]);
  const a = activity;
  if (!a) return <Empty title={error || "Loading your plan…"} />;
  const updateAudience = async () => {
    setAudienceBusy(true); setError("");
    try {
      const result = await api(`/activities/${id}/audience`, "POST", { neighbourhoodOptIn: !a.neighbourhoodOptIn });
      setActivity(result.activity); await refresh();
      toast(result.activity.neighbourhoodOptIn ? "Your event is now shared in Neighbourhood." : "Your event has been removed from Neighbourhood. Existing RSVPs are kept.");
    } catch (e) { setError((e as Error).message); }
    finally { setAudienceBusy(false); }
  };
  const isJoined = joined(a, user.id);
  const saved = (user.savedActivityIds || []).includes(id);
  const change = async (action: string) => {
    setBusy(true);
    try {
      const r = await api(`/activities/${id}/${action}`, "POST", {});
      if (r.activity) setActivity(r.activity);
      await refresh();
      toast(
        action === "join"
          ? "You’re in! Say hi to the group."
          : action === "leave"
            ? "You’ve left this activity."
            : "Your saved activities are updated.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const host =
    a.host || (data.people || []).find((p: any) => p.id === a.hostId) || user;
  const hostConnected = (data.conversations || []).some(
    (c: any) => c.personId === host.id,
  );
  const meetHost = () => go(hostConnected ? "chat" : "people", host.id);
  const sessionMentors = (a.participants || []).filter((id: string) => a.participantRoles?.[id] === "mentor").map((id: string) => members.find((p) => p.id === id) || [user, ...(data.people || [])].find((p: any) => p.id === id)).filter(Boolean);
  return (
    <div className="detail-layout">
      <div>
        <div className="detail-image">
          <img src={imageFor(a)} alt={a.title} />
          <div className="detail-image-actions">
            <IconButton
              label={saved ? "Unsave activity" : "Save activity"}
              onClick={() => change("save")}
            >
              <BookmarkSimple size={22} weight={saved ? "fill" : "regular"} />
            </IconButton>
            <IconButton
              label="Report activity"
              onClick={() => go("report", a.id)}
            >
              <DotsThree size={24} />
            </IconButton>
          </div>
          <Badge tone="green">
            <Plant size={15} />
            {!a.experience || a.experience === "Beginner" ? "Beginner friendly" : a.experience}
          </Badge>
        </div>
        <PageHeading eyebrow={networkNames[user.network]} title={a.title} />
        <div className="event-audience-label"><Badge tone={a.neighbourhoodOptIn ? "purple" : "blue"}>{a.neighbourhoodOptIn ? "Neighbourhood welcome" : "Campus event"}</Badge><span>{a.institutionLabel}</span></div>
        <div className="detail-metadata">
          <div>
            <CalendarBlank size={23} weight="duotone" />
            <span>
              <strong>
                {dateLabel(a)} · {displayTime(a.time)}
              </strong>
              <small>Singapore time · SGT</small>
            </span>
          </div>
          <button className="detail-location-button" onClick={() => go("activity-location", id)}>
            <MapPin size={23} weight="duotone" />
            <span>
              <strong>{a.location}</strong>
              <small>View location & directions</small>
            </span>
            <ArrowRight size={19} />
          </button>
          <div>
            <UsersThree size={23} weight="duotone" />
            <span>
              <strong>
                {total(a)} of {a.capacity} spots filled
              </strong>
              <small>Small groups. Easy conversations.</small>
            </span>
          </div>
        </div>
        {a.category === "study" && <div className="study-detail-summary"><GraduationCap size={26} weight="duotone" /><span><strong>{a.myRole ? `You’re joining as a ${a.myRole}` : "A space to learn and guide"}</strong>{a.roleCounts?.peer || 0} {(a.roleCounts?.peer || 0) === 1 ? "peer" : "peers"} · {a.roleCounts?.mentor || 0} {(a.roleCounts?.mentor || 0) === 1 ? "mentor" : "mentors"}</span><Button variant="ghost" onClick={() => go("study-role", id)}>{a.myRole ? "Change role" : "Choose role"}</Button></div>}
        {a.category === "study" && <section className="study-event-mentors"><SectionTitle action={<button className="text-link" onClick={() => go("mentors")}>All mentors<ArrowRight size={15} /></button>}>Meet the mentors</SectionTitle>{sessionMentors.length ? <div className="study-mentor-grid">{sessionMentors.map((p: any) => <article key={p.id} className="card study-event-mentor"><div className="row"><Avatar person={p} size={45} /><div><strong>{p.name}</strong><small className="block muted">{p.institution}</small></div></div><MentorStats person={p} compact showLike={false} publicView /><Button variant="secondary" className="full" onClick={() => go("mentor-profile", p.id)}>View {p.id === user.id ? "public" : "mentor"} profile<ArrowRight size={17} /></Button></article>)}</div> : <p className="muted">Mentor profiles appear here when their sharing settings allow it.</p>}</section>}
        {a.circleId && <Button variant="secondary" className="full" onClick={() => go("club-chat", a.circleId)}><ChatCircle size={19} /> Open club chat <ArrowRight size={17} /></Button>}
        <h2>The plan</h2>
        <p className="detail-description">{a.description}</p>
        <div className="chips">
          {(a.tags || []).map((t: string) => (
            <Badge key={t} tone="purple">
              {t}
            </Badge>
          ))}
        </div>
        <div className="host-row card">
          <Avatar person={host} size={46} />
          <div>
            <small>Hosted by</small>
            <strong>
              {host.name} <CheckCircle size={15} weight="fill" />
            </strong>
            <p>{host.institution}</p>
          </div>
          {host.id !== user.id && (
            <Button variant="ghost" onClick={meetHost}>
              {hostConnected ? "Say hi" : "Meet host"}
            </Button>
          )}
        </div>
        <h2>Your fellow kakis</h2>
        <div className="member-list">
          {(a.participants || []).map((id: any, i: number) => {
            const p = [user, ...(data.people || [])].find(
              (p) => p.id === (typeof id === "string" ? id : id.id),
            );
            return (
              <div className="row" key={i}>
                <Avatar person={p} name="Student" />
                <span>
                  {p?.name || "Student"}
                  {a.category === "study" && <span className="mentor-member-role"> · {a.participantRoles?.[p?.id] === "mentor" ? "Mentor" : "Peer"}</span>}
                  <small className="muted block">
                    {p?.institution || user.institution}
                  </small>
                </span>
                <CheckCircle className="blue" weight="fill" size={17} />
              </div>
            );
          })}
        </div>
      </div>
      <aside className="detail-booking card">
        {a.hostId === user.id && <AudienceControl enabled={!!a.neighbourhoodOptIn} disabled={audienceBusy} onChange={updateAudience} />}
        <Badge tone="green">
          <ShieldCheck size={15} />{" "}
          {data.meta?.demoMode
            ? "Demo student community"
            : "Your student community"}
        </Badge>
        <h2>
          {isJoined ? "You’re part of the plan." : "There’s room for you."}
        </h2>
        <p className="muted">
          {isJoined
            ? "Check in with your host, and meet everyone at the public meeting point."
            : "Come as you are. You don’t need to know anyone or be an expert."}
        </p>
        <AvatarStack activity={a} />
        <Button
          className="full"
          disabled={busy || (!isJoined && total(a) >= a.capacity)}
          onClick={() =>
            host.id === user.id
              ? go("activities", "hosting")
              : isJoined
                ? meetHost()
                : a.category === "study" ? go("study-role", id) : change("join")
          }
        >
          {busy
            ? "One moment…"
            : host.id === user.id
              ? "See my hosted activities"
              : isJoined
                ? hostConnected
                  ? "Message host"
                  : "Connect with host"
                : total(a) >= a.capacity
                  ? "This activity is full"
                  : a.category === "study" ? "Choose peer or mentor" : a.category === "events"
                    ? "Reserve my spot"
                    : "Count me in"}
          <ArrowRight size={18} />
        </Button>
        {isJoined && host.id !== user.id && (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => change("leave")}
          >
            Leave activity
          </Button>
        )}
        <Button variant="ghost" onClick={() => go("report", a.id)}>
          Report a concern
        </Button>
        <ErrorText>{error}</ErrorText>
      </aside>
    </div>
  );
}

export function CreateActivity() {
  const keyboard = useKeyboard();
  const moveStep = (n: number) => {
    keyboard.hide();
    setStep(n);
  };
  const { api, user, refresh, go, toast } = useKaki();
  const today = singaporeDateKey();
  const [step, setStep] = useState(1),
    [category, setCategory] = useState("study"),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [date, setDate] = useState(() => singaporeDateKey(new Date(Date.now() + 86400000))),
    [time, setTime] = useState("15:00"),
    [capacity, setCapacity] = useState(6),
    [experience, setExperience] = useState("Beginner"),
    [subject, setSubject] = useState(""),
    [locations, setLocations] = useState<any[]>([]),
    [locationId, setLocationId] = useState(""),
    [neighbourhoodOptIn, setNeighbourhoodOptIn] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    api("/locations")
      .then((r) => {
        const items = Array.isArray(r) ? r : r.locations || [];
        setLocations(items);
        setLocationId(items[0]?.id || "");
      })
      .catch((e) => setError(e.message));
  }, [api]);
  const location = locations.find((l) => l.id === locationId);
  const publish = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await api("/activities", "POST", {
        category,
        title,
        description,
        date,
        time,
        capacity,
        experience,
        subject,
        locationId,
        neighbourhoodOptIn,
        tags: [
          experience === "Beginner" ? "Beginner friendly" : experience,
          "Everyone welcome",
        ],
      });
      await refresh();
      go("activity", result.activity?.id || result.id);
      toast("Your plan is live. Let’s bring people together.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="create-flow">
      <PageHeading
        eyebrow={`CREATE A PLAN · STEP ${step} OF 3`}
        title={
          step === 1
            ? "What shall we do?"
            : step === 2
              ? "Make it a plan."
              : "Ready to bring people together?"
        }
        subtitle="It doesn’t have to be a big thing. A small plan is a great start."
      />
      <div className="step-track">
        {[1, 2, 3].map((i) => (
          <span key={i} className={i <= step ? "active" : ""} />
        ))}
      </div>
      {step === 1 && (
        <>
          <div className="category-grid create-categories">
            {categories
              .filter((c) => !["people", "tutoring"].includes(c.id))
              .map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`category-tile tone-${c.tone} ${category === c.id ? "chosen" : ""}`}
                >
                  <c.icon weight="duotone" size={32} />
                  <span>{c.label}</span>
                  {category === c.id && <CheckCircle weight="fill" size={18} />}
                </button>
              ))}
          </div>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              moveStep(2);
            }}
          >
            <Field label="Give your activity a name">
              <Input
                required
                maxLength={90}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Casual badminton after class"
              />
            </Field>
            <Field label="What’s the plan?">
              <Textarea
                required
                maxLength={1200}
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will you do together? Let people know what to expect."
              />
            </Field>
            {category === "study" && (
              <Field label="Subject or module">
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Database Systems"
                />
              </Field>
            )}
            <Button
              type="submit"
              disabled={!title.trim() || !description.trim()}
            >
              Add the details
              <ArrowRight size={18} />
            </Button>
          </form>
        </>
      )}
      {step === 2 && (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            moveStep(3);
          }}
        >
          <div className="form-grid">
            <Field label="Date">
              <Input
                required
                type="date"
                min={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Time (SGT)">
              <Input
                required
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Meeting point">
            <select
              required
              className="input"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
          <p className="privacy-note">
            <ShieldCheck size={16} /> Choose a public campus space. Home
            addresses stay private.
          </p>
          <div className="form-grid">
            <Field label="Total group size, including you">
              <Input
                type="number"
                min={2}
                max={category === "events" ? 50 : 20}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
              />
            </Field>
            <Field label="Experience level">
              <select
                className="input"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
              >
                <option>Beginner</option>
                <option>Casual</option>
                <option>Intermediate</option>
                <option>Competitive</option>
              </select>
            </Field>
          </div>
          <div className="soft-note">
            <ShieldCheck size={20} />
            <span>
              Visible to{" "}
              <strong>{networkNames[user.network]?.toLowerCase()}</strong> only.
              Your community is set by your institution.
            </span>
          </div>
          <AudienceControl enabled={neighbourhoodOptIn} onChange={() => setNeighbourhoodOptIn(!neighbourhoodOptIn)} />
          <div className="row">
            <Button variant="secondary" onClick={() => moveStep(1)}>
              Back
            </Button>
            <Button type="submit" disabled={!locationId}>
              Review activity
              <ArrowRight size={18} />
            </Button>
          </div>
        </form>
      )}
      {step === 3 && (
        <>
          <article className="card create-review">
            <img src={imageFor({ category })} alt="Activity preview" />
            <Badge>{categories.find((c) => c.id === category)?.label}</Badge>
            <h2>{title}</h2>
            <p>{description}</p>
            <div className="metadata">
              <span>
                <CalendarBlank size={18} />
                {date} · {displayTime(time)}
              </span>
              <span>
                <MapPin size={18} />
                {location?.name}
              </span>
              <span>
                <UsersThree size={18} />
                {capacity} students · {experience} friendly
              </span>
            </div>
            <Badge tone="purple">{networkNames[user.network]}</Badge>
            <p className="muted">{neighbourhoodOptIn ? "Shared in Neighbourhood · Other schools in your education and age community can join." : "Listed on your campus · Not shared in Neighbourhood."}</p>
          </article>
          <div className="row">
            <Button variant="secondary" onClick={() => moveStep(2)}>
              Edit details
            </Button>
            <Button onClick={publish} disabled={busy}>
              {busy ? "Publishing…" : "Publish activity"}
              <Sparkle size={18} />
            </Button>
          </div>
        </>
      )}
      <ErrorText>{error}</ErrorText>
    </div>
  );
}

function AudienceControl({ enabled, disabled, onChange }: { enabled: boolean; disabled?: boolean; onChange: () => void }) {
  return <div className="audience-control"><button type="button" className={`audience-switch ${enabled ? "on" : ""}`} role="switch" aria-checked={enabled} aria-label="Share in Neighbourhood" disabled={disabled} onClick={onChange}><MapTrifold size={25} weight="duotone" /><span><strong>Share in Neighbourhood</strong><small>{enabled ? "Open to other schools in your community" : "Keep this event on your campus"}</small></span><span className="audience-track"><span /></span></button><p>When on, students from other schools in your education and age community can find and join. Choose a venue that welcomes visitors.</p></div>;
}
