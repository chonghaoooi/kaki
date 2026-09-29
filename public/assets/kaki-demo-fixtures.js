// Public Vercel showcase only. All people, plans and conversations here are fictional.
const STORE = "kaki-public-campus-v1";
const CAMPUS = "Northstar Campus";
const people = {
  "polytechnic-p1": { name: "Mateo Rivera", avatar: "/assets/kaki/demo-avatar-mateo.webp", course: "Digital Media" },
  "polytechnic-p2": { name: "Ava Brooks", avatar: "/assets/kaki/demo-avatar-ava.webp", course: "Computer Science" },
  "polytechnic-p3": { name: "Priya Shah", avatar: "/assets/kaki/demo-avatar-priya.webp", course: "Visual Communication" },
  "polytechnic-p4": { name: "Leo Park", avatar: "/assets/kaki/demo-avatar-leo.webp", course: "Engineering" },
  "polytechnic-p5": { name: "Amira Hassan", avatar: "/assets/kaki/avatar-5.webp", course: "Psychology" },
  "polytechnic-p6": { name: "Noah Williams", avatar: "/assets/kaki/avatar-6.webp", course: "Product Design" },
  "polytechnic-p7": { name: "Sofia Chen", avatar: "/assets/kaki/avatar-2.webp", course: "Photography" },
};
const schoolNames = [
  ["Singapore Polytechnic", CAMPUS], ["Ngee Ann Polytechnic", "Westbridge Campus"],
  ["Temasek Polytechnic", "Seabrook Campus"], ["Nanyang Polytechnic", "Maple Campus"],
  ["Republic Polytechnic", "Harbour Campus"],
];
const personNames = [
  ["Jia Wei Lim", "Mateo Rivera"], ["Alicia Tan", "Ava Brooks"],
  ["Nur Aisyah", "Priya Shah"], ["Ryan Koh", "Leo Park"],
  ["Priya Nair", "Amira Hassan"], ["Marcus Lee", "Noah Williams"],
  ["Sofia Wong", "Sofia Chen"],
];
const themes = [
  ["study", "Drop-in coding lab", "Bring one bug or question. Ava and the group will help you find your next step.", "demo-coding", "Ava", "Library studio", "15:00", ["Coding", "Peer support"]],
  ["study", "Quiet focus, shared table", "A calm hour to make progress on whatever is due next. No pressure to talk.", "global-study", "Leo", "Library studio", "10:30", ["Quiet study", "Come solo"]],
  ["study", "Design critique, kindly", "Share a work in progress and get specific, constructive feedback.", "demo-mentor", "Priya", "Creative commons", "16:00", ["Design", "Mentor welcome"]],
  ["sports", "Sunset campus walk", "An easy loop and fresh air after class. All paces are welcome.", "global-outdoors", "Amira", "Garden gate", "17:30", ["Easy pace", "Outdoors"]],
  ["sports", "Beginner badminton doubles", "We will rotate partners so everyone gets a game. Spare rackets available.", "global-sports", "Leo", "Activity hall", "16:30", ["Beginner friendly", "Badminton"]],
  ["games", "One more board game night", "Short games, simple rules and enough seats for new faces.", "global-games", "Mateo", "Student commons", "18:00", ["Board games", "Come solo"]],
  ["games", "Co-op game afternoon", "Team up for a low-stakes gaming break, in person at the commons.", "games", "Noah", "Student commons", "14:00", ["Co-op", "All levels"]],
  ["lunch", "The open lunch table", "There is always room for one more. Bring or buy your own lunch.", "global-lunch", "Priya", "Garden café", "12:30", ["Lunch", "New friends"]],
  ["lunch", "Coffee between classes", "A 30-minute reset with people who are also finding their way around campus.", "lunch", "Mateo", "Garden café", "11:30", ["Coffee", "Quick meetup"]],
  ["interests", "Make something with your hands", "A relaxed collage and sketching table. Materials are provided in this fictional demo.", "demo-art", "Priya", "Creative commons", "16:00", ["Art", "Beginners welcome"]],
  ["interests", "Unplugged music circle", "Bring an instrument or just listen. There is space for every level.", "demo-music", "Sofia", "Music studio", "17:00", ["Music", "Jam"]],
  ["interests", "Photo walk: small details", "Explore campus through a new lens. Your phone camera is enough.", "global-creative", "Sofia", "Garden gate", "16:30", ["Photography", "Walking"]],
  ["events", "Campus ideas night", "Meet the people building small projects and interest clubs.", "demo-coding", "Noah", "Student commons", "18:00", ["Projects", "Community"]],
  ["events", "Find your next study crew", "Try mini study circles and leave with a plan for next week.", "demo-mentor", "Ava", "Library studio", "17:00", ["Study circle", "Meet people"]],
  ["events", "Creative showcase social", "See student art and music, then stay for a conversation.", "demo-art", "Sofia", "Creative commons", "18:30", ["Creative", "Social"]],
];
const messageSets = {
  "polytechnic-p1": ["Hey Jamie, are you going to board game night?", "I was thinking about it! Is it okay to come solo?", "Definitely. I’ll save you a seat near the front table."],
  "polytechnic-p2": ["I saw your question about the coding lab. Bring whatever you have so far.", "That helps, thanks. I’m stuck on one part of the project.", "Perfect. We can work through it together at the library studio."],
  "polytechnic-p3": ["The collage table was fun last week. Want to come again?", "Yes! I liked how relaxed it was.", "Same. I’ll bring a few extra magazines for the group."],
  "polytechnic-p4": ["Morning! I’m joining the campus walk after class.", "Nice, I could use some fresh air.", "See you at the garden gate at 5:30 🌿"],
  "polytechnic-p5": ["Thanks for listening after the welcome mixer.", "Of course. It was good to talk.", "There’s a low-pressure lunch table tomorrow if you’d like company."],
  "polytechnic-p6": ["Hey, your idea for a weekly maker club sounded great.", "Thanks! I’m hoping to get a small group together.", "Count me in. I can help plan the first meetup."],
};

