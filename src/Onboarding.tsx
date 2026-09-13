import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Backpack,
  BookOpen,
  GraduationCap,
  Laptop,
  CheckCircle,
  ShieldCheck,
  Sparkle,
  UsersThree,
} from "@phosphor-icons/react";
import { useKeyboard } from "./mobile";
import { useKaki } from "./kaki-context";
import {
  Avatar,
  Badge,
  Button,
  ErrorText,
  Field,
  IconButton,
  Input,
  PageHeading,
} from "./ui";

const stages = [
  {
    id: "secondary",
    title: "Secondary school",
    text: "Find your people, one activity at a time.",
    icon: Backpack,
    color: "blue",
  },
  {
    id: "jc_mi",
    title: "Junior college / MI",
    text: "Study sessions and everything in between.",
    icon: BookOpen,
    color: "purple",
  },
  {
    id: "polytechnic",
    title: "Polytechnic",
    text: "Your next project partner. Your next kaki.",
    icon: Laptop,
    color: "orange",
  },
  {
    id: "university",
    title: "University",
    text: "Make campus feel a little more like home.",
    icon: GraduationCap,
    color: "cyan",
  },
];
const interests = [
  "Badminton",
  "Board games",
  "Photography",
  "Coding",
  "Music",
  "Reading",
  "Art",
  "Football",
  "Gaming",
  "Sustainability",
  "Cooking",
  "Running",
];
const intentions = [
  "Study buddies",
  "Study groups",
  "Sports",
  "Board games",
  "Lunch",
  "Tutoring",
  "Project teammates",
  "New friends",
  "Interest circles",
  "Events",
];

