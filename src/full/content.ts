/** Full-demo content. All numbers are initial tuning values, not a retention promise. */
export const VERSION = 'full-demo.1';
export const BALANCE = 'full-unbalanced.1';
export const realmIds = ['mortal','qi','foundation','golden','nascent','spirit','ascended'] as const;
export type RealmId = typeof realmIds[number];
export type School = 'sword' | 'talisman';
export type LocationId = 'wilderness'|'cave'|'sect'|'market'|'secret'|'terrace';
export interface Realm { name:string; xpCap:number; baseYield:number; maxHp:number; maxMp:number; lifespanMonths:number; power:number; next:RealmId|null; pill:string|null; }
export const realms:Record<RealmId,Realm> = {
 mortal:{name:'凡人',xpCap:10,baseYield:5,maxHp:60,maxMp:20,lifespanMonths:1080,power:0,next:'qi',pill:null},
 qi:{name:'炼气',xpCap:1000,baseYield:50,maxHp:100,maxMp:60,lifespanMonths:1440,power:0,next:'foundation',pill:'foundation_pill'},
 foundation:{name:'筑基',xpCap:3000,baseYield:120,maxHp:170,maxMp:100,lifespanMonths:2880,power:6,next:'golden',pill:'golden_pill'},
 golden:{name:'金丹',xpCap:7200,baseYield:240,maxHp:270,maxMp:150,lifespanMonths:6000,power:16,next:'nascent',pill:'nascent_pill'},
 nascent:{name:'元婴',xpCap:15000,baseYield:420,maxHp:410,maxMp:210,lifespanMonths:12000,power:32,next:'spirit',pill:'spirit_seed'},
 spirit:{name:'化神',xpCap:28000,baseYield:700,maxHp:600,maxMp:290,lifespanMonths:24000,power:52,next:null,pill:'ascension_seal'},
 ascended:{name:'飞升',xpCap:0,baseYield:0,maxHp:600,maxMp:290,lifespanMonths:24000,power:52,next:null,pill:null}
};
export const rank=(realm:RealmId)=>realmIds.indexOf(realm);
export const locations:Record<LocationId,{name:string;min:RealmId;subtitle:string;description:string;art:string}>= {
 wilderness:{name:'青岚山野',min:'mortal',subtitle:'山雨初歇 · 一念入道',description:'松风吹散山间薄雾。循溪可寻凝气草，朝露凝在叶尖；更深的林影里，也有妖物窥伺。',art:'wild'},
 cave:{name:'听雨洞府',min:'mortal',subtitle:'一盏清茶 · 半卷道经',description:'石壁隔断尘嚣，檐雨敲响岁月。你在蒲团前摊开行囊：静修、炼丹，或为下一次远行作准备。',art:'cave'},
 sect:{name:'青云宗',min:'qi',subtitle:'青云有路 · 问道有师',description:'山门钟声穿过云海。执事将委托与传法玉简置于案头；你可以用时间积累灵石，也可拜访故人。',art:'sect'},
 market:{name:'云岚坊市',min:'qi',subtitle:'人间烟火 · 亦是修行',description:'檐下药香混着炉火气。这里可以买齐所缺材料，也能卖出多余收获；修行没有唯一的筹备之路。',art:'market'},
 secret:{name:'照影古境',min:'foundation',subtitle:'一境一心 · 旧碑新痕',description:'失落的石阶延伸到云雾之中。古境按修为显露新的灵材，守碑人却更关心你为何求道。',art:'secret'},
 terrace:{name:'登仙台',min:'spirit',subtitle:'回望来路 · 问心叩天',description:'天门隐在层云之后。此处不会替你跳过修炼：道行、灵物和临劫的选择，将共同决定最后一步。',art:'terrace'}
};
export interface Item {name:string;min:RealmId;buy:number;sell:number|null;kind:'material'|'medicine'|'breakthrough';description:string;hp?:number;mp?:number;}
export const items:Record<string,Item>={
 herb:{name:'凝气草',min:'qi',buy:5,sell:2,kind:'material',description:'山野采得。回春丹与各境丹药的基础药材。'},
 dew:{name:'灵露',min:'qi',buy:10,sell:4,kind:'material',description:'清晨凝集。用来调和丹药灵性。'},
 core:{name:'妖核',min:'qi',buy:50,sell:15,kind:'material',description:'狩猎、护送委托或坊市取得；并非只能冒险。'},
 jade:{name:'地脉灵玉',min:'foundation',buy:45,sell:12,kind:'material',description:'筑基后进入古境采玉，或完成宗门勘脉委托。'},
 lotus:{name:'月华莲',min:'golden',buy:65,sell:18,kind:'material',description:'金丹可采，炼制结婴丹，也用于本命法宝。'},
 soul:{name:'凝魂晶',min:'nascent',buy:90,sell:25,kind:'material',description:'元婴可从古境或安魂委托中稳定获得。'},
 dao:{name:'道蕴砂',min:'spirit',buy:120,sell:32,kind:'material',description:'化神时可收集，用于炼制渡劫引。'},
 healing_pill:{name:'回春丹',min:'mortal',buy:18,sell:5,kind:'medicine',description:'恢复气血；高境界按自身上限恢复一定比例。战中服用占一回合。',hp:35},
 spirit_pill:{name:'回灵丹',min:'qi',buy:18,sell:5,kind:'medicine',description:'恢复灵力；高境界按自身上限恢复一定比例。战中服用占一回合。',mp:25},
 foundation_pill:{name:'筑基丹',min:'qi',buy:160,sell:null,kind:'breakthrough',description:'炼气圆满后消耗一枚筑基，不能误卖。'},
 golden_pill:{name:'凝金丹',min:'foundation',buy:380,sell:null,kind:'breakthrough',description:'筑基圆满后结丹；可炼制，也可购买。'},
 nascent_pill:{name:'结婴丹',min:'golden',buy:700,sell:null,kind:'breakthrough',description:'金丹圆满后结婴；不依赖稀有随机掉落。'},
 spirit_seed:{name:'化神丹',min:'nascent',buy:1100,sell:null,kind:'breakthrough',description:'元婴圆满后化神的消耗物。'},
 ascension_seal:{name:'渡劫引',min:'spirit',buy:1500,sell:null,kind:'breakthrough',description:'化神圆满时引来天劫。启动前自动建立可恢复检查点。'}
};
export interface Source {name:string;location:LocationId;min:RealmId;months:number;stones:number;xp:number;items:Record<string,number>;}
export const sources:Record<string,Source>={
 herbs:{name:'山野采药',location:'wilderness',min:'qi',months:1,stones:0,xp:5,items:{herb:2}},
 dew:{name:'晨间凝露',location:'wilderness',min:'qi',months:1,stones:0,xp:5,items:{dew:1}},
 work:{name:'宗门杂务',location:'sect',min:'qi',months:1,stones:20,xp:0,items:{}},
 core:{name:'护送委托',location:'sect',min:'qi',months:4,stones:0,xp:20,items:{core:1}},
 jade:{name:'古境采玉',location:'secret',min:'foundation',months:2,stones:0,xp:30,items:{jade:2}},
 jade_task:{name:'勘脉委托',location:'sect',min:'foundation',months:3,stones:12,xp:10,items:{jade:1}},
 work_foundation:{name:'护持法阵',location:'sect',min:'foundation',months:2,stones:60,xp:20,items:{}},
 lotus:{name:'寒池采莲',location:'secret',min:'golden',months:3,stones:0,xp:60,items:{lotus:2}},
 lotus_task:{name:'药圃看护',location:'sect',min:'golden',months:4,stones:18,xp:20,items:{lotus:1}},
 work_golden:{name:'传法授业',location:'sect',min:'golden',months:3,stones:130,xp:40,items:{}},
 soul:{name:'静潭凝魂',location:'secret',min:'nascent',months:4,stones:0,xp:100,items:{soul:2}},
 soul_task:{name:'山村安魂',location:'sect',min:'nascent',months:5,stones:25,xp:30,items:{soul:1}},
 work_nascent:{name:'镇守灵脉',location:'sect',min:'nascent',months:4,stones:230,xp:70,items:{}},
 dao:{name:'云台参道',location:'terrace',min:'spirit',months:5,stones:0,xp:180,items:{dao:2}},
 dao_task:{name:'修补道碑',location:'sect',min:'spirit',months:6,stones:35,xp:50,items:{dao:1}},
 work_spirit:{name:'护佑一州',location:'sect',min:'spirit',months:5,stones:360,xp:100,items:{}}
};
export interface Recipe {name:string;min:RealmId;inputs:Record<string,number>;stones:number;months:number;output:string;}
export const recipes:Record<string,Recipe>={
 healing:{name:'炼制回春丹',min:'qi',inputs:{herb:2},stones:2,months:1,output:'healing_pill'},
 spirit:{name:'炼制回灵丹',min:'qi',inputs:{herb:1,dew:1},stones:3,months:1,output:'spirit_pill'},
 foundation:{name:'炼制筑基丹',min:'qi',inputs:{herb:8,dew:2,core:1},stones:20,months:1,output:'foundation_pill'},
 golden:{name:'炼制凝金丹',min:'foundation',inputs:{herb:6,dew:3,core:2,jade:4},stones:60,months:2,output:'golden_pill'},
 nascent:{name:'炼制结婴丹',min:'golden',inputs:{herb:8,dew:4,jade:2,lotus:5},stones:110,months:3,output:'nascent_pill'},
 spirit_seed:{name:'炼制化神丹',min:'nascent',inputs:{dew:6,lotus:3,soul:6},stones:180,months:4,output:'spirit_seed'},
 ascension:{name:'炼制渡劫引',min:'spirit',inputs:{core:3,soul:4,dao:6},stones:240,months:5,output:'ascension_seal'}
};
export type SkillSlot='mind'|'builder'|'finisher';
export interface Skill {name:string;school:School;slot:SkillSlot;min:RealmId;price:number;description:string;effect:string;}
export const skills:Record<string,Skill>={
 sword_mind:{name:'青锋心诀',school:'sword',slot:'mind',min:'qi',price:0,description:'基础剑诀：积蓄剑意，满三层可打断重击。',effect:'sword'},
 sword_still:{name:'止水剑心',school:'sword',slot:'mind',min:'foundation',price:100,description:'静修收益 +25%；战斗护体额外减伤 6。',effect:'still'},
 sword_build:{name:'青锋起势',school:'sword',slot:'builder',min:'qi',price:0,description:'消耗 8 灵力，伤害并获得 2 层剑意。',effect:'build'},
 sword_guard:{name:'听雨剑势',school:'sword',slot:'builder',min:'foundation',price:80,description:'消耗 8 灵力；少量伤害，1 层剑意并护体。',effect:'sword_ward'},
 sword_release:{name:'惊鸿斩',school:'sword',slot:'finisher',min:'qi',price:0,description:'消耗 12 灵力和全部剑意，满层打断重击。',effect:'release'},
 sword_echo:{name:'回风归一',school:'sword',slot:'finisher',min:'golden',price:160,description:'剑意爆发略低，但恢复自身气血，满层仍可破势。',effect:'echo'},
 talisman_mind:{name:'镇灵心诀',school:'talisman',slot:'mind',min:'qi',price:0,description:'基础符诀：二回合符印持续灼伤，亦可提前引爆。',effect:'talisman'},
 talisman_calm:{name:'太清符心',school:'talisman',slot:'mind',min:'foundation',price:100,description:'静修收益 +25%；每次基础攻击额外恢复 4 灵力。',effect:'calm'},
 talisman_build:{name:'镇灵符',school:'talisman',slot:'builder',min:'qi',price:0,description:'消耗 8 灵力，留二回合符印，当前减伤 12。',effect:'mark'},
 talisman_frost:{name:'寒霜符',school:'talisman',slot:'builder',min:'foundation',price:80,description:'消耗 10 灵力，留三回合符印，当前减伤较少。',effect:'frost'},
 talisman_release:{name:'燃符诀',school:'talisman',slot:'finisher',min:'qi',price:0,description:'消耗 10 灵力，结算全部符印余下伤害。',effect:'detonate'},
 talisman_return:{name:'归元符',school:'talisman',slot:'finisher',min:'golden',price:160,description:'消耗 10 灵力，收割符印，同时恢复灵力。',effect:'return'}
};
export interface Relic {name:string;description:string;stones:number;inputs:Record<string,number>;effect:string;}
export const relics:Record<string,Relic>={
 frost_sword:{name:'青霜剑',description:'剑意终结后保留 1 层；所有直接攻击 +5。',stones:140,inputs:{jade:3,core:1},effect:'frost_sword'},
 jade_seal:{name:'玄玉印',description:'每次承受伤害减 8，适合稳健渡劫。',stones:140,inputs:{jade:4},effect:'jade_seal'},
 soul_lamp:{name:'照魂灯',description:'每枚符印每回合额外伤害 4，提前引爆也生效。',stones:160,inputs:{jade:2,lotus:2},effect:'soul_lamp'},
 cloud_mirror:{name:'流云镜',description:'普通攻击与护体额外回灵 6，每回合回气血 4。',stones:160,inputs:{jade:2,dew:5},effect:'cloud_mirror'}
};
export interface Enemy {name:string;min:RealmId;location:LocationId;hp:number;attack:number;heavy:number;xp:number;stones:number;loot:Record<string,number>;trial?:boolean;}
export const enemies:Record<string,Enemy>={
 wolf:{name:'雾隐妖狼',min:'qi',location:'wilderness',hp:76,attack:13,heavy:32,xp:35,stones:10,loot:{core:1}},
 warden:{name:'守山石卫',min:'qi',location:'wilderness',hp:112,attack:17,heavy:40,xp:55,stones:18,loot:{core:1}},
 serpent:{name:'寒潭玄蛇',min:'foundation',location:'secret',hp:145,attack:20,heavy:49,xp:100,stones:24,loot:{jade:2,core:1}},
 puppet:{name:'古境剑傀',min:'golden',location:'secret',hp:220,attack:31,heavy:74,xp:160,stones:40,loot:{lotus:2}},
 shadow:{name:'照影心魇',min:'nascent',location:'secret',hp:330,attack:49,heavy:117,xp:240,stones:65,loot:{soul:2}},
 sentinel:{name:'云台守灵',min:'spirit',location:'terrace',hp:450,attack:70,heavy:165,xp:360,stones:90,loot:{dao:2}},
 trial_heart:{name:'往昔心魔',min:'spirit',location:'terrace',hp:300,attack:37,heavy:95,xp:0,stones:0,loot:{},trial:true},
 trial_thunder:{name:'九霄雷劫',min:'spirit',location:'terrace',hp:390,attack:62,heavy:185,xp:0,stones:0,loot:{},trial:true},
 trial_gate:{name:'天门道影',min:'spirit',location:'terrace',hp:460,attack:68,heavy:195,xp:0,stones:0,loot:{},trial:true}
};
export const maxBatch=50;
export const maxQuantity=1_000_000;
export const cultivation={natural:{months:1,stones:0,bonus:0},assisted:{months:1,stones:20,bonus:100}};
function freeze(v:object){for(const x of Object.values(v))if(x&&typeof x==='object')freeze(x);Object.freeze(v);}
for(const v of [realmIds,realms,locations,items,sources,recipes,skills,relics,enemies,cultivation])freeze(v);
