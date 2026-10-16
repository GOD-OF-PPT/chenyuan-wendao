import type {RealmId,LocationId} from './content.ts';
export interface Option {id:string;label:string;detail:string;cost?:Record<string,number>;stones?:number;gain?:Record<string,number>;reward?:number;xp?:number;result:string;}
export interface Story {id:string;name:string;npc:string;min:RealmId;location:LocationId;requires?:string;body:string;options:Option[];}
const decline:Option={id:'decline',label:'婉言作别',detail:'不消耗物品，各循其道。',result:'你与故人道别。缘分不必强求，登仙之路仍在自己脚下。'};
export const stories:Record<string,Story>={
 shen_return:{id:'shen_return',name:'药香故人',npc:'沈清禾',min:'foundation',location:'sect',body:'药庐门开，沈清禾认出了你。昔年破庙中的一念，终于有了回声。她邀你谈谈一路的修行。',options:[{id:'accept',label:'坐下叙旧',detail:'获回春丹 ×1；记录一次重逢。',gain:{healing_pill:1},result:'她递来药囊：相助是情，交易亦是缘。你们谈到山雨散尽才告别。'},decline]},
 shen_pact:{id:'shen_pact',name:'一诺千山',npc:'沈清禾',min:'nascent',location:'cave',requires:'shen_return',body:'沈清禾为救山村百姓，药囊已经见底。她请你借出两枚回春丹；若有一天你叩天门，她愿以药阵护持。',options:[{id:'lend',label:'借丹立约',detail:'消耗回春丹 ×2；渡劫雷击减伤 8。',cost:{healing_pill:2},result:'你将两枚丹药放入药囊。她郑重收下，约定在登仙台再见。'},decline]},
 pei_meet:{id:'pei_meet',name:'山门论剑',npc:'裴照',min:'foundation',location:'sect',body:'裴照与你争论：修行究竟当独力破关，还是相扶同行？他愿以一块灵玉，换你下次古境之行的答复。',options:[{id:'cooperate',label:'相约同行',detail:'消耗灵石 15；获灵玉 ×1，留下同行之约。',stones:15,gain:{jade:1},result:'你们各取所长，约在照影古境再会。'}, {id:'rival',label:'各凭本事',detail:'获灵石 20；留下论道之约，不成为仇敌。',reward:20,result:'裴照笑着收剑。竞争不是决裂，你们约好日后再论高下。'},decline]},
 pei_echo:{id:'pei_echo',name:'古境重逢',npc:'裴照',min:'golden',location:'secret',requires:'pei_meet',body:'崩塌的石阶前，裴照再次向你伸出手。无论曾经是同行还是对手，这一次都由你重新决定。',options:[{id:'share',label:'分莲共渡',detail:'消耗月华莲 ×1；获灵玉 ×3，形成后续盟约。',cost:{lotus:1},gain:{jade:3},result:'你以月华莲补稳他的灵力，他替你探清前路。旧约有了新的分量。'}, {id:'solo',label:'独行探路',detail:'获月华莲 ×1；保留独行路线。',gain:{lotus:1},result:'你们各择一途。没有谁背弃谁，只是求道的方式不同。'},decline]},
 pei_pact:{id:'pei_pact',name:'云台相约',npc:'裴照',min:'spirit',location:'sect',requires:'pei_echo',body:'裴照听说你将渡劫，提出以一粒道蕴砂布下护阵。你也可以保留灵材，独自迎接雷云。',options:[{id:'ally',label:'合力布阵',detail:'消耗道蕴砂 ×1；所有天劫伤害减 6。',cost:{dao:1},result:'云台护阵中多了一道剑痕。你知道，故人已经赴约。'},decline]},
 lu_intro:{id:'lu_intro',name:'执事问道',npc:'陆玄松',min:'qi',location:'sect',body:'陆玄松没有问你的灵根，只问：修炼、丹药、功法，你眼下最缺什么？他提醒你，境界不能只靠苦坐。',options:[{id:'listen',label:'请教物资来源',detail:'获凝气草 ×2；突破物也可通过坊市购买。',gain:{herb:2},result:'你记下了委托与坊市的位置。修炼的瓶颈，如今有了可寻的来源。'},decline]},
 lu_teach:{id:'lu_teach',name:'授业与受业',npc:'陆玄松',min:'golden',location:'sect',requires:'lu_intro',body:'昔日教你的执事，如今请你为新弟子讲一次道。付出些灵材，或许会让他们少走弯路。',options:[{id:'teach',label:'分玉授业',detail:'消耗灵玉 ×1；获灵石 65。',cost:{jade:1},reward:65,result:'山门下有人第一次引气入体。你忽然想起自己最初的那场山雨。'},decline]},
 lu_farewell:{id:'lu_farewell',name:'山门送别',npc:'陆玄松',min:'spirit',location:'sect',requires:'lu_teach',body:'陆玄松站在山门前，只说了一句：飞升也好，留下也罢，不要忘了自己为何走到这里。',options:[{id:'remember',label:'记下来路',detail:'获回灵丹 ×2；此话留入生平。',gain:{spirit_pill:2},result:'你向山门长揖。此生所学，不只是功法和境界。'},decline]},
 yan_stone:{id:'yan_stone',name:'守碑人',npc:'砚尘',min:'foundation',location:'secret',body:'砚尘拂去残碑上的灰。碑上写着成仙者的名字，碑下却埋着寻常人的故事。你愿意留下哪一种？',options:[{id:'name',label:'刻下道号',detail:'获灵石 25，留下求名之念。',reward:25,result:'石屑落入掌心。砚尘没有评判，只请你记住今日所愿。'}, {id:'story',label:'记录凡人故事',detail:'获灵露 ×3，留下传承之念。',gain:{dew:3},result:'你写下雨夜的破庙。碑上终于不只有成仙者的名字。'},decline]},
 yan_mirror:{id:'yan_mirror',name:'照见本心',npc:'砚尘',min:'nascent',location:'secret',requires:'yan_stone',body:'古镜里没有敌人，只有初入山门的你。那时的愿望，如今是否还在？',options:[{id:'accept',label:'接纳旧我',detail:'获凝魂晶 ×1。终局问心不设善恶必败。',gain:{soul:1},result:'你没有抹掉镜中人。弱小、犹疑与求道，原来都曾属于自己。'},decline]},
 yan_gate:{id:'yan_gate',name:'天门之前',npc:'砚尘',min:'spirit',location:'terrace',requires:'yan_mirror',body:'砚尘指向天门：别人可以替你护阵，不能替你决定前行。去吧，你已经准备得足够久了。',options:[{id:'resolve',label:'揖别守碑人',detail:'获道蕴砂 ×1；为这段因果收尾。',gain:{dao:1},result:'砚尘收起旧笔。下一页，是你的故事。'},decline]}
};
// Eighteen bounded local vignettes; each is a real once-only choice with an explicit cost.
const vignettes:[string,string,LocationId,RealmId,string,string][]=[
 ['rain','檐下听雨','cave','qi','檐雨将一夜分作许多声响。你发现，静坐与急进都是自己的选择。','herb'],
 ['tea','炉边温茶','cave','foundation','炉火正暖。采来的灵材可以用于此刻，也可以留给下一次突破。','dew'],
 ['letter','旧乡来信','cave','golden','故乡的信只写了收成和平安。求道之外，你仍有来处。','herb'],
 ['pine','松下遗囊','wilderness','qi','松根旁挂着一只药囊。主人留下字条，请后来者各取所需。','herb'],
 ['deer','白鹿饮溪','wilderness','foundation','白鹿踏过浅溪，你看见石缝里聚起一滴灵露。','dew'],
 ['cloud','故地云深','wilderness','nascent','昔日令人退却的林影，如今一念便可看清。山路还是那条山路。','core'],
 ['bell','晨钟初响','sect','qi','弟子们正等着山门开。你想起自己初来时紧握行囊的模样。','herb'],
 ['scroll','残卷补页','sect','foundation','藏经阁缺了几页讲解基础吐纳的旧纸。留下些材料，便有人可以抄完。','dew'],
 ['heir','后辈问路','sect','nascent','一位后辈问你修仙是否只有一条正路。你将自己的准备经验说给他听。','lotus'],
 ['stall','雨中药摊','market','qi','药摊将收，摊主愿与你交换一些余材。价格与用途写得明白。','herb'],
 ['jade','玉匠试刻','market','golden','玉匠请你试一试新成的刻刀。珍贵之物也来自许多日常劳动。','jade'],
 ['lantern','万家灯火','market','spirit','灯火铺满长街。即使神识可以越过群山，这里仍值得你停下。','soul'],
 ['steps','断阶寻路','secret','foundation','岔路的风声各不相同。你可以花一点灵石，换一份稳妥的路径记录。','jade'],
 ['pool','寒池月色','secret','golden','水面映着两轮月：一轮在天，一轮在你尚未平息的心中。','lotus'],
 ['echo','空谷回声','secret','nascent','旧日言语从空谷返回。你终于听懂其中一些，却不必照单全收。','soul'],
 ['wind','云台长风','terrace','spirit','长风吹散衣上尘土。远处雷云未合，你仍来得及整理自己的准备。','dao'],
 ['crane','鹤过天门','terrace','spirit','白鹤穿过云缝，天门明灭。你将一段安静的时刻留在心里。','dew'],
 ['dawn','破晓之前','terrace','spirit','东方亮起一线。你知道真正要迈出的，并不是某个规定时刻的一步。','core']
];
for(const [id,name,location,min,body,item] of vignettes)stories['local_'+id]={id:'local_'+id,name,npc:'行旅见闻',location,min,body,options:[{id:'exchange',label:'驻足相助',detail:'消耗灵石 8；获灵材 ×1。',stones:8,gain:{[item]:1},result:'你付出一份心力，也获得一份可用的收获。此地见闻已留入生平。'},decline]};
for(const [i,place] of (['wilderness','cave','sect','market','secret','terrace'] as LocationId[]).entries())stories['omen_'+i]={id:'omen_'+i,name:['落叶留痕','炉烟一缕','檐雀归巢','雨歇灯明','残碑微光','天光初现'][i],npc:'此地机缘',location:place,min:i===4?'foundation':i===5?'spirit':'qi',body:'你在寻常的一天里发现一点不同。机缘不替你修成境界，但可能改变下一次准备。',options:[{id:'observe',label:'细看片刻',detail:'获灵石 10；仅能结算一次。',reward:10,result:'你记下这次偶遇，又回到自己的修行里。'},decline]};
function freeze(v:object){for(const x of Object.values(v))if(x&&typeof x==='object')freeze(x);Object.freeze(v);}
freeze(stories);