export default function Onboarding() {
  const keyboard = useKeyboard();
  const { api, refresh, go, toast, desktop, user } = useKaki();
  const [step, setStep] = useState(user ? "profile" : "welcome"),
    [network, setNetwork] = useState(user?.network || ""),
    [schools, setSchools] = useState<any[]>([]),
    [school, setSchool] = useState<any>(null),
    [search, setSearch] = useState("");
  const [email, setEmail] = useState(""),
    [ageBand, setAgeBand] = useState("under18"),
    [code, setCode] = useState(""),
    [challenge, setChallenge] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [name, setName] = useState(
      user?.name === "New kaki" ? "" : user?.name || "",
    ),
    [year, setYear] = useState(user?.year || "1"),
    [course, setCourse] = useState(user?.course || ""),
    [subjects, setSubjects] = useState(user?.subjects?.join(", ") || ""),
    [language, setLanguage] = useState(
      user?.languages?.join(", ") || "English",
    ),
    [style, setStyle] = useState(user?.studyStyle || "Collaborative"),
    [availability, setAvailability] = useState(
      user?.availability?.[0] || "Afternoons",
    ),
    [chosen, setChosen] = useState<string[]>(user?.interests || []),
    [goals, setGoals] = useState<string[]>(user?.intentions || ["New friends"]),
    [avatar, setAvatar] = useState(
      user?.avatar || "/assets/kaki/avatar-1.webp",
    );
  useEffect(() => {
    if (!network) return;
    let live = true;
    api("/institutions?network=" + network)
      .then((r) => {
        if (live) setSchools(Array.isArray(r) ? r : r.institutions || []);
      })
      .catch((e) => setError(e.message));
    return () => {
      live = false;
    };
  }, [network]);
  const next = (s: string) => {
    keyboard.hide();
    setError("");
    setStep(s);
  };
  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const demo = () =>
    run(async () => {
      await api("/demo", "POST", { network: network || "polytechnic" });
      await refresh();
      go("discover");
      toast("Welcome, Jamie. You’re exploring the demo community.");
    });
  const send = () =>
    run(async () => {
      const result = await api("/auth/start", "POST", {
        institutionId: school.id,
        email,
        ageBand,
      });
      setChallenge(result);
      next("verify");
    });
  const toggle = (item: string, list: string[], set: (x: string[]) => void) =>
    set(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  return (
    <div className={`onboarding onboarding-${step}`}>
      <div className="onboard-brand">
        <span className="wordmark">kaki</span>
        <Badge>
          <ShieldCheck size={14} /> Your student community
        </Badge>
      </div>
      {step !== "welcome" && (
        <div className="onboard-progress">
          <IconButton
            label="Back"
            onClick={() =>
              next(
                (
                  {
                    school: "welcome",
                    email: "school",
                    verify: "email",
                    verified: "email",
                    profile: "verified",
                    interests: "profile",
                  } as any
                )[step] || "welcome",
              )
            }
          >
            <ArrowLeft size={20} />
          </IconButton>
          <span>YOUR PEOPLE ARE HERE</span>
          <div className="progress-dots">
            {[1, 2, 3, 4].map((i) => (
              <i
                key={i}
                className={
                  i <=
                  (
                    {
                      school: 1,
                      email: 2,
                      verify: 2,
                      verified: 2,
                      profile: 3,
                      interests: 4,
                    } as any
                  )[step]
                    ? "active"
                    : ""
                }
              />
            ))}
          </div>
        </div>
      )}
      {step === "welcome" && (
        <>
          <div className="welcome-hero">
            <div>
              <Badge tone="purple">
                <Sparkle size={14} /> A little more together
              </Badge>
              <h1>
                Find your people.
                <br />
                <em>Do your thing.</em>
              </h1>
              <p>
                Find people to study with, play with, talk to, and grow with.
              </p>
            </div>
            <img
              src="/assets/kaki/games.webp"
              alt="Students getting to know each other over a board game"
            />
          </div>
          <div className="section-heading">
            <h2>Where are you studying?</h2>
          </div>
          <p className="muted welcome-help">
            Connect with students at your stage of education.
          </p>
          <div className="stage-grid">
            {stages.map((s) => (
              <button
                className={`stage-card tone-${s.color}`}
                key={s.id}
                onClick={() => {
                  setSchool(null);
                  setSearch("");
                  setSchools([]);
                  setNetwork(s.id);
                  setAgeBand(s.id === "university" ? "18plus" : "under18");
                  next("school");
                }}
              >
                <span className="stage-icon">
                  <s.icon size={27} weight="duotone" />
                </span>
                <span>
                  <strong>{s.title}</strong>
                  <small>{s.text}</small>
                </span>
                <ArrowRight size={18} />
              </button>
            ))}
          </div>
          <div className="demo-invitation">
            <UsersThree size={22} weight="duotone" />
            <div>
              <strong>Take a look around first</strong>
              <p>Explore kaki with a sample student profile.</p>
            </div>
            <Button variant="secondary" disabled={busy} onClick={demo}>
              {busy ? "Opening…" : "Try demo"}
              <ArrowRight size={16} />
            </Button>
          </div>
          <p className="privacy-note">
            <ShieldCheck size={16} /> Four separate communities. One shared
            spirit.
          </p>
        </>
      )}
      {step === "school" && (
        <>
          <PageHeading
            eyebrow={stages.find((s) => s.id === network)?.title}
            title="Find your campus."
            subtitle="This is where your community begins."
          />
          <Input
            aria-label="Search institutions"
            placeholder="Search your school"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="school-list">
            {schools
              .filter((s) =>
                s.name.toLowerCase().includes(search.toLowerCase()),
              )
              .map((s) => (
                <button
                  key={s.id}
                  className={`school-option ${school?.id === s.id ? "selected" : ""}`}
                  onClick={() => setSchool(s)}
                >
                  <span className="school-monogram">
                    <GraduationCap size={23} weight="duotone" />
                  </span>
                  <span>{s.name}</span>
                  {school?.id === s.id ? (
                    <CheckCircle size={23} weight="fill" />
                  ) : (
                    <ArrowRight size={17} />
                  )}
                </button>
              ))}
            {schools.length === 0 && (
              <p className="muted">Loading institutions…</p>
            )}
          </div>
          <Button
            className="full"
            disabled={!school || school.network !== network}
            onClick={() => next("email")}
          >
            Continue
            <ArrowRight size={18} />
          </Button>
          <p className="privacy-note">
            Your education stage determines your community.
          </p>
        </>
      )}
      {step === "email" && (
        <>
          <div className="onboard-symbol">
            <ShieldCheck size={60} weight="duotone" />
          </div>
          <PageHeading
            title="Your campus. Your people."
            subtitle="Verify with your institution-issued email. Your email stays private."
          />
          <Badge>{school?.name}</Badge>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <Field label="School email">
              <Input
                type="email"
                autoComplete="email"
                required
                value={email}
                placeholder={`student@${school?.domains?.[0] || "school.edu.sg"}`}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Privacy age group">
              <select
                className="input"
                value={ageBand}
                onChange={(e) => setAgeBand(e.target.value)}
              >
                <option value="under18">
                  Under 18 — extra privacy by default
                </option>
                <option value="18plus">18 or older</option>
              </select>
            </Field>
            <Button type="submit" disabled={busy || !email}>
              {busy ? "Sending…" : "Send verification code"}
              <ArrowRight size={18} />
            </Button>
          </form>
          <div className="soft-note">
            This local build supports a demo verification flow. Test email
            domains are shown for schools that need institution SSO before live
            verification.
          </div>
        </>
      )}
      {step === "verify" && (
        <>
          <div className="onboard-symbol">
            <ShieldCheck size={60} weight="duotone" />
          </div>
          <PageHeading
            title="Check your inbox."
            subtitle={`Enter the 6-digit code for ${challenge?.maskedEmail || email}.`}
          />
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                const result = await api("/auth/verify", "POST", {
                  challengeId: challenge.challengeId,
                  code,
                });
                if (result.user?.onboardingComplete) {
                  await refresh();
                  go("discover");
                } else next("verified");
              });
            }}
          >
            <Input
              aria-label="Six-digit verification code"
              className="otp-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="[0-9]{6}"
              required
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
            {challenge?.demoCode && (
              <div className="soft-note">
                <strong>Demo code: {challenge.demoCode}</strong>
                <br />
                No email is sent in local demo mode.
              </div>
            )}
            <Button type="submit" disabled={busy || code.length !== 6}>
              {busy ? "Verifying…" : "Verify email"}
              <CheckCircle size={19} />
            </Button>
            <Button variant="ghost" onClick={send} disabled={busy}>
              Send a new code
            </Button>
          </form>
        </>
      )}
      {step === "verified" && (
        <div className="verified-moment">
          <CheckCircle size={96} weight="duotone" />
          <Badge tone="green">
            {challenge?.demoMode || user?.verificationMethod === "demo"
              ? "DEMO EMAIL CONFIRMED"
              : "EMAIL CONFIRMED"}
          </Badge>
          <h1>
            You’re in.
            <br />
            <em>Make yourself at home.</em>
          </h1>
          <p>
            You belong to the{" "}
            {stages.find((s) => s.id === network)?.title.toLowerCase()}{" "}
            community.
          </p>
          <Button onClick={() => next("profile")}>
            Let’s make your profile
            <ArrowRight size={18} />
          </Button>
        </div>
      )}
      {step === "profile" && (
        <>
          <PageHeading
            title="A little about you."
            subtitle="Give your future kakis a few conversation starters."
          />
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                await api("/profile", "PATCH", {
                  name,
                  year,
                  course,
                  subjects: subjects
                    .split(",")
                    .map((s: string) => s.trim())
                    .filter(Boolean),
                  languages: language.split(",").map((s: string) => s.trim()),
                  studyStyle: style,
                  availability: [availability],
                  avatar,
                });
                next("interests");
              });
            }}
          >
            <div className="avatar-choices">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  type="button"
                  aria-label={`Choose profile photo ${n}`}
                  className={avatar.includes(`-${n}.`) ? "chosen" : ""}
                  key={n}
                  onClick={() => setAvatar(`/assets/kaki/avatar-${n}.webp`)}
                >
                  <Avatar
                    src={`/assets/kaki/avatar-${n}.webp`}
                    name={`Sample portrait ${n}`}
                    size={64}
                  />
                </button>
              ))}
            </div>
            <Field label="Your name">
              <Input
                autoComplete="given-name"
                required
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What should we call you?"
              />
            </Field>
            <div className="form-grid">
              <Field label="Year">
                <select
                  className="input"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                >
                  {[1, 2, 3, 4, 5].map((y) => (
                    <option key={y} value={y}>
                      Year {y}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Course / stream">
                <Input
                  required
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="e.g. Information Technology"
                />
              </Field>
            </div>
            <Field label="Subjects or modules">
              <Input
                value={subjects}
                onChange={(e) => setSubjects(e.target.value)}
                placeholder="e.g. Web Development, Databases"
              />
            </Field>
            <Field label="Languages">
              <Input
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              />
            </Field>
            <div className="form-grid">
              <Field label="Study style">
                <select
                  className="input"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                >
                  <option>Collaborative</option>
                  <option>Quiet focus</option>
                  <option>Practice together</option>
                </select>
              </Field>
              <Field label="Usually free">
                <select
                  className="input"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                >
                  <option>Afternoons</option>
                  <option>Evenings</option>
                  <option>Weekends</option>
                  <option>Mornings</option>
                </select>
              </Field>
            </div>
            <Button type="submit" disabled={busy || !name || !course}>
              Continue
              <ArrowRight size={18} />
            </Button>
          </form>
        </>
      )}
      {step === "interests" && (
        <>
          <PageHeading
            title="What’s your thing?"
            subtitle="Choose a few things you enjoy. You can always change these later."
          />
          <div className="chips interest-choices">
            {interests.map((s) => (
              <button
                key={s}
                className={`chip ${chosen.includes(s) ? "selected" : ""}`}
                onClick={() => toggle(s, chosen, setChosen)}
              >
                {chosen.includes(s) && <CheckCircle size={16} />} {s}
              </button>
            ))}
          </div>
          <h2>I’m here for…</h2>
          <div className="chips interest-choices">
            {intentions.map((s) => (
              <button
                key={s}
                className={`chip ${goals.includes(s) ? "selected" : ""}`}
                onClick={() => toggle(s, goals, setGoals)}
              >
                {s}
              </button>
            ))}
          </div>
          <Button
            className="full"
            disabled={busy || !chosen.length}
            onClick={() =>
              run(async () => {
                await api("/profile", "PATCH", {
                  interests: chosen,
                  intentions: goals,
                  onboardingComplete: true,
                });
                await refresh();
                go("discover");
                toast("Your community is ready. Find your first activity.");
              })
            }
          >
            {busy ? "Getting ready…" : "Meet my community"}
            <ArrowRight size={18} />
          </Button>
        </>
      )}
      <ErrorText>{error}</ErrorText>
      {desktop && (
        <p className="desktop-preview-link">
          <a href="/">
            Open the mobile app preview <ArrowRight size={14} />
          </a>
        </p>
      )}
    </div>
  );
}
