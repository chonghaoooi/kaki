import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  BookmarkSimple,
  CalendarBlank,
  Camera,
  CaretRight,
  ChatCircle,
  Check,
  CheckCircle,
  Clock,
  Confetti,
  Flag,
  HandWaving,
  Heart,
  Leaf,
  LockKey,
  MagnifyingGlass,
  MapPin,
  PaperPlaneTilt,
  PencilSimple,
  Plus,
  ShieldCheck,
  Sparkle,
  TelegramLogo,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import { useKaki } from "./kaki-context";
import { MentorBadge, MentorStats } from "./MentorStats";
import {
  Avatar,
  Badge,
  Button,
  Empty,
  Field,
  IconButton,
  Input,
  PageHeading,
  SectionTitle,
  Textarea,
} from "./ui";
import "./community.css";

type Person = Record<string, any>;
type Route = { name: string; id?: string };
const list = (v: any): string[] =>
  Array.isArray(v)
    ? v
    : typeof v === "string"
      ? v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
const dateLabel = (value: any) =>
  value && !isNaN(new Date(value).valueOf())
    ? new Date(value).toLocaleDateString("en-SG", {
        day: "numeric",
        month: "short",
      })
    : "";
const timeLabel = (value: any) =>
  value && !isNaN(new Date(value).valueOf())
    ? new Date(value).toLocaleTimeString("en-SG", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
const errorText = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong. Please try again.";
const networkLabel = (v: string) =>
  ({
    secondary: "Secondary",
    jc_mi: "JC / MI",
    polytechnic: "Poly",
    university: "Uni",
  })[v] ||
  v ||
  "Student";
const yearLabel = (v: any) =>
  v ? (/^\d+$/.test(String(v)) ? `Year ${v}` : String(v)) : "";
const portrait = (value?: string) => value || "/assets/kaki/avatar-1.webp";
function revealSection(section: HTMLElement | null) {
  if (!section) return;
  const scroll = section.closest<HTMLElement>(".mobile-scroll");
  if (scroll) {
    const scale = scroll.getBoundingClientRect().height / scroll.clientHeight;
    scroll.scrollTo({
      top:
        scroll.scrollTop +
        (section.getBoundingClientRect().top -
          scroll.getBoundingClientRect().top) /
          scale -
        20,
    });
  } else section.scrollIntoView({ block: "start" });
}
function Tags({ values }: { values: any }) {
  return (
    <div className="chips">
      {list(values).map((t) => (
        <span className="chip cm-tag" key={t}>
          {t}
        </span>
      ))}
    </div>
  );
}
function Verified({ person }: { person: Person }) {
  const label =
    person.verificationMethod === "demo"
      ? "Demo student"
      : person.enrolmentVerified
        ? "Verified student"
        : person.emailVerified
          ? "Email confirmed"
          : "Student profile";
  return (
    <span
      className={`cm-verified ${person.enrolmentVerified ? "" : "cm-unverified"}`}
    >
      <ShieldCheck size={13} weight="fill" /> {label}
    </span>
  );
}
function SafetyLink({ id }: { id: string }) {
  const { go } = useKaki();
  return (
    <button
      className="cm-text-link cm-safety-link"
      onClick={() => go("report", id)}
    >
      <Flag size={16} /> Report or block
    </button>
  );
}
function useAction() {
  const { toast } = useKaki();
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return { busy, run };
}
function whyPerson(person: Person, user: Person) {
  const sharedSubjects = list(person.subjects).filter((s) =>
    list(user.subjects).includes(s),
  );
  const sharedInterests = list(person.interests).filter((s) =>
    list(user.interests).includes(s),
  );
  if (sharedSubjects.length)
    return `You both study ${sharedSubjects.slice(0, 2).join(" and ")}${sharedInterests.length ? ` and enjoy ${sharedInterests[0].toLowerCase()}` : ""}. A good place to start a conversation.`;
  if (sharedInterests.length)
    return `You both enjoy ${sharedInterests.slice(0, 2).join(" and ")}. Try an activity together.`;
  return (
    person.matchReason ||
    `You're in the same ${networkLabel(user.network).toLowerCase()} community. Start with a shared activity and see what clicks.`
  );
}

function Matches() {
  const { data, user, go, api, refresh, toast } = useKaki();
  const { busy, run } = useAction();
  const [tab, setTab] = useState("For you");
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [direction, setDirection] = useState(0);
  const reduced = useReducedMotion();
  const all: Person[] = data.people || [];
  const conversations: Person[] = data.conversations || [];
  const connectedIds = conversations
    .filter((c) => c.mutual !== false)
    .map((c) => c.personId || c.person?.id);
  const savedIds = list(user.savedPersonIds || user.savedPeopleIds);
  const candidates = all.filter(
    (p) =>
      !dismissed.includes(p.id) &&
      !connectedIds.includes(p.id) &&
      !["passed", "pending"].includes(p.connectionStatus),
  );
  const person = candidates[0];
  const people =
    tab === "Saved"
      ? all.filter((p) => savedIds.includes(p.id) || p.saved)
      : all.filter(
          (p) =>
            connectedIds.includes(p.id) ||
            ["connected", "pending"].includes(p.connectionStatus),
        );
  function act(action: string) {
    if (!person) return;
    run(async () => {
      const result = await api("/connections", "POST", {
        personId: person.id,
        action,
      });
      setDirection(action === "connect" ? 1 : action === "pass" ? -1 : 0);
      setDismissed((old) => [...old, person.id]);
      await refresh();
      if (result.mutual || result.connection?.mutual)
        go("connected", person.id);
      else
        toast(
          action === "connect"
            ? "Connection request sent. A conversation starts when you both connect."
            : action === "save"
              ? `${person.name.split(" ")[0]} saved for later`
              : "Next student, no pressure.",
        );
    });
  }
  return (
    <div className="stack cm-matches">
      <PageHeading
        eyebrow="A familiar face starts here"
        title="Find your people."
        subtitle="Shared interests. Small conversations. Your kind of kaki."
        action={
          <IconButton label="Open messages" onClick={() => go("messages")}>
            <ChatCircle size={23} />
          </IconButton>
        }
      />
      <div className="cm-tabs" role="tablist" aria-label="People views">
        {["For you", "Saved", "Connections"].map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab !== "For you" ? (
        <div className="cm-person-grid">
          {people.length ? (
            people.map((p) => (
              <PersonRow
                key={p.id}
                person={p}
                detail={
                  p.connectionStatus === "pending"
                    ? "Connection request sent · Waiting for a hello"
                    : undefined
                }
                onClick={() =>
                  go(
                    tab === "Connections" && p.connectionStatus !== "pending"
                      ? "chat"
                      : "people",
                    p.id,
                  )
                }
              />
            ))
          ) : (
            <Empty
              title={
                tab === "Saved"
                  ? "Someone to come back to"
                  : "Your next connection is out there"
              }
              text={
                tab === "Saved"
                  ? "Save a student from For you to find them here."
                  : "Connect with a student. When they connect too, you can say hi here."
              }
              action={
                <Button onClick={() => setTab("For you")}>
                  Explore people
                </Button>
              }
            />
          )}
        </div>
      ) : person ? (
        <>
          <div className="cm-match-stage">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.article
                key={person.id}
                className="card cm-match-card"
                data-scroll-drag="ignore"
                drag={!busy && !reduced}
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={0.18}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 85) act("connect");
                  else if (info.offset.x < -85) act("pass");
                  else if (info.offset.y < -85) act("save");
                }}
                initial={reduced ? false : { opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={
                  reduced
                    ? undefined
                    : { opacity: 0, x: direction * 100, scale: 0.97 }
                }
                transition={{ duration: 0.22 }}
              >
                <div className="cm-match-photo">
                  <img
                    src={portrait(person.avatar)}
                    alt={person.name}
                    draggable={false}
                  />
                  <span className="cm-photo-badge">
                    <ShieldCheck size={16} weight="fill" />{" "}
                    {networkLabel(person.network)} community
                  </span>
                  <div className="cm-photo-title">
                    <span>YOUR NEXT STUDY BREAK BUDDY?</span>
                    <h2>
                      {person.name} <HandWaving weight="duotone" size={27} />
                    </h2>
                    <p>{person.institution}</p>
                  </div>
                </div>
                <div className="cm-match-body">
                  <MentorBadge person={person} />
                  <p className="cm-course">
                    {person.course}{" "}
                    {person.year ? `· ${yearLabel(person.year)}` : ""}
                  </p>
                  <p className="cm-bio">
                    {person.bio ||
                      "Up for good conversations and trying something new."}
                  </p>
                  <Tags values={person.interests} />
                  <MentorStats person={person} compact showLike={false} />
                  <div className="cm-why">
                    <Sparkle size={21} weight="duotone" />
                    <div>
                      <strong>A little common ground</strong>
                      <p>{whyPerson(person, user)}</p>
                    </div>
                  </div>
                  <button
                    className="cm-text-link"
                    onClick={() => go(person.mentorStats?.registered ? "mentor-profile" : "people", person.id)}
                  >
                    {person.mentorStats?.registered ? "View mentorship stats" : `A little more about ${person.name.split(" ")[0]}`}{" "}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </motion.article>
            </AnimatePresence>
          </div>
          <div className="cm-match-actions">
            <button
              aria-label="Pass on this student"
              disabled={busy}
              onClick={() => act("pass")}
            >
              <span className="cm-action-circle">
                <X size={25} />
              </span>
              Pass
            </button>
            <button
              aria-label="Save this student"
              disabled={busy}
              onClick={() => act("save")}
            >
              <span className="cm-action-circle cm-save">
                <BookmarkSimple size={25} />
              </span>
              Save
            </button>
            <button
              aria-label="Connect with this student"
              disabled={busy}
              onClick={() => act("connect")}
            >
              <span className="cm-action-circle cm-connect">
                <HandWaving size={27} />
              </span>
              Connect
            </button>
          </div>
          <p className="cm-fine cm-center">
            A connection only opens a chat when you both say yes.
          </p>
        </>
      ) : (
        <Empty
          title="You’re all caught up"
          text="Good connections take their own time. Try a group activity or revisit your saved students."
          action={
            <Button onClick={() => go("discover")}>Find something to do</Button>
          }
        />
      )}
    </div>
  );
}
function PersonRow({
  person,
  onClick,
  detail,
  end,
}: {
  person: Person;
  onClick: () => void;
  detail?: string;
  end?: ReactNode;
}) {
  return (
    <button className="card cm-person-row" onClick={onClick}>
      <Avatar person={person} size={52} />
      <span className="cm-person-row-copy">
        <strong>{person.name}</strong>
        <span>{detail || person.course || person.institution}</span>
        <MentorBadge person={person} />
      </span>
      {end || <CaretRight size={19} />}
    </button>
  );
}
function PersonProfile({ id }: { id?: string }) {
  const { data, user, go, api, refresh, toast } = useKaki();
  const { busy, run } = useAction();
  const person: Person = (data.people || []).find((p: Person) => p.id === id);
  if (!person)
    return (
      <Empty
        title="This profile isn’t available"
        text="It may have been removed or be outside your community."
        action={<Button onClick={() => go("matches")}>Back to people</Button>}
      />
    );
  const isConnected = (data.conversations || []).some(
    (c: Person) => (c.personId || c.person?.id) === id && c.mutual !== false,
  );
  return (
    <div className="stack cm-narrow">
      <div className="card cm-profile-hero">
        <div className="cm-profile-cover" />
        <Avatar person={person} size={96} />
        <h1>{person.name}</h1>
        <Verified person={person} />
        <MentorBadge person={person} />
        <p>
          {person.institution}
          <br />
          {person.course} {person.year ? `· ${yearLabel(person.year)}` : ""}
        </p>
        <div className="cm-profile-buttons">
          <Button
            disabled={busy || person.connectionStatus === "pending"}
            onClick={() =>
              isConnected
                ? go("chat", id)
                : run(async () => {
                    const result = await api("/connections", "POST", {
                      personId: id,
                      action: "connect",
                    });
                    await refresh();
                    if (result.mutual) go("connected", id);
                    else toast("Connection request sent.");
                  })
            }
          >
            {isConnected ? <ChatCircle size={20} /> : <HandWaving size={20} />}{" "}
            {isConnected
              ? "Say hi"
              : person.connectionStatus === "pending"
                ? "Request sent"
                : "Connect"}
          </Button>
          <IconButton
            label="Save student"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await api("/connections", "POST", {
                  personId: id,
                  action: "save",
                });
                await refresh();
                toast("Student saved");
              })
            }
          >
            <BookmarkSimple size={22} />
          </IconButton>
        </div>
      </div>
      <MentorStats person={person} />
      <section className="card cm-padded">
        <SectionTitle>About {person.name.split(" ")[0]}</SectionTitle>
        <p>{person.bio || "A little introduction is on its way."}</p>
        <Tags values={person.interests} />
      </section>
      <section className="card cm-padded">
        <SectionTitle>A study session, together</SectionTitle>
        <Tags values={person.subjects} />
        <div className="cm-detail-line">
          <BookOpen size={20} />
          <span>
            {list(person.studyStyle).join(" · ") ||
              "Open to finding a rhythm together"}
          </span>
        </div>
        <div className="cm-detail-line">
          <Clock size={20} />
          <span>
            {list(person.availability).join(" · ") ||
              "Ask about a good time to meet"}
          </span>
        </div>
        {list(person.languages).length > 0 && (
          <div className="cm-detail-line">
            <ChatCircle size={20} />
            <span>{list(person.languages).join(", ")}</span>
          </div>
        )}
      </section>
      <div className="cm-why">
        <Sparkle size={22} />
        <p>{whyPerson(person, user)}</p>
      </div>
      <SafetyLink id={person.id} />
    </div>
  );
}
function Connected({ id }: { id?: string }) {
  const { data, user, go } = useKaki();
  const person = (data.people || []).find((p: Person) => p.id === id);
  if (!person)
    return (
      <Empty
        title="Find your next kaki"
        action={<Button onClick={() => go("matches")}>Explore people</Button>}
      />
    );
  return (
    <div className="cm-celebration cm-narrow">
      <div className="cm-celebration-icon">
        <Confetti size={38} weight="duotone" />
      </div>
      <Badge tone="purple">A new beginning</Badge>
      <h1>You found a kaki.</h1>
      <p>
        You and {person.name.split(" ")[0]} both said hello.
        <br />
        Good things start with a little common ground.
      </p>
      <div className="cm-connected-avatars">
        <Avatar person={user} size={100} />
        <span>
          <Sparkle size={25} weight="fill" />
        </span>
        <Avatar person={person} size={100} />
      </div>
      <div className="cm-why">
        <Sparkle size={20} />
        <p>{whyPerson(person, user)}</p>
      </div>
      <div className="stack">
        <Button onClick={() => go("chat", id)}>
          <ChatCircle size={20} /> Say hi to {person.name.split(" ")[0]}
        </Button>
        <Button variant="secondary" onClick={() => go("activities")}>
          <CalendarBlank size={20} /> Plan something together
        </Button>
        <Button variant="ghost" onClick={() => go("telegram", id)}>
          <TelegramLogo size={20} /> Connect on Telegram
        </Button>
        <button
          className="cm-text-link cm-centered"
          onClick={() => go("matches")}
        >
          Keep exploring <ArrowRight size={17} />
        </button>
      </div>
    </div>
  );
}

