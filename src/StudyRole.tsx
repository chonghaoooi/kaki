import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, BookOpen, CalendarBlank, CheckCircle, GraduationCap, Heart, MapPin, Sparkle } from "@phosphor-icons/react";
import { useKaki } from "./kaki-context";
import { Badge, Busy, Button, Empty, ErrorText, PageHeading } from "./ui";
import { dateLabel, displayTime, imageFor } from "./Activities";
import "./study-role.css";

export default function StudyRole({ id }: { id: string }) {
  const { data, api, go, refresh, toast } = useKaki();
  const choiceTouched = useRef(false);
  const roleButtons = useRef<{ peer: HTMLButtonElement | null; mentor: HTMLButtonElement | null }>({ peer: null, mentor: null });
  const [activity, setActivity] = useState<any>(() => (data.activities || []).find((a: any) => a.id === id));
  const [role, setRole] = useState<"peer" | "mentor" | "">(activity?.myRole || ""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { let live = true; api(`/activities/${id}`).then((r) => { if (live) { setActivity(r.activity || r); if (!choiceTouched.current) setRole((r.activity || r).myRole || ""); } }).catch((e) => { if (live) setError(e.message); }); return () => { live = false; }; }, [api, id]);
  if (!activity) return error ? <Empty title="We couldn’t find this session." text={error} /> : <Busy />;
  if (activity.category !== "study") return <Empty title="This activity doesn’t have study roles." action={<Button onClick={() => go("activity", id)}>View activity</Button>} />;
  const isJoined = activity.joined || !!activity.myRole;
  const full = !isJoined && (activity.participantCount ?? activity.participants?.length ?? 0) >= activity.capacity;
  const selectRole = (nextRole: "peer" | "mentor") => {
    choiceTouched.current = true;
    setRole(nextRole);
  };
  const navigateRole = (event: KeyboardEvent<HTMLButtonElement>, currentRole: "peer" | "mentor") => {
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextRole = event.key === "Home" ? "peer" : event.key === "End" ? "mentor" : currentRole === "peer" ? "mentor" : "peer";
    selectRole(nextRole);
    roleButtons.current[nextRole]?.focus();
  };
  const join = async () => {
    if (!role || busy) return;
    setBusy(true); setError("");
    try { await api(`/activities/${id}/join`, "POST", { role }); await refresh(); go("activity", id); toast(isJoined ? `You’re now joining as a ${role}.` : `You’re in as a ${role}. See you at the session!`); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return <div className="study-role-page"><PageHeading eyebrow="BETTER WHEN WE LEARN TOGETHER" title="How will you join?" subtitle="Bring your questions. Or share what you know." />
    <article className="study-role-preview card"><img src={imageFor(activity)} alt="" /><div><Badge tone="blue"><BookOpen size={13} /> Study session</Badge><h2>{activity.title}</h2><small><CalendarBlank size={14} /> {dateLabel(activity)} · {displayTime(activity.time)}</small><button className="location-link" onClick={() => go("activity-location", id)}><MapPin size={14} /> {activity.location}</button></div></article>
    <div className="study-role-options" role="radiogroup" aria-label="Your study session role">{[{ id: "peer" as const, title: "Join as a peer", icon: BookOpen, tagline: "Let’s figure it out together.", description: "Ask questions, share notes, and learn alongside other students.", label: "Learn & collaborate" }, { id: "mentor" as const, title: "Join as a mentor", icon: GraduationCap, tagline: "A little guidance goes a long way.", description: "Help fellow students understand a subject you feel confident in.", label: "Guide & encourage" }].map((r) => <button key={r.id} ref={(button) => { roleButtons.current[r.id] = button; }} type="button" role="radio" aria-checked={role === r.id} tabIndex={role === r.id || (!role && r.id === "peer") ? 0 : -1} className={`study-role-option ${r.id} ${role === r.id ? "selected" : ""}`} onClick={() => selectRole(r.id)} onKeyDown={(event) => navigateRole(event, r.id)}><span className="role-icon"><r.icon size={31} weight="duotone" /></span><span className="role-selection">{role === r.id && <CheckCircle size={24} weight="fill" />}</span><span className="eyebrow">{r.label}</span><h2>{r.title}</h2><strong>{r.tagline}</strong><p>{r.description}</p><span className="role-current-count">{activity.roleCounts?.[r.id] || 0} {r.id}{(activity.roleCounts?.[r.id] || 0) === 1 ? "" : "s"} joining{activity.myRole === r.id ? " · Your current role" : ""}</span></button>)}</div>
    <p className="study-role-note"><Heart size={21} weight="duotone" /><span>Everyone has something to offer. Choose the role that fits you for this session.</span></p>
    {role === "mentor" && <div className="study-mentor-note"><Heart size={19} weight="fill" /><span>Your mentoring journey starts here. Keep track of your sessions, days mentoring and thank-you hearts from peers.</span></div>}
    <ErrorText>{error}</ErrorText><Button className="full" onClick={join} disabled={!role || busy || full}>{busy ? "Saving your spot…" : full ? "This session is full" : isJoined ? "Save my role" : role ? `Join as a ${role}` : "Choose your role"}<ArrowRight size={18} /></Button>
  </div>;
}
