import { useId, useRef, useState } from "react";
import { GraduationCap, Heart, Info, Sparkle } from "@phosphor-icons/react";
import { useKaki } from "./kaki-context";
import "./mentor-stats.css";

export type MentorshipStats = {
  firstMentorshipAt: string | null;
  daysSinceFirstMentorship: number | null;
  sessionCount: number;
  likeCount: number;
  isNew: boolean;
  registered: boolean;
  likedByMe: boolean;
  canLike: boolean;
};

type MentorPerson = {
  id?: string;
  personId?: string;
  name?: string;
  mentorStats?: MentorshipStats | null;
};

export function MentorBadge({ person }: { person: MentorPerson }) {
  if (!person.mentorStats?.registered) return null;
  return (
    <span className="mentor-badges">
      <span className="mentor-badge"><GraduationCap size={14} aria-hidden="true" /> Mentor</span>
      {person.mentorStats.isNew && (
        <span className="mentor-new"><Sparkle size={12} aria-hidden="true" /> New</span>
      )}
    </span>
  );
}

export function MentorStats({
  person,
  compact = false,
  showLike = true,
  publicView = false,
  showHeading = true,
}: {
  person: MentorPerson;
  compact?: boolean;
  showLike?: boolean;
  publicView?: boolean;
  showHeading?: boolean;
}) {
  const { user, api, refresh, toast } = useKaki();
  const helpId = useId();
  const requestPending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState<{
    id: string;
    original: MentorshipStats;
    stats: MentorshipStats;
  } | null>(null);
  const personId = person.personId || person.id || "";
  const source = person.mentorStats;
  const stats = updated?.id === personId && updated.original === source ? updated.stats : source;
  if (!stats?.registered) return null;
  const self = personId === user.id;
  const days = stats.daysSinceFirstMentorship;
  const sessions = stats.sessionCount;

  async function toggleLike() {
    if (!stats || !source || !personId || (!stats.canLike && !stats.likedByMe) || self || requestPending.current) return;
    requestPending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api(`/mentors/${encodeURIComponent(personId)}/like`, "POST", {});
      const next: MentorshipStats | undefined = result.mentorStats || result.stats || result.person?.mentorStats;
      if (next) setUpdated({ id: personId, original: source, stats: next });
      toast(next?.likedByMe ? `A heart for ${person.name?.split(" ")[0] || "your mentor"}. Thank you for learning together.` : "Your heart was removed.");
      try { await refresh(); }
      catch { setError("Your change was saved. Reload to refresh the rest of the page."); }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Couldn’t save your heart. Please try again.");
    } finally {
      requestPending.current = false;
      setBusy(false);
    }
  }

  return (
    <section className={`mentor-stats ${compact ? "mentor-stats-compact" : "card"}`} aria-label={self && !publicView ? "Your mentorship" : `${person.name || "Student"}’s mentorship`}>
      {showHeading && <div className="mentor-stats-heading">
        <span><GraduationCap size={compact ? 17 : 21} weight="duotone" aria-hidden="true" />{self && !publicView ? "Your mentorship" : "Mentorship"}</span>
        {stats.isNew && <span className="mentor-new"><Sparkle size={12} aria-hidden="true" /> New</span>}
      </div>}
      <dl className="mentor-metrics">
        <div className="mentor-heart-metric"><dd><Heart size={compact ? 22 : 27} weight="fill" aria-hidden="true" /><span>{stats.likeCount.toLocaleString()}</span></dd><dt>{stats.likeCount === 1 ? "Heart received" : "Hearts received"}</dt></div>
        <div><dd>{sessions.toLocaleString()}</dd><dt>{sessions === 1 ? "Session" : "Sessions"}</dt></div>
        <div><dd>{days === null || days === undefined ? "—" : days.toLocaleString()}</dd><dt>{compact ? "Days mentoring" : "Days since first session"}</dt></div>
      </dl>
      {showLike && !self && (
        <div className="mentor-appreciation">
          <button className={`mentor-like ${stats.likedByMe ? "is-liked" : ""}`} type="button" disabled={busy || (!stats.canLike && !stats.likedByMe) || !personId} aria-label={stats.likedByMe ? `Remove heart from ${person.name || "mentor"}` : `Send a heart to ${person.name || "mentor"}`} aria-pressed={stats.likedByMe} aria-describedby={helpId} onClick={toggleLike}>
            <Heart size={20} weight={stats.likedByMe ? "fill" : "regular"} aria-hidden="true" />
            {busy ? "Saving…" : stats.likedByMe ? "Heart sent" : "Send a heart"}
          </button>
          <p id={helpId}>{stats.likedByMe ? "A little thank-you from you. Tap again to undo." : stats.canLike ? "Learned something together? Let them know." : "Join a study session as a peer to send a heart after it ends."}</p>
        </div>
      )}
      {!compact && <details className="mentor-stats-explainer"><summary><Info size={15} aria-hidden="true" />About hearts & experience</summary><p>Hearts are thank-yous from students who shared a past study session as peers. Each student can leave one heart per mentor and remove it anytime.</p><p>{days === null || days === undefined ? "The first mentorship session hasn’t started yet. " : "Days count from the first mentorship session’s scheduled start. "}Sessions count after their scheduled two-hour end. Attendance isn’t independently verified.</p></details>}
      {error && <p className="mentor-stats-error" role="alert">{error}</p>}
    </section>
  );
}

export default MentorStats;
