import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApi } from './api.mjs';
import { NETWORKS } from './data.mjs';

async function fixture(t,options={}) {
  const folder=mkdtempSync(join(tmpdir(),'kaki-support-')),dbPath=join(folder,'test.sqlite');
  let time=Date.parse('2026-09-13T04:00:00Z'),api=createApi({dbPath,now:()=>time,...options});
  const server=createServer((req,res)=>api.handle(req,res));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));api.close();rmSync(folder,{recursive:true,force:true});});
  const client=()=>{let cookie='';return {get cookie(){return cookie;},async call(path,method='GET',body){const response=await fetch(base+'/api'+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(method==='GET'?{}:{Origin:base,'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});const set=response.headers.get('set-cookie');if(set)cookie=set.split(';')[0];return {status:response.status,body:await response.json()};}};};
  const inspect=fn=>{const db=new DatabaseSync(dbPath);try{return fn(db);}finally{db.close();}};
  return {client,inspect,advance(ms){time+=ms;},async demo(network='polytechnic'){const c=client();assert.equal((await c.call('/demo','POST',{network})).status,200);return c;},async signup(email,ageBand='18plus'){const c=client(),start=(await c.call('/auth/start','POST',{institutionId:'sp',email,ageBand})).body,result=await c.call('/auth/verify','POST',{challengeId:start.challengeId,code:start.demoCode});assert.equal(result.status,200);return {client:c,user:result.body.user};},restart(){api.close();time+=86400000;api=createApi({dbPath,now:()=>time,...options});}};
}
const path=id=>`/support/groups/${id}`;
const joinBody={acceptGuidelines:true,waitlist:false};
const applicationBody={topics:['study-pressure','friendships'],formats:['small-group','one-to-one'],availability:'Weekday afternoons',experience:'I would like to practise listening patiently and respecting boundaries.',acceptBoundaries:true};

test('support groups enforce authentication, four networks and exact age bands on every route',async t=>{
  const f=await fixture(t),anonymous=f.client();
  for(const route of ['/support/groups','/support/listener-application','/support/groups/polytechnic-18plus-support-1/messages'])assert.equal((await anonymous.call(route)).status,401);
  const clients={};
  for(const network of NETWORKS){const c=clients[network]=await f.demo(network),result=(await c.call('/support/groups')).body;assert.equal(result.groups.length,8);assert.equal(result.listenerApplication,null);assert.equal(new Set(result.groups.map(g=>g.need)).size,5);assert.equal(new Set(result.groups.map(g=>g.format)).size,3);assert.ok(result.groups.every(g=>g.demoSample&&g.host.verification==='demo'&&g.date>='2026-09-15'));for(const g of result.groups.filter(g=>g.leaderType==='professional'))assert.match(g.host.credentials,/Fictional.+not been verified/);}
  for(const network of NETWORKS)for(const other of NETWORKS.filter(x=>x!==network)){
    const age=['secondary','jc_mi'].includes(other)?'under18':'18plus',id=`${other}-${age}-support-1`;
    for(const [suffix,method,body] of [['','GET'],['/join','POST',joinBody],['/membership','DELETE'],['/messages','GET'],['/messages','POST',{text:'Hello everyone'}]])assert.equal((await clients[network].call(path(id)+suffix,method,body)).status,404);
  }
  const minor=await f.signup('support-minor@ichat.sp.edu.sg','under18');assert.equal((await minor.client.call('/support/groups')).body.groups.length,8);
  for(const [c,id] of [[minor.client,'polytechnic-18plus-support-1'],[clients.polytechnic,'polytechnic-under18-support-1']])for(const [suffix,method,body] of [['','GET'],['/join','POST',joinBody],['/membership','DELETE'],['/messages','GET'],['/messages','POST',{text:'Hello everyone'}]])assert.equal((await c.call(path(id)+suffix,method,body)).status,403);
});

test('support joins are capacity-safe, idempotent, private and explicitly waitlisted',async t=>{
  const f=await fixture(t),a=await f.demo(),b=(await f.signup('support-capacity@ichat.sp.edu.sg')).client,id='polytechnic-18plus-support-2';
  const before=(await a.call('/state')).body;
  const responses=await Promise.all([a,b].map(c=>c.call(path(id)+'/join','POST',joinBody)));assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
  const winner=responses[0].status===200?a:b,other=winner===a?b:a;
  let group=(await winner.call(path(id))).body.group;assert.equal(group.memberCount,6);assert.equal(group.spotsLeft,0);assert.equal(group.myMembership,'joined');assert.equal(group.status,'full');
  const duplicate=await winner.call(path(id)+'/join','POST',joinBody);assert.deepEqual(duplicate.body.group,group);
  group=(await other.call(path(id)+'/join','POST',{acceptGuidelines:true,waitlist:true})).body.group;assert.equal(group.memberCount,6);assert.equal(group.myMembership,'waitlisted');
  for(const method of ['GET','POST'])assert.equal((await other.call(path(id)+'/messages',method,method==='POST'?{text:'Not a joined member'}:undefined)).status,403);
  assert.equal((await winner.call(path(id)+'/membership','DELETE')).body.group.spotsLeft,1);
  group=(await other.call(path(id)+'/join','POST',joinBody)).body.group;assert.equal(group.myMembership,'joined');assert.equal(group.memberCount,6);
  assert.equal((await other.call(path(id)+'/membership','DELETE')).body.group.myMembership,null);assert.equal((await other.call(path(id)+'/membership','DELETE')).body.group.spotsLeft,1);
  const after=(await a.call('/state')).body;assert.deepEqual(after,before);
  const publicKeys=['id','title','summary','description','need','needLabel','leaderType','format','mode','capacity','date','time','durationMinutes','location','topics','expectations','demoSample','host','memberCount','spotsLeft','status','myMembership','isHost','isEnded'].sort();assert.deepEqual(Object.keys(group).sort(),publicKeys);assert.deepEqual(Object.keys(group.host).sort(),['name','role','credentials','bio','verification'].sort());
  assert.equal((await a.call(path(id)+'/join','POST',{acceptGuidelines:false,waitlist:false})).status,400);assert.equal((await a.call(path(id)+'/join','POST',{...joinBody,status:'joined'})).status,400);assert.equal((await a.call(path(id)+'/join','POST',{...joinBody,waitlist:true})).status,422);
});

test('one-to-one support requests reserve the slot, remain pending, and cancellation frees it',async t=>{
  const f=await fixture(t),a=await f.demo(),b=(await f.signup('support-request@ichat.sp.edu.sg')).client,id='polytechnic-18plus-support-6';
  let group=(await a.call(path(id)+'/join','POST',joinBody)).body.group;assert.equal(group.myMembership,'requested');assert.equal(group.memberCount,1);assert.equal(group.status,'full');
  assert.equal((await a.call(path(id)+'/join','POST',joinBody)).body.group.memberCount,1);
  assert.equal((await b.call(path(id)+'/join','POST',joinBody)).status,409);assert.equal((await b.call(path(id)+'/join','POST',{acceptGuidelines:true,waitlist:true})).body.group.myMembership,'waitlisted');
  assert.equal((await a.call(path(id)+'/messages')).status,403);assert.equal((await a.call(path(id)+'/messages','POST',{text:'May I start chatting?'})).status,403);assert.equal((await a.call(path(id)+'/join','PATCH',{status:'joined'})).status,404);
  f.restart();assert.equal((await a.call(path(id))).body.group.myMembership,'requested');
  group=(await a.call(path(id)+'/membership','DELETE')).body.group;assert.equal(group.spotsLeft,1);assert.equal(group.myMembership,null);
  group=(await b.call(path(id)+'/join','POST',joinBody)).body.group;assert.equal(group.myMembership,'requested');assert.equal(group.memberCount,1);
});

test('support discussions are member-only, block-aware and expose only a message allowlist',async t=>{
  const f=await fixture(t),a=await f.demo(),other=await f.signup('support-discussion@ichat.sp.edu.sg'),b=other.client,id='polytechnic-18plus-support-4';
  assert.equal((await a.call(path(id)+'/messages')).status,403);
  for(const c of [a,b])assert.equal((await c.call(path(id)+'/join','POST',joinBody)).status,200);
  let response=await b.call(path(id)+'/messages','POST',{text:'I am glad there is space to listen.'});assert.equal(response.status,201);assert.equal(response.body.messages.length,2);assert.equal(response.body.messages[1].mine,true);
  let messages=(await a.call(path(id)+'/messages')).body.messages;assert.equal(messages.length,2);assert.equal(messages[1].mine,false);for(const m of messages)assert.deepEqual(Object.keys(m).sort(),['id','text','senderName','mine','createdAt'].sort());
  assert.equal((await a.call(path(id)+'/messages','POST',{text:'Contact me at private@example.com'})).status,400);assert.equal((await a.call(path(id)+'/messages','POST',{text:'Hello',senderId:other.user.id})).status,400);
  await a.call('/blocks','POST',{personId:other.user.id});assert.equal((await a.call(path(id)+'/messages')).body.messages.length,1);
  await b.call(path(id)+'/membership','DELETE');assert.equal((await b.call(path(id)+'/messages')).status,403);assert.equal((await b.call(path(id)+'/messages','POST',{text:'I already left'})).status,403);
  const student='polytechnic-18plus-support-1';assert.equal((await a.call(path(student)+'/join','POST',joinBody)).status,200);await a.call('/blocks','POST',{personId:'polytechnic-p3'});
  assert.ok(!(await a.call('/support/groups')).body.groups.some(g=>g.id===student));for(const suffix of ['','/messages'])assert.equal((await a.call(path(student)+suffix)).status,403);assert.equal((await a.call(path(student)+'/join','POST',joinBody)).status,403);
  assert.equal(f.inspect(db=>db.prepare("SELECT COUNT(*) AS n FROM private_records WHERE id=? AND kind='support-membership'").get(`support-member:${student}:polytechnic-p0`).n),0);
});

test('listener applications stay private and pending without granting profile or helper privileges',async t=>{
  const f=await fixture(t),a=await f.demo(),b=(await f.signup('support-application@ichat.sp.edu.sg')).client,before=(await a.call('/state')).body;
  assert.equal((await a.call('/support/listener-application')).body.application,null);
  for(const body of [{...applicationBody,acceptBoundaries:false},{...applicationBody,topics:['diagnosis']},{...applicationBody,formats:[]},{...applicationBody,status:'approved'},{...applicationBody,verified:true}])assert.equal((await a.call('/support/listener-application','POST',body)).status,400);
  let response=await a.call('/support/listener-application','POST',applicationBody);assert.equal(response.status,201);const application=response.body.application;assert.equal(application.status,'pending');assert.deepEqual(application.topics,applicationBody.topics);
  assert.equal((await b.call('/support/listener-application')).body.application,null);assert.equal((await b.call('/support/groups')).body.listenerApplication,null);assert.equal((await b.call('/support/listener-application/'+encodeURIComponent(application.id))).status,404);
  assert.deepEqual((await a.call('/state')).body,before);assert.equal((await a.call('/support/groups')).body.listenerApplication.id,application.id);
  f.restart();assert.deepEqual((await a.call('/support/listener-application')).body.application,application);
  response=await a.call('/support/listener-application','POST',{...applicationBody,availability:'Saturday afternoons'});assert.equal(response.status,200);assert.equal(response.body.application.id,application.id);assert.equal(response.body.application.status,'pending');assert.equal(response.body.application.createdAt,application.createdAt);
  assert.equal((await a.call('/support/listener-application','DELETE')).body.application,null);assert.equal((await a.call('/support/listener-application','DELETE')).status,200);assert.equal((await a.call('/support/listener-application')).body.application,null);
});

test('support demo migration preserves existing data, memberships, session cookies and messages across restart',async t=>{
  const f=await fixture(t),a=await f.demo(),id='polytechnic-18plus-support-1';
  await a.call(path(id)+'/join','POST',joinBody);await a.call(path(id)+'/messages','POST',{text:'A saved message in this private group.'});
  const counts=()=>f.inspect(db=>({groups:db.prepare("SELECT COUNT(*) AS n FROM objects WHERE kind='support-group'").get().n,members:db.prepare("SELECT COUNT(*) AS n FROM private_records WHERE kind='support-membership'").get().n,messages:db.prepare('SELECT COUNT(*) AS n FROM support_messages').get().n,profiles:db.prepare("SELECT data FROM objects WHERE kind='profile' ORDER BY id").all(),activities:db.prepare("SELECT data FROM objects WHERE kind='activity' ORDER BY id").all(),hearts:db.prepare("SELECT * FROM relations WHERE kind='mentor-like' ORDER BY sender,recipient").all()}));
  const before=counts(),date=(await a.call(path(id))).body.group.date;assert.equal(before.groups,64);assert.equal(before.messages,65);
  f.restart();assert.deepEqual(counts(),before);assert.equal((await a.call(path(id))).body.group.date,date);assert.equal((await a.call(path(id))).body.group.myMembership,'joined');assert.equal((await a.call(path(id)+'/messages')).body.messages.at(-1).text,'A saved message in this private group.');
});

test('live mode never seeds fictional support groups or professional credentials',async t=>{
  const f=await fixture(t,{demoMode:false});assert.equal(f.inspect(db=>db.prepare("SELECT COUNT(*) AS n FROM objects WHERE kind='support-group'").get().n),0);assert.equal(f.inspect(db=>db.prepare('SELECT COUNT(*) AS n FROM support_messages').get().n),0);assert.equal((await f.client().call('/demo','POST',{})).status,404);
});

test('ended support sessions reject new memberships and private reports preserve community boundaries',async t=>{
  const f=await fixture(t),a=await f.demo(),b=(await f.signup('support-ended@ichat.sp.edu.sg')).client,id='polytechnic-18plus-support-1';
  await a.call(path(id)+'/join','POST',joinBody);
  const group=(await a.call(path(id))).body.group;f.advance(Date.parse(`${group.date}T${group.time}:00+08:00`)+group.durationMinutes*60000-Date.parse('2026-09-13T04:00:00Z'));
  assert.equal((await b.call(path(id)+'/join','POST',joinBody)).status,409);assert.equal((await b.call(path(id)+'/join','POST',{acceptGuidelines:true,waitlist:true})).status,409);
  assert.equal((await a.call(path(id)+'/join','POST',joinBody)).body.group.myMembership,'joined');assert.equal((await a.call(path(id)+'/messages')).status,200);assert.equal((await a.call(path(id)+'/membership','DELETE')).body.group.myMembership,null);
  f.inspect(db=>{const row=db.prepare("SELECT data FROM objects WHERE kind='support-group' AND id=?").get('polytechnic-18plus-support-6'),oneToOne=JSON.parse(row.data);oneToOne.date=group.date;oneToOne.time=group.time;db.prepare("UPDATE objects SET data=? WHERE kind='support-group' AND id=?").run(JSON.stringify(oneToOne),oneToOne.id);});assert.equal((await b.call(path('polytechnic-18plus-support-6')+'/join','POST',joinBody)).status,409);assert.equal((await b.call(path(id))).body.group.isEnded,true);
  const report={targetId:id,reason:'Privacy concern',details:'Please review this fictional support group.'};const sent=await a.call('/reports','POST',report);assert.equal(sent.status,201);assert.equal(sent.body.report.targetId,id);
  assert.equal((await b.call('/state')).body.reports,undefined);assert.equal((await a.call('/reports','POST',{...report,targetId:'university-18plus-support-1'})).status,404);assert.equal((await a.call('/reports','POST',{...report,targetId:'polytechnic-under18-support-1'})).status,403);
  assert.equal((await a.call('/reports','POST',{...report,block:true})).status,201);assert.equal((await a.call(path(id))).status,403);
});

test('linked support hosts cannot occupy their own slots but can facilitate ordinary group chat',async t=>{
  const f=await fixture(t),host=await f.signup('support-host@ichat.sp.edu.sg'),ids=['polytechnic-18plus-support-1','polytechnic-18plus-support-6'];
  f.inspect(db=>{for(const id of ids){const g=JSON.parse(db.prepare("SELECT data FROM objects WHERE kind='support-group' AND id=?").get(id).data);g.hostPersonId=host.user.id;db.prepare("UPDATE objects SET data=? WHERE kind='support-group' AND id=?").run(JSON.stringify(g),id);}});
  for(const id of ids){const group=(await host.client.call(path(id))).body.group;assert.equal(group.isHost,true);assert.equal(group.myMembership,null);for(const waitlist of [false,true])assert.equal((await host.client.call(path(id)+'/join','POST',{acceptGuidelines:true,waitlist})).status,400);assert.equal((await host.client.call(path(id)+'/membership','DELETE')).status,400);}
  assert.equal((await host.client.call(path(ids[0])+'/messages')).status,200);assert.equal((await host.client.call(path(ids[0])+'/messages','POST',{text:'Welcome, and share only what feels comfortable.'})).status,201);
  assert.equal((await host.client.call(path(ids[1])+'/messages')).status,403);assert.equal((await host.client.call(path(ids[1])+'/messages','POST',{text:'Cannot open an unconfirmed conversation.'})).status,403);
});
