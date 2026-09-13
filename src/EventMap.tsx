import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import { ArrowRight, ArrowUpRight, CalendarBlank, ListBullets, MapPin, MagnifyingGlass, NavigationArrow, X } from "@phosphor-icons/react";
import { useKaki, networkNames } from "./kaki-context";
import { Button, Busy, Empty, Input, PageHeading, Badge, ErrorText, IconButton } from "./ui";
import { Carousel } from "./mobile";
import { categories, dateLabel, displayTime, imageFor } from "./Activities";
import { getVisiblePartnerEvents, matchesPartnerSearch } from "./partner-events";
import { compareActivities, isDiscoverableActivity, matchesActivitySearch } from "./discovery-model";
import { useDiscoveryClock } from "./use-discovery-clock";
import "leaflet/dist/leaflet.css";
import "./event-map.css";

export type MapLocation = { id: string; name: string; lat?: number | null; lng?: number | null; image?: string; count?: number };
const hasPoint = (l: MapLocation) => typeof l.lat === "number" && Number.isFinite(l.lat) && typeof l.lng === "number" && Number.isFinite(l.lng);
export function VenueMap({ locations, selectedId, onSelect, height = 300, interactive = true }: {
  locations: MapLocation[]; selectedId?: string; onSelect?: (id: string) => void; height?: number; interactive?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null), map = useRef<LeafletMap | null>(null), layer = useRef<LayerGroup | null>(null);
  const fitted = useRef("");
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false);
  const pointsKey = JSON.stringify(locations.filter(hasPoint));
  useEffect(() => {
    let disposed = false;
    setReady(false); fitted.current = "";
    let observer: ResizeObserver | undefined;
    import("leaflet").then((L) => {
      if (disposed || !container.current) return;
      const m = L.map(container.current, { zoomControl: interactive, attributionControl: true, scrollWheelZoom: false, dragging: interactive, touchZoom: interactive, doubleClickZoom: interactive, boxZoom: false, keyboard: interactive, minZoom: 11, maxZoom: 19 }).setView([1.32, 103.82], 12);
      map.current = m;
      m.attributionControl.setPrefix(false);
      let loaded = false;
      L.tileLayer("https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png", {
        minZoom: 11, maxZoom: 19,
        attribution: '<img class="onemap-credit-logo" src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" alt="" /> <a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a> © contributors | <a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">Singapore Land Authority</a>',
      }).on("tileload", () => { loaded = true; if (!disposed) setFailed(false); }).on("tileerror", () => { if (!loaded && !disposed) setFailed(true); }).addTo(m);
      layer.current = L.layerGroup().addTo(m);
      observer = new ResizeObserver(() => m.invalidateSize({ pan: false }));
      observer.observe(container.current);
      setReady(true);
    }).catch(() => { if (!disposed) setFailed(true); });
    return () => { disposed = true; observer?.disconnect(); map.current?.remove(); map.current = null; layer.current = null; };
  }, [interactive]);
  useEffect(() => {
    if (!ready || !map.current || !layer.current) return;
    let disposed = false;
    let clearZoomListener: (() => void) | undefined;
    import("leaflet").then((L) => {
      if (disposed || !map.current || !layer.current) return;
      const points: MapLocation[] = JSON.parse(pointsKey);
      const currentMap = map.current;
      const currentLayer = layer.current;
      if (points.length && fitted.current !== pointsKey) { currentMap.fitBounds(L.latLngBounds(points.map((p) => [p.lat!, p.lng!])), { paddingTopLeft: [48, 66], paddingBottomRight: [48, 48], maxZoom: points.length === 1 ? 16 : 17, animate: false }); fitted.current = pointsKey; }
      const drawMarkers = () => {
        if (disposed) return;
        currentLayer.clearLayers();
        const groups: { points: MapLocation[]; center: { x: number; y: number } }[] = [];
        // Group nearby markers at the current zoom; the location data itself is unchanged.
        const canCluster = interactive && currentMap.getZoom() < 19;
        points.forEach(point => {
          const pixel = currentMap.latLngToContainerPoint([point.lat!, point.lng!]);
          const group = canCluster ? groups.find(g => Math.hypot(g.center.x - pixel.x, g.center.y - pixel.y) <= 48) : undefined;
          if (group) {
            const count = group.points.length;
            group.center = { x: (group.center.x * count + pixel.x) / (count + 1), y: (group.center.y * count + pixel.y) / (count + 1) };
            group.points.push(point);
          } else groups.push({ points: [point], center: pixel });
        });
        groups.forEach(group => {
          if (group.points.length > 1) {
            const count = group.points.reduce((sum, point) => sum + (point.count || 1), 0);
            const containsActivities = group.points.some(point => point.count !== undefined);
            const label = `${group.points.length} public locations${containsActivities ? ` · ${count} activities` : ""}. Zoom in to explore.`;
            const center: [number, number] = [group.points.reduce((sum, point) => sum + point.lat!, 0) / group.points.length, group.points.reduce((sum, point) => sum + point.lng!, 0) / group.points.length];
            const face = document.createElement("div");
            face.className = `kaki-map-cluster ${group.points.some(point => point.id === selectedId) ? "selected" : ""}`;
            face.textContent = String(count);
            const marker = L.marker(center, { title: label, keyboard: true, icon: L.divIcon({ html: face, className: "kaki-cluster-marker", iconSize: [48, 48], iconAnchor: [24, 24] }) })
              .on("click", () => currentMap.fitBounds(L.latLngBounds(group.points.map(point => [point.lat!, point.lng!])), { padding: [48, 48], maxZoom: Math.min(19, currentMap.getZoom() + 2), animate: false }))
              .addTo(currentLayer);
            marker.getElement()?.setAttribute("aria-label", label);
            return;
          }
          const p = group.points[0];
          const face = document.createElement("div");
          face.className = `kaki-map-pin ${p.id === selectedId ? "selected" : ""}`;
          if (p.image) { const img = document.createElement("img"); img.src = p.image; img.alt = ""; face.appendChild(img); }
          else { const dot = document.createElement("span"); dot.textContent = "●"; face.appendChild(dot); }
          if (p.count && p.count > 1) { const count = document.createElement("b"); count.textContent = String(p.count); face.appendChild(count); }
          const marker = L.marker([p.lat!, p.lng!], { title: p.name, alt: p.name, keyboard: interactive, icon: L.divIcon({ html: face, className: "kaki-marker", iconSize: [48, 54], iconAnchor: [24, 54] }) })
            .on("click", () => onSelectRef.current?.(p.id)).addTo(currentLayer);
          marker.getElement()?.setAttribute("aria-label", `${p.name}${p.count ? ` · ${p.count} ${p.count === 1 ? "activity" : "activities"}` : ""}`);
        });
      };
      drawMarkers();
      if (interactive) {
        currentMap.on("zoomend", drawMarkers);
        clearZoomListener = () => currentMap.off("zoomend", drawMarkers);
      }
    });
    return () => { disposed = true; clearZoomListener?.(); };
  }, [ready, pointsKey, selectedId, interactive]);
  return <div className="venue-map" style={{ height }} data-scroll-drag={interactive ? "ignore" : undefined}>
    <div ref={container} className="venue-map-canvas" role="region" aria-label="Map of public meeting places" />
    {!ready && !failed && <div className="map-loading"><Busy text="Finding the meeting spots…" /></div>}
    {failed && <div className="map-fallback" role="status">Map tiles are unavailable. You can still choose a place from the list below.</div>}
  </div>;
}

