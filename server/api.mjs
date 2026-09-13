import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomInt, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { AsyncLocalStorage } from 'node:async_hooks';
import { NETWORKS, ANCHOR_DATE, institutions, locations, seedData, seedMentorData, seedNeighbourhoodData, seedRichNeighbourhoodData, primaryInstitution, defaultSettings } from './data.mjs';
import { enrichLocation, publicMeetingVenues, demoPostalExamples, resolvePostalCode } from './geography.mjs';
import { SUPPORT_NEEDS, SUPPORT_FORMATS, seedSupportData } from './support-data.mjs';
import { seedActivityCatalogue } from './activity-catalogue.mjs';

const digest = s => createHash('sha256').update(s).digest('hex');
const parse = s => JSON.parse(s);
const stringify = s => JSON.stringify(s);
class HttpError extends Error { constructor(status,message){ super(message);this.status=status; } }
const fail=(status,message)=>{throw new HttpError(status,message);};
const text=(v,name,max=500,min=0)=>{if(typeof v!=='string'||v.trim().length<min||v.trim().length>max)fail(400,`${name} must be ${min}–${max} characters.`);return v.trim();};
const list=(v,name,max=15)=>{if(!Array.isArray(v)||v.length>max)fail(400,`${name} must be a list of up to ${max} choices.`);return [...new Set(v.map(x=>text(x,name,60,1)))];};
const contactPattern=/(?:[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?65[ -]?)?[689]\d{3}[ -]?\d{4}|(?:https?:\/\/)?(?:t\.me|telegram\.me|wa\.me|discord\.gg)\/|\b(?:telegram|whatsapp|phone|address)\s*[:=]|@[a-z0-9_]{5,}|\b(?:blk|block)\s+\d+|#\d{1,3}-\d{1,5})/i;
const noContact=s=>{if(contactPattern.test(s))fail(400,'Keep contact details and private addresses off kaki. Plan to meet at an approved campus space.');return s;};
const checkedText=(v,name,max,min=0)=>noContact(text(v,name,max,min));

export function createApi({dbPath='server/kaki.sqlite',demoMode=true,now=()=>Date.now(),resendApiKey=process.env.RESEND_API_KEY,mailFrom=process.env.MAIL_FROM,allowedOrigins=process.env.KAKI_ORIGIN?.split(',').map(x=>x.trim()).filter(Boolean)}={}) {
  if(dbPath!==':memory:')mkdirSync(dirname(dbPath),{recursive:true});
  const db=new DatabaseSync(dbPath);db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS objects(kind TEXT NOT NULL,id TEXT NOT NULL,network TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(kind,id));
    CREATE INDEX IF NOT EXISTS objects_network ON objects(kind,network);
    CREATE TABLE IF NOT EXISTS accounts(email TEXT PRIMARY KEY,user_id TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS challenges(id TEXT PRIMARY KEY,email TEXT NOT NULL,institution_id TEXT NOT NULL,age_band TEXT NOT NULL,code_hash TEXT NOT NULL,expires INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0);
    CREATE INDEX IF NOT EXISTS challenge_email ON challenges(email,created);
    CREATE TABLE IF NOT EXISTS relations(kind TEXT NOT NULL,sender TEXT NOT NULL,recipient TEXT NOT NULL,data TEXT NOT NULL DEFAULT '{}',PRIMARY KEY(kind,sender,recipient));
    CREATE INDEX IF NOT EXISTS relations_recipient ON relations(kind,recipient);
    CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,network TEXT NOT NULL,sender TEXT NOT NULL,recipient TEXT NOT NULL,text TEXT NOT NULL,created TEXT NOT NULL,read INTEGER DEFAULT 0);
    CREATE INDEX IF NOT EXISTS messages_pair ON messages(network,sender,recipient,created);
    CREATE TABLE IF NOT EXISTS private_records(id TEXT PRIMARY KEY,kind TEXT NOT NULL,user_id TEXT NOT NULL,network TEXT NOT NULL,data TEXT NOT NULL,created TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS private_user ON private_records(user_id,kind,created);
    CREATE INDEX IF NOT EXISTS private_tutor_recipient ON private_records(kind,network,json_extract(data,'$.personId'));
    CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,until INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS club_messages(id TEXT PRIMARY KEY,circle_id TEXT NOT NULL,network TEXT NOT NULL,sender_id TEXT NOT NULL,data TEXT NOT NULL,created TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS club_messages_circle ON club_messages(circle_id,network,created);
    CREATE TABLE IF NOT EXISTS plan_origins(plan_id TEXT NOT NULL,user_id TEXT NOT NULL,network TEXT NOT NULL,postal_code TEXT NOT NULL,lat REAL NOT NULL,lng REAL NOT NULL,expires INTEGER NOT NULL,PRIMARY KEY(plan_id,user_id));
    CREATE INDEX IF NOT EXISTS plan_origins_expiry ON plan_origins(expires);
    CREATE TABLE IF NOT EXISTS support_messages(id TEXT PRIMARY KEY,group_id TEXT NOT NULL,network TEXT NOT NULL,sender_id TEXT,text TEXT NOT NULL,created TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS support_messages_group ON support_messages(group_id,network,created);
    CREATE INDEX IF NOT EXISTS private_support_group ON private_records(kind,network,json_extract(data,'$.groupId'));
  `);
  const q=(sql,...args)=>db.prepare(sql).all(...args);
  const one=(sql,...args)=>db.prepare(sql).get(...args);
  const requestCache=new AsyncLocalStorage();let mutationVersion=0;
  const run=(sql,...args)=>{const result=db.prepare(sql).run(...args);if(result.changes)mutationVersion++;return result;};
  const currentCache=()=>{const cache=requestCache.getStore();if(cache&&cache.version!==mutationVersion){cache.stats.clear();cache.activities.clear();cache.version=mutationVersion;}return cache;};
  const get=(kind,id)=>{if(typeof id!=='string')return null;const row=one('SELECT data FROM objects WHERE kind=? AND id=?',kind,id);return row?parse(row.data):null;};
  const all=(kind,network)=>q('SELECT data FROM objects WHERE kind=? AND network=?',kind,network).map(row=>parse(row.data));
  const put=(kind,obj)=>run('INSERT INTO objects(kind,id,network,data) VALUES(?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data,network=excluded.network',kind,obj.id,obj.network,stringify(obj));
  const relation=(kind,sender,recipient)=>one('SELECT data FROM relations WHERE kind=? AND sender=? AND recipient=?',kind,sender,recipient);
  const setRelation=(kind,sender,recipient,data={})=>run('INSERT INTO relations(kind,sender,recipient,data) VALUES(?,?,?,?) ON CONFLICT(kind,sender,recipient) DO UPDATE SET data=excluded.data',kind,sender,recipient,stringify(data));
  const delRelation=(kind,sender,recipient)=>run('DELETE FROM relations WHERE kind=? AND sender=? AND recipient=?',kind,sender,recipient);
  const mine=(kind,userId)=>q('SELECT recipient FROM relations WHERE kind=? AND sender=?',kind,userId).map(x=>x.recipient);
  const blocked=(a,b)=>Boolean(relation('block',a,b)||relation('block',b,a));
  const mutuallyConnected=(a,b)=>Boolean(relation('connect',a,b)&&relation('connect',b,a));
  const stamp=()=>new Date(now()).toISOString();
  const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try {const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}};
  const storedMode=one('SELECT value FROM meta WHERE key=?','data-mode');
  if(!demoMode&&!storedMode&&one('SELECT value FROM meta WHERE key=?','seeded')){db.close();throw new Error('This existing database contains demo records. Use a fresh database for live data.');}
  if(storedMode&&storedMode.value!==(demoMode?'demo':'live')){db.close();throw new Error('Use a separate database for demo and live data.');}
  if(!storedMode)run('INSERT INTO meta(key,value) VALUES(?,?)','data-mode',demoMode?'demo':'live');
  if(demoMode&&!one('SELECT value FROM meta WHERE key=?','seeded'))transaction(()=>{
    const seed=seedData();for(const [key,kind] of [['profiles','profile'],['activities','activity'],['circles','circle'],['tutors','tutor']])for(const item of seed[key])put(kind,item);
    for(const p of seed.profiles)run('INSERT INTO accounts(email,user_id) VALUES(?,?)',p.email,p.id);
    for(const c of seed.connections)setRelation(c.action,c.sender,c.recipient);
    for(const m of seed.messages)run('INSERT INTO messages(id,network,sender,recipient,text,created) VALUES(?,?,?,?,?,?)',m.id,m.network,m.senderId,m.recipientId,m.text,m.createdAt);
    run('INSERT INTO meta(key,value) VALUES(?,?)','seeded','1');
  });
  // Fill newly introduced preference keys while preserving saved choices.
  for(const network of NETWORKS)for(const profile of all('profile',network)){const defaults=defaultSettings(profile.ageBand);if(Object.keys(defaults).some(key=>!Object.hasOwn(profile.settings,key))){profile.settings={...defaults,...profile.settings};put('profile',profile);}}
  if(demoMode)for(const circle of seedData().circles){const existing=get('circle',circle.id);if(existing&&!existing.activityIds){existing.activityIds=circle.activityIds;put('circle',existing);}}
  for(const network of NETWORKS){
    for(const a of all('activity',network))if(a.category==='study'&&!a.participantRoles){a.participantRoles=Object.fromEntries(a.participants.map(id=>[id,'peer']));put('activity',a);}
    for(const c of all('circle',network))if(!c.ownerId||!c.ageBand){c.ownerId=c.ownerId||c.members[0];c.ageBand=get('profile',c.ownerId)?.ageBand||'18plus';c.planIds=c.planIds||[];put('circle',c);}
  }
  if(demoMode&&!one('SELECT value FROM meta WHERE key=?','club-chat-v1'))transaction(()=>{
    for(const network of NETWORKS)for(const c of all('circle',network)){
      const message={id:`${c.id}-welcome`,senderId:c.ownerId,text:`Welcome to ${c.name}! Share an idea for our next meetup. You can plan a spot that works for the group without sharing anyone’s starting address.`,createdAt:'2026-09-13T03:00:00.000Z',type:'message'};
      run('INSERT OR IGNORE INTO club_messages(id,circle_id,network,sender_id,data,created) VALUES(?,?,?,?,?,?)',message.id,c.id,network,c.ownerId,stringify(message),message.createdAt);
    }
    run('INSERT INTO meta(key,value) VALUES(?,?)','club-chat-v1','1');
  });
  if(demoMode&&!one('SELECT value FROM meta WHERE key=?','club-plan-demo-v1'))transaction(()=>{
    for(const network of NETWORKS){
      const c=get('circle',`${network}-c2`),creatorId=`${network}-p0`;if(!c||publicMeetingVenues.length<2)continue;if(!c.members.includes(creatorId)){c.members.push(creatorId);c.memberCount++;}
      const p={id:`${network}-demo-plan`,network,ageBand:c.ageBand,circleId:c.id,creatorId,title:'Code & Coffee weekly catch-up',category:'study',status:'draft',activityIds:[],createdAt:stamp(),demoOrigins:true};put('plan',p);c.planIds=[...(c.planIds||[]),p.id];put('circle',c);
      [creatorId,c.ownerId].forEach((id,i)=>{const v=publicMeetingVenues[i];run('INSERT OR IGNORE INTO plan_origins(plan_id,user_id,network,postal_code,lat,lng,expires) VALUES(?,?,?,?,?,?,?)',p.id,id,network,v.postalCode,v.lat,v.lng,now()+7*86400000);});
      const m={id:`${network}-demo-plan-message`,senderId:creatorId,text:'Demo plan: two public-library starting points are included to try the venue suggestions. They are sample locations, not anyone’s home.',createdAt:stamp(),type:'plan',planId:p.id};run('INSERT OR IGNORE INTO club_messages(id,circle_id,network,sender_id,data,created) VALUES(?,?,?,?,?,?)',m.id,c.id,network,creatorId,stringify(m),m.createdAt);
    }
    run('INSERT INTO meta(key,value) VALUES(?,?)','club-plan-demo-v1','1');
  });
  if(demoMode&&!one('SELECT value FROM meta WHERE key=?','demo-tutor-inbox-v1'))transaction(()=>{
    for(const network of NETWORKS){
      const jamie=get('profile',`${network}-p0`),requester=get('profile',`${network}-p1`);if(!jamie||!requester)continue;
      const tutor={id:`${network}-t0`,network,personId:jamie.id,subject:jamie.subjects[0],subjects:[jamie.subjects[0]],price:0,priceLabel:'Free · Peer support',availability:['Weekday afternoons'],mode:'In person',bio:'Happy to work through a practice question together. Friendly peer support, one small step at a time.'};put('tutor',tutor);
      const request={id:`${network}-demo-tutor-request`,tutorId:tutor.id,personId:jamie.id,recipientId:jamie.id,requesterId:requester.id,date:'2026-09-16',time:'15:00',message:`Hey Jamie, could we work through a few ${tutor.subject} practice questions together? I can bring my notes.`,status:'pending',createdAt:'2026-09-13T04:00:00.000Z'};
      run('INSERT OR IGNORE INTO private_records(id,kind,user_id,network,data,created) VALUES(?,?,?,?,?,?)',request.id,'tutor-request',requester.id,network,stringify(request),request.createdAt);
    }
    run('INSERT INTO meta(key,value) VALUES(?,?)','demo-tutor-inbox-v1','1');
  });
  const auth=req=>{const token=/kaki_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie||'')?.[1];if(!token)fail(401,'Sign in to join your community.');const s=one('SELECT user_id FROM sessions WHERE token_hash=? AND expires>?',digest(token),now());if(!s)fail(401,'Your session has expired. Please sign in again.');const user=get('profile',s.user_id);if(!user)fail(401,'Sign in again.');return user;};
  if(demoMode&&!one('SELECT value FROM meta WHERE key=?','support-groups-demo-v1'))transaction(()=>{
    for(const seeded of seedSupportData({now:now()})){
      if(get('support-group',seeded.id))continue;
      const {demoOccupied,...group}=seeded;put('support-group',group);
      for(let i=0;i<demoOccupied;i++){
        const userId=`support-demo-attendee-${group.network}-${group.ageBand}-${i+1}`,id=`support-member:${group.id}:${userId}`;
        const membership={groupId:group.id,status:group.format==='one-to-one'?'requested':'joined',acceptedGuidelinesAt:stamp(),createdAt:stamp(),demoSample:true};
        run('INSERT OR IGNORE INTO private_records(id,kind,user_id,network,data,created) VALUES(?,?,?,?,?,?)',id,'support-membership',userId,group.network,stringify(membership),membership.createdAt);
      }
      run('INSERT OR IGNORE INTO support_messages(id,group_id,network,sender_id,text,created) VALUES(?,?,?,?,?,?)',`${group.id}-welcome`,group.id,group.network,null,'Welcome to this fictional demo space. Share only what feels comfortable, protect each other’s privacy, and remember that this sample has no live facilitator.',stamp());
    }
    run('INSERT INTO meta(key,value) VALUES(?,?)','support-groups-demo-v1','1');
  });
  const assertNetwork=(obj,user)=>{if(!obj||obj.network!==user.network)fail(404,'This item is not available in your community.');return obj;};
  const peer=(id,user,{requireVisible=false}={})=>{const p=assertNetwork(get('profile',id),user);if(p.id===user.id)fail(400,'Choose another student.');if(blocked(user.id,p.id))fail(403,'This connection is unavailable.');if((p.ageBand==='under18'||user.ageBand==='under18')&&p.ageBand!==user.ageBand)fail(403,'This connection is outside your age-appropriate community.');if(requireVisible&&!p.settings.discoverable&&!mutuallyConnected(user.id,p.id))fail(404,'This profile is not available.');return p;};
  const visiblePeer=(p,user)=>p.id!==user.id&&!blocked(p.id,user.id)&&(p.ageBand===user.ageBand||(p.ageBand!=='under18'&&user.ageBand!=='under18'))&&(p.settings.discoverable||mutuallyConnected(p.id,user.id));
  const sessionStart=a=>Date.parse(`${a.date}T${a.time}:00+08:00`);
  const sessionEnd=a=>sessionStart(a)+2*3600000;
  const eligibleMentorships=p=>{const cache=currentCache();let activities=cache?.activities.get(p.network);if(!activities){activities=all('activity',p.network);cache?.activities.set(p.network,activities);}return activities.filter(a=>a.category==='study'&&a.participants.includes(p.id)&&a.participantRoles?.[p.id]==='mentor'&&Date.parse(a.participantRoleJoinedAt?.[p.id]||p.mentorshipRegisteredAt||'invalid')<sessionEnd(a));};
  const mentorStats=(p,viewer)=>{
    const cache=currentCache(),key=`${p.id}:${viewer?.id||''}`,cached=cache?.stats.get(key);if(cached)return cached;
    const completionMethod='Scheduled start plus 2 hours; attendance is not independently verified.';
    if(!p.mentorshipRegisteredAt){const stats={firstMentorshipAt:null,daysSinceFirstMentorship:null,sessionCount:0,likeCount:0,isNew:true,registered:false,likedByMe:false,canLike:false,completionMethod};cache?.stats.set(key,stats);return stats;}
    const eligibleSessions=eligibleMentorships(p),sessions=eligibleSessions.filter(a=>sessionEnd(a)<=now()),started=eligibleSessions.map(sessionStart).filter(start=>start<=now()),firstStart=started.length?Math.min(...started):null;
    const eligible=viewer&&viewer.id!==p.id&&viewer.network===p.network&&viewer.ageBand===p.ageBand&&!blocked(viewer.id,p.id)&&sessions.some(a=>a.participants.includes(viewer.id)&&(a.participantRoles?.[viewer.id]||'peer')==='peer'&&Date.parse(a.participantJoinedAt?.[viewer.id]||a.createdAt)<sessionEnd(a));
    const stats={firstMentorshipAt:firstStart===null?null:new Date(firstStart).toISOString(),daysSinceFirstMentorship:firstStart===null?null:Math.max(0,Math.floor((now()-firstStart)/86400000)),sessionCount:sessions.length,likeCount:q('SELECT sender FROM relations WHERE kind=? AND recipient=?','mentor-like',p.id).filter(row=>!blocked(row.sender,p.id)).length,isNew:sessions.length===0,registered:true,likedByMe:!!(viewer&&relation('mentor-like',viewer.id,p.id)),canLike:!!eligible,completionMethod};cache?.stats.set(key,stats);return stats;
  };
  const registerMentor=(id,a)=>{const p=get('profile',id);if(!p.mentorshipRegisteredAt){p.mentorshipRegisteredAt=stamp();put('profile',p);}if(!all('tutor',p.network).some(t=>t.personId===p.id))put('tutor',{id:`mentor-${p.id}`,network:p.network,personId:p.id,subject:a.subject||p.subjects[0]||'Peer study support',subjects:a.subject?[a.subject]:p.subjects,price:0,priceLabel:'Free · Peer mentor',availability:p.availability,mode:'In person',bio:'Learning together as a peer mentor. Session completion reflects the scheduled time, not independently verified attendance.'});};
  if(demoMode&&!one('SELECT value FROM meta WHERE key=?','public-mentor-demo-v1'))transaction(()=>{
    const seed=seedMentorData();
    for(const registration of seed.registrations){const p=get('profile',registration.id);if(p&&!p.mentorshipRegisteredAt){p.mentorshipRegisteredAt=registration.registeredAt;put('profile',p);}}
    for(const a of seed.activities){if(!get('activity',a.id))put('activity',a);registerMentor(a.hostId,a);}
    for(const like of seed.likes)if(!relation('mentor-like',like.sender,like.recipient))setRelation('mentor-like',like.sender,like.recipient,{createdAt:like.createdAt,demo:true});
    run('INSERT INTO meta(key,value) VALUES(?,?)','public-mentor-demo-v1','1');
  });
  if(demoMode&&!one('SELECT value FROM meta WHERE key=?','neighbourhood-demo-v1'))transaction(()=>{
    const seed=seedNeighbourhoodData(publicMeetingVenues);
    for(const p of seed.profiles)if(!get('profile',p.id)){put('profile',p);run('INSERT OR IGNORE INTO accounts(email,user_id) VALUES(?,?)',p.email,p.id);}
    for(const a of seed.activities)if(!get('activity',a.id))put('activity',a);
    run('INSERT INTO meta(key,value) VALUES(?,?)','neighbourhood-demo-v1','1');
  });
  if(demoMode&&!one('SELECT value FROM meta WHERE key=?','neighbourhood-rich-demo-v1'))transaction(()=>{
    const seed=seedRichNeighbourhoodData(publicMeetingVenues);
    for(const p of seed.profiles)if(!get('profile',p.id)){put('profile',p);run('INSERT OR IGNORE INTO accounts(email,user_id) VALUES(?,?)',p.email,p.id);}
    for(const a of seed.activities)if(!get('activity',a.id))put('activity',a);
    for(const m of seed.messages)run('INSERT OR IGNORE INTO club_messages(id,circle_id,network,sender_id,data,created) VALUES(?,?,?,?,?,?)',m.id,m.circleId,m.network,m.senderId,stringify(m),m.createdAt);
    for(const network of NETWORKS){const existing=get('activity',`${network}-neighbourhood-demo`);if(existing&&!existing.demoSample){existing.demoSample=true;put('activity',existing);}}
    run('INSERT INTO meta(key,value) VALUES(?,?)','neighbourhood-rich-demo-v1','1');
  });
  // One additive demo release. Keep its original calendar anchor on future
  // restarts/backfills so edits, RSVPs and scheduled plans never move underneath users.
  if(demoMode&&!one('SELECT value FROM meta WHERE key=?','activity-catalogue-v1'))transaction(()=>{
    const anchorDate=one('SELECT value FROM meta WHERE key=?','activity-catalogue-anchor-v1')?.value||new Date(now()+8*3600000).toISOString().slice(0,10);
    run('INSERT OR IGNORE INTO meta(key,value) VALUES(?,?)','activity-catalogue-anchor-v1',anchorDate);
    const seed=seedActivityCatalogue(publicMeetingVenues,{anchorDate,profiles:NETWORKS.flatMap(network=>all('profile',network))});
    for(const activity of seed.activities)if(!get('activity',activity.id))put('activity',activity);
    run('INSERT INTO meta(key,value) VALUES(?,?)','activity-catalogue-v1','1');
  });
  const publicProfile=(p,viewer)=>{const fields=['id','name','institutionId','institution','network','course','year','bio','avatar','interests','intentions','subjects','languages','studyStyle','availability','verified','verificationMethod','onboardingComplete','emailVerified','enrolmentVerified','ageVerified'];return {...Object.fromEntries(fields.filter(key=>Object.hasOwn(p,key)).map(key=>[key,p[key]])),mentorStats:mentorStats(p,viewer)};};
  const presentTutor=(t,user,person)=>{const fields=['id','network','personId','subject','subjects','price','priceLabel','availability','mode','bio'],sessionCount=person.mentorStats.sessionCount;return {...publicProfile(get('profile',t.personId),user),...Object.fromEntries(fields.filter(key=>Object.hasOwn(t,key)).map(key=>[key,t[key]])),sessionCount,sessions:sessionCount,person};};
  const matchInfo=(p,user)=>{const sharedInterests=p.interests.filter(x=>user.interests.includes(x)),sharedSubjects=p.subjects.filter(x=>user.subjects.includes(x));return {compatibility:Math.min(97,63+sharedInterests.length*5+sharedSubjects.length*6),matchReasons:[sharedSubjects.length?`You share ${sharedSubjects.slice(0,2).join(' and ')}.`:'You are in the same student community.',sharedInterests.length?`You both enjoy ${sharedInterests.slice(0,2).join(' and ').toLowerCase()}.`:'You are both open to trying new activities.'],sharedInterests,sharedSubjects};};
  const activityVisible=(a,user)=>!blocked(a.hostId,user.id)&&(!get('profile',a.hostId)||get('profile',a.hostId).ageBand===user.ageBand||(get('profile',a.hostId).ageBand!=='under18'&&user.ageBand!=='under18'));
  const memberVisible=(id,user)=>{if(id===user.id)return true;if(blocked(id,user.id))return false;const p=get('profile',id);return p&&p.network===user.network&&(p.settings.activityVisibility==='community'||(p.settings.activityVisibility==='connections'&&mutuallyConnected(id,user.id)));};
  const circleVisible=(c,user)=>{const owner=get('profile',c.ownerId||c.members[0]),band=c.ageBand||owner?.ageBand;return (!owner||!blocked(owner.id,user.id))&&(band===user.ageBand||(band!=='under18'&&user.ageBand!=='under18'));};
  const presentActivity=(a,user)=>{const participants=a.participants.filter(id=>memberVisible(id,user)),roles=a.category==='study'?Object.fromEntries(a.participants.map(id=>[id,a.participantRoles?.[id]==='mentor'?'mentor':'peer'])):{};const location=publicMeetingVenues.find(l=>l.id===a.locationId)||locations.find(l=>l.id===a.locationId),host=get('profile',a.hostId);const {participantJoinedAt,participantRoleJoinedAt,...visible}=a;return {...visible,institutionId:host.institutionId,institutionLabel:host.institution,neighbourhoodOptIn:a.neighbourhoodOptIn===true,participants,participantRoles:Object.fromEntries(participants.filter(id=>roles[id]).map(id=>[id,roles[id]])),roleCounts:{peer:Object.values(roles).filter(r=>r==='peer').length,mentor:Object.values(roles).filter(r=>r==='mentor').length},myRole:roles[user.id]||null,locationDetails:location?enrichLocation(location):null,participantCount:a.participants.length,host:publicProfile(host,user),saved:Boolean(relation('save-activity',user.id,a.id)),joined:a.participants.includes(user.id)};};
  const activity=(id,user)=>{const a=assertNetwork(get('activity',id),user);if(!activityVisible(a,user))fail(403,'This activity is unavailable.');return a;};
  const circle=(id,user,{member=false}={})=>{const c=assertNetwork(get('circle',id),user);if(!circleVisible(c,user))fail(403,'This club is unavailable.');if(member&&!c.members.includes(user.id))fail(403,'Join this club before taking part.');return c;};
  const presentCircle=(c,user)=>({...c,members:c.members.filter(id=>memberVisible(id,user)),joined:c.members.includes(user.id),activityIds:(c.activityIds||[]).filter(id=>{const a=get('activity',id);return a&&activityVisible(a,user);}),planIds:(c.planIds||[]).filter(id=>{const p=get('plan',id);return p&&!blocked(p.creatorId,user.id);}),weeklyEvents:(c.activityIds||[]).map(id=>get('activity',id)).filter(a=>a&&a.weekly&&activityVisible(a,user)).map(a=>presentActivity(a,user)),nextActivity:c.nextEvent});
  const self=user=>({...user,mentorStats:mentorStats(user,user),savedActivityIds:mine('save-activity',user.id),savedPeopleIds:mine('save-person',user.id),joinedCircleIds:all('circle',user.network).filter(c=>c.members.includes(user.id)).map(c=>c.id),blockedPersonIds:mine('block',user.id),blockedPeople:mine('block',user.id).map(id=>get('profile',id)).filter(Boolean).map(p=>({id:p.id,name:p.name,avatar:p.avatar}))});
  const privateRecords=(kind,user)=>q('SELECT data FROM private_records WHERE kind=? AND user_id=? AND network=? ORDER BY created DESC',kind,user.id,user.network).map(x=>parse(x.data));
  const tutorRequestVisible=(row,user)=>{const r=parse(row.data),otherId=row.user_id===user.id?r.personId:row.user_id,other=get('profile',otherId);return other&&other.network===user.network&&!blocked(other.id,user.id)&&(other.ageBand===user.ageBand||(other.ageBand!=='under18'&&user.ageBand!=='under18'));};
  const presentTutorRequest=(row,user)=>{const r=parse(row.data);return {...r,requesterId:row.user_id,recipientId:r.personId,...(r.personId===user.id?{requester:publicProfile(get('profile',row.user_id),user)}:{})};};
  const tutorRequestLists=user=>{const outgoing=q('SELECT * FROM private_records WHERE kind=? AND user_id=? AND network=? ORDER BY created DESC','tutor-request',user.id,user.network),incoming=q("SELECT * FROM private_records WHERE kind=? AND network=? AND json_extract(data,'$.personId')=? ORDER BY created DESC",'tutor-request',user.network,user.id);return {requests:outgoing.filter(row=>tutorRequestVisible(row,user)).map(row=>presentTutorRequest(row,user)),incomingRequests:incoming.filter(row=>tutorRequestVisible(row,user)).map(row=>presentTutorRequest(row,user))};};
  const record=(kind,user,data)=>{const value={id:randomUUID(),...data,createdAt:stamp()};run('INSERT INTO private_records(id,kind,user_id,network,data,created) VALUES(?,?,?,?,?,?)',value.id,kind,user.id,user.network,stringify(value),value.createdAt);return value;};
  const limit=(key,count,ms)=>{const entry=one('SELECT count,until FROM rate_limits WHERE key=?',key);if(entry&&entry.until>now()&&entry.count>=count)fail(429,'Please wait a little before trying again.');if(!entry||entry.until<=now())run('INSERT INTO rate_limits(key,count,until) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=1,until=excluded.until',key,now()+ms);else run('UPDATE rate_limits SET count=count+1 WHERE key=?',key);};
  const makeSession=(req,res,user)=>{const oldToken=/kaki_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie||'')?.[1];if(oldToken)run('DELETE FROM sessions WHERE token_hash=?',digest(oldToken));const token=randomBytes(32).toString('hex');run('INSERT INTO sessions(token_hash,user_id,expires) VALUES(?,?,?)',digest(token),user.id,now()+7*86400000);res.setHeader('Set-Cookie',`kaki_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${req.socket.encrypted?'; Secure':''}`);};
  const readBody=async req=>{if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))fail(415,'Use application/json.');let size=0,chunks=[];for await(const c of req){size+=c.length;if(size>32768)fail(413,'That request is too large.');chunks.push(c);}try {const value=parse(Buffer.concat(chunks).toString('utf8')||'{}');if(!value||Array.isArray(value)||typeof value!=='object')fail(400,'Send a JSON object.');return value;}catch(e){if(e instanceof HttpError)throw e;fail(400,'The request is not valid JSON.');}};
  const validateSlot=(date,time)=>{date=text(date,'Date',10,10);time=text(time,'Time',5,5);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||!Number.isFinite(Date.parse(`${date}T${time}:00+08:00`))||new Date(`${date}T12:00:00Z`).toISOString().slice(0,10)!==date)fail(400,'Choose a valid date and time.');const day=demoMode?ANCHOR_DATE:new Date(now()+8*3600000).toISOString().slice(0,10);if(date<day)fail(400,'Choose today or a future date.');return {date,time};};
  const messageAllowed=(id,user)=>{const p=peer(id,user);if(!mutuallyConnected(p.id,user.id))fail(403,'Connect with each other before sending a message.');return p;};
  const clubMessage=(c,user,data)=>{const message={id:randomUUID(),senderId:user.id,createdAt:stamp(),type:'message',...data};run('INSERT INTO club_messages(id,circle_id,network,sender_id,data,created) VALUES(?,?,?,?,?,?)',message.id,c.id,user.network,user.id,stringify(message),message.createdAt);return message;};
  const presentClubMessage=(m,user)=>{const author=get('profile',m.senderId),a=m.activityId?get('activity',m.activityId):null;return {...m,author:author?publicProfile(author,user):null,...(a&&a.network===user.network&&activityVisible(a,user)?{activity:presentActivity(a,user)}:{})};};
  const plan=(id,user)=>{const p=assertNetwork(get('plan',id),user);circle(p.circleId,user,{member:true});if(blocked(p.creatorId,user.id))fail(403,'This meetup plan is unavailable.');return p;};
  const activeOrigins=(p,user)=>{run('DELETE FROM plan_origins WHERE expires<=?',now());const c=get('circle',p.circleId);return q('SELECT * FROM plan_origins WHERE plan_id=? AND network=? AND expires>?',p.id,user.network,now()).filter(o=>{const person=get('profile',o.user_id);return c.members.includes(o.user_id)&&person?.network===user.network&&!blocked(o.user_id,user.id)&&person.ageBand===user.ageBand;});};
  const haversine=(a,b)=>{const rad=x=>x*Math.PI/180,dlat=rad(b.lat-a.lat),dlng=rad(b.lng-a.lng),h=Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlng/2)**2;return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));};
  const rankedVenues=origins=>origins.length?publicMeetingVenues.map(venue=>{const distances=origins.map(o=>haversine(o,venue));return {...venue,maxDistanceKm:Math.max(...distances),averageDistanceKm:distances.reduce((a,b)=>a+b,0)/distances.length};}).sort((a,b)=>a.maxDistanceKm-b.maxDistanceKm||a.averageDistanceKm-b.averageDistanceKm||a.id.localeCompare(b.id)).slice(0,6).map(v=>({...v,maxDistanceKm:Math.ceil(v.maxDistanceKm),averageDistanceKm:Math.ceil(v.averageDistanceKm)})):[];
  const presentPlan=(p,user)=>{const origins=p.status==='draft'?activeOrigins(p,user):[],count=p.status==='draft'?origins.length:p.contributionCount||0,suggestions=count===0?[]:count<2?publicMeetingVenues:p.status==='draft'?rankedVenues(origins):p.suggestions||[];return {id:p.id,network:p.network,circleId:p.circleId,title:p.title,category:p.category,creatorId:p.creatorId,status:p.status,createdAt:p.createdAt,contributionCount:count,myPostalCode:origins.find(o=>o.user_id===user.id)?.postal_code||null,suggestions,ranking:{method:'minimax_straight_line',ranked:count>=2,approximate:true,notTravelTime:true,distancePrecisionKm:1,description:count<2?'Public venue choices; group distance ranking starts after two contributions.':'Ranks public venues by the shortest maximum straight-line distance. Distances are rounded up; no route times or transport routes are estimated.'},activityIds:p.activityIds||[],weekly:p.weekly||false,occurrences:p.occurrences||0,publishedAt:p.publishedAt||null,demoOrigins:!!p.demoOrigins};};
  const categoryValue=value=>{const category=text(value,'Category',20,1).toLowerCase().replace(/^sport$/,'sports');if(!['study','sports','games','lunch','interests','events','workshop','other'].includes(category))fail(400,'Choose an activity category.');return category;};
  const studyRole=value=>{if(!['peer','mentor'].includes(value))fail(400,'Choose peer or mentor for this study session.');return value;};
  const neighbourhoodOptIn=value=>{if(value!==undefined&&typeof value!=='boolean')fail(400,'Choose whether to share this event in Neighbourhood.');return value===true;};
  const blockPerson=(user,personId)=>transaction(()=>{setRelation('block',user.id,personId);delRelation('telegram-consent',user.id,personId);delRelation('telegram-consent',personId,user.id);for(const g of all('support-group',user.network)){const memberId=g.hostPersonId===personId?user.id:g.hostPersonId===user.id?personId:null;if(memberId)run('DELETE FROM private_records WHERE id=? AND kind=?',`support-member:${g.id}:${memberId}`,'support-membership');}});

  const supportVisible=(g,user)=>g.ageBand===user.ageBand&&(!g.hostPersonId||!blocked(g.hostPersonId,user.id));
  const supportGroup=(id,user)=>{const g=assertNetwork(get('support-group',id),user);if(!supportVisible(g,user))fail(403,'This support group is unavailable in your community.');return g;};
  const supportMembership=(g,user)=>{const r=one('SELECT data FROM private_records WHERE id=? AND kind=? AND network=? AND user_id=?',`support-member:${g.id}:${user.id}`,'support-membership',user.network,user.id);return r?parse(r.data):null;};
  const supportCount=g=>one("SELECT COUNT(*) AS n FROM private_records WHERE kind='support-membership' AND network=? AND json_extract(data,'$.groupId')=? AND json_extract(data,'$.status') IN ('joined','requested')",g.network,g.id).n;
  const supportEnded=g=>Date.parse(`${g.date}T${g.time}:00+08:00`)+g.durationMinutes*60000<=now();
  const presentSupportGroup=(g,user)=>{
    const fields=['id','title','summary','description','need','needLabel','leaderType','format','mode','capacity','date','time','durationMinutes','location','topics','expectations','demoSample'];
    const memberCount=supportCount(g),hostFields=['name','role','credentials','bio','verification'];
    return {...Object.fromEntries(fields.map(k=>[k,g[k]])),host:Object.fromEntries(hostFields.map(k=>[k,g.host[k]])),memberCount,spotsLeft:Math.max(0,g.capacity-memberCount),status:memberCount>=g.capacity?'full':'open',myMembership:supportMembership(g,user)?.status||null,isHost:g.hostPersonId===user.id,isEnded:supportEnded(g)};
  };
  const requireSupportMember=(g,user)=>{if(!(g.hostPersonId===user.id&&g.format!=='one-to-one')&&supportMembership(g,user)?.status!=='joined')fail(403,'Only joined group members and their facilitator can read or post in this discussion.');};
  const supportMessages=(g,user)=>q('SELECT * FROM (SELECT *,rowid AS sort_id FROM support_messages WHERE group_id=? AND network=? ORDER BY created DESC,rowid DESC LIMIT 200) ORDER BY created,sort_id',g.id,user.network).filter(m=>!m.sender_id||m.sender_id===user.id||(!blocked(m.sender_id,user.id)&&get('profile',m.sender_id)?.ageBand===user.ageBand&&get('profile',m.sender_id)?.network===user.network)).map(m=>({id:m.id,text:m.text,senderName:m.sender_id?get('profile',m.sender_id)?.name||'Student':g.host.name,mine:m.sender_id===user.id,createdAt:m.created}));
  const listenerApplication=user=>{const row=one('SELECT data FROM private_records WHERE id=? AND kind=? AND user_id=? AND network=?',`support-application:${user.id}`,'support-application',user.id,user.network);if(!row)return null;const a=parse(row.data),fields=['id','topics','formats','availability','experience','acceptBoundaries','status','createdAt','updatedAt'];return Object.fromEntries(fields.map(k=>[k,a[k]]));};
  const supportBody=(b,keys)=>{for(const k of Object.keys(b))if(!keys.includes(k))fail(400,`${k} cannot be changed here.`);};
  const presentMessage=(m,user)=>({id:m.id,personId:m.sender===user.id?m.recipient:m.sender,senderId:m.sender,text:m.text,createdAt:m.created,read:Boolean(m.read)});
  const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(stringify(data));};
  const handle=async(req,res)=>{
    const url=new URL(req.url,'http://kaki.local');if(!url.pathname.startsWith('/api/'))return false;
    try {
      const path=url.pathname.replace(/\/$/,''),method=req.method;
      if(!['GET','POST','PATCH','DELETE'].includes(method))fail(405,'Method not allowed.');
      const requestOrigin=`${req.socket.encrypted?'https':'http'}://${req.headers.host}`;
      let requestHost;try{requestHost=new URL(requestOrigin).hostname;}catch{fail(400,'Invalid request host.');}
      if(allowedOrigins?.length?!allowedOrigins.includes(requestOrigin):!['localhost','127.0.0.1','[::1]'].includes(requestHost))fail(403,'This host is not configured for kaki.');
      if(method!=='GET'){
        const origin=req.headers.origin;
        if(!origin||origin!==requestOrigin)fail(403,'This request must come from the kaki app.');
        if(req.headers['sec-fetch-site']==='cross-site')fail(403,'Cross-site requests are not allowed.');
      }
      const ip=req.socket.remoteAddress||'unknown';
      if(path==='/api/health'&&method==='GET'){json(res,200,{ok:true,demoMode});return true;}
      if(path==='/api/institutions'&&method==='GET'){
        const network=url.searchParams.get('network'),query=(url.searchParams.get('q')||'').toLowerCase();
        if(network&&!NETWORKS.includes(network))fail(400,'Choose a supported education network.');
        json(res,200,{institutions:institutions.filter(x=>(!network||x.network===network)&&x.name.toLowerCase().includes(query)),source:{url:'https://data.gov.sg/datasets/d_688b934f82c1059ed0a6993d2a829089/view',updated:'2026-04-17',note:'Secondary and JC/MI directory from MOE; school SSO required for live stage verification.'},demoMode});return true;
      }
      if(path==='/api/demo'&&method==='POST'){
        if(!demoMode)fail(404,'Demo sign-in is disabled.');limit(`demo:${ip}`,60,60000);const b=await readBody(req),network=b.network||'polytechnic';if(!NETWORKS.includes(network))fail(400,'Choose a supported community.');const user=get('profile',`${network}-p0`);makeSession(req,res,user);json(res,200,{ok:true,user:self(user),demoMode:true});return true;
      }
      if(path==='/api/auth/start'&&method==='POST'){
        limit(`signup:${ip}`,20,15*60000);const b=await readBody(req),institution=institutions.find(x=>x.id===b.institutionId);if(!institution)fail(400,'Choose your institution.');
        const email=text(b.email,'Email',254,5).toLowerCase();if(!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)||!institution.domains.includes(email.split('@')[1]))fail(400,`Use your institution-issued address ending in @${institution.domains[0]}.`);
        const ageBand=b.ageBand||(['secondary','jc_mi'].includes(institution.network)?'under18':'18plus');if(!['under18','18plus'].includes(ageBand))fail(400,'Select your age band.');if(institution.network==='secondary'&&ageBand!=='under18')fail(400,'Secondary access requires school review for adult students.');
        if(!demoMode&&institution.verificationMode!=='email')fail(503,'This institution needs school SSO verification before live sign-up is available.');
        if(!demoMode&&(!resendApiKey||!mailFrom))fail(503,'Email verification is not configured yet. Please use a configured deployment.');
        const recent=one('SELECT created FROM challenges WHERE email=? ORDER BY created DESC LIMIT 1',email);if(recent&&now()-recent.created<60000)fail(429,'Wait 60 seconds before requesting another code.');limit(`email:${digest(email)}`,5,3600000);
        const code=String(randomInt(0,1000000)).padStart(6,'0'),id=randomUUID();
        if(!demoMode){let response;try {response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${resendApiKey}`,'Content-Type':'application/json'},body:stringify({from:mailFrom,to:[email],subject:'Your kaki verification code',text:`Your kaki verification code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`}),signal:AbortSignal.timeout(10000)});}catch{fail(503,'Email could not be sent. Please try again shortly.');}if(!response.ok)fail(503,'Email could not be sent. Please try again shortly.');}
        transaction(()=>{run('UPDATE challenges SET used=1 WHERE email=?',email);run('INSERT INTO challenges(id,email,institution_id,age_band,code_hash,expires,created) VALUES(?,?,?,?,?,?,?)',id,email,institution.id,ageBand,digest(`${id}:${code}`),now()+600000,now());});
        json(res,200,{ok:true,challengeId:id,maskedEmail:email.replace(/^(.).+@/,'$1•••@'),expiresIn:600,resendAfter:60,...(demoMode?{demoCode:code,demoMode:true}:{} )});return true;
      }
      if(path==='/api/auth/verify'&&method==='POST'){
        limit(`verify:${ip}`,40,15*60000);const b=await readBody(req),id=text(b.challengeId,'Challenge',100,1),code=text(b.code,'Code',6,6),challenge=one('SELECT * FROM challenges WHERE id=?',id);
        if(!challenge||challenge.used||challenge.expires<=now()||challenge.attempts>=5)fail(400,'This code has expired or is no longer available. Request a new code.');
        run('UPDATE challenges SET attempts=attempts+1 WHERE id=?',id);const valid=/^\d{6}$/.test(code)&&timingSafeEqual(Buffer.from(digest(`${id}:${code}`)),Buffer.from(challenge.code_hash));if(!valid)fail(400,'That code is not correct. Please try again.');
        const institution=institutions.find(x=>x.id===challenge.institution_id);let user;
        transaction(()=>{run('UPDATE challenges SET used=1 WHERE id=?',id);const account=one('SELECT user_id FROM accounts WHERE email=?',challenge.email);if(account){user=get('profile',account.user_id);if(user.institutionId!==institution.id)fail(403,'This account belongs to a different institution.');}else {user={id:randomUUID(),name:'New kaki',institutionId:institution.id,institution:institution.name,network:institution.network,course:'',year:'',bio:'',avatar:'/assets/kaki/avatar-1.webp',interests:[],subjects:[],languages:['English'],studyStyle:'Collaborative',availability:[],ageBand:challenge.age_band,settings:defaultSettings(challenge.age_band),verified:demoMode,verificationMethod:demoMode?'demo':'email',emailVerified:!demoMode,enrolmentVerified:false,ageVerified:false,onboardingComplete:false,email:challenge.email,telegramUsername:null};put('profile',user);run('INSERT INTO accounts(email,user_id) VALUES(?,?)',challenge.email,user.id);}});
        makeSession(req,res,user);json(res,200,{ok:true,user:self(user),demoMode});return true;
      }
      const user=auth(req);
      if(path==='/api/support/groups'&&method==='GET'){json(res,200,{groups:all('support-group',user.network).filter(g=>supportVisible(g,user)).sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)).map(g=>presentSupportGroup(g,user)),listenerApplication:listenerApplication(user)});return true;}
      if(path==='/api/support/listener-application'){
        if(method==='GET'){json(res,200,{application:listenerApplication(user)});return true;}
        if(method==='DELETE'){run('DELETE FROM private_records WHERE id=? AND kind=? AND user_id=?',`support-application:${user.id}`,'support-application',user.id);json(res,200,{application:null});return true;}
        if(method==='POST'){
          limit(`support-application:${user.id}`,8,3600000);const b=await readBody(req);supportBody(b,['topics','formats','availability','experience','acceptBoundaries']);
          if(b.acceptBoundaries!==true)fail(400,'Accept the listener boundaries before applying.');
          const topics=list(b.topics,'Topics',5),formats=list(b.formats,'Formats',3);if(!topics.length||topics.some(x=>!SUPPORT_NEEDS.includes(x))||!formats.length||formats.some(x=>!SUPPORT_FORMATS.includes(x)))fail(400,'Choose supported topics and formats.');
          const prior=listenerApplication(user),application={id:`support-application:${user.id}`,topics,formats,availability:checkedText(b.availability,'Availability',300,2),experience:checkedText(b.experience,'Experience',1500,10),acceptBoundaries:true,status:'pending',createdAt:prior?.createdAt||stamp(),updatedAt:stamp()};
          run('INSERT INTO private_records(id,kind,user_id,network,data,created) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',application.id,'support-application',user.id,user.network,stringify(application),application.createdAt);json(res,prior?200:201,{application});return true;
        }
      }
      const supportRoute=/^\/api\/support\/groups\/([^/]+)(?:\/(join|membership|messages))?$/.exec(path);
      if(supportRoute){
        const groupId=supportRoute[1],action=supportRoute[2];
        if(!action&&method==='GET'){json(res,200,{group:presentSupportGroup(supportGroup(groupId,user),user)});return true;}
        if(action==='join'&&method==='POST'){
          limit(`support-join:${user.id}`,40,3600000);const b=await readBody(req);supportBody(b,['acceptGuidelines','waitlist']);if(b.acceptGuidelines!==true||typeof b.waitlist!=='boolean')fail(400,'Accept the guidelines and choose whether to join the waitlist.');
          const result=transaction(()=>{const g=supportGroup(groupId,user);if(g.hostPersonId===user.id)fail(400,'You already host this group and cannot request your own place.');const existing=supportMembership(g,user);if(existing&&(existing.status!=='waitlisted'||b.waitlist))return presentSupportGroup(g,user);if(supportEnded(g))fail(409,'This support session has ended. Choose an upcoming group.');const full=supportCount(g)>=g.capacity;if(full&&!b.waitlist)fail(409,'This group is full. Choose the waitlist to stay interested.');if(!full&&b.waitlist)fail(422,'There is a place available. Choose join or request this slot.');const value={groupId:g.id,status:b.waitlist?'waitlisted':g.format==='one-to-one'?'requested':'joined',acceptedGuidelinesAt:stamp(),createdAt:existing?.createdAt||stamp()};run('INSERT INTO private_records(id,kind,user_id,network,data,created) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',`support-member:${g.id}:${user.id}`,'support-membership',user.id,user.network,stringify(value),value.createdAt);return presentSupportGroup(g,user);});
          json(res,200,{group:result});return true;
        }
        if(action==='membership'&&method==='DELETE'){const g=supportGroup(groupId,user);if(g.hostPersonId===user.id)fail(400,'Hosts cannot cancel a group through the membership action.');run('DELETE FROM private_records WHERE id=? AND kind=? AND user_id=?',`support-member:${g.id}:${user.id}`,'support-membership',user.id);json(res,200,{group:presentSupportGroup(g,user)});return true;}
        if(action==='messages'&&method==='GET'){const g=supportGroup(groupId,user);requireSupportMember(g,user);json(res,200,{messages:supportMessages(g,user)});return true;}
        if(action==='messages'&&method==='POST'){
          limit(`support-message:${user.id}`,60,60000);const b=await readBody(req);supportBody(b,['text']);const message=checkedText(b.text,'Message',1200,1);
          const messages=transaction(()=>{const g=supportGroup(groupId,user);requireSupportMember(g,user);run('INSERT INTO support_messages(id,group_id,network,sender_id,text,created) VALUES(?,?,?,?,?,?)',randomUUID(),g.id,user.network,user.id,message,stamp());return supportMessages(g,user);});json(res,201,{messages});return true;
        }
      }
      if(path==='/api/logout'&&method==='POST'){const token=/kaki_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie||'')?.[1];if(token)run('DELETE FROM sessions WHERE token_hash=?',digest(token));res.setHeader('Set-Cookie','kaki_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');json(res,200,{ok:true});return true;}
      if(path==='/api/locations'&&method==='GET'){json(res,200,{locations:locations.filter(x=>x.network===user.network).map(enrichLocation)});return true;}
      if(path==='/api/neighbourhood/events'&&method==='GET'){const activities=all('activity',user.network).filter(a=>a.neighbourhoodOptIn===true&&activityVisible(a,user)).map(a=>presentActivity(a,user));json(res,200,{activities,meta:{scope:'neighbourhood',network:user.network,institutionScope:'across-schools',partnerImportsAvailable:false}});return true;}
      if(path==='/api/state'&&method==='GET'){
        const people=all('profile',user.network).filter(p=>visiblePeer(p,user)).map(p=>({...publicProfile(p,user),...matchInfo(p,user),connectionStatus:mutuallyConnected(p.id,user.id)?'connected':relation('connect',user.id,p.id)?'pending':relation('pass',user.id,p.id)?'passed':relation('save-person',user.id,p.id)?'saved':'none'}));
        const currentActivities=all('activity',user.network).filter(a=>activityVisible(a,user)).map(a=>presentActivity(a,user));
        const conversations=people.filter(p=>mutuallyConnected(user.id,p.id)).map(p=>{const last=one('SELECT * FROM messages WHERE network=? AND ((sender=? AND recipient=?) OR (sender=? AND recipient=?)) ORDER BY created DESC LIMIT 1',user.network,user.id,p.id,p.id,user.id);return {personId:p.id,person:p,mutual:true,lastMessage:last?presentMessage(last,user):null,unreadCount:one('SELECT COUNT(*) AS n FROM messages WHERE network=? AND sender=? AND recipient=? AND read=0',user.network,p.id,user.id).n};});
        const joined=currentActivities.filter(a=>a.joined),reflections=privateRecords('reflection',user);
        json(res,200,{user:self(user),activities:currentActivities,people,circles:all('circle',user.network).filter(c=>circleVisible(c,user)).map(c=>presentCircle(c,user)),tutors:all('tutor',user.network).filter(t=>people.some(p=>p.id===t.personId)).map(t=>presentTutor(t,user,people.find(p=>p.id===t.personId))),conversations,journey:{reflections,stats:{study:joined.filter(x=>x.category==='study').length,sports:joined.filter(x=>x.category==='sports').length,interests:joined.filter(x=>x.category==='interests').length,groups:joined.length},themes:['Friendship','Learning','Movement','Creativity','Personal growth']},...tutorRequestLists(user),meta:{demoMode,telegramAvailable:false,postalExamples:demoPostalExamples,availableGeocoder:!!process.env.ONEMAP_TOKEN,postalFixturesAvailable:true,anchorDate:ANCHOR_DATE,timezone:'Asia/Singapore',network:user.network,institutionSource:'MOE 2026 school directory'}});return true;
      }
      if(path==='/api/profile'&&method==='PATCH'){
        const b=await readBody(req),editable=new Set(['name','course','year','bio','avatar','interests','intentions','subjects','languages','studyStyle','availability','settings','onboardingComplete']);for(const key of Object.keys(b))if(!editable.has(key))fail(400,`${key} cannot be changed here.`);
        for(const [key,max] of [['name',70],['course',120],['year',40],['bio',400],['studyStyle',60]])if(key in b)user[key]=checkedText(b[key],key,max,key==='name'?2:0);
        for(const key of ['interests','intentions','subjects','languages','availability'])if(key in b)user[key]=list(b[key],key).map(noContact);
        if('avatar'in b){if(!/^\/assets\/kaki\/avatar-[1-6]\.webp$/.test(b.avatar))fail(400,'Choose one of the available profile photos.');user.avatar=b.avatar;}
        if('onboardingComplete'in b){if(typeof b.onboardingComplete!=='boolean')fail(400,'Invalid onboarding value.');user.onboardingComplete=b.onboardingComplete;}
        if('settings'in b){if(!b.settings||typeof b.settings!=='object'||Array.isArray(b.settings))fail(400,'Invalid privacy settings.');for(const [key,value] of Object.entries(b.settings)){if(!Object.hasOwn(user.settings,key))fail(400,'Unknown privacy setting.');if(key==='activityVisibility'){if(!['community','connections','private'].includes(value))fail(400,'Choose a valid activity visibility.');}else if(typeof value!=='boolean')fail(400,'Privacy settings must be on or off.');user.settings[key]=value;}}
        put('profile',user);json(res,200,{ok:true,user:self(user)});return true;
      }
      const am=/^\/api\/activities\/([^/]+)(?:\/(join|leave|save|audience))?$/.exec(path);
      if(am){const a=activity(am[1],user);if(method==='GET'&&!am[2]){json(res,200,{activity:presentActivity(a,user),members:a.participants.filter(id=>memberVisible(id,user)).map(id=>get('profile',id)).filter(Boolean).map(p=>publicProfile(p,user))});return true;}
        if(method==='POST'&&am[2]){const b=await readBody(req);transaction(()=>{
          const fresh=activity(am[1],user);
          if(am[2]==='audience'){if(fresh.hostId!==user.id)fail(403,'Only the host can change this event’s audience.');if(typeof b.neighbourhoodOptIn!=='boolean')fail(400,'Choose whether to share this event in Neighbourhood.');fresh.neighbourhoodOptIn=b.neighbourhoodOptIn;put('activity',fresh);
          }else if(am[2]==='join'){
            const role=fresh.category==='study'?studyRole(b.role===undefined?'peer':b.role):null,isMember=fresh.participants.includes(user.id),oldRole=fresh.participantRoles?.[user.id]||'peer';
            if(b.role!==undefined&&fresh.category!=='study')fail(400,'Peer and mentor roles are only for study sessions.');
            if(role&&sessionEnd(fresh)<=now()&&(!isMember||oldRole!==role))fail(409,'This study session has ended. Join an upcoming session.');
            if(!isMember){if(fresh.participants.length>=fresh.capacity)fail(409,'This activity is full. Try another small group.');fresh.participants.push(user.id);fresh.participantJoinedAt={...fresh.participantJoinedAt,[user.id]:stamp()};}
            if(role){fresh.participantRoles={...fresh.participantRoles,[user.id]:role};if(!fresh.participantRoleJoinedAt?.[user.id]||oldRole!==role)fresh.participantRoleJoinedAt={...fresh.participantRoleJoinedAt,[user.id]:stamp()};if(role==='mentor')registerMentor(user.id,fresh);}
            put('activity',fresh);
          }else if(am[2]==='leave'){if(fresh.hostId===user.id)fail(400,'The host cannot leave their own activity.');if(fresh.category==='study'&&sessionEnd(fresh)<=now()&&fresh.participants.includes(user.id))fail(409,'This study session has ended. Its participation record is now closed.');fresh.participants=fresh.participants.filter(x=>x!==user.id);if(fresh.participantRoles)delete fresh.participantRoles[user.id];if(fresh.participantRoleJoinedAt)delete fresh.participantRoleJoinedAt[user.id];if(fresh.participantJoinedAt)delete fresh.participantJoinedAt[user.id];put('activity',fresh);}else{if(relation('save-activity',user.id,fresh.id))delRelation('save-activity',user.id,fresh.id);else setRelation('save-activity',user.id,fresh.id);}
        });json(res,200,{ok:true,activity:presentActivity(get('activity',a.id),user)});return true;}
      }
      if(path==='/api/activities'&&method==='POST'){
        limit(`create:${user.id}`,20,3600000);const b=await readBody(req);if(b.network&&b.network!==user.network)fail(403,'Activities must remain in your education community.');const category=text(b.category,'Category',20,1).toLowerCase().replace(/^sport$/, 'sports');if(!['study','sports','games','lunch','interests','events','workshop','other'].includes(category))fail(400,'Choose an activity category.');const location=locations.find(x=>x.id===b.locationId&&x.network===user.network);if(!location)fail(400,'Choose an approved public campus location.');const capacity=Number(b.capacity);if(!Number.isInteger(capacity)||capacity<2||capacity>50)fail(400,'Group size must be between 2 and 50.');const slot=validateSlot(b.date,b.time);
        const img={study:'study',sports:'badminton',games:'games',lunch:'lunch',interests:'photography',events:'study',workshop:'study',other:'games'}[category];
        const a={id:randomUUID(),network:user.network,neighbourhoodOptIn:neighbourhoodOptIn(b.neighbourhoodOptIn),category,title:checkedText(b.title,'Title',100,4),description:checkedText(b.description,'Description',1200,10),...slot,location:location.name,locationId:location.id,capacity,participants:[user.id],participantRoles:category==='study'?{[user.id]:studyRole(b.role===undefined?'peer':b.role)}:{},hostId:user.id,image:`/assets/kaki/${img}.webp`,tags:b.tags?list(b.tags,'Tags',6).map(noContact):['New activity'],experience:checkedText(b.experience||'Everyone welcome','Experience',40),subject:checkedText(b.subject||'','Subject',80),createdAt:stamp()};a.participantJoinedAt={[user.id]:stamp()};a.participantRoleJoinedAt=category==='study'?{[user.id]:stamp()}:{};if(category==='study'&&a.participantRoles[user.id]==='mentor'){if(sessionEnd(a)<=now())fail(400,'Create an upcoming study session to mentor.');registerMentor(user.id,a);}put('activity',a);json(res,201,{ok:true,activity:presentActivity(a,user)});return true;
      }
      if(path==='/api/circles'&&method==='GET'){json(res,200,{circles:all('circle',user.network).filter(c=>circleVisible(c,user)).map(c=>presentCircle(c,user))});return true;}
      if(path==='/api/circles'&&method==='POST'){
        limit(`clubs:${user.id}`,10,3600000);const b=await readBody(req);if(b.network&&b.network!==user.network)fail(403,'Clubs stay in your education community.');
        const name=checkedText(b.name,'Club name',70,3),interest=checkedText(b.interest,'Interest',60,2),description=checkedText(b.description,'Description',800,10);const c={id:randomUUID(),name,title:name,interest,description,network:user.network,ageBand:user.ageBand,ownerId:user.id,members:[user.id],memberCount:1,image:/cod|study|book/i.test(interest)?'/assets/kaki/study.webp':/game|chess/i.test(interest)?'/assets/kaki/games.webp':'/assets/kaki/photography.webp',tags:[interest,'Everyone welcome'],activityIds:[],planIds:[],createdAt:stamp()};put('circle',c);json(res,201,{ok:true,circle:presentCircle(c,user)});return true;
      }
      const cm=/^\/api\/circles\/([^/]+)(?:\/(join|leave|messages|plans))?$/.exec(path);
      if(cm){const c=circle(cm[1],user);
        if(!cm[2]&&method==='GET'){json(res,200,{circle:presentCircle(c,user),plans:c.members.includes(user.id)?(c.planIds||[]).map(id=>get('plan',id)).filter(p=>p&&!blocked(p.creatorId,user.id)).map(p=>presentPlan(p,user)):[]});return true;}
        if(method==='POST'&&['join','leave'].includes(cm[2])){await readBody(req);const updated=transaction(()=>{const fresh=circle(c.id,user);if(cm[2]==='join'){if(!fresh.members.includes(user.id)){fresh.members.push(user.id);fresh.memberCount++;}}else{if(fresh.ownerId===user.id)fail(400,'The club creator cannot leave their own club.');if(fresh.members.includes(user.id)){fresh.members=fresh.members.filter(id=>id!==user.id);fresh.memberCount=Math.max(fresh.members.length,fresh.memberCount-1);}for(const id of fresh.planIds||[])run('DELETE FROM plan_origins WHERE plan_id=? AND user_id=?',id,user.id);}put('circle',fresh);return fresh;});json(res,200,{ok:true,circle:presentCircle(updated,user)});return true;}
        if(cm[2]==='messages'&&method==='GET'){const messages=q('SELECT data FROM club_messages WHERE circle_id=? AND network=? ORDER BY created DESC LIMIT 200',c.id,user.network).reverse().map(row=>parse(row.data)).filter(m=>{const author=get('profile',m.senderId);return author?.network===user.network&&!blocked(m.senderId,user.id)&&author.ageBand===user.ageBand;}).map(m=>presentClubMessage(m,user));json(res,200,{messages,circle:presentCircle(c,user)});return true;}
        if(cm[2]==='messages'&&method==='POST'){circle(c.id,user,{member:true});limit(`club-message:${user.id}`,30,60000);const b=await readBody(req),fresh=circle(c.id,user,{member:true}),message=clubMessage(fresh,user,{text:checkedText(b.text,'Message',2000,1)});json(res,201,{ok:true,message:presentClubMessage(message,user)});return true;}
        if(cm[2]==='plans'&&method==='POST'){circle(c.id,user,{member:true});limit(`plans:${user.id}`,15,3600000);const b=await readBody(req),p={id:randomUUID(),network:user.network,ageBand:user.ageBand,circleId:c.id,creatorId:user.id,title:checkedText(b.title||`${c.name} meetup`,'Title',100,4),category:categoryValue(b.category||'interests'),status:'draft',activityIds:[],createdAt:stamp()};transaction(()=>{const fresh=circle(c.id,user,{member:true});put('plan',p);fresh.planIds=[...(fresh.planIds||[]),p.id];put('circle',fresh);clubMessage(fresh,user,{type:'plan',planId:p.id,text:`Let’s plan ${p.title}. Add a starting postal code privately to find a public meetup spot.`});});json(res,201,{ok:true,plan:presentPlan(p,user)});return true;}
      }
      const pm=/^\/api\/plans\/([^/]+)(?:\/(origin|publish))?$/.exec(path);
      if(pm){const p=plan(pm[1],user);
        if(!pm[2]&&method==='GET'){json(res,200,{plan:presentPlan(p,user)});return true;}
        if(pm[2]==='origin'&&['POST','DELETE'].includes(method)){
          if(p.status!=='draft')fail(409,'Starting points are cleared after a plan is published.');
          if(method==='DELETE'){run('DELETE FROM plan_origins WHERE plan_id=? AND user_id=?',p.id,user.id);json(res,200,{ok:true,plan:presentPlan(p,user)});return true;}
          limit(`geocode:${user.id}`,20,3600000);const b=await readBody(req),postalCode=text(b.postalCode,'Postal code',6,6);if(!/^\d{6}$/.test(postalCode))fail(400,'Enter a six-digit Singapore postal code.');let point;try{point=await resolvePostalCode(postalCode,{demoMode});}catch(e){fail([400,404,422,429,502,503].includes(e.status)?e.status:503,e.message||'This postal code could not be located.');}if(!Number.isFinite(point.lat)||!Number.isFinite(point.lng))fail(503,'The postal service did not return a usable location.');
          transaction(()=>{const latest=plan(p.id,user);if(latest.status!=='draft')fail(409,'This plan was already published.');run('INSERT INTO plan_origins(plan_id,user_id,network,postal_code,lat,lng,expires) VALUES(?,?,?,?,?,?,?) ON CONFLICT(plan_id,user_id) DO UPDATE SET postal_code=excluded.postal_code,lat=excluded.lat,lng=excluded.lng,expires=excluded.expires',p.id,user.id,user.network,postalCode,point.lat,point.lng,now()+7*86400000);});json(res,200,{ok:true,plan:presentPlan(get('plan',p.id),user)});return true;
        }
        if(pm[2]==='publish'&&method==='POST'){
          const b=await readBody(req);if(p.creatorId!==user.id)fail(403,'Only the plan creator can publish this meetup.');
          if(p.status==='published'){json(res,200,{ok:true,plan:presentPlan(p,user),activities:p.activityIds.map(id=>presentActivity(activity(id,user),user))});return true;}
          const venue=publicMeetingVenues.find(v=>v.id===b.venueId);if(!venue)fail(400,'Choose a suggested public meetup venue.');const shareInNeighbourhood=neighbourhoodOptIn(b.neighbourhoodOptIn),slot=validateSlot(b.date,b.time),category=categoryValue(b.category||p.category),title=checkedText(b.title||p.title,'Title',100,4),description=checkedText(b.description,'Description',1200,10),capacity=Number(b.capacity);if(!Number.isInteger(capacity)||capacity<2||capacity>50)fail(400,'Group size must be between 2 and 50.');if(typeof b.weekly!=='boolean')fail(400,'Choose whether this meetup repeats weekly.');const occurrences=b.occurrences??1;if(!Number.isInteger(occurrences)||occurrences<1||occurrences>8||(!b.weekly&&occurrences!==1))fail(400,'Choose 1–8 weekly occurrences, or one meeting without recurrence.');
          const result=transaction(()=>{const latest=plan(p.id,user),c=circle(p.circleId,user,{member:true});if(latest.status==='published')return latest;const origins=activeOrigins(latest,user);if(!origins.length)fail(400,'Add at least one private starting postal code before publishing.');const suggestions=rankedVenues(origins);if(!suggestions.some(s=>s.id===venue.id))fail(400,'Choose a venue from the current group suggestions.');const ids=[],seriesId=randomUUID(),img={study:'study',sports:'badminton',games:'games',lunch:'lunch',interests:'photography',events:'study',workshop:'study',other:'games'}[category];for(let i=0;i<occurrences;i++){const date=new Date(`${slot.date}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+i*7);const a={id:randomUUID(),network:user.network,category,title,description,date:date.toISOString().slice(0,10),time:slot.time,location:venue.name,locationId:venue.id,capacity,participants:[user.id],participantRoles:category==='study'?{[user.id]:'peer'}:{},hostId:user.id,image:`/assets/kaki/${img}.webp`,tags:[c.name,b.weekly?'Weekly meetup':'Club meetup'],experience:'Everyone welcome',subject:'',createdAt:stamp(),circleId:c.id,planId:p.id,seriesId,occurrence:i+1,occurrences,weekly:b.weekly,neighbourhoodOptIn:shareInNeighbourhood};put('activity',a);ids.push(a.id);clubMessage(c,user,{type:'event',activityId:a.id,text:`${title} · ${a.date} at ${a.time} · ${venue.name}`});}latest.status='published';latest.activityIds=ids;latest.weekly=b.weekly;latest.occurrences=occurrences;latest.publishedAt=stamp();latest.contributionCount=origins.length;latest.suggestions=origins.length<2?publicMeetingVenues:suggestions;put('plan',latest);c.activityIds=[...(c.activityIds||[]),...ids];put('circle',c);run('DELETE FROM plan_origins WHERE plan_id=?',p.id);return latest;});json(res,201,{ok:true,plan:presentPlan(result,user),activities:result.activityIds.map(id=>presentActivity(activity(id,user),user))});return true;
        }
      }
      if(path==='/api/connections'&&method==='POST'){
        limit(`connections:${user.id}`,60,3600000);const b=await readBody(req),p=peer(b.personId,user,{requireVisible:true});if(!['pass','save','connect'].includes(b.action))fail(400,'Choose pass, save or connect.');if(b.action==='connect'&&!p.settings.allowInvites&&!mutuallyConnected(p.id,user.id)&&!relation('connect',p.id,user.id))fail(403,'This student is not accepting new invitations.');if(b.action==='save')setRelation('save-person',user.id,p.id);else setRelation(b.action,user.id,p.id);if(b.action==='connect')delRelation('pass',user.id,p.id);json(res,200,{ok:true,mutual:mutuallyConnected(p.id,user.id),person:{...publicProfile(p,user),...matchInfo(p,user)}});return true;
      }
      if(path==='/api/mentors'&&method==='GET'){const mentors=all('profile',user.network).filter(p=>p.mentorshipRegisteredAt&&visiblePeer(p,user)).map(p=>publicProfile(p,user));json(res,200,{mentors});return true;}
      const mentorPath=/^\/api\/mentors\/([^/]+)$/.exec(path);
      if(mentorPath&&method==='GET'){const p=mentorPath[1]===user.id?user:peer(mentorPath[1],user,{requireVisible:true});if(!p.mentorshipRegisteredAt)fail(404,'This student has not registered as a mentor.');json(res,200,{mentor:publicProfile(p,user)});return true;}
      const ml=/^\/api\/mentors\/([^/]+)\/like$/.exec(path);
      if(ml&&method==='POST'){await readBody(req);limit(`mentor-likes:${user.id}`,60,3600000);const p=peer(ml[1],user);if(!p.mentorshipRegisteredAt)fail(400,'This student has not registered as a mentor.');const existing=relation('mentor-like',user.id,p.id);if(!existing&&!mentorStats(p,user).canLike)fail(403,'Only a peer from a completed shared study session can like this mentor.');if(existing)delRelation('mentor-like',user.id,p.id);else setRelation('mentor-like',user.id,p.id,{createdAt:stamp()});json(res,200,{ok:true,liked:!existing,mentorStats:mentorStats(p,user)});return true;}
      const mm=/^\/api\/messages\/([^/]+)$/.exec(path);
      if(mm){const p=messageAllowed(mm[1],user);if(method==='GET'){run('UPDATE messages SET read=1 WHERE network=? AND sender=? AND recipient=?',user.network,p.id,user.id);const messages=q('SELECT * FROM messages WHERE network=? AND ((sender=? AND recipient=?) OR (sender=? AND recipient=?)) ORDER BY created LIMIT 500',user.network,user.id,p.id,p.id,user.id).map(m=>presentMessage(m,user));json(res,200,{messages,person:publicProfile(p,user)});return true;}
        if(method==='POST'){limit(`messages:${user.id}`,30,60000);const b=await readBody(req),body=checkedText(b.text,'Message',2000,1),id=randomUUID(),created=stamp();run('INSERT INTO messages(id,network,sender,recipient,text,created) VALUES(?,?,?,?,?,?)',id,user.network,user.id,p.id,body,created);json(res,201,{ok:true,message:{id,personId:p.id,senderId:user.id,text:body,createdAt:created,read:false}});return true;}
      }
      const tm=/^\/api\/tutors\/([^/]+)\/request$/.exec(path);
      if(tm&&method==='POST'){
        limit(`tutor:${user.id}`,10,3600000);const tutor=assertNetwork(get('tutor',tm[1]),user);peer(tutor.personId,user,{requireVisible:true});const b=await readBody(req),slot=validateSlot(b.date,b.time),message=checkedText(b.message||'I would like a little help with this subject.','Message',600,1);
        let duplicate=false;const request=transaction(()=>{const pending=privateRecords('tutor-request',user).find(r=>r.status==='pending'&&r.tutorId===tutor.id&&r.date===slot.date&&r.time===slot.time&&r.message===message);if(pending){duplicate=true;return {...pending,requesterId:user.id,recipientId:tutor.personId};}return record('tutor-request',user,{tutorId:tutor.id,personId:tutor.personId,recipientId:tutor.personId,requesterId:user.id,...slot,message,status:'pending'});});
        json(res,duplicate?200:201,{ok:true,request});return true;
      }
      const trm=/^\/api\/tutor-requests\/([^/]+)$/.exec(path);
      if(trm&&method==='PATCH'){
        const b=await readBody(req);if(!['accepted','declined','cancelled'].includes(b.status))fail(400,'Choose accepted, declined or cancelled.');
        const request=transaction(()=>{const row=one('SELECT * FROM private_records WHERE id=? AND kind=? AND network=?',trm[1],'tutor-request',user.network);if(!row)fail(404,'This tutoring request is unavailable.');const r=parse(row.data),isRequester=row.user_id===user.id,isRecipient=r.personId===user.id;if(!isRequester&&!isRecipient)fail(404,'This tutoring request is unavailable.');if(!tutorRequestVisible(row,user))fail(403,'This tutoring connection is unavailable.');if((b.status==='cancelled'&&!isRequester)||(b.status!=='cancelled'&&!isRecipient))fail(403,'Only the appropriate participant can make this change.');if(r.status===b.status)return presentTutorRequest(row,user);if(r.status!=='pending')fail(409,'This request has already been answered.');r.status=b.status;r.updatedAt=stamp();row.data=stringify(r);run('UPDATE private_records SET data=? WHERE id=?',row.data,row.id);return presentTutorRequest(row,user);});
        json(res,200,{ok:true,request});return true;
      }
      if(path==='/api/reports'&&method==='POST'){
        limit(`reports:${user.id}`,15,3600000);const b=await readBody(req),support=get('support-group',b.targetId),target=get('profile',b.targetId)||get('activity',b.targetId)||get('circle',b.targetId)||(support&&supportGroup(b.targetId,user));assertNetwork(target,user);const report=record('report',user,{targetId:target.id,reason:text(b.reason,'Reason',100,2),details:text(b.details||'','Details',2000),status:'received'});if(b.block===true){const personId=get('profile',b.targetId)?b.targetId:target.hostId||target.hostPersonId;if(personId&&personId!==user.id)blockPerson(user,personId);}json(res,201,{ok:true,report,message:'Your report has been saved for review. This local demo has no live moderation team.'});return true;
      }
      if(path==='/api/blocks'&&method==='POST'){const b=await readBody(req),p=assertNetwork(get('profile',b.personId),user);if(p.id===user.id)fail(400,'You cannot block yourself.');blockPerson(user,p.id);json(res,200,{ok:true});return true;}
      const bm=/^\/api\/blocks\/([^/]+)$/.exec(path);if(bm&&method==='DELETE'){assertNetwork(get('profile',bm[1]),user);delRelation('block',user.id,bm[1]);json(res,200,{ok:true});return true;}
      if(path==='/api/reflections'&&method==='POST'){limit(`reflection:${user.id}`,30,3600000);const b=await readBody(req);if(b.activityId){const a=activity(b.activityId,user);if(!a.participants.includes(user.id))fail(403,'Reflect on an activity you have joined.');}const reflection=record('reflection',user,{text:text(b.text||'','Reflection',3000),tags:list(b.tags||[],'Reflection tags',8),activityId:b.activityId||null});json(res,201,{ok:true,reflection});return true;}
      if(path==='/api/telegram/consent'&&method==='POST'){const b=await readBody(req),p=messageAllowed(b.personId,user);if(typeof b.consent!=='boolean')fail(400,'Choose whether you consent.');if(user.ageBand==='under18'||p.ageBand==='under18')fail(403,'External contact sharing is unavailable for under-18 accounts.');if(b.consent)setRelation('telegram-consent',user.id,p.id);else delRelation('telegram-consent',user.id,p.id);const mutual=Boolean(relation('telegram-consent',user.id,p.id)&&relation('telegram-consent',p.id,user.id));json(res,200,{ok:true,consent:b.consent,mutual,available:false,username:null,message:'Your preference is saved. Telegram linking is not configured yet; no contact details have been shared.'});return true;}
      fail(404,'This API route is not available.');
    }catch(error){if(!res.headersSent){if(!(error instanceof HttpError))console.error('kaki API error:',error);json(res,error instanceof HttpError?error.status:500,{error:error instanceof HttpError?error.message:'Something went wrong. Please try again.'});}else res.end();}
    return true;
  };
  const cleanupExpiredOrigins=()=>run('DELETE FROM plan_origins WHERE expires<=?',now());
  cleanupExpiredOrigins();
  const expiryTimer=setInterval(cleanupExpiredOrigins,60000);expiryTimer.unref();
  return {handle:(req,res)=>requestCache.run({version:mutationVersion,stats:new Map(),activities:new Map()},()=>handle(req,res)),close:()=>{clearInterval(expiryTimer);db.close();}};
}