function Circles() {
  const { data, go, user } = useKaki();
  const [search, setSearch] = useState("");
  const [joined, setJoined] = useState(false);
  const circles = (data.circles || []).filter(
    (c: Person) =>
      `${c.name} ${c.description} ${c.category || c.interest || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (!joined || c.joined || list(user.joinedCircleIds).includes(c.id)),
  );
  return (
    <div className="stack">
      <PageHeading
        eyebrow="A place to feel at home"
        title="Little circles. Big possibilities."
        subtitle="Find the people who get your kind of thing."
      />
      <div className="cm-search">
        <MagnifyingGlass size={21} />
        <Input
          aria-label="Search circles"
          placeholder="Photography, coding, board games…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="cm-tabs" role="tablist" aria-label="Circle views">
        <button
          role="tab"
          aria-selected={!joined}
          className={!joined ? "active" : ""}
          onClick={() => setJoined(false)}
        >
          Discover circles
        </button>
        <button
          role="tab"
          aria-selected={joined}
          className={joined ? "active" : ""}
          onClick={() => setJoined(true)}
        >
          My circles
        </button>
      </div>
      <div className="cm-circle-grid">
        {circles.map((circle: Person) => (
          <button
            className="card cm-circle-card"
            key={circle.id}
            onClick={() => go("circle", circle.id)}
          >
            <div className="cm-circle-image">
              <img
                loading="lazy"
                src={circle.image || "/assets/kaki/photography.webp"}
                alt=""
              />
              <Badge>
                {circle.category || circle.interest || "Interest circle"}
              </Badge>
            </div>
            <div className="cm-padded">
              <div className="cm-circle-heading">
                <h3>{circle.name}</h3>
                <ArrowUpRight size={22} />
              </div>
              <p>{circle.description}</p>
              <div className="cm-circle-footer">
                <span>
                  <UsersThree size={18} />{" "}
                  {circle.memberCount || circle.members?.length || 0} members
                </span>
                {circle.joined ||
                list(user.joinedCircleIds).includes(circle.id) ? (
                  <span className="cm-joined">
                    <Check size={16} /> Joined
                  </span>
                ) : (
                  <span className="cm-discover-link">Find your circle</span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
      {circles.length === 0 && (
        <Empty
          title={
            joined
              ? "Make a little room for your interests"
              : "No circles found"
          }
          text={
            joined
              ? "Join a circle to keep your favourite people and plans in one place."
              : "Try a different interest or a shorter search."
          }
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSearch("");
                setJoined(false);
              }}
            >
              Browse circles
            </Button>
          }
        />
      )}
    </div>
  );
}
function Circle({ id }: { id?: string }) {
  const { data, user, api, go, refresh, toast } = useKaki();
  const { busy, run } = useAction();
  const circle: Person = (data.circles || []).find((c: Person) => c.id === id);
  if (!circle)
    return (
      <Empty
        title="This circle isn’t available"
        action={<Button onClick={() => go("circles")}>Explore circles</Button>}
      />
    );
  const joined =
    circle.joined || list(user.joinedCircleIds).includes(circle.id);
  const activities = (data.activities || []).filter(
    (a: Person) => a.circleId === id || list(circle.activityIds).includes(a.id),
  );
  const members = (circle.members || [])
    .map((p: any) =>
      typeof p === "string"
        ? (data.people || []).find((x: Person) => x.id === p)
        : p,
    )
    .filter(Boolean);
  return (
    <div className="stack cm-narrow">
      <div className="card cm-circle-detail">
        <img
          className="cm-cover-image"
          src={circle.image || "/assets/kaki/photography.webp"}
          alt={circle.name}
        />
        <div className="cm-padded">
          <Badge tone="purple">
            {circle.category || circle.interest || "Find your thing"}
          </Badge>
          <h1>{circle.name}</h1>
          <div className="cm-detail-line">
            <UsersThree size={20} />
            <span>
              {circle.memberCount || members.length} members ·{" "}
              {networkLabel(user.network)} community
            </span>
          </div>
          <p>{circle.description}</p>
          <Button
            disabled={busy || joined}
            onClick={() =>
              run(async () => {
                await api(`/circles/${id}/join`, "POST");
                await refresh();
                toast(`Welcome to ${circle.name}!`);
              })
            }
          >
            {joined ? <Check size={20} /> : <Plus size={20} />}{" "}
            {joined ? "You’re in this circle" : "Join this circle"}
          </Button>
        </div>
      </div>
      <section className="card cm-padded">
        <SectionTitle>Good company, good ground rules</SectionTitle>
        <div className="cm-detail-line">
          <ShieldCheck size={22} />
          <span>Students in your education community.</span>
        </div>
        <div className="cm-detail-line">
          <HandWaving size={22} />
          <span>New faces and first-timers are welcome.</span>
        </div>
        <div className="cm-detail-line">
          <MapPin size={22} />
          <span>Meet in campus or public spaces.</span>
        </div>
      </section>
      <section>
        <SectionTitle
          action={
            <button className="cm-text-link" onClick={() => go("create")}>
              Start a plan <Plus size={16} />
            </button>
          }
        >
          What’s coming up
        </SectionTitle>
        {activities.length ? (
          activities.map((a: Person) => (
            <button
              key={a.id}
              className="card cm-event-row"
              onClick={() => go("activity", a.id)}
            >
              <span className="cm-calendar-tile">
                <CalendarBlank size={23} />
                {dateLabel(a.date || a.startsAt)}
              </span>
              <span>
                <strong>{a.title}</strong>
                <small>
                  {a.time || timeLabel(a.startsAt)} ·{" "}
                  {a.location?.name || a.location}
                </small>
              </span>
              <CaretRight size={19} />
            </button>
          ))
        ) : (
          <div className="card cm-padded">
            <p className="muted">
              The next plan is yours to make. Start a small activity and invite
              your circle.
            </p>
          </div>
        )}
      </section>
      {members.length > 0 && (
        <section>
          <SectionTitle>A few familiar faces</SectionTitle>
          <div className="cm-person-grid">
            {members.slice(0, 6).map((p: Person) => (
              <PersonRow
                key={p.id}
                person={p}
                onClick={() => go("people", p.id)}
              />
            ))}
          </div>
        </section>
      )}
      <SafetyLink id={circle.id} />
    </div>
  );
}

function tutorPrice(tutor: Person) {
  const source = tutor.price ?? tutor.hourlyRate;
  const amount = Number(source);
  const known = source !== undefined && source !== null && source !== "" && Number.isFinite(amount) && amount >= 0;
  return {
    amount: known ? amount : null,
    label: known ? amount === 0 ? "Free" : `S$${amount.toLocaleString("en-SG", { maximumFractionDigits: 2 })}` : "Ask about pricing",
    detail: known ? amount === 0 ? "Peer support" : "per hour" : "Confirm before meeting",
  };
}

function Tutoring({ requestedId }: { requestedId?: string }) {
  const { data, user, api, refresh, toast, go } = useKaki();
  const { busy, run } = useAction();
  const [search, setSearch] = useState("");
  const [price, setPrice] = useState("All");
  const [mode, setMode] = useState("All");
  const [selected, setSelected] = useState<Person | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("16:00");
  const [message, setMessage] = useState("");
  const [sentRequest, setSentRequest] = useState<{ date: string; time: string; message: string; tutorName: string; id?: string } | null>(null);
  const [requestError, setRequestError] = useState("");
  const requestRef = useRef<HTMLElement>(null);
  const handledRequestId = useRef<string | undefined>(undefined);
  const offers: Person[] = data.tutors || [];
  const minDate = data.meta?.demoMode && data.meta.anchorDate
    ? data.meta.anchorDate
    : new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  const query = search.trim().toLowerCase();
  const filtersActive = Boolean(query) || price !== "All" || mode !== "All";
  const selectedPerson = selected?.person || selected;
  const selectedPrice = selected ? tutorPrice(selected) : null;
  const isSelf = (tutor: Person) => (tutor.personId || tutor.person?.id || tutor.id) === user.id;

  function chooseTutor(tutor: Person) {
    if (isSelf(tutor)) return;
    setSelected(tutor);
    setSentRequest(null);
    setRequestError("");
    setMessage("");
  }
  function closeRequest() {
    setSelected(null);
    setSentRequest(null);
    setRequestError("");
  }
  function clearFilters() { setSearch(""); setPrice("All"); setMode("All"); }

  useEffect(() => {
    if (selected) revealSection(requestRef.current);
  }, [selected]);
  useEffect(() => {
    if (!requestedId) {
      handledRequestId.current = undefined;
      return;
    }
    if (handledRequestId.current === requestedId) return;
    handledRequestId.current = requestedId;
    const offer = offers.find(tutor => tutor.id === requestedId || tutor.personId === requestedId || tutor.person?.id === requestedId);
    if (offer && !isSelf(offer)) chooseTutor(offer);
    else {
      setSelected(null);
      setRequestError(offer ? "This is your own tutoring offer. Other students can request a session with you." : "That tutoring offer is no longer available. You can explore the current offers below.");
    }
  }, [requestedId, data.tutors, user.id]);

  const tutors = offers.filter((tutor: Person) => {
    const person = tutor.person || tutor;
    const haystack = [person.name, tutor.name, person.institution, tutor.institution, tutor.subject, ...list(tutor.subjects)].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(query)
      && (price === "All" || tutorPrice(tutor).amount === 0)
      && (mode === "All" || list(tutor.modes || tutor.mode).some(value => value.toLowerCase().replace(/[-\s]+/g, " ").includes(mode.toLowerCase())));
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !selected || isSelf(selected)) return;
    setRequestError("");
    if (!date || !time || date < minDate || !Number.isFinite(Date.parse(`${date}T${time}:00+08:00`))) {
      setRequestError("Choose today or a future date and a valid time in Singapore.");
      return;
    }
    if (message.trim().length < 10) {
      setRequestError("Add a little more about the topic you’d like help with (at least 10 characters).");
      return;
    }
    const submitted = {
      tutorId: selected.id,
      tutorName: selectedPerson?.name || selected.name,
      date,
      time,
      message: message.trim(),
    };
    run(async () => {
      try {
        const response = await api(`/tutors/${submitted.tutorId}/request`, "POST", {
          date: submitted.date,
          time: submitted.time,
          message: submitted.message,
        });
        const saved = response.request;
        setSentRequest({
          id: saved?.id,
          date: saved?.date ?? submitted.date,
          time: saved?.time ?? submitted.time,
          message: saved?.message ?? submitted.message,
          tutorName: submitted.tutorName,
        });
      } catch (error) {
        setRequestError(errorText(error));
        throw error;
      }
      toast("Your session request has been sent.");
      try { await refresh(); }
      catch { setRequestError("Your request was saved. Reload your profile to see the latest request status."); }
    });
  }

  return (
    <div className="stack cm-tutoring-page">
      <div className="cm-tutoring-heading">
        <PageHeading
          eyebrow="A little help goes a long way"
          title="Find your study kaki."
          subtitle="Work through a tricky topic with someone who’s been there."
        />
        <Button variant="secondary" className="cm-meet-mentors" onClick={() => go("mentors")}>
          <UsersThree size={19} aria-hidden="true" /> Meet mentors <ArrowRight size={16} aria-hidden="true" />
        </Button>
      </div>
      <section className="cm-tutoring-filters" aria-label="Find tutoring support">
        <div className="cm-search">
          <MagnifyingGlass size={21} aria-hidden="true" />
          <Input aria-label="Search tutors" placeholder="Subject, module, name or school" value={search} onChange={(event) => setSearch(event.target.value)} />
          {search && <IconButton label="Clear tutor search" className="cm-search-clear" onClick={() => setSearch("")}><X size={17} /></IconButton>}
        </div>
        <div className="cm-filter-row" role="group" aria-label="Filter tutoring sessions">
          <button type="button" aria-pressed={price === "Free"} className={`chip ${price === "Free" ? "selected" : ""}`} onClick={() => setPrice(price === "All" ? "Free" : "All")}>
            <Leaf size={16} aria-hidden="true" /> Free peer support
          </button>
          {["Online", "In person"].map(value => <button type="button" key={value} aria-pressed={mode === value} className={`chip ${mode === value ? "selected" : ""}`} onClick={() => setMode(mode === value ? "All" : value)}>{value}</button>)}
        </div>
      </section>
      <div className="cm-tutoring-results">
        <p role="status" aria-live="polite"><strong>{tutors.length}</strong> {tutors.length === 1 ? "tutor" : "tutors"} {filtersActive ? "matching your search" : "offering one-to-one support"}</p>
        {filtersActive && <button type="button" className="cm-text-link" onClick={clearFilters}>Clear filters</button>}
      </div>
      {!selected && requestError && <p className="cm-tutoring-error" role="alert">{requestError}</p>}
      {selected && selectedPerson && (
        <section ref={requestRef} className="card cm-padded cm-request cm-tutoring-request-form" aria-label="Request a tutoring session">
          <div className="cm-request-heading">
            <div><p className="eyebrow">{sentRequest ? "REQUEST SENT" : "ONE-TO-ONE SUPPORT"}</p><h2>{sentRequest ? "A good first step." : "Let’s plan a session."}</h2></div>
            <IconButton label="Close request" disabled={busy} onClick={closeRequest}><X size={20} /></IconButton>
          </div>
          <div className="cm-selected-tutor">
            <Avatar person={selectedPerson} size={54} />
            <div><strong>{selectedPerson.name || selected.name}</strong><span>{list(selected.subjects).join(" · ") || selected.subject || "Peer tutoring"}</span><small>{selectedPrice?.label} {selectedPrice?.amount ? "per hour" : ""} · {list(selected.modes || selected.mode).join(" / ") || "Arrange a format together"}</small></div>
          </div>
          {sentRequest ? (
            <div className="stack cm-request-confirmation">
              <p><CheckCircle className="cm-success" size={22} weight="fill" aria-hidden="true" /><span>Your request to <strong>{sentRequest.tutorName}</strong> for <strong>{dateLabel(sentRequest.date)} at {sentRequest.time} SGT</strong> is awaiting their reply.</span></p>
              <p className="cm-fine">You can check their response or cancel the pending request in your profile. A request does not confirm a session or take payment.</p>
              {requestError && <p className="cm-tutoring-error" role="alert">{requestError}</p>}
              <div className="cm-request-confirmation-actions"><Button onClick={() => go("profile")}>View requests <ArrowRight size={17} /></Button><button type="button" className="cm-text-link" onClick={closeRequest}>Keep exploring</button></div>
            </div>
          ) : (
            <form className="stack" onSubmit={submit} aria-busy={busy}>
              <div className="form-grid">
                <Field label="Preferred date"><Input type="date" required disabled={busy} min={minDate} value={date} onChange={event => { setDate(event.target.value); setRequestError(""); }} /></Field>
                <Field label="Preferred time (SGT)"><Input type="time" required disabled={busy} value={time} onChange={event => { setTime(event.target.value); setRequestError(""); }} /></Field>
              </div>
              <Field label="What would you like help with?"><Textarea required disabled={busy} minLength={10} maxLength={600} rows={3} placeholder="For example: I’d like to practise SQL joins and work through a question together." value={message} onChange={event => { setMessage(event.target.value); setRequestError(""); }} /></Field>
              <p className="cm-fine">Suggest a time and topic. Your tutor will review your request before a session is agreed.</p>
              {requestError && <p className="cm-tutoring-error" role="alert">{requestError}</p>}
              <Button disabled={busy} type="submit">{busy ? "Sending request…" : "Send session request"} <ArrowRight size={18} /></Button>
            </form>
          )}
        </section>
      )}
      <div className="cm-tutor-grid">
        {tutors.map((tutor: Person) => {
          const person = tutor.person || tutor;
          const personId = tutor.personId || person.id;
          const priceInfo = tutorPrice(tutor);
          const self = personId === user.id;
          const registered = person.mentorStats?.registered === true;
          const subjects = list(tutor.subjects).length ? list(tutor.subjects) : list(tutor.subject);
          return (
            <article className={`card cm-tutor-card ${selected?.id === tutor.id ? "cm-tutor-selected" : ""}`} key={tutor.id} aria-label={`${person.name} tutoring offer`}>
              <div className="cm-tutor-person"><Avatar person={person} size={66} /><div><h3>{person.name}</h3><p className="cm-tutor-institution">{person.institution}</p><div className="cm-tutor-badges"><Verified person={person} /><MentorBadge person={person} /></div></div></div>
              <div className="cm-tutor-subjects"><Tags values={subjects} /></div>
              <p className="cm-tutor-bio">{tutor.bio || person.bio || "A little guidance to help you understand a topic and practise at your pace."}</p>
              <div className="cm-tutor-details"><span><Clock size={17} aria-hidden="true" />{list(tutor.availability).join(" · ") || "Arrange a time together"}</span><span><MapPin size={17} aria-hidden="true" />{list(tutor.modes || tutor.mode).join(" / ") || "Agree a format before meeting"}</span></div>
              {registered && <MentorStats person={person} compact showLike={false} showHeading={false} />}
              <div className="cm-tutor-footer"><div className="cm-tutor-price"><strong>{priceInfo.label}</strong><span>{priceInfo.detail}</span></div><Button disabled={self || busy} aria-label={self ? "Your own tutoring offer" : `Request a session with ${person.name}`} onClick={() => chooseTutor(tutor)}>{self ? "Your tutoring offer" : "Request session"}{!self && <ArrowRight size={16} aria-hidden="true" />}</Button></div>
              <div className="cm-tutor-links"><button type="button" className="cm-text-link" onClick={() => go(registered ? "mentor-profile" : self ? "profile" : "people", self && !registered ? undefined : personId)}>{registered ? "View mentor" : "View profile"} <ArrowUpRight size={14} aria-hidden="true" /></button>{!self && <SafetyLink id={personId} />}</div>
            </article>
          );
        })}
      </div>
      {!tutors.length && <Empty title={filtersActive ? "No tutors match just yet." : "A little support is on its way."} text={filtersActive ? "Try another subject or include more session types." : "You can still meet mentors and join a group study session in your community."} action={<Button variant="secondary" onClick={() => filtersActive ? clearFilters() : go("mentors")}>{filtersActive ? "Clear filters" : "Meet mentors"}</Button>} />}
    </div>
  );
}
function Messages() {
  const { data, go } = useKaki();
  const [search, setSearch] = useState("");
  const conversations = (data.conversations || []).filter((c: Person) =>
    `${c.person?.name || c.name || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <div className="stack cm-narrow">
      <PageHeading
        eyebrow="Good conversations start with hi"
        title="Your conversations."
        subtitle="A little space for your people."
      />
      <button className="club-chat-promo" type="button" onClick={() => go("clubs")}>
        <UsersThree size={24} weight="duotone" aria-hidden="true" />
        <span><strong>Find a club. Keep the conversation going.</strong><small>Public group chats, shared interests and weekly plans.</small></span>
        <ArrowRight size={20} aria-hidden="true" />
      </button>
      <div className="cm-search">
        <MagnifyingGlass size={21} />
        <Input
          aria-label="Search conversations"
          placeholder="Find a conversation"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="card cm-conversation-list">
        {conversations.map((c: Person) => {
          const person =
            c.person ||
            (data.people || []).find((p: Person) => p.id === c.personId) ||
            c;
          return (
            <button
              key={c.personId || person.id}
              className="cm-conversation"
              onClick={() => go("chat", c.personId || person.id)}
            >
              <Avatar person={person} size={57} />
              <span className="cm-conversation-copy">
                <span>
                  <strong>{person.name}</strong>
                  <small>{dateLabel(c.lastMessage?.createdAt)}</small>
                </span>
                <span className="cm-message-preview">
                  {typeof c.lastMessage === "string"
                    ? c.lastMessage
                    : c.lastMessage?.text ||
                      "You’re connected. Say a little hello."}
                </span>
              </span>
              {c.unreadCount > 0 && (
                <span className="cm-unread">{c.unreadCount}</span>
              )}
            </button>
          );
        })}
      </div>
      {conversations.length === 0 && (
        <Empty
          title={
            search ? "No conversation found" : "Your first hello is waiting"
          }
          text={
            search
              ? "Try another name."
              : "Once you both connect, your conversation will appear here."
          }
          action={
            <Button onClick={() => (search ? setSearch("") : go("matches"))}>
              {search ? "Clear search" : "Find your people"}
            </Button>
          }
        />
      )}
      <div className="cm-privacy-note">
        <LockKey size={18} />
        <p>
          Private messages are for mutual connections. Club conversations are shared with club members in your education community.
        </p>
      </div>
    </div>
  );
}
function Chat({ id }: { id?: string }) {
  const { data, user, api, go, toast, refresh } = useKaki();
  const { busy, run } = useAction();
  const [messages, setMessages] = useState<Person[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const person =
    (data.people || []).find((p: Person) => p.id === id) ||
    (data.conversations || []).find((c: Person) => c.personId === id)?.person;
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api(`/messages/${id}`);
        if (!cancelled) {
          setMessages(Array.isArray(res) ? res : res.messages || []);
          setError("");
        }
      } catch (e) {
        if (!cancelled) setError(errorText(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const timer = setInterval(load, 12000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [id, api]);
  if (!person)
    return (
      <Empty
        title="This conversation isn’t available"
        action={
          <Button onClick={() => go("messages")}>Back to messages</Button>
        }
      />
    );
  function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    run(async () => {
      const res = await api(`/messages/${id}`, "POST", { text: text.trim() });
      const msg = res.message || res;
      setMessages((old) => [...old, msg]);
      setText("");
      await refresh();
    });
  }
  return (
    <div className="cm-chat cm-narrow">
      <div className="card cm-chat-header">
        <button
          className="cm-chat-person"
          onClick={() => go("people", person.id)}
        >
          <Avatar person={person} size={49} />
          <span>
            <strong>{person.name}</strong>
            <small>{person.institution}</small>
            <Verified person={person} />
          </span>
        </button>
        <IconButton
          label="Report or block student"
          onClick={() => go("report", person.id)}
        >
          <Flag size={21} />
        </IconButton>
      </div>
      <div className="cm-chat-ground">
        <Sparkle size={17} />
        <p>{whyPerson(person, user)}</p>
      </div>
      <div className="cm-chat-actions">
        <button
          className="chip"
          onClick={() => setText("Hey! Want to find a study session together?")}
        >
          <BookOpen size={16} /> Study
        </button>
        <button
          className="chip"
          onClick={() =>
            setText("Hi! Would you be up for lunch on campus sometime?")
          }
        >
          <HandWaving size={16} /> Lunch
        </button>
        <button className="chip" onClick={() => go("activities")}>
          <CalendarBlank size={16} /> Make a plan
        </button>
      </div>
      {loading ? (
        <div className="cm-chat-loading" role="status">
          Opening your conversation…
        </div>
      ) : error ? (
        <div className="card cm-padded">
          <p role="alert">{error}</p>
          <Button onClick={() => go("matches")}>Back to connections</Button>
        </div>
      ) : (
        <>
          <div className="cm-message-list" aria-live="polite">
            {messages.length === 0 && (
              <div className="cm-chat-empty">
                <HandWaving size={42} weight="duotone" />
                <h3>A small hello goes a long way.</h3>
                <p>Ask about a shared interest, or make a plan together.</p>
              </div>
            )}
            {messages.map((m, i) => {
              const mine =
                m.senderId === user.id || m.sender === user.id || m.mine;
              return (
                <div
                  key={m.id || i}
                  className={`cm-message ${mine ? "cm-message-mine" : ""}`}
                >
                  <p>{m.text}</p>
                  <small>
                    {!mine && (
                      <button
                        type="button"
                        className="cm-message-report"
                        aria-label="Report this message"
                        onClick={() => go("report", person.id)}
                      >
                        <Flag size={12} />
                      </button>
                    )}
                    {timeLabel(m.createdAt)}
                    {mine && <Check size={12} />}
                  </small>
                </div>
              );
            })}
          </div>
          <form className="cm-composer" onSubmit={send}>
            <Input
              aria-label={`Message ${person.name}`}
              placeholder="Say a little hello…"
              maxLength={2000}
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <IconButton
              type="submit"
              label="Send message"
              disabled={busy || !text.trim()}
            >
              <PaperPlaneTilt size={22} weight="fill" />
            </IconButton>
          </form>
          <div className="cm-chat-bottom">
            <button className="cm-text-link" onClick={() => go("telegram", id)}>
              <TelegramLogo size={17} /> Telegram preferences
            </button>
            <button
              className="cm-text-link"
              onClick={() => {
                toast(
                  "Meet in a public place and keep private contact details out of chat. Report any message that makes you uncomfortable.",
                );
              }}
            >
              <ShieldCheck size={17} /> Stay safe
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Profile() {
  const { user, data, go, api, refresh } = useKaki();
  const { busy, run } = useAction();
  const joined = (data.activities || []).filter(
    (a: Person) =>
      a.joined || list(a.memberIds || a.attendeeIds).includes(user.id),
  );
  return (
    <div className="stack cm-narrow">
      <PageHeading title="Your little corner." eyebrow="Show up as yourself" />
      <div className="card cm-profile-hero">
        <div className="cm-profile-cover" />
        <Avatar person={user} size={96} />
        <h1>{user.name}</h1>
        <Verified person={user} />
        <MentorBadge person={user} />
        <p>
          {user.institution}
          <br />
          {user.course} {user.year ? `· ${yearLabel(user.year)}` : ""}
        </p>
        <Button variant="secondary" onClick={() => go("edit-profile")}>
          <PencilSimple size={18} /> Edit profile
        </Button>
      </div>
      <section className="card cm-padded">
        <SectionTitle>About me</SectionTitle>
        <p>
          {user.bio ||
            "Tell your community a little about the things you enjoy."}
        </p>
        <Tags values={user.interests} />
      </section>
      <MentorStats person={user} />
      {user.mentorStats?.registered && (
        <div className="stack">
          <p className="cm-fine">Your mentorship stats are visible to eligible students in your community.</p>
          <Button variant="secondary" onClick={() => go("mentor-profile", user.id)}>
            Preview public mentor profile <ArrowRight size={17} />
          </Button>
        </div>
      )}
      <button className="cm-journey-promo" onClick={() => go("journey")}>
        <span className="cm-promo-icon">
          <Leaf size={29} weight="duotone" />
        </span>
        <span>
          <strong>My journey</strong>
          <small>A space to notice the little things.</small>
        </span>
        <ArrowRight size={22} />
      </button>
      <div className="card cm-menu-list">
        <MenuRow
          icon={<Heart size={23} />}
          title="Support groups"
          detail="Find your space or be a listening ear"
          onClick={() => go("support")}
        />
        <MenuRow
          icon={<HandWaving size={23} />}
          title="People & matches"
          detail="Find familiar interests and new connections"
          onClick={() => go("matches")}
        />
        <MenuRow
          icon={<BookmarkSimple size={23} />}
          title="Saved activities"
          detail={`${list(user.savedActivityIds).length} plans to come back to`}
          onClick={() => go("activities", "saved")}
        />
        <MenuRow
          icon={<CalendarBlank size={23} />}
          title="My plans"
          detail={`${joined.length} activities on your calendar`}
          onClick={() => go("activities", "joined")}
        />
        <MenuRow
          icon={<UsersThree size={23} />}
          title="My circles"
          detail="People who share your kind of thing"
          onClick={() => go("circles")}
        />
        <MenuRow
          icon={<TelegramLogo size={23} />}
          title="Telegram"
          detail="Your notifications and contact preferences"
          onClick={() => go("telegram")}
        />
        <MenuRow
          icon={<ShieldCheck size={23} />}
          title="Privacy & safety"
          detail="You're in control of your space"
          onClick={() => go("privacy")}
        />
      </div>
      <TutoringInbox />
      <Button
        variant="ghost"
        disabled={busy}
        onClick={() =>
          run(async () => {
            await api("/logout", "POST");
            await refresh();
            go("discover");
          })
        }
      >
        Sign out
      </Button>
      <p className="cm-fine cm-center">
        <LockKey size={14} /> Your email and private reflections are never on
        your public profile.
      </p>
    </div>
  );
}
function TutoringInbox() {
  const { data, api, refresh, toast } = useKaki();
  const { busy, run } = useAction();
  const incoming: Person[] = data.incomingRequests || [];
  const outgoing: Person[] = data.requests || [];
  if (!incoming.length && !outgoing.length) return null;
  function update(
    request: Person,
    status: "accepted" | "declined" | "cancelled",
  ) {
    run(async () => {
      await api(`/tutor-requests/${request.id}`, "PATCH", { status });
      await refresh();
      toast(
        status === "accepted"
          ? "Session accepted. The student can see your response."
          : status === "declined"
            ? "Request declined. The student can see your response."
            : "Your session request is cancelled.",
      );
    });
  }
  function requestCard(request: Person, isIncoming: boolean) {
    const tutor = (data.tutors || []).find(
      (t: Person) => t.id === request.tutorId,
    );
    const person = isIncoming ? request.requester : tutor?.person || tutor;
    const status = request.status || "pending";
    const labels: Record<string, string> = {
      pending: "Awaiting reply",
      accepted: "Accepted",
      declined: "Declined",
      cancelled: "Cancelled",
    };
    return (
      <article
        className="card cm-tutoring-request"
        key={request.id}
        aria-label={`${isIncoming ? "Incoming request from" : "Request to"} ${person?.name || "student"}`}
      >
        <div className="cm-tutoring-request-header">
          <Avatar person={person} size={44} />
          <div>
            <strong>
              {person?.name ||
                (isIncoming ? "A student in your community" : "Your tutor")}
            </strong>
            <small>
              {dateLabel(request.date)} · {request.time} SGT
            </small>
          </div>
          <Badge
            tone={
              status === "accepted"
                ? "green"
                : status === "declined"
                  ? "orange"
                  : "purple"
            }
          >
            {labels[status] || status}
          </Badge>
        </div>
        {request.message && (
          <p className="cm-request-message">{request.message}</p>
        )}
        {status === "pending" ? (
          <>
            <p className="cm-fine">
              {isIncoming
                ? "Review the proposed time and topic before responding."
                : "Waiting for your tutor to review the proposed session."}
            </p>
            <div className="cm-request-actions">
              {isIncoming ? (
                <>
                  <Button
                    disabled={busy}
                    onClick={() => update(request, "accepted")}
                  >
                    <Check size={16} />
                    Accept request
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => update(request, "declined")}
                  >
                    Decline request
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => update(request, "cancelled")}
                >
                  Cancel request
                </Button>
              )}
            </div>
          </>
        ) : (
          <p className="cm-fine">
            {status === "accepted"
              ? "The proposed time is accepted. No payment has been taken."
              : status === "declined"
                ? "This request was declined. You can explore another tutor or time."
                : "This request is cancelled. You can make a new request when you’re ready."}
          </p>
        )}
      </article>
    );
  }
  return (
    <section className="stack cm-tutoring-inbox">
      <SectionTitle>Tutoring requests</SectionTitle>
      {incoming.length > 0 && (
        <div className="stack">
          <h3>Requests for you</h3>
          {[...incoming].reverse().map((r) => requestCard(r, true))}
        </div>
      )}
      {outgoing.length > 0 && (
        <div className="stack">
          <h3>Your requests</h3>
          {[...outgoing].reverse().map((r) => requestCard(r, false))}
        </div>
      )}
    </section>
  );
}
function MenuRow({
  icon,
  title,
  detail,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button className="cm-menu-row" onClick={onClick}>
      <span className="cm-menu-icon">{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <CaretRight size={20} />
    </button>
  );
}
function EditProfile() {
  const { user, api, refresh, toast, go } = useKaki();
  const { busy, run } = useAction();
  const [form, setForm] = useState({
    name: user.name || "",
    bio: user.bio || "",
    course: user.course || "",
    year: String(user.year || "Year 1"),
    subjects: list(user.subjects).join(", "),
    interests: list(user.interests).join(", "),
    languages: list(user.languages).join(", "),
    studyStyle: list(user.studyStyle).join(", "),
    availability: list(user.availability).join(", "),
    avatar: user.avatar || "/assets/kaki/avatar-1.webp",
  });
  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (form.name.trim().length < 2) {
      toast("Add the name you’d like your community to use.");
      return;
    }
    run(async () => {
      await api("/profile", "PATCH", {
        ...form,
        name: form.name.trim(),
        year: form.year,
        subjects: list(form.subjects),
        interests: list(form.interests),
        languages: list(form.languages),
        studyStyle: form.studyStyle,
        availability: list(form.availability),
      });
      await refresh();
      toast("Your profile is updated");
      go("profile");
    });
  }
  return (
    <form className="stack cm-narrow" onSubmit={submit}>
      <PageHeading
        title="A little more you."
        subtitle="Help your community find common ground."
      />
      <section className="card cm-padded cm-edit-avatar">
        <Avatar src={form.avatar} name={form.name} size={85} />
        <div>
          <strong>Choose a profile photo</strong>
          <p className="cm-fine">Sample portraits for this demo.</p>
          <div className="row">
            {[1, 2].map((n) => (
              <button
                type="button"
                key={n}
                aria-label={`Choose portrait ${n}`}
                aria-pressed={form.avatar === `/assets/kaki/avatar-${n}.webp`}
                className={`cm-avatar-choice ${form.avatar === `/assets/kaki/avatar-${n}.webp` ? "selected" : ""}`}
                onClick={() => set("avatar", `/assets/kaki/avatar-${n}.webp`)}
              >
                <Avatar src={`/assets/kaki/avatar-${n}.webp`} size={39} />
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="card cm-padded stack">
        <Field label="Your name">
          <Input
            required
            minLength={2}
            maxLength={50}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>
        <Field label="A little introduction">
          <Textarea
            rows={3}
            maxLength={400}
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
            placeholder="Usually studying after class. Always up for…"
          />
        </Field>
        <Field label="Course / stream">
          <Input
            maxLength={100}
            value={form.course}
            onChange={(e) => set("course", e.target.value)}
          />
        </Field>
        <Field label="Year / level">
          <Input
            value={form.year}
            maxLength={40}
            placeholder="Year 2 or Secondary 3"
            onChange={(e) => set("year", e.target.value)}
          />
        </Field>
        <div className="cm-privacy-note">
          <ShieldCheck size={20} />
          <p>
            {user.institution} · {networkLabel(user.network)} community
            <br />
            Your education community is managed separately from your public
            profile.
          </p>
        </div>
      </section>
      <section className="card cm-padded stack">
        <SectionTitle>Things we could have in common</SectionTitle>
        <p className="cm-fine">Separate each item with a comma.</p>
        {(
          [
            ["interests", "Interests", "Badminton, Photography, Board games"],
            ["subjects", "Subjects / modules", "Programming, Database systems"],
            ["languages", "Languages", "English, Mandarin"],
            ["studyStyle", "Study style", "Small groups, Practice questions"],
            [
              "availability",
              "Usually free",
              "Weekday afternoons, Saturday mornings",
            ],
          ] as const
        ).map(([key, label, placeholder]) => (
          <Field key={key} label={label}>
            <Input
              value={form[key]}
              maxLength={key === "studyStyle" ? 60 : 250}
              placeholder={placeholder}
              onChange={(e) => set(key, e.target.value)}
            />
          </Field>
        ))}
      </section>
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save my profile"} <Check size={18} />
      </Button>
    </form>
  );
}

function Journey() {
  const { data, user, api, refresh, toast } = useKaki();
  const { busy, run } = useAction();
  const [text, setText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("What did you enjoy this week?");
  const reflections: Person[] = Array.isArray(data.journey)
    ? data.journey
    : data.journey?.reflections || data.reflections || [];
  const activities = (data.activities || []).filter(
    (a: Person) =>
      a.joined || list(a.memberIds || a.attendeeIds).includes(user.id),
  );
  const prompts = [
    "What did you enjoy this week?",
    "Did you try something new?",
    "Who did you collaborate with?",
    "What would you like to try next?",
  ];
  const tagOptions = [
    "Enjoyed it",
    "Met someone new",
    "Learned something",
    "Tried something new",
    "Had a good conversation",
    "Would do it again",
  ];
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    run(async () => {
      await api("/reflections", "POST", { text: text.trim(), tags });
      await refresh();
      setText("");
      setTags([]);
      toast("A little moment, saved just for you.");
    });
  }
  return (
    <div className="stack cm-narrow">
      <PageHeading
        eyebrow="For you, and only you"
        title="Your journey, your pace."
        subtitle="Growth happens in all sorts of little moments."
      />
      <div className="cm-journey-hero">
        <Leaf size={34} weight="duotone" />
        <h2>
          There’s no right pace
          <br />
          for finding your people.
        </h2>
        <p>Notice what feels good. Make room for more of it.</p>
        <span>
          <LockKey size={14} /> Only you can see this space
        </span>
      </div>
      <div className="cm-journey-counts">
        <div>
          <strong>{activities.length}</strong>
          <span>plans joined</span>
        </div>
        <div>
          <strong>{list(user.joinedCircleIds).length}</strong>
          <span>circles explored</span>
        </div>
        <div>
          <strong>{reflections.length}</strong>
          <span>moments kept</span>
        </div>
      </div>
      <form className="card cm-padded stack" onSubmit={submit}>
        <SectionTitle>A moment to reflect</SectionTitle>
        <div className="cm-prompt-list">
          {prompts.map((p) => (
            <button
              type="button"
              key={p}
              className={prompt === p ? "selected" : ""}
              onClick={() => setPrompt(p)}
            >
              {p}
            </button>
          ))}
        </div>
        <Field label={prompt}>
          <Textarea
            rows={4}
            required
            maxLength={2000}
            placeholder="It can be something small…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </Field>
        <div className="chips">
          {tagOptions.map((t) => (
            <button
              className={`chip ${tags.includes(t) ? "selected" : ""}`}
              key={t}
              type="button"
              aria-pressed={tags.includes(t)}
              onClick={() =>
                setTags((old) =>
                  old.includes(t) ? old.filter((x) => x !== t) : [...old, t],
                )
              }
            >
              {tags.includes(t) && <Check size={14} />} {t}
            </button>
          ))}
        </div>
        <Button type="submit" disabled={busy || !text.trim()}>
          <LockKey size={18} />
          {busy ? "Saving…" : "Keep this moment"}
        </Button>
      </form>
      <section>
        <SectionTitle>Little moments, kept</SectionTitle>
        {reflections.length ? (
          <div className="stack">
            {[...reflections].reverse().map((r: Person, i: number) => (
              <article className="card cm-padded cm-reflection" key={r.id || i}>
                <span className="cm-fine">
                  {dateLabel(r.createdAt)} <LockKey size={12} />
                </span>
                <p>{r.text}</p>
                <Tags values={r.tags} />
              </article>
            ))}
          </div>
        ) : (
          <div className="card cm-padded">
            <p className="muted">
              Your first reflection will live here. There’s nothing to catch up
              on.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
function ToggleRow({
  label,
  detail,
  value,
  disabled,
  onChange,
}: {
  label: string;
  detail: string;
  value: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="cm-toggle-row">
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={value}
        disabled={disabled}
        className={`cm-toggle ${value ? "on" : ""}`}
        onClick={() => onChange(!value)}
      >
        <span />
      </button>
    </div>
  );
}
function Privacy() {
  const { user, data, api, refresh, toast } = useKaki();
  const { busy, run } = useAction();
  const settings = user.settings || {};
  const blocked = list(user.blockedPersonIds);
  function change(key: string, value: boolean | string) {
    run(async () => {
      await api("/profile", "PATCH", {
        settings: { ...settings, [key]: value },
      });
      await refresh();
      toast("Privacy preference saved");
    });
  }
  return (
    <div className="stack cm-narrow">
      <PageHeading
        eyebrow="Your space, your choice"
        title="Privacy & safety."
        subtitle="Feel comfortable showing up as yourself."
      />
      <div className="cm-privacy-banner">
        <ShieldCheck size={30} weight="duotone" />
        <div>
          <strong>Your community stays your community.</strong>
          <p>
            Discovery, activities and messages stay within the{" "}
            {networkLabel(user.network)} network. Private contact details aren’t
            public.
          </p>
        </div>
      </div>
      <section className="card cm-padded">
        <SectionTitle>How people find you</SectionTitle>
        <ToggleRow
          disabled={busy}
          label="Show me in people discovery"
          detail="Let students at your education stage discover your profile."
          value={settings.discoverable !== false}
          onChange={(v) => change("discoverable", v)}
        />
        <ToggleRow
          disabled={busy}
          label="Allow new connection requests"
          detail="Let students in your community ask to connect. Existing connections can still talk."
          value={settings.allowInvites !== false}
          onChange={(v) => change("allowInvites", v)}
        />
        <div className="cm-visibility-field">
          <Field label="Who can see me in activity member lists?">
            <select
              className="cm-select"
              disabled={busy}
              value={settings.activityVisibility || "community"}
              onChange={(e) => change("activityVisibility", e.target.value)}
            >
              <option value="community">My education community</option>
              <option value="connections">Only my connections</option>
              <option value="private">Keep my membership private</option>
            </select>
          </Field>
        </div>
      </section>
      <section className="card cm-padded">
        <SectionTitle>Always part of kaki</SectionTitle>
        <div className="cm-detail-line">
          <LockKey size={22} />
          <span>Conversations open only after a mutual connection.</span>
        </div>
        <div className="cm-detail-line">
          <ShieldCheck size={22} />
          <span>
            Private email, phone numbers and exact ages stay off public
            profiles.
          </span>
        </div>
        <div className="cm-detail-line">
          <MapPin size={22} />
          <span>Plans use approved campus and public places.</span>
        </div>
        <div className="cm-detail-line">
          <TelegramLogo size={22} />
          <span>External contact sharing needs both students’ consent.</span>
        </div>
      </section>
      <section className="card cm-padded">
        <SectionTitle>Blocked students</SectionTitle>
        {blocked.length ? (
          blocked.map((id) => {
            const p =
              (user.blockedPeople || []).find((x: Person) => x.id === id) ||
              (data.people || []).find((x: Person) => x.id === id);
            return (
              <div key={id} className="cm-block-row">
                <span>{p?.name || "Blocked student"}</span>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await api(`/blocks/${id}`, "DELETE");
                      await refresh();
                      toast("Student unblocked");
                    })
                  }
                >
                  Unblock
                </Button>
              </div>
            );
          })
        ) : (
          <p className="muted">
            You haven’t blocked anyone. You can report or block from profiles
            and conversations.
          </p>
        )}
      </section>
      <p className="cm-fine">
        For younger students, contact sharing stays restricted and discovery
        starts with stricter defaults. Reports are saved for review; this demo
        does not have a live moderation team.
      </p>
    </div>
  );
}
function Telegram({ id }: { id?: string }) {
  const { data, user, api, refresh, toast } = useKaki();
  const { busy, run } = useAction();
  const [consentResult, setConsentResult] = useState<any>(null);
  const settings = user.settings || {};
  const person = (data.people || []).find((p: Person) => p.id === id);
  const connected =
    !!person &&
    (data.conversations || []).some(
      (c: Person) => c.personId === id && c.mutual !== false,
    );
  function update(key: string, value: boolean) {
    run(async () => {
      await api("/profile", "PATCH", {
        settings: { ...settings, [key]: value },
      });
      await refresh();
      toast("Telegram preference saved");
    });
  }
  return (
    <div className="stack cm-narrow">
      <PageHeading
        eyebrow="Keep the good plans close"
        title="kaki, on Telegram."
        subtitle="Your community, with you wherever you chat."
      />
      <div className="cm-telegram-hero">
        <TelegramLogo size={52} weight="duotone" />
        <h2>
          A little nudge.
          <br />A good plan.
        </h2>
        <p>
          Choose the updates you’d like to receive when Telegram is connected.
        </p>
        <Badge>Bot not connected</Badge>
      </div>
      <section className="card cm-padded">
        <SectionTitle>Connection status</SectionTitle>
        <p>
          The Telegram bot isn’t configured in this demo. Your preferences are
          saved, but messages and invitations won’t be delivered to Telegram
          yet.
        </p>
        <div className="cm-privacy-note">
          <ShieldCheck size={20} />
          <p>Telegram uses the same education-community boundaries as kaki.</p>
        </div>
      </section>
      <section className="card cm-padded">
        <SectionTitle>What would you like to hear about?</SectionTitle>
        <ToggleRow
          disabled={busy}
          label="Activity updates"
          detail="Changes to plans you’ve joined."
          value={!!settings.telegramActivities}
          onChange={(v) => update("telegramActivities", v)}
        />
        <ToggleRow
          disabled={busy}
          label="New connections"
          detail="A hello when a connection becomes mutual."
          value={!!settings.telegramMatches}
          onChange={(v) => update("telegramMatches", v)}
        />
        <ToggleRow
          disabled={busy}
          label="Circle invitations"
          detail="New plans from the circles you’ve joined."
          value={!!settings.telegramCircles}
          onChange={(v) => update("telegramCircles", v)}
        />
        <ToggleRow
          disabled={busy}
          label="Lunch opportunities"
          detail="A little company for a campus lunch."
          value={!!settings.telegramLunch}
          onChange={(v) => update("telegramLunch", v)}
        />
      </section>
      {person && (
        <section className="card cm-padded stack">
          <SectionTitle>Connect with {person.name.split(" ")[0]}</SectionTitle>
          <p>
            Only share your Telegram contact if you’re comfortable. Both of you
            need to agree first.
          </p>
          {!connected ? (
            <div className="cm-privacy-note">
              <LockKey size={20} />
              <p>
                Make a mutual connection in kaki before requesting external
                contact sharing.
              </p>
            </div>
          ) : (
            <>
              <Button
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const result = await api("/telegram/consent", "POST", {
                      personId: id,
                      consent: true,
                    });
                    setConsentResult(result);
                    toast(
                      result.message || "Your consent preference is saved.",
                    );
                  })
                }
              >
                <TelegramLogo size={18} />{" "}
                {consentResult ? "Consent saved" : "I’m comfortable sharing"}
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await api("/telegram/consent", "POST", {
                      personId: id,
                      consent: false,
                    });
                    setConsentResult(null);
                    toast("Consent withdrawn");
                  })
                }
              >
                Withdraw my consent
              </Button>
              {consentResult && (
                <p className="cm-fine">
                  {consentResult.message ||
                    "Your preference is saved. Contact details stay private until both students consent and the integration is configured."}
                </p>
              )}
            </>
          )}
        </section>
      )}
      <div className="cm-privacy-note">
        <LockKey size={18} />
        <p>Telegram usernames never appear on public profiles.</p>
      </div>
    </div>
  );
}
function Report({ id }: { id?: string }) {
  const { data, api, refresh, go, back } = useKaki();
  const { busy, run } = useAction();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [block, setBlock] = useState(true);
  const [sent, setSent] = useState(false);
  const [wasBlocked, setWasBlocked] = useState(false);
  const person = (data.people || []).find((p: Person) => p.id === id);
  const target =
    person ||
    (data.circles || []).find((c: Person) => c.id === id) ||
    (data.activities || []).find((a: Person) => a.id === id);
  if (sent)
    return (
      <div className="stack cm-narrow cm-report-done">
        <ShieldCheck size={62} weight="duotone" />
        <h1>Thanks for speaking up.</h1>
        <p>
          Your report is saved.{" "}
          {wasBlocked
            ? "This student is blocked and can no longer contact you in kaki."
            : "You can return to your community when you’re ready."}
        </p>
        <p className="cm-fine">
          This demo records reports but does not have a live moderation team.
        </p>
        <Button onClick={() => go("discover")}>Back to my community</Button>
      </div>
    );
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!reason || !id) return;
    run(async () => {
      const shouldBlock = !!person && block;
      await api("/reports", "POST", {
        targetId: id,
        reason,
        details: details.trim(),
        block: shouldBlock,
      });
      await refresh();
      setWasBlocked(shouldBlock);
      setSent(true);
    });
  }
  return (
    <form className="stack cm-narrow" onSubmit={submit}>
      <PageHeading
        eyebrow="We’re glad you’re telling us"
        title="Let’s keep kaki kind."
        subtitle={`Report ${target?.name || target?.title || "this content"}. Your report is private.`}
      />
      <section className="card cm-padded stack">
        <Field label="What’s happening?">
          <select
            className="cm-select"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            <option value="">Choose a reason</option>
            {[
              "Unwanted contact or harassment",
              "Inappropriate content",
              "Sharing private contact details",
              "Unsafe meeting location",
              "Impersonation or suspicious account",
              "Spam or scams",
              "Something else",
            ].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
        <Field label="Anything else you’d like to tell us? (optional)">
          <Textarea
            rows={5}
            maxLength={2000}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Share what happened. Please avoid adding anyone’s private contact details."
          />
        </Field>
        {person && (
          <ToggleRow
            label={`Also block ${person.name.split(" ")[0]}`}
            detail="You won’t appear to each other or receive messages. They won’t be notified."
            value={block}
            onChange={setBlock}
          />
        )}
        <p className="cm-fine">
          Reports are stored for review. If you are in immediate danger, seek
          help from a trusted person or local emergency services.
        </p>
      </section>
      <Button variant="danger" type="submit" disabled={busy || !reason || !id}>
        <Flag size={18} />
        {busy ? "Submitting…" : "Submit private report"}
      </Button>
      <Button type="button" variant="ghost" onClick={back}>
        Cancel
      </Button>
    </form>
  );
}

export default function CommunityScreens({ route }: { route: Route }) {
  const components: Record<string, ReactNode> = {
    matches: <Matches />,
    people: route.id ? <PersonProfile id={route.id} /> : <Matches />,
    connected: <Connected id={route.id} />,
    circles: <Circles />,
    circle: <Circle id={route.id} />,
    tutoring: <Tutoring requestedId={route.id} />,
    messages: <Messages />,
    chat: <Chat id={route.id} />,
    profile: <Profile />,
    "edit-profile": <EditProfile />,
    journey: <Journey />,
    privacy: <Privacy />,
    telegram: <Telegram id={route.id} />,
    report: <Report id={route.id} />,
  };
  return (
    <div className="cm-community" key={`${route.name}-${route.id || ""}`}>
      {components[route.name] || <Matches />}
    </div>
  );
}
