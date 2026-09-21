import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, validState, migrate, matchPeople, diagnose, transition, validPlan, activeExchange } from '../core.js';
const future=()=>new Date(Date.now()+7*86400000).toISOString().slice(0,16);
const pending=()=>({id:'test',personId:'zhou',name:'小周',give:'PPT 排版',want:'英语口语',status:'pending',plan:{when:future(),myMinutes:30,theirMinutes:30,mode:'线上实时'},done:{me:false,them:false},outcomes:{me:null,them:null},review:null,history:[]});
test('Independent skill pools find cross-card matches and group multiple return options by person',()=>{
  const s=freshState();s.filter='exchange';const list=matchPeople(s);
  assert.deepEqual(list.map(m=>m.person.id),['zhou','chen']);
  assert.deepEqual(list[1].pairs,[{give:'Excel 公式',want:'英语口语'}]);
  s.selected='手机摄影';const lin=matchPeople(s).find(m=>m.person.id==='lin');
  assert.deepEqual(lin.pairs.map(p=>p.give),['Excel 公式','PPT 排版']);
});
test('Time filtering and relaxing do not invent common time',()=>{
  const s=freshState();s.filter='exchange';s.selected='Vibe Coding';s.profile.learn.push({name:'Vibe Coding'});s.profile.flexible=false;
  assert.equal(matchPeople(s).length,0);assert.equal(diagnose(s).code,'time');
  s.profile.flexible=true;const matches=matchPeople(s);assert.equal(matches.length,1);assert.equal(matches[0].common.length,0);
  s.profile.flexible=false;assert.equal(matchPeople(s).length,0);
});
test('No result diagnoses distinguish missing skill, missing supply, reciprocity and skipped cards',()=>{
  const s=freshState();s.filter='exchange';s.selected='吉他';s.profile.learn.push({name:'吉他'});assert.equal(diagnose(s).code,'skills');
  s.selected='陶艺';assert.equal(diagnose(s).code,'supply');
  s.selected='英语口语';s.skipped=matchPeople(s).map(m=>m.skipKey);assert.equal(diagnose(s).code,'skipped');
  s.profile.teach=[];assert.equal(diagnose(s).code,'teach');
  s.profile.learn=[];assert.equal(diagnose(s).code,'learn');
});
test('Full exchange requires two teaching confirmations and two separate outcome confirmations',()=>{
  let e=pending();assert.throws(()=>transition(e,'start'));e=transition(e,'accept');e=transition(e,'start');
  assert.throws(()=>transition(e,'outcome',{actor:'me',result:'achieved'}));
  e=transition(e,'done',{actor:'me'});assert.equal(e.status,'learning');
  assert.throws(()=>transition(e,'done',{actor:'me'}));
  e=transition(e,'done',{actor:'them'});assert.equal(e.status,'verifying');
  e=transition(e,'outcome',{actor:'me',result:'partial',note:'需要更多练习'});assert.equal(e.status,'verifying');
  e=transition(e,'outcome',{actor:'them',result:'achieved'});assert.equal(e.status,'completed');assert.equal(e.outcomes.me.result,'partial');
  assert.throws(()=>transition(e,'review',{rating:0}));
  e=transition(e,'review',{rating:4,note:'反馈很具体'});assert.equal(e.review.rating,4);
  const s=freshState();s.exchanges=[e];assert.ok(validState(s));assert.equal(activeExchange(s,'zhou',e.give,e.want),undefined);
});
test('Counteroffer invalidates the prior agreement and requires reconfirmation',()=>{
  let e=transition(pending(),'accept');
  e=transition(e,'counter',{when:future(),myMinutes:45,theirMinutes:30});assert.equal(e.status,'negotiating');assert.throws(()=>transition(e,'start'));
  e=transition(e,'confirm');assert.equal(e.status,'scheduled');
  e=transition(e,'propose',{when:future(),myMinutes:30,theirMinutes:45});assert.equal(e.status,'pending');
});
test('Unscheduled or past proposals cannot be accepted',()=>{
  const e=pending();e.plan.when='';assert.throws(()=>transition(e,'accept'));
  e.plan.when='2020-01-01T10:00';assert.throws(()=>transition(e,'accept'));
  assert.equal(validPlan({...e.plan,when:future(),myMinutes:0}),false);
});
test('Cancellation after one side taught retains their work and history',()=>{
  let e=transition(transition(pending(),'accept'),'start');e=transition(e,'done',{actor:'me'});
  e=transition(e,'cancel',{reason:'对方未按约定参与'});assert.equal(e.done.me,true);assert.equal(e.done.them,false);assert.equal(e.status,'cancelled');assert.ok(e.history.length);
  assert.throws(()=>transition(e,'start'));
});
test('Old cards migrate without discarding pending invitations',()=>{
  const s=migrate({mine:[{give:'PPT 排版',want:'英语口语',goal:'自我介绍',time:'周三晚上',flex:true},{give:'Excel 公式',want:'手机摄影',time:'周六上午'}],saved:['m1:c1'],invitations:[{id:12,key:'m1:c1',name:'小周',give:'PPT 排版',want:'英语口语',goal:'原始目标',when:future()}]});
  assert.equal(s.profile.teach.length,2);assert.equal(s.profile.learn.length,2);assert.equal(s.exchanges[0].myGoal,'原始目标');assert.equal(s.exchanges[0].status,'pending');assert.deepEqual(s.saved,['zhou']);assert.ok(validState(s));
});
test('Malformed local data rejected while normal state survives JSON persistence',()=>{
  assert.ok(validState(JSON.parse(JSON.stringify(freshState()))));
  const s=freshState();s.exchanges=[{}];assert.equal(validState(s),false);
});