function readStore() { try { return JSON.parse(localStorage.getItem(STORE) || "{}"); } catch { return {}; } }
function writeStore(value) { localStorage.setItem(STORE, JSON.stringify(value)); }
export function resetFixtures() { localStorage.removeItem(STORE); }
function day(offset) { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function stamp(offset) { const d = new Date(); d.setMinutes(d.getMinutes() - offset); return d.toISOString(); }
function replaceLabels(value) {
  if (typeof value === "string") {
    for (const [before, after] of [...schoolNames, ...personNames]) value = value.replaceAll(before, after);
    return value;
  }
  if (Array.isArray(value)) return value.map(replaceLabels);
  if (!value || typeof value !== "object") return value;
  const result = Object.fromEntries(Object.entries(value).map(([key, val]) => [key, replaceLabels(val)]));
  if (result.institutionId === "sp" || result.id === "sp") {
    if (result.institution) result.institution = CAMPUS;
    if (result.name && result.id === "sp") result.name = CAMPUS;
    if (result.institutionLabel) result.institutionLabel = CAMPUS;
  }
  if (people[result.id]) Object.assign(result, people[result.id]);
  if (result.avatar?.startsWith("/assets/kaki/avatar-") && people[result.personId]) result.avatar = people[result.personId].avatar;
  if (result.locationDetails?.address) {
    result.locationDetails.address = "Illustrative campus location · fictional demo";
    result.locationDetails.postalCode = null;
    result.locationDetails.locationNote = "This campus and its map pins are fictional. Do not use them for directions.";
  }
  if (result.category && result.locationDetails && result.institutionLabel && !result.demoFixture) {
    const venue = /walk|trail|hike|jog|run/i.test(result.title || "") ? "Garden gate" : ({ study: "Library studio", sports: "Activity hall", games: "Student commons", lunch: "Garden café", interests: "Creative commons", events: "Student commons", workshop: "Creative commons" })[result.category] || "Community hub";
    result.location = `${result.institutionLabel} · ${venue}`;
    result.locationDetails.name = result.location;
    result.locationDetails.venueName = result.location;
  }
  if (result.need && result.leaderType && result.mode === "in-person") result.location = `${CAMPUS} · Student commons (illustrative)`;
  return result;
}
function fixtureActivities(state) {
  const saved = readStore();
  const byName = Object.fromEntries((state.people || []).map(p => [p.name.split(" ")[0], p]));
  const fallback = state.people?.[0] || state.user;
  return themes.map(([category,title,description,photo,hostName,venue,time,tags], index) => {
    const id = `northstar-demo-${String(index+1).padStart(2,"0")}`;
    const host = byName[hostName] || fallback;
    const others = (state.people || []).filter(p => p.id !== state.user.id && p.id !== host.id).slice(index % 4, index % 4 + 3);
    const participants = [host.id, ...others.map(p => p.id)];
    const change = saved.activities?.[id] || {};
    if (change.joined) participants.push(state.user.id);
    const roles = category === "study" ? Object.fromEntries(participants.map((p,i) => [p, i === 0 ? "mentor" : "peer"])) : {};
    if (change.joined && category === "study") roles[state.user.id] = change.role || "peer";
    return { id, network: "polytechnic", institutionId: "sp", institutionLabel: CAMPUS,
      category, title, description: `${description} Fictional event for the public kaki demo.`,
      date: day(1 + (index * 3) % 14), time, location: `${CAMPUS} · ${venue}`, locationId: `sp-${venue.toLowerCase().replaceAll(" ", "-")}`,
      locationDetails: { id: `demo-${index}`, name: venue, venueName: `${CAMPUS} · ${venue}`, address: "Illustrative campus location · fictional demo", precision: "campus", locationNote: "This is a fictional campus; no real venue or directions are provided." },
      capacity: index % 3 === 0 ? 12 : 8, participants, participantCount: participants.length,
      participantRoles: roles, roleCounts: { peer: Object.values(roles).filter(r => r === "peer").length, mentor: Object.values(roles).filter(r => r === "mentor").length },
      myRole: roles[state.user.id] || null, joined: !!change.joined, saved: !!change.saved,
      hostId: host.id, host, image: `/assets/kaki/${photo}.webp`, demoVisual: true,
      demoSample: true, demoFixture: true, neighbourhoodOptIn: index % 4 === 0,
      tags: [...tags, "Demo sample"], experience: "Everyone welcome", subject: category === "study" ? "Study support" : "",
      createdAt: stamp(1440 * (2 + index)),
    };
  });
}
function fixtureMessages(personId, userId) {
  const lines = messageSets[personId] || [];
  const scripted = lines.map((text,i) => ({ id: `demo-dm-${personId}-${i}`, personId, senderId: i === 1 ? userId : personId, text, createdAt: stamp((lines.length - i) * 60 + Object.keys(messageSets).indexOf(personId) * 40), read: i !== 2 }));
  return [...scripted, ...(readStore().messages?.[personId] || [])];
}
export function decorate(path, method, payload) {
  const data = replaceLabels(payload);
  if (method !== "GET" || !data || typeof data !== "object") return data;
  if (path === "/api/state" && data.user?.network === "polytechnic") {
    const state = { ...data, meta: { ...data.meta, publicDemo: true, fictionalCampus: CAMPUS, institutionSource: "Fictional public demo" } };
    state.activities = [...fixtureActivities(state), ...(state.activities || []).map(a => ({ ...a, demoVisual: true, image: photoFor(a) }))];
    const demoConversations = Object.keys(messageSets).map(personId => {
      const person = state.people.find(p => p.id === personId);
      if (!person) return null;
      const messages = fixtureMessages(personId, state.user.id);
      return { personId, person, mutual: true, lastMessage: messages.at(-1), unreadCount: readStore().read?.[personId] ? 0 : 1 };
    }).filter(Boolean);
    state.conversations = [...demoConversations, ...(state.conversations || []).filter(c => !messageSets[c.personId])];
    state.user.savedActivityIds = [...new Set([...(state.user.savedActivityIds || []), ...Object.entries(readStore().activities || {}).filter(([,v]) => v.saved).map(([id]) => id)])];
    return state;
  }
  if (path === "/api/neighbourhood/events" && Array.isArray(data.activities)) data.activities = data.activities.map(a => ({ ...a, demoVisual: true, image: photoFor(a) }));
  if (path.startsWith("/api/activities/") && data.activity) data.activity = { ...data.activity, demoVisual: true, image: photoFor(data.activity) };
  return data;
}
function photoFor(activity) {
  const title = `${activity.title || ""} ${(activity.tags || []).join(" ")}`;
  if (/cod(e|ing)|tech|app|web|hack/i.test(title)) return "/assets/kaki/demo-coding.webp";
  if (/music|jam|sing|guitar/i.test(title)) return "/assets/kaki/demo-music.webp";
  if (/art|craft|draw|sketch|collage|design/i.test(title)) return "/assets/kaki/demo-art.webp";
  if (/mentor|peer|study|learn/i.test(title)) return "/assets/kaki/demo-mentor.webp";
  if (/walk|trail|hike|outdoor|jog|run/i.test(title)) return "/assets/kaki/global-outdoors.webp";
  if (/badminton|sport|football/i.test(title)) return "/assets/kaki/global-sports.webp";
  if (/board|games|chess|puzzle/i.test(title)) return "/assets/kaki/global-games.webp";
  if (/lunch|coffee|cafe|food/i.test(title)) return "/assets/kaki/global-lunch.webp";
  if (/photo|camera/i.test(title)) return "/assets/kaki/global-creative.webp";
  return activity.image;
}
export function fixtureRequest(path, method, body, state) {
  if (!state?.user || state.user.network !== "polytechnic") return null;
  const match = path.match(/^\/api\/activities\/(northstar-demo-\d+)(?:\/(join|leave|save))?$/);
  if (match) {
    const activity = fixtureActivities(state).find(a => a.id === match[1]);
    if (!activity) return { status: 404, body: { error: "Activity not found" } };
    if (method === "GET" && !match[2]) return { status: 200, body: { activity, members: activity.participants.map(id => [state.user, ...(state.people || [])].find(p => p.id === id)).filter(Boolean) } };
    if (method === "POST" && match[2]) {
      const saved = readStore(); saved.activities ||= {};
      const change = saved.activities[match[1]] ||= {};
      const action = match[2];
      if (action === "join") {
        if (!change.joined && activity.participantCount >= activity.capacity) return { status: 409, body: { error: "This activity is full." } };
        const role = body?.role || "peer";
        if (activity.category === "study" && !["peer", "mentor"].includes(role)) return { status: 400, body: { error: "Choose peer or mentor." } };
        change.joined = true; change.role = activity.category === "study" ? role : null;
      } else if (action === "leave") { change.joined = false; change.role = null; }
      else change.saved = !change.saved;
      writeStore(saved);
      return { status: 200, body: { ok: true, activity: fixtureActivities(state).find(a => a.id === match[1]) } };
    }
  }
  const dm = path.match(/^\/api\/messages\/(polytechnic-p[1-6])$/);
  if (dm && messageSets[dm[1]]) {
    const personId = dm[1], person = state.people.find(p => p.id === personId);
    if (!person) return { status: 404, body: { error: "Conversation unavailable" } };
    if (method === "GET") { const saved = readStore(); saved.read ||= {}; saved.read[personId] = true; writeStore(saved); return { status: 200, body: { person, messages: fixtureMessages(personId, state.user.id) } }; }
    if (method === "POST") {
      const text = String(body?.text || "").trim();
      if (!text || text.length > 2000) return { status: 400, body: { error: "Write a message of up to 2000 characters." } };
      const message = { id: `demo-reply-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, personId, senderId: state.user.id, text, createdAt: new Date().toISOString(), read: false };
      const saved = readStore(); saved.messages ||= {}; (saved.messages[personId] ||= []).push(message); writeStore(saved);
      return { status: 201, body: { ok: true, message } };
    }
  }
  return null;
}
