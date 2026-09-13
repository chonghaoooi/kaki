import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createApi } from './api.mjs';
import { seedActivityCatalogue } from './activity-catalogue.mjs';
import { NETWORKS, locations, primaryInstitution, seedData, seedNeighbourhoodData, seedRichNeighbourhoodData } from './data.mjs';
import { publicMeetingVenues } from './geography.mjs';

const categories = ['study', 'sports', 'games', 'lunch', 'interests', 'events'];
const catalogueId = id => id.includes('-catalogue-');
const profiles = [
  ...seedData().profiles,
  ...seedNeighbourhoodData(publicMeetingVenues).profiles,
  ...seedRichNeighbourhoodData(publicMeetingVenues).profiles,
];

async function fixture(t, options = {}) {
  const api = createApi({ dbPath: ':memory:', now: () => Date.parse('2026-09-13T04:00:00Z'), ...options });
  const server = createServer((req, res) => api.handle(req, res).then(handled => {
    if (!handled) { res.statusCode = 404; res.end(); }
  }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    await new Promise(resolve => server.close(resolve));
    api.close();
  };
  t.after(close);
  return {
    close,
    client(initialCookie = '') {
      let cookie = initialCookie;
      return {
        get cookie() { return cookie; },
        async call(path, method = 'GET', body) {
          const response = await fetch(base + path, {
            method,
            headers: { ...(cookie ? { Cookie: cookie } : {}), ...(method === 'GET' ? {} : { Origin: base, 'Content-Type': 'application/json' }) },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          });
          const next = response.headers.get('set-cookie');
          if (next) cookie = next.split(';')[0];
          return { status: response.status, body: await response.json() };
        },
      };
    },
  };
}

function temporaryDatabase(t) {
  const folder = mkdtempSync(join(tmpdir(), 'kaki-catalogue-'));
  t.after(() => {
    const resolvedFolder = resolve(folder);
    assert.equal(dirname(resolvedFolder), resolve(tmpdir()), 'cleanup stays within the temporary directory');
    assert.ok(basename(resolvedFolder).startsWith('kaki-catalogue-'), 'cleanup targets only this test fixture');
    rmSync(resolvedFolder, { recursive: true, force: true });
  });
  return join(folder, 'catalogue.sqlite');
}

test('catalogue has useful variety in every genre, with balanced campus and shared plans', () => {
  const input = { anchorDate: '2026-09-13', profiles };
  const { activities } = seedActivityCatalogue(publicMeetingVenues, input);
  assert.equal(activities.length, 216);
  assert.equal(new Set(activities.map(a => a.id)).size, activities.length);
  assert.deepEqual(seedActivityCatalogue(publicMeetingVenues, input).activities, activities, 'the same release must produce stable records');
  for (const network of NETWORKS) {
    for (const category of categories) {
      const genre = activities.filter(a => a.network === network && a.category === category);
      const campus = genre.filter(a => !a.neighbourhoodOptIn);
      const shared = genre.filter(a => a.neighbourhoodOptIn);
      assert.equal(campus.length, 6, `${network}/${category} campus`);
      assert.equal(shared.length, 3, `${network}/${category} shared`);
      assert.equal(new Set(genre.map(a => a.title)).size, 9, `${network}/${category} should not repeat the same title`);
      for (const [scope, rows] of [['campus', campus], ['shared', shared]]) {
        assert.deepEqual(rows.map(a => a.id).sort(), rows.map((_, i) => `${network}-catalogue-${scope}-${category}-${String(i + 1).padStart(2, '0')}`).sort());
      }
      assert.ok(genre.some(a => a.participants.length < a.capacity), `${network}/${category} needs joinable options`);
      assert.ok(new Set(genre.map(a => a.date)).size >= 3, `${network}/${category} needs more than one day's plans`);
    }
  }
});

test('catalogue membership, mentor roles, venues, images and date windows are valid', () => {
  const { activities } = seedActivityCatalogue(publicMeetingVenues, { anchorDate: '2026-12-31', profiles });
  const people = new Map(profiles.map(p => [p.id, p]));
  const allVenues = new Map([...locations, ...publicMeetingVenues].map(v => [v.id, v]));
  const publicIds = new Set(publicMeetingVenues.map(v => v.id));
  for (const activity of activities) {
    const label = activity.id;
    const host = people.get(activity.hostId);
    assert.ok(host, `${label}: host exists`);
    assert.equal(host.network, activity.network, label);
    assert.ok(activity.participants.includes(host.id), `${label}: host takes a place`);
    assert.equal(new Set(activity.participants).size, activity.participants.length, label);
    assert.ok(activity.participants.length > 0 && activity.participants.length <= activity.capacity, label);
    assert.ok(!activity.participants.includes(`${activity.network}-p0`), `${label}: Jamie chooses their own plans`);
    for (const personId of activity.participants) {
      const person = people.get(personId);
      assert.ok(person, `${label}: participant ${personId} exists`);
      assert.equal(person.network, host.network, label);
      assert.equal(person.ageBand, host.ageBand, label);
      assert.ok(Number.isFinite(Date.parse(activity.participantJoinedAt[personId])), `${label}: joined time`);
    }
    if (activity.category === 'study') {
      assert.deepEqual(Object.keys(activity.participantRoles).sort(), [...activity.participants].sort(), label);
      for (const [personId, role] of Object.entries(activity.participantRoles)) {
        assert.ok(['mentor', 'peer'].includes(role), label);
        if (role === 'mentor') assert.equal(personId, `${activity.network}-p2`, `${label}: no invented mentor registration`);
        assert.ok(Date.parse(activity.participantRoleJoinedAt[personId]) < Date.parse(`${activity.date}T${activity.time}:00+08:00`), label);
      }
      assert.ok(activity.subject.length > 0, `${label}: study subject`);
    }
    const venue = allVenues.get(activity.locationId);
    assert.ok(venue, `${label}: approved venue`);
    assert.equal(activity.location, venue.name, label);
    if (activity.neighbourhoodOptIn) {
      assert.ok(publicIds.has(venue.id), `${label}: shared activity at a public meeting venue`);
      assert.ok(Number.isFinite(venue.lat) && Number.isFinite(venue.lng), `${label}: map coordinates`);
    } else {
      assert.equal(venue.network, activity.network, label);
      assert.equal(venue.institutionId, primaryInstitution(activity.network).id, label);
      assert.equal(host.institutionId, venue.institutionId, label);
    }
    assert.match(activity.image, /^\/assets\/kaki\/[a-z0-9-]+\.webp$/, label);
    assert.ok(existsSync(new URL(`../public${activity.image}`, import.meta.url)), `${label}: image file exists`);
    assert.match(activity.time, /^(?:[01]\d|2[0-3]):[0-5]\d$/, label);
    const offset = (Date.parse(`${activity.date}T00:00:00Z`) - Date.parse('2026-12-31T00:00:00Z')) / 86400000;
    assert.ok(Number.isInteger(offset) && offset >= 1 && offset <= 21, `${label}: future date within three weeks`);
    assert.equal(activity.demoSample, true, label);
  }
  for (const network of NETWORKS) assert.ok(activities.some(a => a.network === network && a.participantRoles?.[`${network}-p2`] === 'mentor'), `${network}: mentor-led choice`);
});

test('API exposes the catalogue in each eligible community and shared map feed without autojoining', async t => {
  const f = await fixture(t);
  for (const network of NETWORKS) {
    const client = f.client();
    assert.equal((await client.call('/api/demo', 'POST', { network })).status, 200);
    const state = await client.call('/api/state');
    assert.equal(state.status, 200);
    const activities = state.body.activities.filter(a => catalogueId(a.id));
    assert.equal(activities.length, 54, network);
    assert.ok(activities.every(a => a.network === network && !a.joined), network);
    assert.ok(activities.every(a => a.host && a.locationDetails && a.participantCount > 0), network);
    const shared = await client.call('/api/neighbourhood/events');
    assert.equal(shared.status, 200);
    assert.equal(shared.body.activities.filter(a => catalogueId(a.id)).length, 18, network);
    assert.ok(shared.body.activities.every(a => a.neighbourhoodOptIn === true && a.network === network), network);
    const foreign = NETWORKS.find(n => n !== network);
    assert.equal((await client.call(`/api/activities/${foreign}-catalogue-campus-sports-01`)).status, 404, network);
  }
});

test('additive migration preserves edits, memberships, saves, private data, sessions and original calendar on replay', async t => {
  const dbPath = temporaryDatabase(t);
  const time = Date.parse('2026-12-31T16:30:00Z'); // It is already 1 January in Singapore.
  const first = await fixture(t, { dbPath, now: () => time });
  const client = first.client();
  assert.equal((await client.call('/api/demo', 'POST', { network: 'polytechnic' })).status, 200);
  const state = (await client.call('/api/state')).body;
  const activity = state.activities.find(a => catalogueId(a.id) && a.category === 'sports' && a.participantCount < a.capacity);
  assert.ok(activity);
  const url = `/api/activities/${activity.id}`;
  assert.equal((await client.call(`${url}/join`, 'POST', {})).status, 200);
  assert.equal((await client.call(`${url}/save`, 'POST', {})).body.activity.saved, true);
  assert.equal((await client.call('/api/reflections', 'POST', { text: 'I found a plan I would enjoy joining.', tags: ['Met someone new'], activityId: activity.id })).status, 201);
  await first.close();

  const db = new DatabaseSync(dbPath);
  const originalAnchor = db.prepare('SELECT value FROM meta WHERE key=?').get('activity-catalogue-anchor-v1').value;
  assert.equal(originalAnchor, '2027-01-01', 'anchor uses Singapore day, not UTC day');
  const record = JSON.parse(db.prepare('SELECT data FROM objects WHERE kind=? AND id=?').get('activity', activity.id).data);
  record.title = 'My edited sports plan';
  record.date = '2027-01-20';
  db.prepare('UPDATE objects SET data=? WHERE kind=? AND id=?').run(JSON.stringify(record), 'activity', record.id);
  const originalRows = db.prepare('SELECT * FROM objects ORDER BY kind,id').all();
  const preservedTables = ['accounts', 'sessions', 'relations', 'messages', 'private_records', 'club_messages', 'support_messages'];
  const snapshot = handle => Object.fromEntries(preservedTables.map(table => [table, JSON.stringify(handle.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all())]));
  const before = snapshot(db);
  const initialOrigins = db.prepare('SELECT * FROM plan_origins ORDER BY rowid').all();
  db.close();

  // A normal restart retains a working session and selected plan state.
  const second = await fixture(t, { dbPath, now: () => time + 3600000 });
  const resumed = second.client(client.cookie);
  const restored = await resumed.call(url);
  assert.equal(restored.status, 200);
  assert.equal(restored.body.activity.title, record.title);
  assert.equal(restored.body.activity.joined, true);
  assert.equal(restored.body.activity.saved, true);
  assert.equal((await resumed.call('/api/state')).body.journey.reflections.some(r => r.text === 'I found a plan I would enjoy joining.'), true);
  await second.close();

  // Backfill one missing item much later: original plans must not silently move.
  const edit = new DatabaseSync(dbPath);
  assert.deepEqual(edit.prepare('SELECT * FROM plan_origins ORDER BY rowid').all(), initialOrigins, 'unexpired private meeting origins survive a restart');
  const missingId = 'polytechnic-catalogue-shared-interests-03';
  edit.prepare('DELETE FROM objects WHERE kind=? AND id=?').run('activity', missingId);
  edit.prepare('DELETE FROM meta WHERE key=?').run('activity-catalogue-v1');
  edit.close();
  const third = createApi({ dbPath, now: () => Date.parse('2027-03-05T04:00:00Z') });
  third.close();
  const final = new DatabaseSync(dbPath);
  try {
    assert.deepEqual(final.prepare('SELECT * FROM objects ORDER BY kind,id').all(), originalRows, 'only the missing record is restored, with its original scheduled date');
    const after = snapshot(final);
    for (const table of preservedTables) assert.equal(after[table] === before[table], true, `${table} records survive unchanged`);
    assert.equal(final.prepare('SELECT COUNT(*) AS count FROM plan_origins').get().count, 0, 'expired private meeting origins still receive normal cleanup');
    assert.equal(final.prepare('SELECT value FROM meta WHERE key=?').get('activity-catalogue-anchor-v1').value, originalAnchor);
    assert.equal(final.prepare('SELECT value FROM meta WHERE key=?').get('activity-catalogue-v1').value, '1');
  } finally { final.close(); }
});

test('live databases never receive demo catalogue records or its migration markers', t => {
  const dbPath = temporaryDatabase(t);
  const live = createApi({ dbPath, demoMode: false });
  live.close();
  const db = new DatabaseSync(dbPath);
  try {
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM objects').get().count, 0);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM meta WHERE key LIKE 'activity-catalogue%'").get().count, 0);
    assert.equal(db.prepare('SELECT value FROM meta WHERE key=?').get('data-mode').value, 'live');
  } finally { db.close(); }
});
