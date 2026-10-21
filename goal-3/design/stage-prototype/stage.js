(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const icon = id => `<svg aria-hidden="true"><use href="art/ui-kit.svg#${id}"></use></svg>`;
 const art = id => `art/v2/${id}.webp`;
 const pages = [{id:'cultivate',name:'修行',icon:'nav-cultivate'},{id:'explore',name:'历练',icon:'nav-explore'},{id:'alchemy',name:'丹炉',icon:'item-healing_pill'},{id:'study',name:'功法',icon:'skill-sword_mind'},{id:'relic',name:'法宝',icon:'relic-jade_seal'},{id:'inventory',name:'行囊',icon:'nav-inventory'},{id:'fate',name:'仙缘',icon:'nav-karma'},{id:'life',name:'生平',icon:'action-export'}];
 const recipes = [{name:'回春丹',use:'恢复气血，为下一段历练备药。',cost:'每炉 2 灵石 · 1 游戏月 · 30 秒',stone:2,inputs:[['herb','凝气草','12 / 2']]},{name:'回灵丹',use:'补充灵力，支持连续施展术法。',cost:'每炉 3 灵石 · 1 游戏月 · 30 秒',stone:3,inputs:[['herb','凝气草','12 / 1'],['dew','灵露','4 / 1']]},{name:'筑基丹',use:'炼气圆满时，消耗一枚筹备筑基。',cost:'每炉 20 灵石 · 1 游戏月 · 30 秒',stone:20,inputs:[['herb','凝气草','12 / 8'],['dew','灵露','4 / 2'],['core','妖核','1 / 1']]}];
 const books = [{name:'青锋心诀',use:'静修收益 +10%。已掌握，可比较装入心法槽。',known:true},{name:'止水剑心',use:'静修收益 +25%；战斗护体额外减伤 6。需筑基。',known:false},{name:'听雨剑势',use:'消耗 8 灵力，少量伤害，蓄一层剑意并护体。需筑基。',known:false}];
 const relics = [{id:'frost_sword',name:'青霜剑',use:'剑意终结后保留一层；所有直接攻击 +5。',cost:140},{id:'jade_seal',name:'玄玉印',use:'每次承受伤害减 8，适合稳健渡劫。',cost:140},{id:'soul_lamp',name:'照魂灯',use:'每枚符印每回合额外伤害 4，提前引爆也生效。',cost:160},{id:'cloud_mirror',name:'流云镜',use:'普通攻击与护体额外回灵 6，每回合回血 4。',cost:160}];
 const items=[['herb','凝气草',12,'materials','炼丹的基础药材，来自山野采药。'],['dew','灵露',4,'materials','清晨凝集，用来调和丹药药性。'],['core','妖核',1,'materials','部分丹药与法宝的材料。'],['jade','地脉灵玉',0,'materials','炼制法宝和高阶丹药的材料。'],['lotus','月华莲',0,'materials','高阶突破丹药的材料。'],['soul','凝魂晶',0,'materials','化神阶段的重要材料。'],['dao','道蕴砂',0,'materials','用于筹备渡劫引。'],['healing_pill','回春丹',1,'medicine','恢复气血，战中服用占一回合。'],['spirit_pill','回灵丹',0,'medicine','恢复灵力，战中服用占一回合。'],['foundation_pill','筑基丹',0,'breakthrough','炼气圆满后消耗一枚筑基。'],['golden_pill','凝金丹',0,'breakthrough','筑基圆满后用于凝结金丹。'],['nascent_pill','结婴丹',0,'breakthrough','金丹圆满后用于结婴。'],['spirit_seed','化神丹',0,'breakthrough','元婴圆满后用于化神。'],['ascension_seal','渡劫引',0,'breakthrough','化神圆满后用于进入天劫。']];
 const people=[{name:'沈清禾',role:'药修 · 雨中故人',img:'shen',use:'山雨将歇，她仍记得破庙中的那次相逢。'},{name:'陆玄松',role:'青云宗 · 传法前辈',img:'lu',use:'先看眼下缺什么，再谈下一步修行。'},{name:'裴知微',role:'坊市 · 行路故交',img:'pei',use:'沿着旧日因果，再续一段机缘。'}];
 let page='alchemy',recipe=0,book=0,relic=0,person=0,place=0,item=0,itemPage=0,filter='all',chapter=0;
 const plan={cycles:5,budget:10,reserve:0};let activity=null,noticeTimer=0;
 const title=(top,name,subtitle='')=>`<div class="scene-heading"><small>${top}</small><h1>${name}</h1>${subtitle?`<p>${subtitle}</p>`:''}</div>`;
 function feedback(message){clearTimeout(noticeTimer);$('notice').textContent=message;$('notice').hidden=false;noticeTimer=setTimeout(()=>{$('notice').hidden=true;},4000);}
 function bind(selector,fn){$('stage').querySelectorAll(selector).forEach(el=>el.addEventListener('click',()=>fn(el)));}
 function selectList(list,selected,attr,foot){return `<div class="selector">${list.map((x,i)=>`<button ${attr}="${i}" aria-pressed="${i===selected}">${x.name}<small>${x.hint||''}</small></button>`).join('')}${foot||''}</div>`;}
 function decision(name,use,cost,summary,action,links=''){return `<section class="decision"><h2>${name}</h2><p class="use">${use}</p><p class="cost">${cost}</p><p class="plan-line">${summary}</p><button class="jade primary" id="main-action" ${activity?'disabled':''}>${activity?'当前已有安排':action}</button><div class="detail-links">${links}</div></section>`;}
 function render(){
  $('navigation').innerHTML=pages.map(p=>`<button data-page="${p.id}" ${page===p.id?'aria-current="page"':''}>${icon(p.icon)}<span>${p.name}</span></button>`).join('');
  $('navigation').querySelectorAll('button').forEach(b=>b.onclick=()=>{page=b.dataset.page;render();});
  const world={cultivate:'cave-meditation',explore:'wilderness',alchemy:'cave',study:'sect',relic:'cave',inventory:'cave',fate:'wilderness',life:'sect'}[page];$('world').style.backgroundImage=`url('${art('scenes/'+world)}')`;
  let html='';
  if(page==='cultivate'){
   html=title('听雨洞府','静心修行','长久积累，圆满后再筹备突破。')+`<section class="cultivation"><h2>自然吐纳</h2><p>每轮修为 +50 · 60 秒 · 1 游戏月</p><small>修为圆满即停 · 最多 50 轮 · 不耗灵石</small><p><button class="jade primary" id="main-action" ${activity?'disabled':''}>${activity?'当前已有安排':'开始修炼'}</button></p><div class="detail-links"><button data-drawer="training">调整修炼安排</button><button data-drawer="goal">查看筑基缺口</button></div></section>`;
  }else if(page==='alchemy'){
   const r=recipes[recipe];html=title('听雨洞府 · 丹房','炉火与药香')+selectList(recipes.map((r,i)=>({name:r.name,hint:i===2?'筹备突破':'历练补给'})),recipe,'data-recipe','<button class="all" data-drawer="recipes">全部丹谱 ›</button>')+`<div class="object ${activity?.page==='alchemy'?'running-object':''}"><img src="${art('catalogue/alchemy-v1')}" alt="炼丹炉"><div class="materials">${r.inputs.map(([id,n,q])=>`<span>${icon('item-'+id)}${n}<small>持有 / 单炉 ${q}</small></span>`).join('')}</div></div>`+decision('炼制'+r.name,r.use,r.cost,`本段 ${plan.cycles} 炉 · 灵石上限 ${plan.budget} · 最多 ${plan.cycles} 游戏月<br>保留灵石 ${plan.reserve}；材料不足即停`,'开炉炼丹','<button data-drawer="plan">调整这次安排</button><button data-drawer="source">查看药材来源</button>');
  }else if(page==='explore'){
   const names=['青岚山野','青云宗','云岚坊市'],uses=['凝气草、灵露与普通历练。','宗门委托与传法玉简。','药材、丹药与物资购售。'];html=title('路线预览','择路而行','选择地点只预览，行路由你确认。')+`<div class="route-points">${names.map((n,i)=>`<button data-place="${i}" aria-pressed="${i===place}">${icon(['nav-explore','nav-karma','nav-inventory'][i])}<span>${n}</span></button>`).join('')}</div>`+decision(names[place],uses[place],'单次行旅 · 6 秒 · 不耗物资','只抵达此地；不自动采集、交易或开战。','行路至'+names[place],'<button data-drawer="source">查看此地资源</button><button data-drawer="strategy">查看战策</button>');
  }else if(page==='study'){
   const b=books[book];html=title('青云宗 · 传法阁','择一卷而习')+selectList(books.map(x=>({name:x.name,hint:x.known?'已掌握':'需筑基'})),book,'data-book','<button class="all" data-drawer="books">全部功法 ›</button>')+`<div class="object hero-book"><img src="${art('catalogue/study-v1')}" alt="玉简与剑"></div>`+decision(b.name,b.use,b.known?'装入前先比较 · 不消耗物资':'当前炼气 · 需筑基后研习',b.known?'心法只装一卷；更换后才影响修炼。':'目录可随时查看，尚未研习不会产生效果。',b.known?'比较并装入心法':'查看研习条件','<button data-drawer="loadout">当前配装</button><button data-drawer="books">研习清单</button>');
  }else if(page==='relic'){
   const r=relics[relic];html=title('听雨洞府 · 器室','器随道转')+selectList(relics.map(x=>({name:x.name,hint:'器谱 · 尚未炼成'})),relic,'data-relic')+`<div class="object relic">${icon('relic-'+r.id)}<small>器谱示意 · 尚未持有</small></div>`+decision(r.name,r.use,`单件 ${r.cost} 灵石 · 2 游戏月 · 60 秒`,'当前炼气 · 需金丹后炼器<br>本命槽：尚未装备','查看炼制条件','<button data-drawer="loadout">比较本命槽</button><button data-drawer="source">查看材料来源</button>');
  }else if(page==='inventory'){
   const rows=items.filter(x=>filter==='all'||x[3]===filter),max=Math.ceil(rows.length/8);itemPage=Math.min(itemPage,max-1);const visible=rows.slice(itemPage*8,itemPage*8+8);if(!visible.includes(items[item]))item=items.indexOf(visible[0]);const selected=items[item];html=title('随身物资','行囊')+`<div class="inventory-shell"><div><div class="inventory-tabs">${[['all','全部'],['materials','灵材'],['medicine','丹药'],['breakthrough','突破物']].map(([id,n])=>`<button data-filter="${id}" aria-pressed="${filter===id}">${n}</button>`).join('')}</div><div class="item-grid">${visible.map(x=>`<button data-item="${items.indexOf(x)}" aria-pressed="${x===selected}">${icon('item-'+x[0])}<span>${x[1]}</span><small>× ${x[2]}</small></button>`).join('')}</div><div class="pager"><button id="items-prev" ${itemPage===0?'disabled':''}>‹ 上一页</button><span>${itemPage+1} / ${max} 页</span><button id="items-next" ${itemPage===max-1?'disabled':''}>下一页 ›</button></div></div><section class="inventory-info"><h2>${selected[1]}</h2><p>${selected[4]}</p><small>当前持有 ${selected[2]}</small><button class="jade primary" data-drawer="source">查看可达来源</button><button class="quiet" data-drawer="item">用途与安排 ›</button></section></div>`;
  }else if(page==='fate'){
   const p=people[person];html=title('旧友与来路','仙缘')+selectList(people.map(x=>({name:x.name,hint:x.role.split(' · ')[0]})),person,'data-person')+`<img class="person" src="${art('characters/'+p.img)}" alt="${p.name}">`+decision(p.name,p.use,p.role,'先了解当前机缘，再选择回应。','查看当前机缘','<button data-drawer="person">已记来路</button>');
  }else if(page==='life'){
   const chapters=[['来路','山雨初歇','青岚山野的松风吹散薄雾。那场破庙中的相逢，成了此生问道的起点。'],['修行','听雨洞府','静坐、取材、疗养，再回到炉边。一步一步积累，圆满后再筹备下一境。'],['因果','人间故旧','每次已经落定的选择，都在这里留下一笔。尚未决定的机缘，仍待你亲自回答。']];const c=chapters[chapter];html=title('道者手记','此生来路')+selectList(chapters.map(x=>({name:x[0]})),chapter,'data-chapter')+`<article class="book-reading"><span class="date">示例篇章 · ${c[0]}</span><h2>${c[1]}</h2><p>${c[2]}</p><div class="pager"><button id="chapter-prev" ${chapter===0?'disabled':''}>‹ 上一章</button><span>${chapter+1} / 3</span><button id="chapter-next" ${chapter===2?'disabled':''}>下一章 ›</button></div><div class="reading-tools"><button data-drawer="records">完整行动记录</button><button data-drawer="life">导出与收卷</button></div></article>`;
  }
  $('stage').innerHTML=html;
  bind('[data-drawer]',el=>openDetail(el.dataset.drawer));
  for(const [attr,set] of [['recipe',v=>{recipe=v;plan.cycles=recipe===2?1:5;plan.budget=recipes[recipe].stone*plan.cycles;}],['book',v=>book=v],['relic',v=>relic=v],['place',v=>place=v],['person',v=>person=v],['item',v=>item=v],['chapter',v=>chapter=v]])bind(`[data-${attr}]`,el=>{set(Number(el.dataset[attr]));render();});
  bind('[data-filter]',el=>{filter=el.dataset.filter;itemPage=0;render();});
  if($('items-prev')){$('items-prev').onclick=()=>{itemPage--;render();};$('items-next').onclick=()=>{itemPage++;render();};}
  if($('chapter-prev')){$('chapter-prev').onclick=()=>{chapter--;render();};$('chapter-next').onclick=()=>{chapter++;render();};}
  if($('main-action'))$('main-action').onclick=()=>{if(activity)return;if(page==='study')openDetail(books[book].known?'compare':'books');else if(page==='relic')openDetail('relic');else if(page==='fate')openDetail('person');else start();};
 }
 const row=(label,value)=>`<p class="form-row"><span>${label}</span><strong>${value}</strong></p>`;
 function openDetail(kind){
  let heading='',body='',footer='<button class="quiet" data-close>返回场景</button>';
  if(kind==='plan'||kind==='training'){
   const training=kind==='training';heading=training?'修炼安排':'这次炼丹安排';body=training?'<p>自然吐纳 · 修为圆满即停</p><p>最多50轮，每轮60秒和1游戏月；不耗灵石。</p><p>灵石辅助与完整限额在正式接线时按原合同保留。</p>':`<p>${recipes[recipe].name} · 每炉${recipes[recipe].stone}灵石 / 1游戏月</p><div class="preset-row"><button data-preset="1">先炼一炉</button><button data-preset="5">安排五炉</button></div><label class="form-row">最多炉数<input id="cycles-input" type="number" min="1" max="50" value="${plan.cycles}"></label><label class="form-row">累计灵石上限<input id="budget-input" type="number" min="0" max="10000" value="${plan.budget}"></label><label class="form-row">灵石至少保留<input id="reserve-input" type="number" min="0" max="10000" value="${plan.reserve}"></label><small>达到炉数、累计预算、保留线或缺材就停。当前原型演示层级，不会执行正式结算。</small>`;footer+=`<button class="jade" id="apply-plan" ${activity?'disabled':''}>${activity?'先暂停并停止当前演示':'保存本次选择'}</button>`;
  }else if(kind==='recipes'){
   heading='丹谱';body='<div class="drawer-list">'+recipes.map((r,i)=>`<button data-pick-recipe="${i}">${icon('item-'+['healing_pill','spirit_pill','foundation_pill'][i])}<span>${r.name}<small>${r.cost}</small></span><span class="arrow">›</span></button>`).join('')+'</div><p>后续境界：凝金丹、结婴丹、化神丹、渡劫引。</p><small>正式目录保留全部七方与分页；这里聚焦当前炼气决策。</small>';
  }else if(kind==='goal'){
   heading='筹备筑基';body=row('修为','600 / 1000')+row('筑基丹','0 / 1')+'<p>先积累修为，也可提前取材炼丹。两者齐备后，由你确认突破。</p><div class="drawer-list"><button data-route="cultivate">回洞府修炼 <span class="arrow">›</span></button><button data-route="alchemy">查看筑基丹 <span class="arrow">›</span></button></div>';
  }else if(kind==='source'){
   heading='材料去处';body='<div class="drawer-list"><button data-route="explore">'+icon('item-herb')+'<span>山野采药<small>凝气草 ×2 · 每轮30秒 / 1游戏月</small></span><span class="arrow">›</span></button><button data-route="explore">'+icon('item-dew')+'<span>晨间凝露<small>灵露 ×1 · 每轮30秒 / 1游戏月</small></span><span class="arrow">›</span></button></div><p>查看来源只定位；到达后另行安排采集。</p><small>委托、坊市与全部后续来源在正式目录中保留。</small>';
  }else if(kind==='books'||kind==='loadout'||kind==='compare'){
   heading=kind==='compare'?'装入前比较':kind==='loadout'?'当前配装':'功法目录';body=kind==='books'?'<p>当前炼气可研习本境玉简；止水剑心与听雨剑势需筑基。</p><div class="drawer-list">'+books.map((b,i)=>`<button data-pick-book="${i}"><span>${b.name}<small>${b.known?'已掌握':'需筑基'}</small></span><span class="arrow">›</span></button>`).join('')+'</div>':row('心法','青锋心诀')+row('起手','青锋起势')+row('终结','惊鸿斩')+row('本命法宝','尚未装备')+'<p>已掌握与已装备分开；换法先比较实际效果，再单独确认。</p>';
  }else if(kind==='relic'){
   heading=relics[relic].name+' · 炼制条件';body=row('境界','当前炼气 / 需要金丹')+row('地点','听雨洞府')+row('灵石',relics[relic].cost+' / 件')+'<p>查看器谱不会炼制或装备。达到条件后，单件炼成，再由你决定是否装入本命槽。</p>';
  }else if(kind==='strategy'){
   heading='战策';body='<p>默认战场只显示敌方意图、我方状态与下一招。</p><div class="drawer-list"><button data-info="招式顺序只在这里展开，当前战局不同时铺开整张配置表。">招式顺序 <span class="arrow">›</span></button><button data-info="用药阈值、整段用量与库存保留在确认前核对。">药匣与保留 <span class="arrow">›</span></button><button data-info="危险时暂停或按已选策略撤退；暂停不会自动离场。">危险边界 <span class="arrow">›</span></button></div><small>这里只演示逐层查看，未运行战斗规则。</small>';
  }else if(kind==='person'){
   heading=people[person].name;body=`<p>${people[person].use}</p><p>机缘来由、选项效果和代价放在这里阅读。阅读不倒计时；确定回应后才安排一次。</p><small>原型不代选剧情，不记录新的因果。</small>`;
  }else if(kind==='records'){
   heading='行道手记';body='<p>暂无本轮已结算成果。</p><p>默认只提示这一段的关键收获。逐轮费用、物资净变化与停止原因在完整手记中分页回看。</p><small>原型计时不发放奖励，也不伪造正式回执。</small>';
  }else if(kind==='activity'){
   heading='当前安排';body=activity?row('活动',activity.title)+row('状态',activity.phase==='running'?'进行中':'已暂停')+row('本轮',activity.ms/1000+' 秒')+'<p>切换页面仍保留这条活动；继续后按正式规则重新计时未完成轮次。</p>':'<p>当前没有活动。</p>';if(activity)footer+='<button class="jade" id="stop-activity">停止本次演示</button>';
  }else if(kind==='item'){
   heading=items[item][1];body=`<p>${items[item][4]}</p>${row('当前数量',items[item][2])}<p>使用、出售、炼制是不同的明确安排，不在查看时触发。</p>`;
  }else if(kind==='profile'){
   heading='顾长青';body=row('境界','炼气')+row('气血 / 灵力','100 / 60')+row('修为','600 / 1000')+row('灵石','80')+'<p>完整属性、寿元、配装与导出在人物页核对。常驻界面仅保留当下需要的信息。</p>';
  }else if(kind==='life'){
   heading='生平与收卷';body='<p>导出、恢复完整准备、主动归隐与寿尽仍保留明确入口。</p><p>关键行动单独核对内容和代价；关闭阅读页不会结束人生。</p><small>本原型不提供真实存档导入导出或收卷。</small>';
  }else{
   heading=kind==='help'?'如何安排':'界面设置';body=kind==='help'?'<p>① 先选对象。② 看清本段目标和投入。③ 确认安排，随后放置执行。</p><p>活动条始终可见，随时暂停。详细预算和记录按需打开。</p>':'<p>设置与导出保留固定入口。动效、声音和阅读偏好集中在此，不挤占日常玩法。</p><small>本轮仅展示桌面布局方向，未接入正式偏好存储。</small>';
  }
  $('detail-title').textContent=heading;$('detail-body').innerHTML=body;$('detail-footer').innerHTML=footer;if(!$('detail').open)$('detail').showModal();
  $('detail').querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$('detail').close());
  $('detail').querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>{page=b.dataset.route;if(page==='alchemy'){recipe=2;plan.cycles=1;plan.budget=20;}$('detail').close();render();});
  $('detail').querySelectorAll('[data-pick-recipe]').forEach(b=>b.onclick=()=>{recipe=Number(b.dataset.pickRecipe);page='alchemy';plan.cycles=recipe===2?1:5;plan.budget=recipes[recipe].stone*plan.cycles;$('detail').close();render();});
  $('detail').querySelectorAll('[data-pick-book]').forEach(b=>b.onclick=()=>{book=Number(b.dataset.pickBook);page='study';$('detail').close();render();});
  $('detail').querySelectorAll('[data-info]').forEach(b=>b.onclick=()=>feedback(b.dataset.info));
  $('detail').querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{$('cycles-input').value=b.dataset.preset;$('budget-input').value=Number(b.dataset.preset)*recipes[recipe].stone;});
  if($('apply-plan'))$('apply-plan').onclick=()=>{if(kind==='plan'){const c=Number($('cycles-input').value),b=Number($('budget-input').value),r=Number($('reserve-input').value);if(!Number.isSafeInteger(c)||c<1||c>50||!Number.isSafeInteger(b)||b<0||b>10000||!Number.isSafeInteger(r)||r<0||r>10000){feedback('请填写有效的有限次数、预算与保留量。');return;}plan.cycles=c;plan.budget=b;plan.reserve=r;}$('detail').close();render();feedback('选择已更新；确认开始才会进入计时演示。');};
  if($('stop-activity'))$('stop-activity').onclick=()=>{activity=null;$('activity').hidden=true;$('detail').close();render();feedback('演示已停止，未产生游戏消耗或奖励。');};
 }
 function start(){const title=page==='cultivate'?'自然吐纳':page==='alchemy'?'炼制'+recipes[recipe].name:'行路至'+['青岚山野','青云宗','云岚坊市'][place],ms=page==='cultivate'?60000:page==='alchemy'?30000:6000;activity={page,title,ms,remaining:ms,due:performance.now()+ms,phase:'running'};$('activity').hidden=false;render();updateActivity();}
 function updateActivity(){if(!activity)return;const a=activity;if(a.phase==='running'){a.remaining=Math.max(0,a.due-performance.now());if(a.remaining===0){a.phase='paused';feedback('本轮计时演示结束；没有扣费、奖励或存档写入。');}}$('activity-name').textContent=a.title;$('activity-state').textContent=a.phase==='running'?'本轮进行中 · 示例未结算':'已暂停 · 继续会重新计时';const secs=Math.ceil(a.remaining/1000);$('countdown').textContent=String(Math.floor(secs/60)).padStart(2,'0')+':'+String(secs%60).padStart(2,'0');$('activity-fill').style.width=(100*(1-a.remaining/a.ms))+'%';$('pause').textContent=a.phase==='running'?'暂停':'继续';}
 $('pause').onclick=()=>{if(!activity)return;if(activity.phase==='running'){activity.remaining=Math.max(0,activity.due-performance.now());activity.phase='paused';}else{activity.phase='running';activity.remaining=activity.ms;activity.due=performance.now()+activity.ms;}updateActivity();};
 $('activity-view').onclick=()=>openDetail('activity');$('profile').onclick=()=>openDetail('profile');$('goal').onclick=()=>openDetail('goal');$('help').onclick=()=>openDetail('help');$('settings').onclick=()=>openDetail('settings');$('journal').onclick=()=>openDetail('records');$('close-detail').onclick=()=>$('detail').close();setInterval(updateActivity,100);render();
})();