export default function EventsMap({ neighbourhood = false }: { neighbourhood?: boolean }) {
  const { data, go, user, desktop, api, route, setRouteParams } = useKaki();
  const category = route.params?.category || "all", source = route.params?.source || "all", query = route.params?.q || "";
  const setCategory = (value: string) => setRouteParams({category: value === "all" ? undefined : value});
  const setSource = (value: string) => setRouteParams({source: value === "all" ? undefined : value});
  const setQuery = (value: string) => setRouteParams({q: value});
  const [selectedId, setSelectedId] = useState<string>();
  const [nearby, setNearby] = useState<any[]>([]), [loading, setLoading] = useState(neighbourhood), [error, setError] = useState(""), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!neighbourhood) return;
    let live = true; setLoading(true); setError("");
    api('/neighbourhood/events').then(r => { if (live) setNearby(r.activities || []); }).catch(e => { if (live) setError(e.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [api, neighbourhood, attempt, user.id, data.activities]);
  const referenceTime = useDiscoveryClock();
  const search = query.trim().toLowerCase();
  const activities = (neighbourhood ? nearby : data.activities || []).filter((a: any) => isDiscoverableActivity(a, referenceTime) && (neighbourhood || a.institutionId === user.institutionId) && (source === "all" || source === "schools") && (category === "all" || a.category === category) && matchesActivitySearch(a, search));
  const partners = neighbourhood ? getVisiblePartnerEvents(referenceTime).filter(e => (source === "all" || source === e.source) && (category === "all" || category === e.category) && matchesPartnerSearch(e, search)) : [];
  const events: any[] = [
    ...activities,
    ...partners.map(event => ({ ...event, partner: true, date: event.startsAt.slice(0,10), time: event.startsAt.slice(11,16), locationDetails: event.locationDetails ? { ...event.locationDetails, venueName: event.location } : null })),
  ].sort(compareActivities);
  const locations = useMemo(() => {
    const groups = new Map<string, MapLocation>();
    for (const event of events) {
      const location = event.locationDetails;
      if (!location || !hasPoint(location)) continue;
      const id = `${location.lat},${location.lng}`;
      const existing = groups.get(id);
      if (existing) existing.count = (existing.count || 1) + 1;
      else groups.set(id, { ...location, id, name: location.venueName || location.name || event.location, image: event.partner ? undefined : imageFor(event), count: 1 });
    }
    return [...groups.values()];
  }, [events]);
  const selection = locations.find(l => l.id === selectedId);
  const shown = selection ? events.filter(event => `${event.locationDetails?.lat},${event.locationDetails?.lng}` === selection.id) : events;
  const unmapped = events.filter(event => !event.locationDetails || !hasPoint(event.locationDetails)).length;
  const openEvent = (event: any) => go(event.partner ? "partner-event" : "activity", event.id);
  return <div className="event-map-page">
    <PageHeading eyebrow={neighbourhood ? "YOUR NEIGHBOURHOOD" : networkNames[user.network]} title="Good plans, all around." subtitle={neighbourhood ? "Student meetups, culture and new possibilities." : "Find a little adventure on your campus."} />
    <div className="map-search-row"><div className="search-bar"><MagnifyingGlass size={21} /><Input aria-label="Search the event map" placeholder="Activity, school or place" value={query} onChange={e => { setQuery(e.target.value); setSelectedId(undefined); }} />{query && <IconButton label="Clear map search" onClick={() => { setQuery(""); setSelectedId(undefined); }}><X size={18}/></IconButton>}</div><Button variant="secondary" onClick={() => go(neighbourhood ? "neighbourhood" : "browse", undefined, {q: query, category, ...(neighbourhood ? {source} : {})})}><ListBullets size={20} /> List</Button></div>
    {neighbourhood && <Carousel className="map-filters map-source-filters" ariaLabel="Map event sources">{[{id:"all",label:"All sources"},{id:"schools",label:"Student plans"},{id:"mccy",label:"MCCY & partners"},{id:"nyc",label:"NYC"}].map(item => <button key={item.id} className={`chip ${source === item.id ? "active" : ""}`} aria-pressed={source === item.id} onClick={() => { setSource(item.id); setSelectedId(undefined); }}>{item.label}</button>)}</Carousel>}
    <Carousel className="map-filters" ariaLabel="Event categories">{[{ id: "all", label: "All plans" }, ...categories.filter(c => !["people", "tutoring"].includes(c.id))].map(item => <button key={item.id} className={`chip ${category === item.id ? "active" : ""}`} aria-pressed={category === item.id} onClick={() => { setCategory(item.id); setSelectedId(undefined); }}>{item.label}</button>)}</Carousel>
    {loading && <Busy text="Finding shared events…" />}
    {error && <div><ErrorText>{error}</ErrorText><Button variant="secondary" onClick={() => setAttempt(a => a + 1)}>Try again</Button></div>}
    <VenueMap locations={locations} selectedId={selectedId} onSelect={setSelectedId} height={desktop ? 430 : 315} />
    <p className="map-coverage">{events.length - unmapped} mapped {events.length - unmapped === 1 ? "plan" : "plans"} · {locations.length} public {locations.length === 1 ? "location" : "locations"}{unmapped > 0 ? ` · ${unmapped} address-only listings` : ""}</p>
    {neighbourhood && data.meta?.demoMode && (source === "all" || source === "schools") && <p className="map-demo-note">Student meetups are fictional demo plans at real public venues. Official programmes link to their organisers.</p>}
    <div className="map-results-heading"><div><span className="eyebrow">{selection ? "AT THIS SPOT" : "PICK YOUR NEXT PLAN"}</span><h2>{selection ? selection.name : `${events.length} ${events.length === 1 ? "plan" : "plans"} to explore`}</h2></div>{selection && <Button variant="ghost" onClick={() => setSelectedId(undefined)}>Show all</Button>}</div>
    <div className="map-event-list">{shown.map(event => <article key={event.id} className="map-event-card">
      <button className={`map-event-image ${event.partner ? "map-official-image" : ""}`} aria-label={`View ${event.title}`} onClick={() => openEvent(event)}>{event.partner ? <span><CalendarBlank size={28} weight="duotone"/><small>{event.source === "mccy" ? "MCCY" : "NYC"}</small></span> : <img src={imageFor(event)} alt="" loading="lazy" />}</button>
      <div><span className="map-event-date"><CalendarBlank size={14} /> {event.scheduleLabel || `${dateLabel(event)} · ${displayTime(event.time)}`}</span><button className="title-button" onClick={() => openEvent(event)}><h3>{event.title}</h3></button><button className="location-link" onClick={() => go(event.partner ? "partner-event" : "activity-location", event.id)}><MapPin size={15} /><span>{event.locationDetails?.venueName || event.location}</span><ArrowUpRight size={14} /></button><small className="muted">{event.partner ? `${event.sourceName} · Check eligibility` : `${event.participantCount ?? event.participants?.length ?? 0} / ${event.capacity} joined${event.category === "study" ? " · Peer & mentor spots" : ""}${event.demoSample ? " · Demo" : ""}`}</small></div>
      <button className="map-card-arrow" aria-label={`Open ${event.title}`} onClick={() => openEvent(event)}><ArrowRight size={19} /></button>
    </article>)}</div>
    {!shown.length && !loading && !error && <Empty title="No plans in this view yet." text="Try another source or category, or clear your search." action={<Button onClick={() => { setQuery(""); setCategory("all"); setSource("all"); setSelectedId(undefined); }}>Show all plans</Button>} />}
    {unmapped > 0 && !selection && <p className="map-note">{unmapped} {unmapped === 1 ? "listing has" : "listings have"} an address but no verified pin yet. Open the event for the organiser’s location and directions.</p>}
  </div>;
}


export function ActivityLocation({ id }: { id: string }) {
  const { data, api, go, desktop } = useKaki();
  const [activity, setActivity] = useState<any>(() => (data.activities || []).find((a: any) => a.id === id));
  const [error, setError] = useState("");
  useEffect(() => { let live = true; api(`/activities/${id}`).then((r) => { if (live) setActivity(r.activity || r); }).catch((e) => { if (live) setError(e.message); }); return () => { live = false; }; }, [api, id]);
  if (!activity) return error ? <Empty title="This location isn’t available." text={error} /> : <Busy />;
  const l = activity.locationDetails;
  const mapped = l && hasPoint(l);
  const address = [l?.address, l?.postalCode && !l?.address?.includes(l.postalCode) ? `Singapore ${l.postalCode}` : ""].filter(Boolean).join(", ");
  const destination = mapped ? `${l.lat},${l.lng}` : (address || activity.location);
  return <div className="activity-location-page"><PageHeading eyebrow="THE MEETING SPOT" title="See you here." subtitle={activity.title} />
    {mapped ? <VenueMap locations={[{ ...l, id: activity.id, name: l.venueName || activity.location, image: imageFor(activity) }]} height={desktop ? 440 : 350} selectedId={activity.id} /> : <div className="map-unavailable card"><MapPin size={38} weight="duotone" /><h2>Meeting details</h2><p>A precise map pin isn’t available for this location yet.</p></div>}
    <div className="location-address card"><Badge tone="blue"><MapPin size={14} /> {l?.precision === "campus" ? "Campus location" : "Public meeting spot"}</Badge><h2>{l?.venueName || activity.location}</h2><p>{address || activity.location}</p>{l?.precision === "campus" && <p className="map-note">The pin shows the campus. Check the activity details with your host for the exact room or entrance.</p>}{l?.locationNote && <p className="map-note">{l.locationNote}</p>}{l?.meetingPoint && <p className="map-note">{l.meetingPoint}</p>}<a className="btn btn-primary full" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=transit`} target="_blank" rel="noopener noreferrer"><NavigationArrow size={20} /> Get directions <ArrowUpRight size={17} /></a></div>
    <div className="location-plan-row"><img src={imageFor(activity)} alt="" /><div><strong>{activity.title}</strong><small>{dateLabel(activity)} · {displayTime(activity.time)}</small></div><Button variant="ghost" aria-label="Return to activity" onClick={() => go("activity", id)}><ArrowRight size={20} /></Button></div>
  </div>;
}
