import { initialProfile, people } from './data.js?v=paid-6';
export const STORAGE_KEY = 'dabashou-skills-v3';
export const clone = value => JSON.parse(JSON.stringify(value));
export const uid = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function freshState() {
  return { version: 3, profile: clone(initialProfile), selected: '英语口语', filter: 'all', saved: [], skipped: [], subscriptions: [], exchanges: [] };
}
export function validState(s) {
  const entry = v => v && typeof v.name === 'string' && v.name.trim() && v.name.length <= 40;
  return s?.version === 3 && s.profile && typeof s.profile.bio === 'string' &&
    ['teach','learn'].every(k => Array.isArray(s.profile[k]) && s.profile[k].every(entry)) &&
    Array.isArray(s.profile.times) && s.profile.times.every(t=>typeof t==='string') && typeof s.profile.flexible === 'boolean' &&
    ['saved','skipped','subscriptions','exchanges'].every(k=>Array.isArray(s[k])) &&
    s.exchanges.every(e=>e && typeof e.id==='string' && typeof e.give==='string' && typeof e.want==='string' && typeof e.name==='string' && STATES.includes(e.status) && e.plan && Number(e.plan.myMinutes)>0 && Number(e.plan.theirMinutes)>0 && e.done && e.outcomes && Array.isArray(e.history));
}
export function migrate(old) {
  const s = freshState();
  if (!Array.isArray(old?.mine)) return s;
  s.profile.teach = [...new Map(old.mine.filter(c=>typeof c?.give==='string').map(c=>[c.give,{ name:c.give, level:'入门', scope:'', evidence:'' }])).values()];
  s.profile.learn = [...new Map(old.mine.filter(c=>typeof c?.want==='string').map(c=>[c.want,{ name:c.want, level:'入门', goal: typeof c.goal==='string'?c.goal:'' }])).values()];
  s.profile.times = [...new Set(old.mine.map(c=>c.time).filter(t=>typeof t==='string'))];
  s.profile.flexible = old.mine.some(c=>c.flex);
  s.selected = s.profile.learn[0]?.name || '';
  const oldIDs = {c1:'zhou', c2:'chen', c3:'lin', c4:'yu'};
  s.saved = [...new Set((old.saved||[]).map(k=>oldIDs[String(k).split(':')[1]]).filter(Boolean))];
  s.exchanges = (old.invitations||[]).filter(e=>e && typeof e.give==='string' && typeof e.want==='string').map(e=>({
    id: String(e.id), personId: oldIDs[String(e.key).split(':')[1]] || '', name: String(e.name || '交换伙伴'), give:e.give, want:e.want,
    myGoal:e.goal || '', theirGoal:e.theirGoal || '', status:'pending', plan:{when:e.when || '', flexible:!!e.flex, myMinutes:30, theirMinutes:30, mode:'线上实时'},
    done:{me:false,them:false}, outcomes:{me:null,them:null}, review:null, history:[{at:Date.now(),text:'从旧版保留邀请，等待对方确认。'}]
  }));
  return s;
}
export function combinations(profile, person, skill) {
  return person.teach.filter(t=>profile.learn.some(w=>w.name===t.name)&&(!skill||t.name===skill)).flatMap(t=>
    person.learn.filter(w=>profile.teach.some(g=>g.name===w.name)).map(w=>({want:t.name,give:w.name})));
}
export function matchPeople(state, catalog = people) {
  const mode = ['exchange','learn','teach'].includes(state.filter) ? state.filter : 'all';
  const teachSelected = state.profile.teach.some(s=>s.name===state.teachSelected) ? state.teachSelected : state.profile.teach[0]?.name;
  return catalog.flatMap(person=>{
    const pairs=combinations(state.profile,person,state.selected);
    const learning=person.teach.filter(t=>t.paid===true && Number(t.price)>0 && Number(t.minutes)>0 && t.name===state.selected && state.profile.learn.some(s=>s.name===t.name));
    const teaching=person.learn.filter(t=>t.paid===true && Number(t.budget)>0 && Number(t.minutes)>0 && state.profile.teach.some(s=>s.name===t.name) && (mode!=='teach'||t.name===teachSelected));
    const common=person.times.filter(t=>state.profile.times.includes(t));
    const kinds=mode==='all'?['exchange','learn','teach']:[mode];
    return kinds.map(kind=>{
      const relevant=kind==='exchange'?pairs.length:kind==='learn'?learning.length:teaching.length;
      const skipKey=`${mode}:${mode==='teach'?teachSelected:state.selected}:${person.id}:${kind}`;
      return {person,pairs,learning,teaching,kind,relevant,common,skipKey,available:!!common.length||state.profile.flexible||person.flexible};
    });
  }).filter(m=>m.relevant && m.available && !state.skipped.includes(m.skipKey))
    .sort((a,b)=>Number(b.kind==='exchange')-Number(a.kind==='exchange')||Number(!!b.common.length)-Number(!!a.common.length));
}
export function diagnose(state, catalog=people) {
  const mode=['exchange','learn','teach'].includes(state.filter)?state.filter:'all';
  if(mode==='teach'&&!state.profile.teach.length) return {code:'teach',title:'先添加一项能教的技能',text:'分享你熟悉的经验，找到想向你学习的人。'};
  if((mode==='learn'||mode==='exchange')&&!state.profile.learn.length) return {code:'learn',title:'先添加一项想学的技能',text:'英语口语、吉他或 Vibe Coding，都可以从一次交流开始。'};
  if(mode==='exchange'&&!state.profile.teach.length) return {code:'teach',title:'还差一项你能教的技能',text:'补充你愿意分享的经验，才能找到双向互补的伙伴。'};
  const possible=matchPeople({...state,profile:{...state.profile,flexible:true},skipped:[]},catalog);
  if(possible.length) {
    if(possible.every(m=>state.skipped.includes(m.skipKey))) return {code:'skipped',title:'这组推荐已暂时跳过',text:'可以重新查看，或保留学习意向等待其他伙伴。'};
    return {code:'time',title:'技能符合，时间还没对上',text:'可以放宽时间条件，或修改自己的可用时段。具体日期仍需双方确认。'};
  }
  if(mode==='teach')return {code:'demand',title:'暂时没有匹配的付费学习需求',text:'这里只展示明确愿意付费的一对一学习需求。可以切换其他能教的技能。'};
  if(mode==='learn')return {code:'supply',title:'暂时没有匹配的付费课程',text:'这里只展示明确提供收费一对一教学的伙伴，可以切换其他想学的技能。'};
  const providers=catalog.filter(p=>p.teach.some(t=>t.name===state.selected));
  if(mode==='exchange'&&providers.length)return {code:'skills',title:'有人能教，但暂时无法双向互换',text:`他们想学：${[...new Set(providers.flatMap(p=>p.learn.map(s=>s.name)))].join('、')}。可以补充能教的技能，或切换到技能学习查看。`};
  return {code:'supply',title:'暂时没有符合条件的伙伴',text:'可以调整想学或能教的技能，或保留学习意向等待新伙伴。'};
}
export const STATES = ['pending','negotiating','scheduled','learning','verifying','completed','cancelled'];
export const LABELS = {pending:'待对方回应',negotiating:'待你确认方案',scheduled:'已约定',learning:'互换进行中',verifying:'待确认学习成果',completed:'已完成',cancelled:'已取消'};
export function activeExchange(state, personId, give, want) {
  return state.exchanges.find(e=>e.personId===personId && e.give===give && e.want===want && !['completed','cancelled'].includes(e.status));
}
export function validPlan(plan, now=Date.now()) {
  return !!plan.when && Number.isFinite(new Date(plan.when).getTime()) && new Date(plan.when).getTime()>now && [15,30,45,60].includes(Number(plan.myMinutes)) && [15,30,45,60].includes(Number(plan.theirMinutes));
}
export function transition(exchange, event, payload = {}) {
  const e=clone(exchange);
  const assert=(ok,message)=>{if(!ok)throw new Error(message)};
  const at=Date.now(); let text='';
  switch(event) {
    case 'accept':
      assert(e.status==='pending','当前方案不在待回应状态');
      assert(validPlan(e.plan),'请先协商一个未来的具体时间');
      e.status='scheduled';text='对方接受了你的方案，双方已确认。';break;
    case 'counter':
      assert(['pending','negotiating','scheduled'].includes(e.status),'当前阶段不能改期');
      assert(validPlan(payload),'请选择未来的具体时间');
      e.plan=payload;e.status='negotiating';text='对方提出新方案，等待你确认。';break;
    case 'propose':
      assert(['pending','negotiating','scheduled'].includes(e.status),'当前阶段不能修改方案');
      assert(validPlan(payload),'请选择未来的具体时间');
      e.plan=payload;e.status='pending';text='你提出了新方案，等待对方确认。';break;
    case 'confirm':
      assert(e.status==='negotiating','没有待确认的新方案');assert(validPlan(e.plan),'约定时间已过，请重新协商');
      e.status='scheduled';text='你接受了新方案，双方已确认。';break;
    case 'start':
      assert(e.status==='scheduled','请先由双方确认交换方案');e.status='learning';text='本次互换已开始。';break;
    case 'done':
      assert(e.status==='learning','请先开始互换');assert(['me','them'].includes(payload.actor),'未知参与方');
      assert(!e.done[payload.actor],'该方已经确认教学完成');e.done[payload.actor]=true;
      text=payload.actor==='me'?'你已完成自己的教学。':'对方已完成自己的教学。';
      if(e.done.me&&e.done.them)e.status='verifying';break;
    case 'outcome':
      assert(e.status==='verifying','请先完成双方教学');assert(['me','them'].includes(payload.actor),'未知参与方');
      assert(['achieved','partial','missed'].includes(payload.result),'请选择学习结果');
      e.outcomes[payload.actor]={result:payload.result,note:String(payload.note||'').slice(0,200)};
      text=payload.actor==='me'?'你已确认本次学习成果。':'对方已确认本次学习成果。';
      if(e.outcomes.me&&e.outcomes.them)e.status='completed';break;
    case 'review':
      assert(e.status==='completed','请先完成双方成果确认');
      assert([1,2,3,4,5].includes(Number(payload.rating)),'请选择评分');
      e.review={rating:Number(payload.rating),note:String(payload.note||'').slice(0,200)};text='你已保存本次评价。';break;
    case 'cancel':
      assert(!['completed','cancelled'].includes(e.status),'当前互换不能取消');
      assert(String(payload.reason||'').trim(),'请填写取消原因');
      e.status='cancelled';e.cancelReason=String(payload.reason).slice(0,200);text=`本次互换已取消：${e.cancelReason}`;break;
    default: throw new Error('未知操作');
  }
  e.history.push({at,text});return e;
}
