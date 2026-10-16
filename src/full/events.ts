import { items, realms, sources } from './content.ts';
import type { RealmId, LocationId } from './content.ts';
import type { Choice } from './types.ts';
export interface StoryCondition { opening?: Choice[]; choices?: Record<string, string[]>; }
export interface CausalAid { allDamageReduction?: number; thunderDamageReduction?: number; }
export interface Option {
 id:string; label:string; detail:string; cost?:Record<string,number>; stones?:number;
 gain?:Record<string,number>; reward?:number; xp?:number; requireXpRoom?:boolean;
 result:string; condition?:StoryCondition; aid?:CausalAid; memory?:string; relationship?:string;
}
export interface StoryVariant { when:StoryCondition; body:string; results?:Record<string,string>; }
export interface Story {
 id:string; name:string; npc:string; min:RealmId; location:LocationId; requires?:string;
 body:string; options:Option[]; variants?:StoryVariant[];
}
const decline:Option={id:'decline',label:'婉言作别',detail:'不消耗物品，各循其道。',result:'你与对方作别。没有新的约定，登仙之路仍在自己脚下。',memory:'你这次婉言作别，没有达成新的约定。',relationship:'暂别'};
export const stories:Record<string,Story>={
  "shen_return": {
    "id": "shen_return",
    "name": "药香故人",
    "npc": "沈清禾",
    "min": "foundation",
    "location": "sect",
    "body": "药庐的门开了。你与沈清禾相对而坐，如何接续这场会面，仍由你决定。",
    "options": [
      {
        "id": "accept",
        "label": "坐下叙旧",
        "detail": "收下回春丹 ×1；赠丹之缘有了回响。",
        "result": "她将一份药囊放在你面前，谢过雨夜相救。你收下回春丹，聊起各自走过的山路。",
        "condition": {
          "opening": [
            "help"
          ]
        },
        "gain": {
          "healing_pill": 1
        },
        "memory": "你在药庐坐下叙旧，收下一份药囊。",
        "relationship": "相助"
      },
      {
        "id": "bargain",
        "label": "另订药约",
        "detail": "付灵石 18，换回春丹 ×1；旧账仍然两清。",
        "result": "药价与药效说得明白，你付清灵石收下丹药。她记住的是这次守约，没有将旧日交易说成救命恩情。",
        "condition": {
          "opening": [
            "trade"
          ]
        },
        "stones": 18,
        "gain": {
          "healing_pill": 1
        },
        "memory": "你另付药价，与沈清禾做了一笔清楚的丹药交易。",
        "relationship": "相识"
      },
      {
        "id": "assist",
        "label": "以草相助",
        "detail": "消耗凝气草 ×2，获回春丹 ×1；从今天建立新信任。",
        "result": "你把药草交给她。沈清禾重新报了姓名，又回赠一枚丹药：这份相助从今日算起。",
        "condition": {
          "opening": [
            "leave"
          ]
        },
        "cost": {
          "herb": 2
        },
        "gain": {
          "healing_pill": 1
        },
        "memory": "你在药庐以草相助，从这次会面建立了新信任。",
        "relationship": "相助"
      },
      {
        "id": "decline",
        "label": "婉言作别",
        "detail": "不消耗物品，各循其道。",
        "result": "你与对方作别。没有新的约定，登仙之路仍在自己脚下。",
        "memory": "你这次婉言作别，没有达成新的约定。",
        "relationship": "暂别"
      }
    ],
    "variants": [
      {
        "when": {
          "opening": [
            "help"
          ]
        },
        "body": "沈清禾认出了雨夜赠丹的你。她将备好的药囊放在案上，说那枚回春丹救下的不只是一段行程。今日你可以收下她的心意，也可以暂且作别。",
        "results": {
          "decline": "她仍记得雨夜的相助。你这次没有收下药囊，只约各自珍重，赠丹之事没有因此被抹去。"
        }
      },
      {
        "when": {
          "opening": [
            "trade"
          ]
        },
        "body": "沈清禾记得那场一丹换一简的交易，旧账早已两清。她没有称你为救命恩人，只把新炼的丹药和药价摆在案上，问你是否另订一笔药约。",
        "results": {
          "decline": "你没有另购丹药。旧账两清，今日也不添新约，你们平静作别。"
        }
      },
      {
        "when": {
          "opening": [
            "leave"
          ]
        },
        "body": "当年的山雨中，你保留丹药，各自离开。直到今日药庐相见，你们才正式通报姓名。沈清禾缺一份药草，愿以丹药答谢这次新的相助。",
        "results": {
          "decline": "你们通了姓名，但这次没有交换物资。她没有把当年的擦肩说成恩情，彼此仍可在日后重新选择。"
        }
      }
    ]
  },
  "shen_pact": {
    "id": "shen_pact",
    "name": "一诺千山",
    "npc": "沈清禾",
    "min": "nascent",
    "location": "cave",
    "body": "山村疫气未散，沈清禾请你匀出药物；临劫之约要由今日的付出立下。",
    "options": [
      {
        "id": "lend",
        "label": "借丹立约",
        "detail": "消耗回春丹 ×2；立下雷劫药阵之约，雷击减伤 8。",
        "result": "你把两枚丹药放入药囊。这次承诺由今日的借丹立下，她答应以药阵护持雷劫。",
        "condition": {
          "choices": {
            "shen_return": [
              "accept",
              "bargain",
              "assist"
            ]
          }
        },
        "cost": {
          "healing_pill": 2
        },
        "aid": {
          "thunderDamageReduction": 8
        },
        "memory": "你借出丹药，与沈清禾约定以药阵护持雷劫。",
        "relationship": "相约护阵"
      },
      {
        "id": "rebuild",
        "label": "此刻重新相助",
        "detail": "消耗回春丹 ×2、凝气草 ×2；从本次相助立约，雷击减伤 8。",
        "result": "你没有拿昔日交情作凭据，而是补足眼前急缺的药物。沈清禾收下这份新的相助，愿在雷劫中以药阵赴约。",
        "condition": {
          "choices": {
            "shen_return": [
              "decline"
            ]
          }
        },
        "cost": {
          "healing_pill": 2,
          "herb": 2
        },
        "aid": {
          "thunderDamageReduction": 8
        },
        "memory": "药庐作别后，你付出新的药物，重新建立了护阵之约。",
        "relationship": "相约护阵"
      },
      {
        "id": "decline",
        "label": "婉言作别",
        "detail": "不消耗物品，各循其道。",
        "result": "你与对方作别。没有新的约定，登仙之路仍在自己脚下。",
        "memory": "你这次婉言作别，没有达成新的约定。",
        "relationship": "暂别"
      }
    ],
    "requires": "shen_return",
    "variants": [
      {
        "when": {
          "choices": {
            "shen_return": [
              "accept"
            ]
          },
          "opening": [
            "help"
          ]
        },
        "body": "雨夜赠丹、药庐叙旧，沈清禾都记得。但她没有凭旧恩替你许诺：山村缺药，若你愿再借两枚回春丹，她会为这次相助立下临劫药阵之约。"
      },
      {
        "when": {
          "choices": {
            "shen_return": [
              "accept"
            ]
          },
          "opening": [
            "trade",
            "leave"
          ]
        },
        "body": "上回药庐叙旧时，你收过她备的一份药囊。那段来往没有改写雨夜的选择。如今山村缺药，她请你另借丹药；护阵之约要从这次付出立下。"
      },
      {
        "when": {
          "choices": {
            "shen_return": [
              "bargain"
            ]
          }
        },
        "body": "药庐交易已经结清，沈清禾不以旧账求你偿还。眼下山村急缺丹药，她提出一项新的相助：借出两枚回春丹，换她在雷劫中布下一道药阵。"
      },
      {
        "when": {
          "choices": {
            "shen_return": [
              "assist"
            ]
          }
        },
        "body": "药庐赠草之后，你们才有了新的信任。如今沈清禾为山村救急，愿以临劫护阵回应你的再次借丹。她说的是今日之诺，没有虚构当年的救命恩情。"
      },
      {
        "when": {
          "choices": {
            "shen_return": [
              "decline"
            ]
          }
        },
        "body": "药庐那回，你们没有达成新的约定。沈清禾没有称你为旧日盟友；山村的病患却仍需要药物。若你愿意补足这次急缺，可以从现在重新建立信任。"
      }
    ]
  },
  "pei_meet": {
    "id": "pei_meet",
    "name": "山门论剑",
    "npc": "裴照",
    "min": "foundation",
    "location": "sect",
    "body": "裴照与你初次论道：修行当独力破关，还是相扶同行？你可以约定合作，也可以坦然较量，或暂且作别。",
    "options": [
      {
        "id": "cooperate",
        "label": "相约同行",
        "detail": "付灵石 15，获灵玉 ×1；留下同行之约。",
        "result": "你们交换了眼前所需，各取所长，约在照影古境再会。",
        "stones": 15,
        "gain": {
          "jade": 1
        },
        "memory": "你在山门与裴照交换物资，相约同行。",
        "relationship": "相约同行"
      },
      {
        "id": "rival",
        "label": "各凭本事",
        "detail": "获灵石 20；接受论道之约，不成为仇敌。",
        "result": "裴照笑着收剑，将论道的酬资交给你。你们约好日后再论高下，竞争并非决裂。",
        "reward": 20,
        "memory": "你与裴照约定各凭本事，保留同辈竞争。",
        "relationship": "同道竞争"
      },
      {
        "id": "decline",
        "label": "婉言作别",
        "detail": "不消耗物品，各循其道。",
        "result": "你与对方作别。没有新的约定，登仙之路仍在自己脚下。",
        "memory": "你这次婉言作别，没有达成新的约定。",
        "relationship": "暂别"
      }
    ]
  },
  "pei_echo": {
    "id": "pei_echo",
    "name": "古境重逢",
    "npc": "裴照",
    "min": "golden",
    "location": "secret",
    "body": "断阶前又见裴照。山门的答复仍在，今日的路却可以重新选择。",
    "options": [
      {
        "id": "share",
        "label": "分莲共渡",
        "detail": "消耗月华莲 ×1，获灵玉 ×3；续接同行之约。",
        "result": "你以月华莲稳住他的灵力，他将探路所得的灵玉分给你。山门的同行之约在古境得到了回应。",
        "condition": {
          "choices": {
            "pei_meet": [
              "cooperate"
            ]
          }
        },
        "cost": {
          "lotus": 1
        },
        "gain": {
          "jade": 3
        },
        "memory": "你在古境与裴照分莲共渡。",
        "relationship": "相助"
      },
      {
        "id": "contest",
        "label": "以莲论道",
        "detail": "消耗月华莲 ×1，获灵玉 ×2、灵石 20；竞争中互取所需。",
        "result": "你们把比试变成一场明白的交换。裴照承认你的眼力，你也认可他的探路所得；对手之间添了一份敬重。",
        "condition": {
          "choices": {
            "pei_meet": [
              "rival"
            ]
          }
        },
        "cost": {
          "lotus": 1
        },
        "gain": {
          "jade": 2
        },
        "reward": 20,
        "memory": "你与裴照在古境以莲论道，竞争中互换所需。",
        "relationship": "竞中相惜"
      },
      {
        "id": "reconnect",
        "label": "从此同行",
        "detail": "消耗月华莲 ×1，获灵玉 ×2；合作从本次会面开始。",
        "result": "你们没有假称多年盟友。你交出月华莲，他分给你灵玉，新约从眼前这段断阶开始。",
        "condition": {
          "choices": {
            "pei_meet": [
              "decline"
            ]
          }
        },
        "cost": {
          "lotus": 1
        },
        "gain": {
          "jade": 2
        },
        "memory": "山门作别后，你与裴照在古境新结同行之约。",
        "relationship": "新结同行"
      },
      {
        "id": "solo",
        "label": "独行探路",
        "detail": "获月华莲 ×1；这次各走一途。",
        "result": "你们各择一途。裴照指出一处可采的寒池，你收下月华莲，仍独自探路。",
        "gain": {
          "lotus": 1
        },
        "memory": "古境相逢后，你与裴照选择了不同的路。",
        "relationship": "各行其路"
      },
      {
        "id": "decline",
        "label": "婉言作别",
        "detail": "不消耗物品，各循其道。",
        "result": "你与对方作别。没有新的约定，登仙之路仍在自己脚下。",
        "memory": "你这次婉言作别，没有达成新的约定。",
        "relationship": "暂别"
      }
    ],
    "requires": "pei_meet",
    "variants": [
      {
        "when": {
          "choices": {
            "pei_meet": [
              "cooperate"
            ]
          }
        },
        "body": "裴照认出了山门相约同行的你。断阶前，他先将探得的路径摊开，再问你是否愿分一株月华莲稳住灵力。旧约可以接续，也可以在此各走一途。"
      },
      {
        "when": {
          "choices": {
            "pei_meet": [
              "rival"
            ]
          }
        },
        "body": "裴照还记得“各凭本事”的答复，见面先问你古境所得。他愿拿灵玉与灵石交换月华莲，再论一次眼力；这是对手间的新交易，并非多年盟友的分账。"
      },
      {
        "when": {
          "choices": {
            "pei_meet": [
              "decline"
            ]
          }
        },
        "body": "山门那回你没有应下邀约，裴照并未把你当成旧日同行。断阶前这次重逢，他重新提出交换与合作；若你愿意，新约便从今日开始。"
      }
    ]
  },
  "pei_pact": {
    "id": "pei_pact",
    "name": "云台相约",
    "npc": "裴照",
    "min": "spirit",
    "location": "sect",
    "body": "裴照听说你将临劫，问你是否愿意在云台布下一道共同的护阵。",
    "options": [
      {
        "id": "ally",
        "label": "合力布阵",
        "detail": "消耗道蕴砂 ×1；天劫各击减伤 6。",
        "result": "你交出道蕴砂，将古境相助续为临劫护阵。裴照应下这次邀约，云台会有他的一道剑痕。",
        "condition": {
          "choices": {
            "pei_echo": [
              "share",
              "contest",
              "reconnect"
            ]
          }
        },
        "cost": {
          "dao": 1
        },
        "aid": {
          "allDamageReduction": 6
        },
        "memory": "你与裴照约定在云台合力布阵。",
        "relationship": "相约护阵"
      },
      {
        "id": "renew",
        "label": "从今并肩",
        "detail": "消耗道蕴砂 ×1、月华莲 ×1；从本次立约，天劫各击减伤 6。",
        "result": "你将灵材交给裴照，没有把过去的独行改写成同行。你们从这次护阵开始并肩。",
        "condition": {
          "choices": {
            "pei_echo": [
              "solo",
              "decline"
            ]
          }
        },
        "cost": {
          "dao": 1,
          "lotus": 1
        },
        "aid": {
          "allDamageReduction": 6
        },
        "memory": "古境各走一途后，你另付灵材，与裴照新立护阵之约。",
        "relationship": "相约护阵"
      },
      {
        "id": "decline",
        "label": "婉言作别",
        "detail": "不消耗物品，各循其道。",
        "result": "你与对方作别。没有新的约定，登仙之路仍在自己脚下。",
        "memory": "你这次婉言作别，没有达成新的约定。",
        "relationship": "暂别"
      }
    ],
    "requires": "pei_echo",
    "variants": [
      {
        "when": {
          "choices": {
            "pei_echo": [
              "share"
            ]
          }
        },
        "body": "古境分莲共渡之后，你们确实有过一次相助。裴照愿将那次合作续到云台，请你以一粒道蕴砂合布护阵；你仍可保留灵材，独自迎劫。"
      },
      {
        "when": {
          "choices": {
            "pei_echo": [
              "contest"
            ]
          }
        },
        "body": "你们在古境仍是论道的对手，也曾互换所需。裴照没有抹去这份竞争，只问临劫之时，可否暂将高下放在一边，合布护阵。"
      },
      {
        "when": {
          "choices": {
            "pei_echo": [
              "reconnect"
            ]
          }
        },
        "body": "你们的同行从古境那回新约开始，并非旧日已有的盟誓。裴照愿为这份新信任赴云台之约，是否接续，仍由你决定。"
      },
      {
        "when": {
          "choices": {
            "pei_echo": [
              "solo",
              "decline"
            ]
          }
        },
        "body": "古境之后，你们没有接续同行。裴照没有以多年盟友自居，今日只是重新问你：若愿补足护阵与调息的灵材，能否从现在并肩？"
      }
    ]
  },
  "lu_intro": {
    "id": "lu_intro",
    "name": "执事问道",
    "npc": "陆玄松",
    "min": "qi",
    "location": "sect",
    "body": "陆玄松没有问你的灵根，只问修炼、丹药、功法，眼下最缺什么。他提醒你，境界不能只靠苦坐。",
    "options": [
      {
        "id": "listen",
        "label": "请教物资来源",
        "detail": "获凝气草 ×2；得知委托与坊市的筹备方式。",
        "result": "你记下了委托与坊市的位置。瓶颈有了可寻的来源，真正的物资仍要自己筹备。",
        "gain": {
          "herb": 2
        },
        "memory": "你向陆玄松请教了物资来源。",
        "relationship": "相识"
      },
      {
        "id": "decline",
        "label": "婉言作别",
        "detail": "不消耗物品，各循其道。",
        "result": "你与对方作别。没有新的约定，登仙之路仍在自己脚下。",
        "memory": "你这次婉言作别，没有达成新的约定。",
        "relationship": "暂别"
      }
    ]
  },
  "lu_teach": {
    "id": "lu_teach",
    "name": "授业与受业",
    "npc": "陆玄松",
    "min": "golden",
    "location": "sect",
    "body": "山门的新弟子需要一场讲解，陆玄松邀你分些灵材、说说自己的准备经验。",
    "options": [
      {
        "id": "teach",
        "label": "分玉授业",
        "detail": "消耗灵玉 ×1，获灵石 65。",
        "result": "你分出灵玉，为后辈讲解自己实际走过的筹备路线。山门付了酬资，这次授业有了确切的来处。",
        "cost": {
          "jade": 1
        },
        "reward": 65,
        "memory": "你回山门分玉授业，讲解自己走过的筹备路线。",
        "relationship": "授业"
      },
      {
        "id": "decline",
        "label": "婉言作别",
        "detail": "不消耗物品，各循其道。",
        "result": "你与对方作别。没有新的约定，登仙之路仍在自己脚下。",
        "memory": "你这次婉言作别，没有达成新的约定。",
        "relationship": "暂别"
      }
    ],
    "requires": "lu_intro",
    "variants": [
      {
        "when": {
          "choices": {
            "lu_intro": [
              "listen"
            ]
          }
        },
        "body": "当年为你指过物资来源的陆玄松，如今邀你给新弟子讲一场道。他并未替你跨过境界，也不请你空谈，只盼你说说自己怎样筹备灵材。"
      },
      {
        "when": {
          "choices": {
            "lu_intro": [
              "decline"
            ]
          }
        },
        "body": "当年你没有留下请教，陆玄松也未曾做过你的授业师长。今日听闻你的历练，他重新邀你为后辈讲一场道；这次来往从新的付出开始。"
      }
    ]
  },
  "lu_farewell": {
    "id": "lu_farewell",
    "name": "山门送别",
    "npc": "陆玄松",
    "min": "spirit",
    "location": "sect",
    "body": "山门前，陆玄松为将要远行的你备了一份送行药。",
    "options": [
      {
        "id": "remember",
        "label": "记下来路",
        "detail": "获回灵丹 ×2；记下这次山门送别。",
        "result": "你收下送行药，向山门长揖。远行与留下都由自己决定，来处不必被改写。",
        "gain": {
          "spirit_pill": 2
        },
        "memory": "你在山门收下送行药，记下来路。",
        "relationship": "相识"
      },
      {
        "id": "decline",
        "label": "婉言作别",
        "detail": "不消耗物品，各循其道。",
        "result": "你与对方作别。没有新的约定，登仙之路仍在自己脚下。",
        "memory": "你这次婉言作别，没有达成新的约定。",
        "relationship": "暂别"
      }
    ],
    "requires": "lu_teach",
    "variants": [
      {
        "when": {
          "choices": {
            "lu_teach": [
              "teach"
            ]
          }
        },
        "body": "陆玄松记得你曾回山分玉授业。今日他送你到山门，只说远行之前，不妨再想一想那些曾向你问路的后辈。"
      },
      {
        "when": {
          "choices": {
            "lu_teach": [
              "decline"
            ]
          }
        },
        "body": "你上次没有留下授业，陆玄松没有替你编出一段师承佳话。他仍以山门执事的身份送行：路是你自己走来的，后面的选择也仍在你手里。"
      }
    ]
  },
  "yan_stone": {
    "id": "yan_stone",
    "name": "守碑人",
    "npc": "砚尘",
    "min": "foundation",
    "location": "secret",
    "body": "砚尘拂去残碑上的灰。碑上有成仙者的名字，碑下也该留下寻常人的故事。你愿记录什么？",
    "options": [
      {
        "id": "name",
        "label": "刻下道号",
        "detail": "获灵石 25，留下求名之念。",
        "result": "你刻下道号，收下碑前的酬资。砚尘没有评判，只请你记住今日所愿。",
        "reward": 25,
        "memory": "你在残碑刻下道号。",
        "relationship": "相识"
      },
      {
        "id": "story",
        "label": "记录凡人故事",
        "detail": "获灵露 ×3，留下传承之念。",
        "result": "你写下雨夜的破庙。碑上终于不只有成仙者的名字，砚尘递来留给记录者的灵露。",
        "gain": {
          "dew": 3
        },
        "memory": "你为残碑记录了一段凡人故事。",
        "relationship": "相识"
      },
      {
        "id": "decline",
        "label": "婉言作别",
        "detail": "不消耗物品，各循其道。",
        "result": "你与对方作别。没有新的约定，登仙之路仍在自己脚下。",
        "memory": "你这次婉言作别，没有达成新的约定。",
        "relationship": "暂别"
      }
    ]
  },
  "yan_mirror": {
    "id": "yan_mirror",
    "name": "照见本心",
    "npc": "砚尘",
    "min": "nascent",
    "location": "secret",
    "body": "古镜里没有敌人，只有初入山门的你。砚尘问今日是否愿再看一眼。",
    "options": [
      {
        "id": "accept",
        "label": "接纳旧我",
        "detail": "获凝魂晶 ×1；不以善恶单选决定胜负。",
        "result": "你没有抹掉镜中人。弱小、犹疑与求道都曾属于自己，砚尘将凝魂晶交到你手中。",
        "gain": {
          "soul": 1
        },
        "memory": "你在古镜前接纳了曾经的自己。",
        "relationship": "照见本心"
      },
      {
        "id": "decline",
        "label": "婉言作别",
        "detail": "不消耗物品，各循其道。",
        "result": "你与对方作别。没有新的约定，登仙之路仍在自己脚下。",
        "memory": "你这次婉言作别，没有达成新的约定。",
        "relationship": "暂别"
      }
    ],
    "requires": "yan_stone",
    "variants": [
      {
        "when": {
          "choices": {
            "yan_stone": [
              "name"
            ]
          }
        },
        "body": "砚尘指向你曾刻下的道号。古镜里，求名的年轻人还站在山雨中。你可以承认那份愿望，也可以暂且离开镜前。"
      },
      {
        "when": {
          "choices": {
            "yan_stone": [
              "story"
            ]
          }
        },
        "body": "砚尘翻到你记录的凡人故事，又请你看看镜中的自己。记录别人时留下的目光，今日是否也肯留给那个尚且弱小的人？"
      },
      {
        "when": {
          "choices": {
            "yan_stone": [
              "decline"
            ]
          }
        },
        "body": "当年你没有在残碑留下名字或故事，砚尘没有替你补写。今日他重新移开镜前的灰，请你自己决定是否回望来路。"
      }
    ]
  },
  "yan_gate": {
    "id": "yan_gate",
    "name": "天门之前",
    "npc": "砚尘",
    "min": "spirit",
    "location": "terrace",
    "body": "砚尘在天门前收起旧笔，留下最后一次道别的机会。",
    "options": [
      {
        "id": "resolve",
        "label": "揖别守碑人",
        "detail": "获道蕴砂 ×1；收束这段来往。",
        "result": "你收下道蕴砂，向守碑人一揖。别人可以护阵，不能代你选择前行。",
        "gain": {
          "dao": 1
        },
        "memory": "你在天门前与守碑人作别。",
        "relationship": "天门揖别"
      },
      {
        "id": "decline",
        "label": "婉言作别",
        "detail": "不消耗物品，各循其道。",
        "result": "你与对方作别。没有新的约定，登仙之路仍在自己脚下。",
        "memory": "你这次婉言作别，没有达成新的约定。",
        "relationship": "暂别"
      }
    ],
    "requires": "yan_mirror",
    "variants": [
      {
        "when": {
          "choices": {
            "yan_mirror": [
              "accept"
            ]
          }
        },
        "body": "你在古镜前接纳旧我，砚尘便没有再问同一个问题。他只指向天门：带着你承认的来路，作自己的决定。"
      },
      {
        "when": {
          "choices": {
            "yan_mirror": [
              "decline"
            ]
          }
        },
        "body": "上回你没有驻足古镜，砚尘也没有替你写下“已经释怀”。他只是把路让开：不必给所有旧事同一个答案，天门前仍由你选择。"
      }
    ]
  }
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
for (const [id,name,location,min,body,item] of vignettes) {
 const material=items[item].name;
 const options:Option[]=[{id:'exchange',label:'交换眼前所需',detail:`付灵石 8，获${material} ×1。`,stones:8,gain:{[item]:1},result:`你在「${name}」付清灵石，收下${material}。这次交换没有替你推进境界。`}];
 let text=body;
 if (['pine','bell','heir'].includes(id)) {
  text={pine:'松根旁，一位采药人扭伤了腿。你可以留下疗伤之物，也可以出些灵石，托路过弟子帮忙送他回山门。',bell:'晨钟初响，值夜弟子仍在照顾一位受伤的同伴。手边的丹药和雇人帮忙的灵石，都有各自的用处。',heir:'后辈在山路受伤，却仍惦记着将灵材送回药庐。你可以付些灵石请人接应，也可以分出一枚疗伤丹药。'}[id]!;
  options[0]={...options[0],label:'托人照应',result:`你付了灵石，请路过弟子照应伤者。对方以${material}答谢这次安排。`};
  options.push({id:'aid',label:'分丹救急',detail:`消耗回春丹 ×1，获${material} ×2。`,cost:{healing_pill:1},gain:{[item]:2},result:`你留下回春丹，换得伤者安稳的喘息。两份${material}是他此刻能够交付的谢意。`});
 } else if (['rain','letter','scroll','dawn'].includes(id)) {
  const sourceId=min==='spirit'?'work_spirit':item==='dew'?'dew':'herbs';
  options.push({id:'plan',label:'只记筹备之法',detail:'不消耗物资，不领取奖励；记下可用的来源。',result:`你没有交换物资，而是记下${sources[sourceId].name}的筹备方式。真正所需仍要亲自前往取得。`});
 } else if (['steps','pool','wind'].includes(id)) {
  const input=id==='steps'?'dew':id==='pool'?'jade':'soul';
  options.push({id:'barter',label:'以余材换路',detail:`消耗${items[input].name} ×1，获${material} ×2。`,cost:{[input]:1},gain:{[item]:2},result:`你拿出一份${items[input].name}，换得两份${material}与眼前的行路记录；留下的物资也有了明确去处。`});
 } else if (['cloud','echo','lantern','crane'].includes(id)) {
  const insight=Math.floor(realms[min].baseYield/2);
  options.push({id:'remember',label:'留物记旧游',detail:`消耗${material} ×1，修为最多 +${insight}；圆满时不消耗。`,cost:{[item]:1},xp:insight,requireXpRoom:true,result:`你在旧地留下一份${material}，把今昔的差别理成一段新的体会。所得修为以当次结算为准，境界仍需物品与突破。`});
 }
 stories['local_'+id]={id:'local_'+id,name,npc:'行旅见闻',location,min,body:text,options:[...options,decline]};
}
for(const [i,place] of (['wilderness','cave','sect','market','secret','terrace'] as LocationId[]).entries())stories['omen_'+i]={id:'omen_'+i,name:['落叶留痕','炉烟一缕','檐雀归巢','雨歇灯明','残碑微光','天光初现'][i],npc:'此地机缘',location:place,min:i===4?'foundation':i===5?'spirit':'qi',body:'你在寻常的一天里发现一点不同。机缘不替你修成境界，但可能改变下一次准备。',options:[{id:'observe',label:'细看片刻',detail:'获灵石 10；仅能结算一次。',reward:10,result:'你记下这次偶遇，又回到自己的修行里。'},decline]};
function freeze(v:object){for(const x of Object.values(v))if(x&&typeof x==='object')freeze(x);Object.freeze(v);}
freeze(stories);
