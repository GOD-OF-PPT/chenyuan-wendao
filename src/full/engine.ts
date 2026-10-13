import * as C from './content.ts';
import {stories} from './events.ts';
import type {Game,Command,Action,Choice,Battle,Move} from './types.ts';
export type {Game,Command,Action,Battle} from './types.ts';
export class RuleError extends Error {code:string;constructor(code:string,message:string){super(message);this.code=code;this.name='RuleError';}}
function fail(code:string,message:string):never{throw new RuleError(code,message);}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const own=(v:object,k:unknown):k is string=>typeof k==='string'&&Object.hasOwn(v,k);
const integer=(v:unknown,min=0,max=C.maxQuantity)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const text=(v:unknown,n=100)=>typeof v==='string'&&v.trim().length>0&&v.length<=n;
function shape(v:unknown,keys:string[]):asserts v is Record<string,unknown>{if(!object(v)||Object.keys(v).length!==keys.length||Object.keys(v).some(k=>!keys.includes(k)))fail('SAVE_SHAPE','存档结构或字段无效');}
const choiceIds=['help','trade','leave'];
const emptyItems=()=>Object.fromEntries(Object.keys(C.items).map(k=>[k,0]));
export function newGame(name:string,runId:string):Game{
 const g:Game={format:'chenyuan-full',version:2,core:{schemaVersion:2,contentVersion:C.VERSION,balanceVersion:C.BALANCE,runId,revision:0,mode:'event',player:{name,realm:'mortal',xp:0,hp:60,mp:20,stones:40,startAgeMonths:216},world:{location:'wilderness',elapsedMonths:0},inventory:{...emptyItems(),healing_pill:1},openingChoice:null,learnedSkills:[],activeEvent:{id:'temple',instanceId:runId+':temple'}},school:null,loadout:{mind:null,builder:null,finisher:null,relic:null},learned:[],ownedRelics:[],battle:null,journal:['你带着一枚回春丹，在山雨中走进破庙。'],wins:0,choices:{},milestones:{mortal:0},trial:null,status:'active',ending:null};
 validateGame(g);return g;
}
export function validateGame(value:unknown):asserts value is Game{
 shape(value,['format','version','core','school','loadout','learned','ownedRelics','battle','journal','wins','choices','milestones','trial','status','ending']);
 if(value.format!=='chenyuan-full'||value.version!==2)fail('SAVE_VERSION','不支持的完整存档版本');
 shape(value.core,['schemaVersion','contentVersion','balanceVersion','runId','revision','mode','player','world','inventory','openingChoice','learnedSkills','activeEvent']);
 const c=value.core;
 if(c.schemaVersion!==2||c.contentVersion!==C.VERSION||c.balanceVersion!==C.BALANCE)fail('SAVE_VERSION','内容或数值版本不匹配，请保留原存档');
 if(!text(c.runId)||!integer(c.revision)||!['event','idle'].includes(String(c.mode)))fail('SAVE_ID','存档身份无效');
 shape(c.player,['name','realm','xp','hp','mp','stones','startAgeMonths']);shape(c.world,['location','elapsedMonths']);
 const p=c.player,w=c.world;
 if(!text(p.name,16)||!own(C.realms,p.realm)||!own(C.locations,w.location))fail('SAVE_PLAYER','道号、境界或地点无效');
 const r=C.realms[p.realm as C.RealmId];
 if(C.rank(p.realm as C.RealmId)<C.rank(C.locations[w.location as C.LocationId].min))fail('SAVE_LOCATION','当前境界不能进入该地点');
 if(!integer(p.xp,0,r.xpCap)||!integer(p.hp,1,r.maxHp)||!integer(p.mp,0,r.maxMp)||!integer(p.stones)||!integer(p.startAgeMonths,1)||!integer(w.elapsedMonths))fail('SAVE_RANGE','属性超出范围');
 if((p.startAgeMonths as number)+(w.elapsedMonths as number)>=r.lifespanMonths)fail('SAVE_AGE','存档超出寿限');
 shape(c.inventory,Object.keys(C.items));if(Object.values(c.inventory).some(n=>!integer(n)))fail('SAVE_ITEMS','物品数量无效');
 if(c.openingChoice!==null&&!choiceIds.includes(String(c.openingChoice)))fail('SAVE_CHOICE','开场选择无效');
 if(!Array.isArray(c.learnedSkills)||c.learnedSkills.length!==(c.openingChoice==='trade'?1:0)||c.learnedSkills.some(s=>s!=='skill_jinghong_slash'))fail('SAVE_LEGACY_SKILL','开场功法记录不一致');
 if(value.school!==null&&!['sword','talisman'].includes(String(value.school)))fail('SAVE_SCHOOL','修法无效');
 if(p.realm==='mortal'&&value.school!==null)fail('SAVE_SCHOOL','凡人尚不能装备修法');
 const arr=(a:unknown,table:object)=>Array.isArray(a)&&a.length<=Object.keys(table).length&&new Set(a).size===a.length&&a.every(x=>own(table,x));
 if(!arr(value.learned,C.skills)||!arr(value.ownedRelics,C.relics))fail('SAVE_EQUIPMENT','功法或法宝引用无效');
 const learned=value.learned as string[],owned=value.ownedRelics as string[];
 if(learned.some(k=>C.rank(C.skills[k].min)>C.rank(p.realm as C.RealmId)))fail('SAVE_EQUIPMENT','未达功法境界');
 if(owned.length&&C.rank(p.realm as C.RealmId)<C.rank('golden'))fail('SAVE_EQUIPMENT','金丹前无法持有本命法宝');
 shape(value.loadout,['mind','builder','finisher','relic']);
 for(const slot of ['mind','builder','finisher'] as const){const id=value.loadout[slot];if(value.school===null){if(id!==null)fail('SAVE_LOADOUT','尚未选择修法');}else if(!own(C.skills,id)||!learned.includes(id)||C.skills[id].slot!==slot||C.skills[id].school!==value.school)fail('SAVE_LOADOUT','功法槽位或修法不匹配');}
 if(value.loadout.relic!==null&&(!own(C.relics,value.loadout.relic)||!owned.includes(value.loadout.relic)))fail('SAVE_LOADOUT','法宝未获得');
 if(!Array.isArray(value.journal)||value.journal.length>100||value.journal.some(x=>typeof x!=='string'||x.length>600)||!integer(value.wins))fail('SAVE_JOURNAL','经历无效');
 if(!object(value.choices)||Object.entries(value.choices).some(([id,v])=>!own(stories,id)||!stories[id].options.some(o=>o.id===v)||C.rank(stories[id].min)>C.rank(p.realm as C.RealmId)))fail('SAVE_STORIES','因果记录无效');
 for(const id of Object.keys(value.choices)){const req=stories[id].requires;if(req&&!own(value.choices,req))fail('SAVE_STORIES','因果链缺少前置事件');}
 if(!object(value.milestones)||Object.entries(value.milestones).some(([id,n])=>![...C.realmIds,'trial_completed'].includes(id as C.RealmId)||!integer(n,0,w.elapsedMonths as number)||(id!=='trial_completed'&&C.rank(id as C.RealmId)>C.rank(p.realm as C.RealmId))))fail('SAVE_MILESTONE','生平里程碑无效');
 if(!['active','ascended','ended'].includes(String(value.status))||![null,'transmit','depart','lifespan'].includes(value.ending as null))fail('SAVE_ENDING','结局无效');
 if(value.status==='active'&&(value.ending!==null||p.realm==='ascended'))fail('SAVE_ENDING','未完成的结局状态');
 if(value.status==='ascended'&&(p.realm!=='ascended'||!['transmit','depart'].includes(String(value.ending))||!own(value.milestones,'trial_completed')))fail('SAVE_ENDING','飞升缺少实际渡劫记录');
 if(value.status==='ended'&&(value.ending!=='lifespan'||p.realm==='ascended'))fail('SAVE_ENDING','生平结束状态不一致');
 if(value.trial!==null){shape(value.trial,['stage','answer']);if(!integer(value.trial.stage,0,4)||![null,'accept','release'].includes(value.trial.answer as null)||p.realm!=='spirit'||w.location!=='terrace'||value.status!=='active'||!value.school)fail('SAVE_TRIAL','渡劫状态无效');if((value.trial.stage===0)!==(value.trial.answer===null))fail('SAVE_TRIAL','问心记录不一致');}
 if(value.battle!==null){shape(value.battle,['enemy','hp','round','sword','marks','log']);const b=value.battle;if(!own(C.enemies,b.enemy))fail('SAVE_BATTLE','敌人无效');const e=C.enemies[b.enemy];
  if(!integer(b.hp,1,e.hp)||!integer(b.round,0,39)||!integer(b.sword,0,3)||!Array.isArray(b.marks)||b.marks.length>3||b.marks.some(n=>!integer(n,1,3))||!Array.isArray(b.log)||b.log.length>8||b.log.some(s=>typeof s!=='string'||s.length>600))fail('SAVE_BATTLE','回合数据无效');
  if(!value.school||c.mode!=='idle'||value.status!=='active'||w.location!==e.location||C.rank(p.realm as C.RealmId)<C.rank(e.min))fail('SAVE_BATTLE','战斗与当前状态不一致');
  if(value.school==='sword'&&b.marks.length||value.school==='talisman'&&b.sword)fail('SAVE_BATTLE','战斗资源与修法不符');
  if(Boolean(e.trial)!==Boolean(value.trial))fail('SAVE_TRIAL','天劫和普通战斗不能混用');
  if(value.trial&&['trial_heart','trial_thunder','trial_gate'][(value.trial.stage as number)-1]!==b.enemy)fail('SAVE_TRIAL','天劫阶段不一致');
 }
 if(value.trial&&[1,2,3].includes(value.trial.stage as number)&&value.battle===null)fail('SAVE_TRIAL','天劫缺少战斗');
 if(c.mode==='event'){
  shape(c.activeEvent,['id','instanceId']);const e=c.activeEvent;
  if(e.instanceId!==c.runId+':'+e.id||value.battle!==null||value.status!=='active')fail('SAVE_EVENT','事件上下文无效');
  if(e.id==='temple'){if(c.openingChoice!==null||p.realm!=='mortal'||p.xp!==0||w.location!=='wilderness')fail('SAVE_EVENT','破庙事件状态无效');}
  else if(e.id==='trial_question'){if(!value.trial||value.trial.stage!==0||c.openingChoice===null)fail('SAVE_EVENT','问心事件状态无效');}
  else if(!own(stories,e.id)||c.openingChoice===null||own(value.choices,e.id)||stories[e.id].location!==w.location||C.rank(stories[e.id].min)>C.rank(p.realm as C.RealmId)||(stories[e.id].requires&&!own(value.choices as object,stories[e.id].requires)))fail('SAVE_EVENT','事件引用或地点无效');
 }else if(c.activeEvent!==null||c.openingChoice===null)fail('SAVE_EVENT','存在未处理的事件');
 if(value.status!=='active'&&(value.trial!==null||value.battle!==null||c.mode!=='idle'))fail('SAVE_ENDING','已结束存档仍有未决战斗');
}
function log(g:Game,s:string){g.journal=[...g.journal,s].slice(-100);}
function needRealm(g:Game,min:C.RealmId){if(C.rank(g.core.player.realm)<C.rank(min))fail('REALM_REQUIRED',`需要${C.realms[min].name}境界`);}
function place(g:Game,id:C.LocationId){if(g.core.world.location!==id)fail('LOCATION_REQUIRED',`请先前往${C.locations[id].name}`);}
function spend(g:Game,stones=0,resources:Record<string,number>={}){if(g.core.player.stones<stones)fail('INSUFFICIENT_STONES','灵石不足');for(const [id,n]of Object.entries(resources))if(g.core.inventory[id]<n)fail('INSUFFICIENT_ITEM',`缺少${C.items[id].name} ×${n-g.core.inventory[id]}`);g.core.player.stones-=stones;for(const [id,n]of Object.entries(resources))g.core.inventory[id]-=n;}
function time(g:Game,n:number){if(g.core.player.startAgeMonths+g.core.world.elapsedMonths+n>=C.realms[g.core.player.realm].lifespanMonths)fail('AGE_LIMIT','寿元不足：请恢复境界检查点调整路线，或在设置中整理此生');g.core.world.elapsedMonths+=n;}
function xp(g:Game,n:number){g.core.player.xp=Math.min(C.realms[g.core.player.realm].xpCap,g.core.player.xp+n);}
function gain(g:Game,resources:Record<string,number>){for(const [id,n]of Object.entries(resources)){if(g.core.inventory[id]+n>C.maxQuantity)fail('CAPACITY','物资已达安全上限');g.core.inventory[id]+=n;}}
export function stats(g:Game){const r=C.realms[g.core.player.realm];return {...r,guard:24+Math.floor(r.power*1.2)+(g.loadout.mind==='sword_still'?6:0),cultivationBonus:['sword_still','talisman_calm'].includes(g.loadout.mind??'')?25:0,markDamage:9+Math.floor(r.power/3)+(g.loadout.relic==='soul_lamp'?4:0)};}
export function intent(b:Battle){const e=C.enemies[b.enemy];return b.round%3===1?{kind:'prepare',name:'正在蓄势 · 下回合重击',damage:0}:b.round%3===2?{kind:'heavy',name:'蓄势重击',damage:e.heavy}:{kind:'attack',name:'试探进攻',damage:e.attack};}
export function availableEvents(g:Game){return Object.values(stories).filter(e=>g.status==='active'&&!g.trial&&!g.battle&&g.core.mode==='idle'&&g.core.world.location===e.location&&C.rank(g.core.player.realm)>=C.rank(e.min)&&!own(g.choices,e.id)&&(!e.requires||own(g.choices,e.requires)));}
const commandFields:Record<string,string[]>={CHOOSE:['choice'],TRAVEL:['location'],CULTIVATE:['method','count'],SOURCE:['sourceId','count','target'],BUY:['item','quantity'],SELL:['item','quantity'],CRAFT:['recipeId'],USE:['item'],REST:[],BREAKTHROUGH:[],SCHOOL:['school'],LEARN:['skill'],EQUIP:['skill'],FORGE:['relic'],EQUIP_RELIC:['relic'],ENCOUNTER:['enemy'],BATTLE:['move'],EVENT:['event'],DECIDE:['option'],START_TRIAL:[],ANSWER_TRIAL:['answer'],END:['ending'],RETIRE:[]};
export function validateCommand(c:unknown):asserts c is Command{
 if(!object(c)||!text(c.commandId)||!text(c.runId)||!integer(c.expectedRevision)||!own(commandFields,c.type)||Object.keys(c).some(k=>!['type','commandId','runId','expectedRevision',...commandFields[c.type as string]].includes(k)))fail('INVALID_COMMAND','指令类型、标识或字段无效');
 for(const k of commandFields[c.type as string])if(!['count','target'].includes(k)&&!own(c,k))fail('INVALID_COMMAND','指令缺少参数');
 if(c.count!==undefined&&!integer(c.count,1,C.maxBatch))fail('INVALID_COMMAND','批量次数应为1至50');
 if(['BUY','SELL'].includes(String(c.type))&&!integer(c.quantity,1))fail('INVALID_COMMAND','数量须为正整数');
 if(c.target!==undefined){shape(c.target,['item','quantity']);if(!own(C.items,c.target.item)||!integer(c.target.quantity,1))fail('INVALID_COMMAND','目标物资无效');}
 const checks:[string,object][]=[['location',C.locations],['item',C.items],['sourceId',C.sources],['recipeId',C.recipes],['skill',C.skills],['relic',C.relics],['enemy',C.enemies],['event',stories],['method',C.cultivation]];
 for(const [k,t]of checks)if(c[k]!==undefined&&!own(t,c[k]))fail('INVALID_COMMAND','未知的内容引用');
 if(c.choice!==undefined&&!choiceIds.includes(String(c.choice)))fail('INVALID_COMMAND','开场选项无效');
 if(c.school!==undefined&&!['sword','talisman'].includes(String(c.school)))fail('INVALID_COMMAND','修法无效');
 if(c.move!==undefined&&!['attack','guard','technique','release','heal','restore','flee'].includes(String(c.move)))fail('INVALID_COMMAND','行动无效');
 if(c.option!==undefined&&!text(c.option,40))fail('INVALID_COMMAND','事件选项无效');
 if(c.answer!==undefined&&!['accept','release'].includes(String(c.answer)))fail('INVALID_COMMAND','问心选项无效');
 if(c.ending!==undefined&&!['transmit','depart'].includes(String(c.ending)))fail('INVALID_COMMAND','结局选项无效');
}
function freshBattle(enemy:string):Battle{return {enemy,hp:C.enemies[enemy].hp,round:0,sword:0,marks:[],log:[]};}
function useMedicine(g:Game,id:string){const item=C.items[id],r=C.realms[g.core.player.realm],p=g.core.player;if(!item.hp&&!item.mp)fail('NOT_USABLE','该物用于配方或突破，不能直接服用');if(item.hp&&p.hp===r.maxHp||item.mp&&p.mp===r.maxMp)fail('NO_CHANGE','已经恢复圆满，无需消耗丹药');spend(g,0,{[id]:1});if(item.hp)p.hp=Math.min(r.maxHp,p.hp+Math.max(item.hp,Math.floor(r.maxHp*.35)));if(item.mp)p.mp=Math.min(r.maxMp,p.mp+Math.max(item.mp,Math.floor(r.maxMp*.35)));}
function loseBattle(g:Game,reason:string){g.core.player.hp=Math.max(1,g.core.player.hp);g.core.world.location='cave';g.battle=null;g.trial=null;log(g,reason+'。回洞府疗养，或恢复渡劫前检查点；功法与未消耗物品保留。');}
function battleTurn(g:Game,move:Move){
 const b=g.battle!,e=C.enemies[b.enemy],p=g.core.player,r=stats(g),forecast=intent(b);let damage=0,block=0,interrupt=false;const lines:string[]=[];
 const mana=(n:number)=>{if(p.mp<n)fail('MP_REQUIRED','灵力不足，普通攻击或护体可以回灵');p.mp-=n;};
 const extra=g.loadout.relic==='frost_sword'?5:0,releaseBonus=g.trial?.answer==='release'?8:0;
 if(move==='flee'){p.hp=Math.max(1,p.hp-8);loseBattle(g,'你主动退离战场，本次不获战利品');return;}
 if(move==='attack'){damage=13+r.power+extra;p.mp=Math.min(r.maxMp,p.mp+6+(g.loadout.mind==='talisman_calm'?4:0));if(g.school==='sword')b.sword=Math.min(3,b.sword+1);lines.push(`基础攻击 ${damage}，凝聚灵力`);}
 if(move==='guard'){block=r.guard;p.mp=Math.min(r.maxMp,p.mp+5);lines.push(`护体减伤 ${block}，回灵 5`);}
 if(move==='technique'){
  if(g.school==='sword'){mana(8);if(g.loadout.builder==='sword_guard'){damage=9+r.power+extra;block=16+Math.floor(r.power/2);b.sword=Math.min(3,b.sword+1);}else{damage=16+r.power+extra;b.sword=Math.min(3,b.sword+2);}lines.push(`${C.skills[g.loadout.builder!].name}，剑意 ${b.sword}/3`);}
  else{if(b.marks.length>=3)fail('MARK_CAP','符印已满，请引爆或等待消散');const frost=g.loadout.builder==='talisman_frost';mana(frost?10:8);b.marks.push(frost?3:2);block=(frost?5:12)+Math.floor(r.power/2);lines.push(`${C.skills[g.loadout.builder!].name}，留下${frost?3:2}回合符印`);}
 }
 if(move==='release'){
  if(g.school==='sword'){if(!b.sword)fail('SWORD_REQUIRED','请先积累剑意');mana(12);damage=18+r.power+extra+10*b.sword+(g.core.learnedSkills.length?4:0);interrupt=b.sword===3&&forecast.kind==='heavy';if(g.loadout.finisher==='sword_echo'){damage-=6;p.hp=Math.min(r.maxHp,p.hp+16+Math.floor(r.power/2));}b.sword=g.loadout.relic==='frost_sword'?1:0;lines.push(`${C.skills[g.loadout.finisher!].name} ${damage}${interrupt?'，打断重击':''}`);}
  else{if(!b.marks.length)fail('MARK_REQUIRED','先施符，再择机引爆');mana(10);damage=16+r.power+extra+b.marks.reduce((a,n)=>a+n*r.markDamage,0);b.marks=[];if(g.loadout.finisher==='talisman_return')p.mp=Math.min(r.maxMp,p.mp+18);lines.push(`${C.skills[g.loadout.finisher!].name} ${damage}，结算符印余威`);}
 }
 if(move==='heal'||move==='restore'){useMedicine(g,move==='heal'?'healing_pill':'spirit_pill');lines.push('服丹恢复，消耗一个回合');}
 const tick=b.marks.length*r.markDamage;if(tick)lines.push(`符印灼伤 ${tick}`);damage+=tick+(damage>0?releaseBonus:0);b.marks=b.marks.map(n=>n-1).filter(n=>n>0);b.hp-=damage;
 if(g.loadout.relic==='cloud_mirror'){p.hp=Math.min(r.maxHp,p.hp+4);if(move==='attack'||move==='guard')p.mp=Math.min(r.maxMp,p.mp+6);}
 if(b.hp<=0){g.wins++;log(g,lines.join(' · ')+`。击败${e.name}。`);
  if(g.trial){g.trial.stage++;if(g.trial.stage===4){g.battle=null;g.milestones.trial_completed=g.core.world.elapsedMonths;log(g,'雷云散尽，天门已开。最后一步，由你决定留下些什么。');}else{g.battle=freshBattle(['trial_heart','trial_thunder','trial_gate'][g.trial.stage-1]);log(g,`下一关：${C.enemies[g.battle.enemy].name}。气血与消耗持续保留。`);}}
  else{gain(g,e.loot);p.stones+=e.stones;xp(g,e.xp);g.battle=null;log(g,`战利品：${Object.entries(e.loot).map(([id,n])=>C.items[id].name+' ×'+n).join('、')}；灵石 +${e.stones}，修为 +${e.xp}（不超过上限）。`);}return;
 }
 let armor=g.loadout.relic==='jade_seal'?8:0;
 if(g.trial){if(g.trial.answer==='accept')armor+=10;if(g.choices.pei_pact==='ally')armor+=6;if(b.enemy==='trial_thunder'&&g.choices.shen_pact==='lend')armor+=8;}
 const loss=interrupt?0:Math.max(0,forecast.damage-block-armor);p.hp-=loss;lines.push(forecast.kind==='prepare'?'敌人正在蓄势':`承受伤害 ${loss}`);b.round++;b.log=[...b.log,...lines].slice(-8);log(g,lines.join(' · '));
 if(p.hp<=0||b.round>=40)loseBattle(g,p.hp<=0?'你未能抵住这一击':'缠斗过久，你被护山阵送回');
}
function one(g:Game,a:Action){
 if(g.status!=='active')fail('ENDED','此生已经结束，可以导出生平或开启新的人生');
 if(a.type==='RETIRE'){if(g.battle||g.trial||g.core.mode==='event')fail('PENDING','先处理当前事件或退出战斗');g.status='ended';g.ending='lifespan';log(g,'你收起行囊，将这一生写成旧卷。此生未飞升，但走过的路并未消失。');return;}
 if(a.type==='CHOOSE'){if(g.core.activeEvent?.id!=='temple')fail('EVENT_RESOLVED','破庙因果已经结算');if(a.choice!=='leave')spend(g,0,{healing_pill:1});g.core.openingChoice=a.choice;g.core.learnedSkills=a.choice==='trade'?['skill_jinghong_slash']:[];g.core.activeEvent=null;g.core.mode='idle';log(g,a.choice==='help'?'你赠丹相助，结下赠药之缘。':a.choice==='trade'?'你以丹换来惊鸿剑简，彼此两清。':'你留下回春丹，谨慎地走出破庙。');return;}
 if(a.type==='ANSWER_TRIAL'){if(g.core.activeEvent?.id!=='trial_question'||g.trial?.stage!==0)fail('NO_QUESTION','此刻没有待答的问心');g.trial.answer=a.answer;g.trial.stage=1;g.core.mode='idle';g.core.activeEvent=null;g.battle=freshBattle('trial_heart');log(g,a.answer==='accept'?'你接纳曾经的自己，天劫每击减伤 10。':'你放下旧念，天劫直接攻击额外伤害 8。');return;}
 if(a.type==='DECIDE'){const id=g.core.activeEvent?.id;if(!id||!own(stories,id)||own(g.choices,id))fail('NO_EVENT','没有待处理的机缘');const story=stories[id],o=story.options.find(x=>x.id===a.option);if(!o)fail('INVALID_OPTION','选项无效');spend(g,o.stones??0,o.cost);gain(g,o.gain??{});g.core.player.stones+=o.reward??0;xp(g,o.xp??0);g.choices[id]=o.id;g.core.mode='idle';g.core.activeEvent=null;log(g,`${story.npc} · ${story.name}：${o.result}`);return;}
 if(g.core.mode==='event')fail('PENDING_EVENT','先处理当前遭遇；查看资料不会消耗时间');
 if(a.type==='BATTLE'){if(!g.battle)fail('NO_BATTLE','当前没有战斗');battleTurn(g,a.move);return;}
 if(g.battle)fail('IN_BATTLE','战斗中只能使用战斗面板，或选择撤退');
 if(a.type==='END'){if(g.trial?.stage!==4)fail('TRIAL_REQUIRED','先通过天劫三关');g.trial=null;g.status='ascended';g.ending=a.ending;g.core.player.realm='ascended';g.core.player.xp=0;g.milestones.ascended=g.core.world.elapsedMonths;log(g,a.ending==='transmit'?'你将道法留在人间，而后踏入天门。此后万山之间，仍有人传诵你的来路。':'你向旧友挥别，独赴上界。云海合拢，新的故事不在这部旧卷之中。');return;}
 if(g.trial)fail('IN_TRIAL','天劫尚未结束，不能离开筹备或重复启动');
 switch(a.type){
  case 'TRAVEL':needRealm(g,C.locations[a.location].min);if(g.core.world.location===a.location)fail('NO_CHANGE','已在此地');g.core.world.location=a.location;log(g,`你抵达${C.locations[a.location].name}。`);break;
  case 'CULTIVATE':{place(g,'cave');const p=g.core.player,r=stats(g),m=C.cultivation[a.method];if(a.method==='assisted')needRealm(g,'qi');if(p.xp===r.xpCap)fail('XP_CAP','修为圆满，请筹备突破物');spend(g,m.stones);time(g,m.months);const yieldXp=Math.floor(r.baseYield*(100+m.bonus+r.cultivationBonus)/100);xp(g,yieldXp);break;}
  case 'SOURCE':{const s=C.sources[a.sourceId];needRealm(g,s.min);place(g,s.location);if(a.target){if(!own(s.items,a.target.item))fail('TARGET_UNREACHABLE','此处不产目标物资');if(g.core.inventory[a.target.item]>=a.target.quantity)fail('TARGET_MET','目标已经收集齐全');}time(g,s.months);gain(g,s.items);g.core.player.stones+=s.stones;xp(g,s.xp);break;}
  case 'BUY':needRealm(g,C.items[a.item].min);place(g,'market');spend(g,C.items[a.item].buy*a.quantity);gain(g,{[a.item]:a.quantity});break;
  case 'SELL':{place(g,'market');const price=C.items[a.item].sell;if(price===null)fail('LOCKED_ITEM','突破物不可出售');spend(g,0,{[a.item]:a.quantity});g.core.player.stones+=price*a.quantity;break;}
  case 'CRAFT':{place(g,'cave');const r=C.recipes[a.recipeId];needRealm(g,r.min);spend(g,r.stones,r.inputs);time(g,r.months);gain(g,{[r.output]:1});break;}
  case 'USE':useMedicine(g,a.item);break;
  case 'REST':{place(g,'cave');const r=stats(g);if(g.core.player.hp===r.maxHp&&g.core.player.mp===r.maxMp)fail('NO_CHANGE','气血灵力已经圆满');time(g,1);g.core.player.hp=r.maxHp;g.core.player.mp=r.maxMp;break;}
  case 'BREAKTHROUGH':{place(g,'cave');const r=C.realms[g.core.player.realm];if(!r.next)fail('TRIAL_REQUIRED','化神圆满后须前往登仙台渡劫');if(g.core.player.xp<r.xpCap)fail('XP_REQUIRED','修为尚未圆满');spend(g,0,r.pill?{[r.pill]:1}:{});g.core.player.realm=r.next;g.core.player.xp=0;g.core.player.hp=C.realms[r.next].maxHp;g.core.player.mp=C.realms[r.next].maxMp;g.milestones[r.next]=g.core.world.elapsedMonths;log(g,`你踏入${C.realms[r.next].name}。${r.next==='golden'?'金丹既成，本命法宝可以开始炼制。':'修行没有捷径，新的资源与机缘已向你开放。'}`);break;}
  case 'SCHOOL':{needRealm(g,'qi');if(g.school===a.school)fail('NO_CHANGE','已经采用此修法');g.school=a.school;const defaults=[a.school+'_mind',a.school+'_build',a.school+'_release'];g.learned=[...new Set([...g.learned,...defaults])];g.loadout.mind=defaults[0];g.loadout.builder=defaults[1];g.loadout.finisher=defaults[2];log(g,a.school==='sword'?'你展开青锋剑诀。积蓄、破势，才是剑修的节奏。':'你提笔绘符。护持、灼伤与引爆，皆有其时机。');break;}
  case 'LEARN':{place(g,'sect');const s=C.skills[a.skill];needRealm(g,s.min);if(g.learned.includes(a.skill))fail('ALREADY_LEARNED','已掌握此法');spend(g,s.price);g.learned.push(a.skill);log(g,`你研习${s.name}。${s.description}`);break;}
  case 'EQUIP':{const s=C.skills[a.skill];if(!g.learned.includes(a.skill))fail('NOT_LEARNED','尚未掌握此法');if(g.school!==s.school)fail('SCHOOL_REQUIRED','先切换到对应修法');if(g.loadout[s.slot]===a.skill)fail('NO_CHANGE','此法已经装备');g.loadout[s.slot]=a.skill;log(g,`你将${s.name}纳入当前功法。`);break;}
  case 'FORGE':{place(g,'cave');needRealm(g,'golden');if(g.ownedRelics.includes(a.relic))fail('ALREADY_OWNED','已拥有此法宝');const r=C.relics[a.relic];spend(g,r.stones,r.inputs);time(g,2);g.ownedRelics.push(a.relic);log(g,`炉火初歇，${r.name}已成。请在修行页装备。`);break;}
  case 'EQUIP_RELIC':if(!g.ownedRelics.includes(a.relic))fail('NOT_OWNED','尚未炼成此法宝');if(g.loadout.relic===a.relic)fail('NO_CHANGE','已装备');g.loadout.relic=a.relic;log(g,`${C.relics[a.relic].name}与你的心神相连。`);break;
  case 'ENCOUNTER':{const e=C.enemies[a.enemy];if(e.trial)fail('TRIAL_REQUIRED','不可从普通历练进入天劫');needRealm(g,e.min);place(g,e.location);if(!g.school)fail('SCHOOL_REQUIRED','先选择剑修或符修');if(g.core.player.hp<30)fail('HP_REQUIRED','气血低于30，请先疗养');time(g,1);g.battle=freshBattle(a.enemy);log(g,`你遇见${e.name}。观察对方意图，再决定出手。`);break;}
  case 'EVENT':{if(!availableEvents(g).some(s=>s.id===a.event))fail('EVENT_UNAVAILABLE','此地或当前进度没有这段机缘');g.core.mode='event';g.core.activeEvent={id:a.event,instanceId:g.core.runId+':'+a.event};break;}
  case 'START_TRIAL':{place(g,'terrace');if(g.core.player.realm!=='spirit'||g.core.player.xp!==C.realms.spirit.xpCap)fail('XP_REQUIRED','化神修为须圆满');if(!g.school)fail('SCHOOL_REQUIRED','先装备修法');if(g.core.player.hp<Math.floor(C.realms.spirit.maxHp*.8))fail('HP_REQUIRED','渡劫前气血至少恢复到八成');spend(g,0,{ascension_seal:1});g.trial={stage:0,answer:null};g.core.mode='event';g.core.activeEvent={id:'trial_question',instanceId:g.core.runId+':trial_question'};log(g,'渡劫引化作一道金光。问心之前，你回望自己真正走过的路。');break;}
 }
}
/** Deterministic command resolution. It never reads clocks, DOM, storage, or random APIs. */
export function advance(game:Game,command:Command):Game{
 validateGame(game);validateCommand(command);
 if(command.runId!==game.core.runId)fail('RUN_MISMATCH','已经切换存档，请读取最新进度');
 if(command.expectedRevision!==game.core.revision)fail('STALE_REVISION','另一页面已经推进，请重新读取进度');
 let g=structuredClone(game),steps=0,stop='';
 const count=command.type==='CULTIVATE'||command.type==='SOURCE'?command.count??1:1;
 for(let i=0;i<count;i++){const candidate=structuredClone(g);try{one(candidate,command);validateGame(candidate);g=candidate;steps++;}catch(e){if(steps&&e instanceof RuleError&&['XP_CAP','AGE_LIMIT','TARGET_MET','INSUFFICIENT_STONES','INSUFFICIENT_ITEM','CAPACITY'].includes(e.code)){stop=e.message;break;}throw e;}}
 g.core.revision++;
 if(['CULTIVATE','SOURCE','BUY','SELL','CRAFT','REST','USE'].includes(command.type)){
  const p=g.core.player,before=game.core.player;const parts:string[]=[];
  if(p.xp!==before.xp)parts.push(`修为 +${p.xp-before.xp}`);if(p.stones!==before.stones)parts.push(`灵石 ${p.stones-before.stones>0?'+':''}${p.stones-before.stones}`);
  for(const id of Object.keys(C.items)){const n=g.core.inventory[id]-game.core.inventory[id];if(n)parts.push(`${C.items[id].name} ${n>0?'+':''}${n}`);}
  if(p.hp>before.hp)parts.push(`气血 +${p.hp-before.hp}`);if(p.mp>before.mp)parts.push(`灵力 +${p.mp-before.mp}`);
  const months=g.core.world.elapsedMonths-game.core.world.elapsedMonths;if(months)parts.push(`游戏岁月 +${months}月`);
  log(g,`${steps>1?`结算 ${steps} 次：`:''}${parts.join(' · ')}${stop?'；自动停止：'+stop:''}`);
 }
 validateGame(g);return g;
}
export function reason(g:Game,a:Action):string|null{try{advance(g,{...a,commandId:'preview',runId:g.core.runId,expectedRevision:g.core.revision});return null;}catch(e){return e instanceof Error?e.message:'当前不可执行';}}
export function parseGame(raw:string):Game{
 if(typeof raw!=='string'||raw.length>1_000_000)fail('SAVE_SIZE','存档过大');let v:unknown;try{v=JSON.parse(raw);}catch{fail('SAVE_JSON','文件不是有效 JSON');}
 if(object(v)&&v.format==='chenyuan-full'){validateGame(v);return structuredClone(v);}
 // Explicit import of the two historical M1 formats. Preserve all resources and battle state.
 const old=object(v)&&v.format==='chenyuan-playable'&&v.version===1?v:null;
 const c=old?old.core:v;
 if(!object(c)||c.schemaVersion!==1||c.contentVersion!=='m1-economic-slice.1'||c.balanceVersion!=='m1-unbalanced.1')fail('SAVE_VERSION','未知旧档版本，未覆盖现有进度');
 shape(c,['schemaVersion','contentVersion','balanceVersion','runId','revision','mode','player','world','inventory','openingChoice','learnedSkills','activeEvent']);
 if(!object(c.player)||!['mortal','qi','foundation'].includes(String(c.player.realm))||!object(c.inventory)||Object.keys(c.inventory).length!==6||Object.keys(c.inventory).some(k=>!['herb','dew','core','healing_pill','spirit_pill','foundation_pill'].includes(k)))fail('SAVE_LEGACY','旧档境界或物品无效');
 if(old)shape(old,['format','version','core','school','battle','journal','wins']);
 const g=newGame(String(c.player.name),String(c.runId));
 g.core={...structuredClone(c),schemaVersion:2,contentVersion:C.VERSION,balanceVersion:C.BALANCE,inventory:{...emptyItems(),...c.inventory}} as Game['core'];
 if(old){g.school=old.school as Game['school'];g.battle=structuredClone(old.battle) as Battle|null;g.journal=old.journal as string[];g.wins=old.wins as number;}
 if(g.school&&['sword','talisman'].includes(g.school)){const d=[g.school+'_mind',g.school+'_build',g.school+'_release'];g.learned=d;g.loadout={mind:d[0],builder:d[1],finisher:d[2],relic:null};}
 g.milestones={mortal:0,[g.core.player.realm]:g.core.world.elapsedMonths};validateGame(g);return structuredClone(g);
}
export function biography(g:Game):string[]{
 const p=g.core.player;const lines=[`${p.name}，${Math.floor((p.startAgeMonths+g.core.world.elapsedMonths)/12)}岁，${C.realms[p.realm].name}。`,g.core.openingChoice==='help'?'初入山雨，曾赠出唯一的回春丹。':g.core.openingChoice==='trade'?'初入山雨，以一枚丹药换得剑简。':g.core.openingChoice==='leave'?'初入山雨，选择留住自己的丹药。':'此生刚刚开始，破庙之缘尚未决定。'];
 for(const id of C.realmIds)if(id!=='mortal'&&own(g.milestones,id))lines.push(`行道第${g.milestones[id]}个月，踏入${C.realms[id].name}。`);
 if(g.school)lines.push(`当前修法：${g.school==='sword'?'剑修':'符修'}。胜过${g.wins}场挑战。`);
 if(g.choices.shen_return)lines.push(g.choices.shen_return==='accept'?'你曾与沈清禾在药庐叙旧。':'你曾与沈清禾重逢，又各自作别。');
 if(g.choices.shen_pact==='lend')lines.push(g.status==='ascended'?'赠丹之诺仍在，沈清禾以药阵护持雷劫。':'赠丹之诺仍在，沈清禾答应在雷劫中以药阵相助。');
 if(g.choices.pei_meet)lines.push(g.choices.pei_meet==='cooperate'?'裴照曾与你相约同行。':g.choices.pei_meet==='rival'?'你与裴照各凭本事，亦未曾相轻。':'你曾婉拒裴照的邀约。');
 if(g.choices.pei_echo)lines.push(g.choices.pei_echo==='share'?'古境重逢时，你与裴照分莲共渡。':'古境重逢后，你们选择了不同的路。');
 if(g.choices.pei_pact==='ally')lines.push(g.status==='ascended'?'云台护阵中，留下了裴照的一道剑痕。':'你与裴照约定在云台合力布阵。');
 if(g.choices.lu_teach==='teach')lines.push('你曾回到山门，向后辈传授自己所学。');
 if(g.choices.yan_mirror==='accept')lines.push('照影古境里，你接纳了曾经弱小的自己。');
 if(g.ending)lines.push(g.ending==='transmit'?'道法留在人间，你由此飞升。':g.ending==='depart'?'你挥别故人，独赴上界。':'此生收卷，未渡天门。来路仍值得记取。');
 return lines;
}
