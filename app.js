import { SKILLS, TIMES, LEVELS, people } from './data.js';
import { STORAGE_KEY, clone, uid, freshState, validState, migrate, combinations, matchPeople, diagnose, LABELS, activeExchange, validPlan, transition } from './core.js';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button = (text, action, id='', cls='', extra='') => `<button type="button" class="${cls}" data-action="${action}" data-id="${esc(id)}" ${extra}>${text}</button>`;
const hint = t => `<p class="muted small">${esc(t)}</p>`;
const personBy = id => people.find(p=>p.id===id);
const formatTime = t => t ? esc(String(t).replace('T',' ')) : '具体时间待协商';
let state = freshState(), storageWarning = '', view = 'discover', detailId = '', toastTimer, lastFocus;
try {
  const current = localStorage.getItem(STORAGE_KEY);
  if (current) {
    const parsed = JSON.parse(current);
    if(validState(parsed)) state=parsed;
    else storageWarning='保存的数据不完整，已展示示例；原数据尚未覆盖。';
  } else {
    const old=localStorage.getItem('dabashou-cards-v2');
    if(old) {state=migrate(JSON.parse(old));storageWarning='已将旧交换卡拆分为独立技能，并保留原邀请。';}
  }
} catch { storageWarning='本地数据暂时无法读取，当前使用示例。'; }
if(!['all','exchange','learn','teach'].includes(state.filter))state.filter='all';
if(!state.profile.learn.some(s=>s.name===state.selected))state.selected=state.profile.learn[0]?.name||'';
function persist() {try {localStorage.setItem(STORAGE_KEY,JSON.stringify(state));} catch {toast('无法保存到浏览器，刷新后更改可能丢失。');}}
function toast(text) {$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4500);}
function open(title, html) {lastFocus=document.activeElement;$('#modal-title').textContent=title;$('#modal-body').innerHTML=html;if(!$('#modal').open)$('#modal').showModal();$('#modal').scrollTop=0;}
function close() {$('#modal').close();}
$('#close').onclick=close;
$('#modal').addEventListener('close',()=>{if(lastFocus?.isConnected)lastFocus.focus();else document.querySelector('nav [aria-current]')?.focus();});
function route(page, id='') { view=page;detailId=id;history.pushState(null,'',id?`#exchange/${encodeURIComponent(id)}`:`#${page}`);render();window.scrollTo({top:0,behavior:'instant'});}
function fromHash() {const hash=location.hash.slice(1);if(hash.startsWith('exchange/')){view='exchanges';try{detailId=decodeURIComponent(hash.slice(9));}catch{detailId='';}}else{view=['discover','exchanges','mine'].includes(hash)?hash:'discover';detailId='';}render();}
window.addEventListener('hashchange',fromHash);
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>route(b.dataset.page));
function render() {
  document.querySelectorAll('[data-page]').forEach(b=>{if(b.dataset.page===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  const pending=state.exchanges.filter(e=>!['completed','cancelled'].includes(e.status)).length;
  $('#exchange-count').textContent=pending?String(pending):'';
  if(view==='mine')renderMine(); else if(view==='exchanges')detailId?renderExchange():renderExchanges();else renderDiscover();
}
function renderDiscover() {
  const matches=matchPeople(state);
  if(!state.profile.teach.some(s=>s.name===state.teachSelected))state.teachSelected=state.profile.teach[0]?.name||'';
  const teaching=state.filter==='teach';
  const title=state.filter==='all'?'为你推荐的伙伴':`${(teaching?state.teachSelected:state.selected)||'技能'}伙伴`;
  const description={all:'汇总互换、学习与教授机会，双向互补优先',exchange:'双方技能互补，可以协商交换方案',learn:'找到能教你的人，无需先满足对方的学习需求',teach:'找到想学你技能的人，可切换左侧能教的技能'}[state.filter];
  $('#app').innerHTML=`<div class="discovery layout"><aside class="sidebar"><h1>找到互补的技能</h1><p class="muted intro">用你会的，学你想学的。</p><div class="section-label"><h2>我想学的</h2>${button('管理','skills','learn','quiet')}</div><div class="skill-choices">${state.profile.learn.map(s=>button(esc(s.name),'select',s.name,'skill-choice',`aria-pressed="${s.name===state.selected}"`)).join('')||button('添加想学的技能','add-skill','learn','secondary')}</div><div class="section-label spaced"><h2>我能教的</h2>${button('管理','skills','teach','quiet')}</div><div class="tags">${state.profile.teach.map(s=>teaching?button(esc(s.name),'select-teach',s.name,'skill-choice',`aria-pressed="${s.name===state.teachSelected}"`):`<span class="tag">${esc(s.name)}</span>`).join('')||hint('添加你愿意分享的技能')}</div><p class="small muted">${teaching?'选择一项能教的技能，查看对应的学习伙伴。':'每项能教的技能都会参与匹配，无需提前绑定。'}</p><div class="availability"><div class="section-label"><h2>我的时间</h2>${button('调整','times','','quiet')}</div><p>${esc(state.profile.times.join('、')||'尚未设置')}</p><span class="small muted">${state.profile.flexible?'其他时段也可协商':'仅匹配已选时段'} · 线上交流</span></div></aside><section class="recommendations" aria-label="技能推荐"><div class="section-label"><div><h2 class="results-title">${esc(title)}</h2><p class="small muted">${matches.length?`${matches.length} 位伙伴 · `:''}${description}</p></div>${button(`收藏 ${state.saved.length}`,'saved','','quiet')}</div><div class="filters" aria-label="伙伴类型筛选">${[['all','全部'],['exchange','技能互换'],['learn','技能学习'],['teach','技能教授']].map(([v,t])=>button(t,'filter',v,'filter',`aria-pressed="${state.filter===v}"`)).join('')}</div><div class="result-list">${matches.length?matches.map(matchCard).join(''):emptyHTML()}</div></section></div>`;
}
function matchCard(m) {
  if(m.kind!=='exchange')return directionalCard(m);
  const p=m.person, pair=m.pairs[0], skill=p.teach.find(t=>t.name===pair.want), gives=[...new Set(m.pairs.map(x=>x.give))];
  const inProgress=state.exchanges.find(e=>e.personId===p.id&&e.want===pair.want&&!['completed','cancelled'].includes(e.status));
  return `<article class="match-card"><div class="card-person"><div class="who"><span class="avatar" aria-hidden="true">${esc(p.name.slice(-1))}</span><strong>${esc(p.name)}</strong><span class="small muted">技能互换</span></div><span class="status neutral">${m.common.length?'时段有交集':'时间待协商'}</span></div><div class="skill-pair"><div><p class="eyebrow">对方能教 · 你想学</p><h3>${esc(pair.want)}</h3><p class="skill-description">${esc(skill.scope)}</p></div><span class="exchange-symbol" aria-hidden="true">⇄</span><div><p class="eyebrow">你能教 · 对方想学</p><h3>${gives.map(esc).join('<span class="or"> 或 </span>')}</h3><p class="skill-description">${gives.length>1?'发起时选择其中一项即可':esc(p.learn.find(s=>s.name===gives[0]).goal)}</p></div></div><div class="match-meta"><span>${esc(m.common.length?m.common.join('、'):p.times.join('、'))}${m.common.length?' · 具体时间待确认':''}</span><span>${p.record?`完成 ${p.record.completed} 次 · 示例记录`:'新伙伴 · 暂无互换记录'}</span></div><div class="card-actions"><div>${button('查看档案','profile',p.id,'quiet')}${button(state.saved.includes(p.id)?'已收藏':'收藏','save',p.id,'quiet',`aria-pressed="${state.saved.includes(p.id)}"`)}</div>${inProgress?button('查看互换','detail',inProgress.id,'primary'):button('查看交换方案','invite',p.id,'primary')}</div><div class="skip-row">${button('暂不考虑','skip',p.id,'quiet small')}</div></article>`;
}
function directionalCard(m) {
  const p=m.person, learning=m.kind==='learn', entries=learning?m.learning:m.teaching;
  const content=entries.map(s=>`<div><p class="eyebrow">${learning?'对方能教 · 你想学':'对方想学 · 你能教'}</p><h3>${esc(s.name)}</h3><p class="skill-description">${esc(learning?s.scope:s.goal)}</p></div>`).join('');
  return `<article class="match-card"><div class="card-person"><div class="who"><span class="avatar" aria-hidden="true">${esc(p.name.slice(-1))}</span><strong>${esc(p.name)}</strong><span class="small muted">${learning?'技能学习':'技能教授'}</span></div><span class="status neutral">${m.common.length?'时段有交集':'时间待协商'}</span></div><div class="directional-skills">${content}</div><div class="match-meta"><span>${esc((m.common.length?m.common:p.times).join('、'))} · 具体时间待确认</span><span>${m.pairs.length?'也可以双向互换，查看档案了解更多':'当前为单向技能匹配，可先查看档案了解需求'}</span></div><div class="card-actions">${button(state.saved.includes(p.id)?'已收藏':'收藏','save',p.id,'quiet',`aria-pressed="${state.saved.includes(p.id)}"`)}${button('查看档案','profile',p.id,'primary')}</div><div class="skip-row">${button('暂不考虑','skip',p.id,'quiet small')}</div></article>`;
}
function emptyHTML() {
  const d=diagnose(state),subscribed=state.subscriptions.includes(state.selected),teaching=state.filter==='teach';
  return `<div class="empty"><span class="empty-symbol" aria-hidden="true">⇄</span><h3>${esc(d.title)}</h3><p>${esc(d.text)}</p><div class="empty-actions">${d.code==='time'?button('放宽时间条件','relax','','primary'):d.code==='skipped'?button('重新查看推荐','unskip','','primary'):button(['learn','supply'].includes(d.code)?'添加想学技能':'补充能教技能','add-skill',['learn','supply'].includes(d.code)?'learn':'teach','primary')}${button(teaching?'管理能教技能':'管理想学技能','skills',teaching?'teach':'learn','secondary')}${state.selected&&!teaching?button(subscribed?'已保留匹配意向':'订阅新匹配','subscribe',state.selected,'quiet',subscribed?'disabled':''):''}</div><p class="small muted">演示版只保存匹配意向，不会发送通知。</p></div>`;
}
function renderMine() {
  const p=state.profile;
  $('#app').innerHTML=`<div class="page"><div class="page-heading"><h1>我的技能</h1><p class="muted">能教与想学分别管理，系统为你组合交换方案。</p></div><div class="my-profile"><div class="section-label"><div class="who"><span class="avatar large">我</span><div><h2>我的介绍</h2><p class="muted">${esc(p.bio)}</p></div></div>${button('编辑','bio','','quiet')}</div></div><div class="skill-columns">${['teach','learn'].map(type=>`<section><div class="section-label"><h2>${type==='teach'?'我能教的':'我想学的'} <span class="count">${p[type].length}</span></h2>${button('＋ 添加','add-skill',type,'quiet')}</div>${p[type].map((s,i)=>`<article class="skill-item"><div class="section-label"><h3>${esc(s.name)}</h3>${button('编辑','edit-skill',`${type}:${i}`,'quiet')}</div><p class="small muted">${type==='teach'?'适合':'当前水平'}：${esc(s.level||'待补充')}</p><p>${esc(type==='teach'?(s.scope||'补充可以教的内容，让伙伴更了解你。'):(s.goal||'可以补充一个学习目标作为参考。'))}</p>${type==='teach'&&s.evidence?`<p class="evidence-summary small">能力参考：${esc(s.evidence)}</p>`:''}</article>`).join('')||`<p class="muted">还没有添加技能。</p>`}</section>`).join('')}</div><section class="settings-section"><div class="section-label"><div><h2>可用时间</h2><p>${esc(p.times.join('、')||'尚未设置')} · ${p.flexible?'可协商':'仅这些时段'}</p></div>${button('调整时间','times','','secondary')}</div></section><section class="settings-section"><h2>我的互换记录</h2><p class="muted">${state.exchanges.filter(e=>e.status==='completed').length?`已完成 ${state.exchanges.filter(e=>e.status==='completed').length} 次演示互换。`:'暂无完成记录，完成首次互换后会在这里留下记录。'}</p>${button('查看互换','page','exchanges','quiet')}</section>${state.subscriptions.length?`<section class="settings-section"><h2>已订阅的学习意向</h2><p class="small muted">仅在此浏览器保存；演示版不发送通知。</p><div class="subscription-list">${state.subscriptions.map(s=>`<div><span>${esc(s)}</span>${button('取消订阅','unsubscribe',s,'quiet')}</div>`).join('')}</div></section>`:''}</div>`;
}
function manageSkills(type) {route('mine');document.querySelectorAll('.skill-columns section')[type==='teach'?0:1]?.scrollIntoView({block:'start',behavior:'smooth'});}
function editSkill(type, index=-1) {
  const old=state.profile[type][index], s=old||{name:'',level:'入门',scope:'',evidence:'',goal:''};
  open(`${old?'编辑':'添加'}${type==='teach'?'能教':'想学'}的技能`,`<form id="skill-form" class="form"><label>技能名称<input name="skill" list="skill-options" maxlength="40" required value="${esc(s.name)}" placeholder="例如：英语口语、吉他、Vibe Coding"></label><datalist id="skill-options">${SKILLS.map(n=>`<option value="${esc(n)}"></option>`).join('')}</datalist><label>${type==='teach'?'适合的学习者':'我目前的水平'}<select name="level">${(type==='teach'?['零基础','入门','有一定基础','零基础、入门','入门、有一定基础']:LEVELS).map(n=>`<option ${s.level===n?'selected':''}>${n}</option>`).join('')}</select></label>${type==='teach'?`<label>我能教什么<textarea name="scope" maxlength="160" placeholder="擅长的内容，以及暂时不能教的内容">${esc(s.scope)}</textarea></label><label>能力参考 <span class="optional">选填</span><textarea name="evidence" maxlength="160" placeholder="简述一个作品、案例或可以演示的练习">${esc(s.evidence)}</textarea></label>`:`<label>学习目标 <span class="optional">选填</span><textarea name="goal" maxlength="160" placeholder="例如：独立完成一段英文自我介绍">${esc(s.goal)}</textarea></label><p class="small muted">目标用于协商教学内容，推荐仍以技能名称为主。</p>`}<p id="form-error" class="form-error" role="alert"></p><div class="form-actions">${old?button('移除技能','remove-skill',`${type}:${index}`,'quiet danger'):''}<button class="primary" type="submit">保存技能</button></div></form>`);
  $('#skill-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),rawName=String(f.get('skill')).trim(),name=SKILLS.find(n=>n.toLowerCase()===rawName.toLowerCase())||rawName;if(!name){$('#form-error').textContent='请输入技能名称。';return;}if(state.profile[type].some((v,i)=>i!==index&&v.name.toLowerCase()===name.toLowerCase())){$('#form-error').textContent='这项技能已存在，可以编辑原有技能。';return;}const entry={name,level:f.get('level'),...(type==='teach'?{scope:String(f.get('scope')).trim(),evidence:String(f.get('evidence')).trim()}:{goal:String(f.get('goal')).trim()})};if(old)state.profile[type][index]=entry;else state.profile[type].push(entry);if(type==='learn'&&(!state.selected||state.selected===old?.name))state.selected=name;persist();close();render();toast('技能已保存，推荐会使用新的供需组合。');};
}
function editTimes() {
  open('我的可用时间',`<form id="time-form" class="form"><p class="muted">选择通常有空的时段，具体日期在交换方案中确认。</p><div class="time-grid">${TIMES.map(t=>`<label class="check"><input type="checkbox" name="times" value="${t}" ${state.profile.times.includes(t)?'checked':''}>${t}</label>`).join('')}</div><label class="check"><input type="checkbox" name="flexible" ${state.profile.flexible?'checked':''}>其他时段也可以协商</label><p id="form-error" class="form-error" role="alert"></p><div class="form-actions"><button class="primary" type="submit">保存时间</button></div></form>`);
  $('#time-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),times=f.getAll('times'),flexible=f.has('flexible');if(!times.length&&!flexible){$('#form-error').textContent='至少选择一个时段，或允许协商其他时间。';return;}state.profile.times=times;state.profile.flexible=flexible;state.filter='all';persist();close();render();toast('可用时间已更新。');};
}
function profile(id) {
  const p=personBy(id);if(!p)return;
  const ordered=[...p.teach].sort((a,b)=>Number(b.name===state.selected)-Number(a.name===state.selected));
  open(`${p.name}的档案`,`<div class="profile-intro"><span class="avatar large">${esc(p.name.slice(-1))}</span><div><p>${esc(p.bio)}</p><p class="small muted">示例档案 · 自述内容未经认证</p></div></div>${ordered.map(s=>`<section class="profile-section"><h3>${esc(s.name)}</h3><dl class="profile-facts"><div><dt>适合谁</dt><dd>${esc(s.level)}</dd></div><div><dt>教学范围</dt><dd>${esc(s.scope)}</dd></div></dl><details class="evidence"><summary>查看能力参考 · ${esc(s.evidence)}</summary><p class="sample-text">${esc(s.sample)}</p><small>虚构示例材料，用于展示能力参考的呈现方式。</small></details></section>`).join('')}<section class="profile-section"><h3>想学的技能</h3><p>${p.learn.map(s=>esc(s.name)).join('、')}</p><p class="small muted">${p.learn.map(s=>esc(s.goal)).join('；')}</p></section><section class="profile-section"><h3>互换记录</h3>${p.record?`<div class="record-stats"><div><strong>${p.record.completed}</strong><span>完成互换</span></div><div><strong>${p.record.onTime}/${p.record.completed}</strong><span>按约定时间参与</span></div></div><blockquote>“${esc(p.record.feedback)}”</blockquote><p class="small muted">以上次数与评价均为示例，不代表真实用户记录。</p>`:`<p class="muted">新伙伴，暂无完成记录。</p><p class="small muted">可以先约一次小范围练习，了解彼此的教学方式。</p>`}</section><div class="form-actions">${combinations(state.profile,p,state.selected).length?button('查看交换方案','invite',p.id,'primary'):button('关闭档案','close','','secondary')}</div>`);
}
function planFields(plan={}, allowFlexible=false) {
  return `<label>具体时间<input type="datetime-local" name="when" value="${esc(plan.when||'')}" ${allowFlexible?'':'required'}></label>${allowFlexible?`<label class="check"><input type="checkbox" name="flexible" ${plan.flexible?'checked':''}>还没有确定时间，先协商</label>`:''}<div class="two-fields"><label>我教学的时长<select name="myMinutes">${[15,30,45,60].map(n=>`<option value="${n}" ${Number(plan.myMinutes||30)===n?'selected':''}>${n} 分钟</option>`).join('')}</select></label><label>对方教学的时长<select name="theirMinutes">${[15,30,45,60].map(n=>`<option value="${n}" ${Number(plan.theirMinutes||30)===n?'selected':''}>${n} 分钟</option>`).join('')}</select></label></div><p class="small muted">线上交流 · 时长是投入约定，双方需认可教学范围。</p>`;
}
function readPlan(form) {const f=new FormData(form);return{when:String(f.get('when')||''),flexible:f.has('flexible'),myMinutes:Number(f.get('myMinutes')),theirMinutes:Number(f.get('theirMinutes')),mode:'线上实时'};}
function invite(id, repeat=null) {
  const p=personBy(id);if(!p){toast('该伙伴暂无可用档案。');return;}
  let pairs=combinations(state.profile,p,repeat?.want||state.selected);
  if(!pairs.length){toast('当前技能已不互补，请先更新自己的技能。');return;}
  if(repeat)pairs.sort((a,b)=>Number(b.give===repeat.give)-Number(a.give===repeat.give));
  open('确认交换方案',`<form id="invite-form" class="form"><p class="small muted">与${esc(p.name)}互换 · 模拟邀请，不发送真实消息</p><div class="two-fields"><label>我想学<select name="want">${[...new Set(pairs.map(p=>p.want))].map(n=>`<option>${esc(n)}</option>`).join('')}</select></label><label>我可以教<select name="give">${[...new Set(pairs.map(p=>p.give))].map(n=>`<option>${esc(n)}</option>`).join('')}</select></label></div><label>我的学习目标<textarea name="myGoal" maxlength="160" placeholder="这次希望学会什么？">${esc(repeat?.myGoal||state.profile.learn.find(s=>s.name===pairs[0].want)?.goal||'')}</textarea></label><div class="goal-reference"><span class="small muted">对方的学习目标</span><p id="their-goal"></p></div>${planFields({},true)}<label class="check"><input name="agree" type="checkbox" required>我认可这次的教学范围与投入，愿意发起互换</label><p id="form-error" class="form-error" role="alert"></p><div class="form-actions"><button class="primary" type="submit">发送模拟邀请</button></div></form>`);
  const form=$('#invite-form');const updateGoal=()=>$('#their-goal').textContent=p.learn.find(s=>s.name===form.elements.give.value)?.goal||'双方协商确认';updateGoal();form.elements.give.onchange=updateGoal;
  form.onsubmit=e=>{e.preventDefault();const f=new FormData(form),plan=readPlan(form),give=f.get('give'),want=f.get('want');if(!plan.when&&!plan.flexible){$('#form-error').textContent='请选择具体时间，或勾选先协商。';return;}if(plan.when&&!validPlan(plan)){$('#form-error').textContent='请选择未来的日期和时间。';return;}const existing=activeExchange(state,p.id,give,want);if(existing){close();route('exchanges',existing.id);toast('这组技能已有进行中的互换。');return;}const exchange={id:uid(),personId:p.id,name:p.name,give,want,myGoal:String(f.get('myGoal')).trim(),theirGoal:p.learn.find(s=>s.name===give)?.goal||'',plan,status:'pending',done:{me:false,them:false},outcomes:{me:null,them:null},review:null,history:[{at:Date.now(),text:'你发出了邀请，等待对方回应。'}]};state.exchanges.unshift(exchange);persist();close();route('exchanges',exchange.id);toast('模拟邀请已发出。');};
}
function renderExchanges() {
  const active=state.exchanges.filter(e=>!['completed','cancelled'].includes(e.status)),finished=state.exchanges.filter(e=>['completed','cancelled'].includes(e.status));
  const row=e=>`<article class="exchange-row"><div><div class="row-title"><h3>${esc(e.want)} <span class="muted">⇄</span> ${esc(e.give)}</h3><span class="status">${LABELS[e.status]}</span></div><p class="muted">与${esc(e.name)} · ${formatTime(e.plan.when)}</p><p class="small muted">${nextStep(e)}</p></div>${button('查看进度','detail',e.id,'secondary')}</article>`;
  $('#app').innerHTML=`<div class="page"><div class="page-heading"><h1>我的互换</h1><p class="muted">从确认方案，到彼此学会一点新东西。</p></div>${state.exchanges.length?`<section><h2>进行中 <span class="count">${active.length}</span></h2>${active.map(row).join('')||hint('暂无进行中的互换。')}</section>${finished.length?`<section class="history-section"><h2>已结束</h2>${finished.map(row).join('')}</section>`:''}`:`<div class="empty"><h2>开始第一次技能互换</h2><p>找到互补伙伴，一起商量这次教什么、学什么。</p>${button('去发现伙伴','page','discover','primary')}</div>`}</div>`;
}
function nextStep(e) {return {pending:'下一步：等待对方接受或提出新方案。',negotiating:'下一步：确认对方提出的新时间与投入。',scheduled:'双方已确认方案，可以开始互换。',learning:'双方分别完成教学后，再确认学习成果。',verifying:'双方分别确认自己的学习结果。',completed:e.review?'评价已保存，可以再次互换。':'互换已结束，可以留下评价或再次互换。',cancelled:'原方案、已完成教学和取消原因均已保留。'}[e.status];}
const outcomeLabel={achieved:'已达到目标',partial:'部分达到目标',missed:'暂未达到目标'};
function renderExchange() {
  const e=state.exchanges.find(e=>e.id===detailId);if(!e){detailId='';renderExchanges();return;}
  const steps=['发送方案','双方确认','互相教学','确认成果','评价与再约'],position={pending:0,negotiating:1,scheduled:1,learning:2,verifying:3,completed:4,cancelled:-1}[e.status];
  $('#app').innerHTML=`<div class="page detail-page">${button('← 全部互换','page','exchanges','quiet back')}<div class="detail-heading"><div><p class="eyebrow">与${esc(e.name)}的互换</p><h1>${esc(e.want)} <span class="muted">⇄</span> ${esc(e.give)}</h1></div><span class="status">${LABELS[e.status]}</span></div>${e.status!=='cancelled'?`<ol class="stepper" aria-label="互换进度">${steps.map((s,i)=>`<li class="${i<=position?'reached':''}" ${i===position?'aria-current="step"':''}><span>${i<position?'✓':i+1}</span>${s}</li>`).join('')}</ol>`:''}<p class="next-step">${nextStep(e)}</p><div class="detail-columns"><section class="plan-section"><h2>本次交换方案</h2><div class="plan-skills"><div><span class="eyebrow">我学</span><h3>${esc(e.want)}</h3><p>${esc(e.myGoal||'学习目标待双方交流确认')}</p></div><div><span class="eyebrow">我教</span><h3>${esc(e.give)}</h3><p>${esc(e.theirGoal||'教学内容待双方交流确认')}</p></div></div><dl class="plan-facts"><div><dt>时间</dt><dd>${formatTime(e.plan.when)}</dd></div><div><dt>投入</dt><dd>我教 ${e.plan.myMinutes} 分钟 · 对方教 ${e.plan.theirMinutes} 分钟</dd></div><div><dt>方式</dt><dd>线上交流</dd></div></dl>${e.status==='cancelled'?`<p class="cancel-note">取消原因：${esc(e.cancelReason||'已取消')}</p>`:''}${e.done.me||e.done.them?`<p class="small muted">教学记录：我${e.done.me?'已':'未'}完成 · 对方${e.done.them?'已':'未'}完成</p>`:''}${e.outcomes.me||e.outcomes.them?`<div class="outcomes"><h3>学习成果</h3>${['me','them'].map(actor=>e.outcomes[actor]?`<p><strong>${actor==='me'?'我':'对方'}：${outcomeLabel[e.outcomes[actor].result]}</strong>${e.outcomes[actor].note?`<br><span class="muted">${esc(e.outcomes[actor].note)}</span>`:''}</p>`:'').join('')}</div>`:''}${e.review?`<div class="review-summary"><h3>我的评价 · ${e.review.rating}/5</h3><p>${esc(e.review.note||'已评分，未填写文字评价。')}</p></div>`:''}<div class="detail-actions">${exchangeActions(e)}</div></section><aside class="activity"><h2>互换动态</h2><ol>${e.history.map(h=>`<li><p>${esc(h.text)}</p><time>${new Date(h.at).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</time></li>`).join('')}</ol></aside></div>${demoPanel(e)}</div>`;
}
function exchangeActions(e) {
  let html='';
  if(e.status==='negotiating')html+=button('接受新方案','confirm',e.id,'primary');
  if(['pending','negotiating','scheduled'].includes(e.status))html+=button(e.status==='scheduled'?'申请改期':'修改方案','propose',e.id,'secondary');
  if(e.status==='scheduled')html+=button('开始本次互换','start',e.id,'primary');
  if(e.status==='learning')html+=e.done.me?'<span class="small muted">你已完成教学，等待对方完成。</span>':button('我已完成教学','done',e.id,'primary');
  if(e.status==='verifying')html+=e.outcomes.me?'<span class="small muted">你的成果已确认，等待对方确认。</span>':button('确认我的学习成果','outcome',e.id,'primary');
  if(e.status==='completed')html+=button(e.review?'修改评价':'评价这次互换','review',e.id,'secondary')+button('再约一次','repeat',e.id,'primary');
  if(!['completed','cancelled'].includes(e.status))html+=button(e.status==='pending'?'撤回邀请':'取消互换','cancel',e.id,'quiet');
  return html;
}
function demoPanel(e) {
  if(['completed','cancelled'].includes(e.status))return '<p class="small muted demo-footnote">本次为本地演示互换，状态与评价不会发送给真实用户。</p>';
  let actions='';
  if(e.status==='pending')actions+=button('模拟对方接受','accept',e.id,'secondary',''+(!validPlan(e.plan)?'disabled':''));
  if(['pending','negotiating','scheduled'].includes(e.status))actions+=button('模拟对方提出新方案','counter',e.id,'secondary');
  if(e.status==='learning'&&!e.done.them)actions+=button('模拟对方完成教学','their-done',e.id,'secondary');
  if(e.status==='verifying'&&!e.outcomes.them)actions+=button('模拟对方确认成果','their-outcome',e.id,'secondary');
  return `<aside class="demo-panel"><div><h2>演示对方操作</h2><p class="small muted">这些按钮仅模拟对方回应，不会发送消息或开启真实课堂。</p>${e.status==='pending'&&!validPlan(e.plan)?'<p class="small muted">请先由任意一方提出未来的具体时间，再接受方案。</p>':''}${e.status==='scheduled'?'<p class="small muted">可点击上方“开始本次互换”继续体验，无需等待预约时间。</p>':''}</div><div class="demo-actions">${actions||'<p class="small muted">继续完成上方你的操作。</p>'}</div></aside>`;
}
function applyEvent(id,event,payload={}) {const index=state.exchanges.findIndex(e=>e.id===id);if(index<0)return;try{state.exchanges[index]=transition(state.exchanges[index],event,payload);persist();render();}catch(error){toast(error.message);}}
function proposal(id,actor) {
  const e=state.exchanges.find(e=>e.id===id);
  open(actor==='them'?'模拟对方提出新方案':'修改交换方案',`<form id="proposal-form" class="form"><p class="muted">新方案会替换原约定，需另一方再次确认。</p>${planFields(e.plan)}<p id="form-error" class="form-error" role="alert"></p><div class="form-actions"><button class="primary" type="submit">${actor==='them'?'模拟提出方案':'发送新方案'}</button></div></form>`);
  $('#proposal-form').onsubmit=event=>{event.preventDefault();const plan=readPlan(event.target);if(!validPlan(plan)){$('#form-error').textContent='请选择未来的具体时间。';return;}close();applyEvent(id,actor==='them'?'counter':'propose',plan);};
}
function confirmDone(id,actor='me') {
  const e=state.exchanges.find(e=>e.id===id);
  open(actor==='me'?'确认完成教学':'模拟对方完成教学',`<div class="form"><p>${actor==='me'?'你':'对方'}已完成本次 <strong>${esc(actor==='me'?e.give:e.want)}</strong> 的约定教学内容。</p><p class="muted">这一步只记录教学完成；双方学习成果会在下一步分别确认。</p><div class="form-actions">${button(actor==='me'?'确认教学完成':'模拟确认完成',actor==='me'?'confirm-done':'confirm-their-done',id,'primary')}</div></div>`);
}
function outcome(id,actor='me') {
  const e=state.exchanges.find(e=>e.id===id);
  open(actor==='me'?'确认我的学习成果':'模拟对方确认学习成果',`<form id="outcome-form" class="form"><div class="goal-reference"><span class="eyebrow">${actor==='me'?'我的':'对方的'}学习目标</span><p>${esc((actor==='me'?e.myGoal:e.theirGoal)||'本次约定的学习内容')}</p></div><fieldset><legend>这次学习达到目标了吗？</legend>${Object.entries(outcomeLabel).map(([value,label])=>`<label class="check"><input type="radio" name="result" value="${value}" required>${label}</label>`).join('')}</fieldset><label>补充说明 <span class="optional">选填</span><textarea name="note" maxlength="200" placeholder="学会了什么，或哪里还需要练习？"></textarea></label><p class="small muted">未达成的结果也会如实保留；确认完成不等于目标已达成。</p><div class="form-actions"><button type="submit" class="primary">${actor==='me'?'确认学习成果':'模拟确认成果'}</button></div></form>`);
  $('#outcome-form').onsubmit=event=>{event.preventDefault();const f=new FormData(event.target);close();applyEvent(id,'outcome',{actor,result:f.get('result'),note:f.get('note')});};
}
function review(id) {
  const e=state.exchanges.find(e=>e.id===id);
  open('评价这次互换',`<form id="review-form" class="form"><label>整体体验<select name="rating" required><option value="">请选择</option>${[[5,'5 · 很有帮助'],[4,'4 · 比较满意'],[3,'3 · 一般'],[2,'2 · 需要改进'],[1,'1 · 不满意']].map(([v,t])=>`<option value="${v}" ${e.review?.rating===v?'selected':''}>${t}</option>`).join('')}</select></label><label>具体反馈 <span class="optional">选填</span><textarea name="note" maxlength="200" placeholder="讲解是否清楚？有没有练习机会？">${esc(e.review?.note||'')}</textarea></label><p class="small muted">评价只保存在此浏览器，不会公开发布。</p><div class="form-actions"><button class="primary" type="submit">保存评价</button></div></form>`);
  $('#review-form').onsubmit=event=>{event.preventDefault();const f=new FormData(event.target);close();applyEvent(id,'review',{rating:f.get('rating'),note:f.get('note')});toast('评价已保存。');};
}
function cancelExchange(id) {
  const e=state.exchanges.find(e=>e.id===id);
  open(e.status==='pending'?'撤回邀请':'取消互换',`<form id="cancel-form" class="form"><p>取消后会保留方案与操作记录。${e.done.me||e.done.them?'已有一方完成教学，完成记录也会保留。':''}</p><label>原因<select name="reason"><option>时间不合适</option><option>教学范围不合适</option><option>对方未按约定参与</option><option>暂时不想继续</option></select></label><div class="form-actions">${button('继续互换','close','','secondary')}<button type="submit" class="primary">确认${e.status==='pending'?'撤回':'取消'}</button></div></form>`);
  $('#cancel-form').onsubmit=event=>{event.preventDefault();const reason=new FormData(event.target).get('reason');close();applyEvent(id,'cancel',{reason});};
}
function showSaved() {
  const list=people.filter(p=>state.saved.includes(p.id));
  open('收藏的伙伴',list.length?list.map(p=>`<div class="saved-row"><div><strong>${esc(p.name)}</strong><p class="muted">${p.teach.map(s=>esc(s.name)).join('、')}</p></div>${button('查看档案','profile',p.id,'quiet')}${button('取消收藏','unsave',p.id,'quiet')}</div>`).join(''):'<p class="empty-copy">暂无收藏。在推荐中收藏感兴趣的伙伴，稍后再比较。</p>');
}
document.addEventListener('click',event=>{
  const b=event.target.closest('[data-action]');if(!b||b.disabled)return;
  const {action,id}=b.dataset;
  switch(action) {
    case 'page':route(id);break;
    case 'detail':route('exchanges',id);break;
    case 'close':close();break;
    case 'select':state.selected=id;if(state.filter==='teach')state.filter='learn';persist();render();break;
    case 'select-teach':state.teachSelected=id;persist();render();break;
    case 'filter':state.filter=id;persist();render();break;
    case 'skills':manageSkills(id);break;
    case 'add-skill':editSkill(id);break;
    case 'edit-skill':{const [type,i]=id.split(':');editSkill(type,Number(i));break;}
    case 'remove-skill':{const [type,i]=id.split(':');const removed=state.profile[type].splice(Number(i),1)[0];if(type==='learn'&&state.selected===removed.name)state.selected=state.profile.learn[0]?.name||'';persist();close();render();toast('技能已移除，已发出的互换方案保持不变。');break;}
    case 'times':editTimes();break;
    case 'bio':open('编辑我的介绍',`<form id="bio-form" class="form"><label>一句话介绍<textarea name="bio" maxlength="160" required>${esc(state.profile.bio)}</textarea></label><button class="primary" type="submit">保存介绍</button></form>`);$('#bio-form').onsubmit=e=>{e.preventDefault();const bio=String(new FormData(e.target).get('bio')).trim();if(!bio){toast('请填写简短介绍。');return;}state.profile.bio=bio;persist();close();render();};break;
    case 'profile':profile(id);break;
    case 'save':state.saved=state.saved.includes(id)?state.saved.filter(x=>x!==id):[...state.saved,id];persist();render();break;
    case 'saved':showSaved();break;
    case 'unsave':state.saved=state.saved.filter(x=>x!==id);persist();render();showSaved();break;
    case 'skip':{const match=matchPeople(state).find(m=>m.person.id===id);if(match)state.skipped.push(match.skipKey);persist();render();toast('已暂时跳过，可在无推荐时重新查看。');break;}
    case 'unskip':state.skipped=state.skipped.filter(k=>!k.startsWith(`${state.filter}:${state.filter==='teach'?state.teachSelected:state.selected}:`));persist();render();break;
    case 'relax':state.profile.flexible=true;persist();render();toast('已允许协商其他时段，具体时间仍需双方确认。');break;
    case 'subscribe':if(!state.subscriptions.includes(id))state.subscriptions.push(id);persist();render();toast('匹配意向已保留。演示版不发送通知。');break;
    case 'unsubscribe':state.subscriptions=state.subscriptions.filter(s=>s!==id);persist();render();break;
    case 'invite':invite(id);break;
    case 'repeat':{const e=state.exchanges.find(e=>e.id===id);invite(e.personId,e);break;}
    case 'accept':applyEvent(id,'accept');break;
    case 'confirm':applyEvent(id,'confirm');break;
    case 'propose':proposal(id,'me');break;
    case 'counter':proposal(id,'them');break;
    case 'start':applyEvent(id,'start');break;
    case 'done':confirmDone(id);break;
    case 'their-done':confirmDone(id,'them');break;
    case 'confirm-done':close();applyEvent(id,'done',{actor:'me'});break;
    case 'confirm-their-done':close();applyEvent(id,'done',{actor:'them'});break;
    case 'outcome':outcome(id);break;
    case 'their-outcome':outcome(id,'them');break;
    case 'review':review(id);break;
    case 'cancel':cancelExchange(id);break;
  }
});
fromHash();
if(storageWarning)toast(storageWarning);