test('Discovery types include one-way learning and teaching without requiring reciprocity',()=>{
  const s=freshState();
  const all=matchPeople(s);
  assert.equal(new Set(all.map(m=>m.person.id+':'+m.kind)).size,all.length);
  assert.deepEqual(all.filter(m=>m.person.id==='zhou').map(m=>m.kind),['exchange','learn','teach']);
  s.filter='learn';assert.deepEqual(matchPeople(s).map(m=>m.person.id),['zhou','chen']);
  s.profile.teach=[];assert.equal(matchPeople(s).length,2);
  s.profile.learn.push({name:'吉他'});s.selected='吉他';assert.deepEqual(matchPeople(s).map(m=>m.person.id),['an']);
  s.filter='exchange';assert.equal(matchPeople(s).length,0);
});
test('Teaching filters by the selected skill and works without any learning goals',()=>{
  const s=freshState();s.filter='teach';s.teachSelected='Excel 公式';s.profile.learn=[];
  assert.deepEqual(matchPeople(s).map(m=>m.person.id),['chen','lin','yu']);
  assert.ok(matchPeople(s).every(m=>m.kind==='teach'&&m.teaching.every(t=>t.name==='Excel 公式')));
  s.teachSelected='PPT 排版';assert.deepEqual(matchPeople(s).map(m=>m.person.id),['zhou','lin','xu']);
});
test('Skipping a learning result does not hide the partner in another discovery type',()=>{
  const s=freshState();s.filter='learn';s.skipped=[matchPeople(s)[0].skipKey];assert.equal(matchPeople(s).length,1);
  s.filter='exchange';assert.equal(matchPeople(s).length,2);
});

test('Paid discovery requires explicit paid offers or budgets; barter remains available',()=>{
  const s=freshState();s.selected='手机摄影';s.filter='learn';
  assert.deepEqual(matchPeople(s).map(m=>m.person.id),['lin']);
  s.filter='exchange';assert.ok(matchPeople(s).some(m=>m.person.id==='yu'));
  s.filter='teach';s.profile.teach.push({name:'Vibe Coding'});s.teachSelected='Vibe Coding';
  assert.equal(matchPeople(s).length,0);
});
