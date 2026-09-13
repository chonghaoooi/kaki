import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  House,
  CalendarBlank,
  Plus,
  User,
  ArrowLeft,
  ChatCircle,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  Heart,
} from "@phosphor-icons/react";
import { MobileScroll, useKeyboard, useKeyboardInsets } from "./mobile";
import { KakiContext, api, type Route, networkNames } from "./kaki-context";
import { Avatar, Button, IconButton, Busy } from "./ui";
import Onboarding from "./Onboarding";
import {
  ActivityBrowser,
  ActivityDetail,
  CreateActivity,
  Discover,
} from "./Activities";
import "@fontsource-variable/inter";
import "./prototype.css";
import "./event-map.css";
import "./study-role.css";
const CommunityScreens = lazy(() => import("./CommunityScreens"));
const Clubs = lazy(() => import("./Clubs"));
const EventsMap = lazy(() => import("./EventMap"));
const ActivityLocation = lazy(() => import("./EventMap").then((m) => ({ default: m.ActivityLocation })));
const StudyRole = lazy(() => import("./StudyRole"));
const Mentors = lazy(() => import("./Mentors"));
const Support = lazy(() => import("./Support"));
const SupportHelp = lazy(() => import("./SupportHelp"));
const Neighbourhood = lazy(() => import("./Neighbourhood"));
const PartnerEventDetail = lazy(() => import("./Neighbourhood").then(m => ({ default: m.PartnerEventDetail })));
const rootTabs = [
  { name: "discover", label: "Discover", icon: House },
  { name: "activities", label: "Activities", icon: CalendarBlank },
  { name: "create", label: "Create", icon: Plus },
  { name: "support", label: "Support", icon: Heart },
  { name: "profile", label: "Profile", icon: User },
];
const titles: Record<string, string> = {
  browse: "Find an activity",
  activity: "Your next plan",
  create: "Start something",
  category: "Explore activities",
  people: "Meet your people",
  connected: "A new connection",
  tutoring: "Peer tutoring",
  mentors: "Meet the mentors",
  "mentor-profile": "Mentor profile",
  support: "Support groups",
  "support-group": "Your support space",
  "support-chat": "Group conversation",
  "listening-ear": "Be a listening ear",
  "support-help": "Support when you need it",
  "partner-event": "Around your neighbourhood",
  circles: "Clubs & chats",
  circle: "Your club",
  clubs: "Clubs & chats",
  club: "Your club",
  "club-chat": "Club conversation",
  "plan-meetup": "Make a plan together",
  "event-map": "Explore the map",
  "activity-location": "Meeting spot",
  "study-role": "Your study role",
  events: "Upcoming events",
  messages: "Messages",
  chat: "Conversation",
  profile: "Your profile",
  "edit-profile": "Edit profile",
  journey: "My journey",
  privacy: "Privacy & safety",
  telegram: "Telegram",
  report: "Report a concern",
};
function readRoute(): Route {
  const [path, search = ""] = window.location.hash.replace(/^#\/?/, "").split("?");
  const [name, id] = path.split("/");
  return {
    name: name || "discover",
    id: id ? decodeURIComponent(id) : undefined,
    params: Object.fromEntries(new URLSearchParams(search)),
  };
}
function routeURL(route: Route) {
  const query = new URLSearchParams(Object.entries(route.params || {}).filter(([, value]) => value !== ""));
  return "#/" + route.name + (route.id ? "/" + encodeURIComponent(route.id) : "") + (query.size ? "?" + query : "");
}
export default function Prototype() {
  return <KakiApp />;
}
export function KakiApp({ desktop = false }: { desktop?: boolean }) {
  const keyboard = useKeyboard();
  const insets = useKeyboardInsets();
  const [data, setData] = useState<any>(null),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(""),
    [route, setRoute] = useState<Route>(readRoute),
    [discoverDestination, setDiscoverDestination] = useState(() => readRoute().name === "neighbourhood" ? "neighbourhood" : "discover"),
    [toastText, setToastText] = useState("");
  const historyKey = useRef(crypto.randomUUID());
  const historyDepth = useRef(0);
  useEffect(() => {
    window.history.replaceState({ kakiHistoryKey: historyKey.current, kakiHistoryDepth: 0 }, "", window.location.href);
  }, []);
  const setRouteParams = useCallback((patch: Record<string, string | undefined>) => {
    setRoute(current => {
      const params = { ...current.params };
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === "") delete params[key];
        else params[key] = value;
      }
      const next = { ...current, params };
      window.history.replaceState(window.history.state, "", routeURL(next));
      return next;
    });
  }, []);
  useEffect(() => { if (["discover", "neighbourhood"].includes(route.name)) setDiscoverDestination(route.name); }, [route.name]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useCallback((text: string) => {
    setToastText(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastText(""), 4600);
  }, []);
  const refresh = useCallback(async () => {
    try {
      const r = await api("/state");
      setData(r);
      setLoadError("");
    } catch (e) {
      if ((e as any).status === 401) {
        setData(null);
      } else {
        setLoadError((e as Error).message);
        throw e;
      }
    }
  }, []);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await refresh();
      } catch {
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [refresh]);
  useEffect(() => {
    const onHash = () => {
      setRoute(readRoute());
      keyboard.hide();
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [keyboard]);
  const go = useCallback(
    (name: string, id?: string, params?: Record<string, string>) => {
      keyboard.hide();
      historyDepth.current += 1;
      setRoute({ name, id, params });
      window.history.pushState(
        { kakiHistoryKey: historyKey.current, kakiHistoryDepth: historyDepth.current },
        "",
        routeURL({ name, id, params }),
      );
      if (desktop) window.scrollTo({ top: 0, behavior: "instant" });
    },
    [keyboard, route, desktop],
  );
  const back = useCallback(() => {
    keyboard.hide();
    if (historyDepth.current > 0) window.history.back();
    else {
      const prior = { name: "discover" };
      setRoute(prior);
      window.history.replaceState({ kakiHistoryKey: historyKey.current, kakiHistoryDepth: 0 }, "", routeURL(prior));
    }
  }, [keyboard]);
  useEffect(() => {
    const fn = () => {
      const state = window.history.state;
      historyDepth.current = state?.kakiHistoryKey === historyKey.current ? state.kakiHistoryDepth || 0 : 0;
      setRoute(readRoute());
      keyboard.hide();
    };
    window.addEventListener("popstate", fn);
    return () => window.removeEventListener("popstate", fn);
  }, [keyboard]);
  const value = useMemo(
    () => ({ data, user: data?.user, desktop, route, setRouteParams, refresh, go, back, toast, api }),
    [data, desktop, route, setRouteParams, refresh, go, back, toast],
  );
  const isMain = route.name === "neighbourhood" || rootTabs.some((t) => t.name === route.name);
  const discoverActive = ["discover", "neighbourhood"].includes(route.name);
  const supportActive = ["support", "support-group", "support-chat", "listening-ear", "support-help"].includes(route.name);
  const user = data?.user?.onboardingComplete === false ? null : data?.user;
  const page = loading ? (
    <div className="loading-page">
      <span className="wordmark">kaki</span>
      <Busy text="Finding your community…" />
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-card" />
    </div>
  ) : loadError && !user ? (
    <div className="loading-page">
      <span className="wordmark">kaki</span>
      <h2>Let’s get you connected.</h2>
      <p>{loadError}</p>
      <Button
        onClick={() => {
          setLoading(true);
          refresh()
            .catch(() => {})
            .finally(() => setLoading(false));
        }}
      >
        Try again
      </Button>
    </div>
  ) : !user ? (
    <Onboarding />
  ) : route.name === "discover" ? (
    <Discover />
  ) : route.name === "neighbourhood" ? (
    <Suspense fallback={<Busy />}><Neighbourhood /></Suspense>
  ) : route.name === "partner-event" ? (
    <Suspense fallback={<Busy />}><PartnerEventDetail key={route.id} id={route.id || ""} /></Suspense>
  ) : route.name === "activities" ? (
    <ActivityBrowser own initialTab={route.id} />
  ) : ["browse", "category", "events"].includes(route.name) ? (
    <ActivityBrowser category={route.id} />
  ) : route.name === "activity" ? (
    <ActivityDetail key={route.id} id={route.id || ""} />
  ) : route.name === "create" ? (
    <CreateActivity />
  ) : ["circles", "circle", "clubs", "club", "club-chat", "plan-meetup"].includes(route.name) ? (
    <Suspense fallback={<Busy />}><Clubs route={{ ...route, name: route.name === "circles" ? "clubs" : route.name === "circle" ? "club" : route.name }} /></Suspense>
  ) : route.name === "event-map" ? (
    <Suspense fallback={<Busy />}><EventsMap key={route.id} neighbourhood={route.id === "neighbourhood"} /></Suspense>
  ) : route.name === "activity-location" ? (
    <Suspense fallback={<Busy />}><ActivityLocation key={route.id} id={route.id || ""} /></Suspense>
  ) : route.name === "study-role" ? (
    <Suspense fallback={<Busy />}><StudyRole key={route.id} id={route.id || ""} /></Suspense>
  ) : ["mentors", "mentor-profile"].includes(route.name) ? (
    <Suspense fallback={<Busy />}><Mentors route={route} /></Suspense>
  ) : route.name === "support-help" ? (
    <Suspense fallback={<Busy />}><SupportHelp /></Suspense>
  ) : supportActive ? (
    <Suspense fallback={<Busy />}><Support key={route.name + (route.id || "")} route={route} /></Suspense>
  ) : (
    <Suspense fallback={<Busy />}>
      <CommunityScreens route={route} />
    </Suspense>
  );
  return (
    <KakiContext.Provider value={value}>
      <div
        className={`kaki-app ${desktop ? "desktop-app" : "mobile-app"} ${!user ? "signed-out" : ""} ${route.name === "club-chat" ? "club-chat-active" : ""}`}
      >
        {desktop && user && (
          <header className="desktop-nav">
            <button className="wordmark" onClick={() => go(discoverDestination)}>
              kaki
            </button>
            <nav aria-label="Main navigation">
              {[
                { name: "discover", label: "Discover" },
                { name: "activities", label: "Activities" },
                { name: "support", label: "Support" },
                { name: "clubs", label: "Clubs" },
                { name: "mentors", label: "Mentors" },
              ].map((n) => (
                <button
                  className={route.name === n.name || (n.name === "discover" && discoverActive) || (n.name === "support" && supportActive) || (n.name === "mentors" && ["mentor-profile", "tutoring"].includes(route.name)) ? "active" : ""}
                  key={n.name}
                  onClick={() => go(n.name === "discover" ? discoverDestination : n.name)}
                >
                  {n.label}
                </button>
              ))}
            </nav>
            <div className="desktop-nav-right">
              <IconButton label="Messages" onClick={() => go("messages")}>
                <ChatCircle size={24} />
              </IconButton>
              <Button variant="secondary" onClick={() => go("create")}>
                <Plus size={16} />
                Create
              </Button>
              <button
                className="profile-link"
                aria-label="Your profile"
                onClick={() => go("profile")}
              >
                <Avatar person={user} size={37} />
              </button>
            </div>
          </header>
        )}
        {!desktop && user && !isMain && (
          <header className="mobile-toolbar">
            <IconButton label="Go back" onClick={back}>
              <ArrowLeft size={22} />
            </IconButton>
            <strong>{titles[route.name] || "kaki"}</strong>
            <IconButton label="Messages" onClick={() => go("messages")}>
              <ChatCircle size={22} />
            </IconButton>
          </header>
        )}
        {desktop ? (
          <main
            className={`desktop-main ${route.name === "discover" ? "with-aside" : ""}`}
          >
            {!isMain && user && (
              <button className="desktop-back text-link" onClick={back}>
                <ArrowLeft size={17} />
                Back
              </button>
            )}
            <div className="desktop-page">{page}</div>
            {user && route.name === "discover" && (
              <aside className="community-aside">
                <div className="card aside-campus">
                  <ShieldCheck size={30} weight="duotone" />
                  <span className="eyebrow">YOUR COMMUNITY</span>
                  <h3>{user.institution}</h3>
                  <p>
                    Different interests.
                    <br />
                    Same student spirit.
                  </p>
                  <div className="aside-network">
                    <CheckCircle size={16} weight="fill" />
                    {networkNames[user.network]}
                  </div>
                </div>
                <div className="card aside-invitation">
                  <img
                    src="/assets/kaki/photography.webp"
                    alt="Students on a campus photography walk"
                  />
                  <div>
                    <span className="eyebrow">TRY SOMETHING NEW</span>
                    <h3>Take the scenic route.</h3>
                    <p>Find a club that gets your curiosity.</p>
                    <Button variant="secondary" onClick={() => go("circles")}>
                      Explore clubs
                      <ArrowRight size={16} />
                    </Button>
                  </div>
                </div>
                <button className="aside-journey" onClick={() => go("journey")}>
                  <span>
                    Little moments,
                    <br />
                    <strong>your own journey.</strong>
                  </span>
                  <ArrowRight size={22} />
                </button>
              </aside>
            )}
          </main>
        ) : (
          <MobileScroll
            key={route.name + route.id + !!user}
            className={`kaki-scroll ${user && !isMain ? "has-toolbar" : ""}`}
          >
            <main className="kaki-page">{page}</main>
          </MobileScroll>
        )}
        {user && route.name === "club-chat" && <div id="club-composer-slot" style={!desktop ? { bottom: insets.isKeyboardVisible ? insets.bottomInset : insets.bottomInset + 72 } : undefined} />}
        {user && !desktop && !insets.isKeyboardVisible && (
          <nav
            className="bottom-nav"
            aria-label="Main navigation"
            style={{ paddingBottom: insets.bottomInset }}
          >
            {rootTabs.map((t) => (
              <button
                key={t.name}
                className={`${route.name === t.name || (t.name === "discover" && discoverActive) || (t.name === "support" && supportActive) ? "active" : ""} ${t.name === "create" ? "create-tab" : ""}`}
                onClick={() => go(t.name === "discover" ? discoverDestination : t.name)}
              >
                <span>
                  <t.icon
                    size={t.name === "create" ? 26 : 24}
                    weight={route.name === t.name || (t.name === "discover" && discoverActive) || (t.name === "support" && supportActive) ? "fill" : "regular"}
                  />
                </span>
                <small>{t.label}</small>
              </button>
            ))}
          </nav>
        )}
        {desktop && (
          <footer className="desktop-footer">
            <span>kaki · Find your people. Do your thing.</span>
            <div>
              <a href="/">Mobile preview</a>
              {user && (
                <button onClick={() => go("privacy")}>Privacy & safety</button>
              )}
              <span>
                {data?.meta?.demoMode
                  ? "Local demo · Sample community"
                  : "Student community"}
              </span>
            </div>
          </footer>
        )}
        {toastText && (
          <div
            className="kaki-toast"
            role="status"
            style={!desktop ? { bottom: insets.bottomInset + 75 } : undefined}
          >
            <CheckCircle size={20} weight="fill" />
            <span>{toastText}</span>
            <button
              aria-label="Dismiss notification"
              onClick={() => setToastText("")}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </KakiContext.Provider>
  );
}
