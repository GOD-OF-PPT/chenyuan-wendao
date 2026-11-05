from uir34_05_inventory import prior_uir3405_bytes
"""Exact configuration display evolution under the original 60000B preparation cap."""
import hashlib,json
from pathlib import Path
LEDGER='art/redesign/uir34-03.json'
MANIFEST={'format': 'chenyuan-configuration-focus-uir34-03',
 'version': 1,
 'userAcceptance': False,
 'path': 'web/src/ConfigurationDialog.vue',
 'bytes': 5642,
 'sha256': '74067880f132af079130acea336dfd559901cc088d09124f4a26b97d2504ee86',
 'before': 'goal-4/evidence/uir34-03/before/ConfigurationDialog.vue',
 'beforeSHA256': 'cc50327d03b19836dc9e41df9ff0e36185e2f64b846d510b795b6aad671f8b52',
 'operations': [[692, '', 'cmd=computed(()=>props.intent.command);\nconst '],
                [798, 'uote', ''],
                [848, 'props', 'cmd'],
                [852, 'int', 'valu'],
                [857, 'nt.command', ''],
                [884, '', "'|'full"],
                [989, 'props', 'cmd'],
                [993, 'int', 'valu'],
                [998, 'nt.command', ''],
                [1087, ';', ','],
                [1089,
                 "const skill=(id:string|null)=>id?C.skills[id]?.name??id:'未装备';\n"
                 "const relic=(id:string|null)=>id?C.relics[id]?.name??id:'未装备';\n"
                 "const slots=['mind','builder','finisher','relic'] as const;\n"
                 'const ',
                 ''],
                [1153,
                 '',
                 ',\n'
                 "object=(slot:string,id:string|null)=>id?(slot==='relic'?C.relics[id]:C.skills[id]):null,\n"
                 "name=(slot:string,id:string|null)=>object(slot,id)?.name??'未装备'"],
                [1315, 'change=(', ''],
                [1316,
                 'lot:typeof '
                 'slots[number])=>quote.value.before.loadout[slot]!==quote.value.after.loadout[slot];\n'
                 'const comparedS',
                 ''],
                [1333, 'props', 'cmd'],
                [1337, 'int', 'valu'],
                [1342, 'nt.command', ''],
                [1367, 'props', 'cmd'],
                [1371, 'int', 'valu'],
                [1376, 'nt.command', ''],
                [1389, '', 'cmd.value.ty'],
                [1402, '', "e==='EQUIP_RELIC'?'"],
                [1422, 'ops.', "elic':'m"],
                [1432, '', "d');\ncons"],
                [1442, 'ent.', ' ids='],
                [1450, '', 'puted(()=>{const a=c'],
                [1471, '', 'd.v'],
                [1475, '', 'lue;retur'],
                [1485, 'd', ' a'],
                [1504,
                 '',
                 "Object.values(C.startingLoadouts[a.school]):[a.type==='EQUIP'?a.skill:a.relic];});\n"
                 'const effect=(state:typeof '
                 "q.value.before)=>object(slot.value,state.loadout[slot.value])?.description??(slot.value==='relic'?'未装备，无器物加成':'尚未择法，无功法效果');\n"
                 "const metrics=[['cultivationBonus','修炼加成'],['guard','护御'],["],
                [1800,
                 '',
                 "arkDamage','符印伤害'],['manualDamageBonus','剑简加成']]as const;\nconst metric=(key:str"],
                [1881, 'd', "g,n:number)=>key==='cultivationBonus'&&view.value==='effects'?n+'%"],
                [1950, '', ";\nconst effects=computed(()=>metrics.filter(([k])=>view.value==='f"],
                [2019,
                 '',
                 "'||q.value.before[k]!==q.value.after[k]).map(([k,label])=>`${label} "
                 "${metric(k,q.value.before[k])} → ${metric(k,q.value.after[k])}`).join(' · "
                 "')||'基础指标保持原值；专属作用见上。'"],
                [2491, '  <span class="eyebrow">器随道转 · 确认后保存</span>', ''],
                [2563, '', " · {{cmd.type==='SCHOOL'?school(cmd.school):name(slot,ids[0])}}"],
                [2632, '  ', ''],
                [2839,
                 '',
                 'full\'" data-testid="config-full" @click="view=\'full\'">完整比较</button><button '
                 ':aria-pressed="view===\''],
                [3031, '  ', ''],
                [3066,
                 '  <p v-if="intent.command.type===\'SCHOOL\'">择法将更换下列三项功法。已掌握的功法和本命法宝保留。</p>\n'
                 '  <p v-else>此处只更换已掌握或已持有的配装，不研习、不炼制、不旅行。</p>\n'
                 '  <div class="configuration-schools"><span>{{school(quote.before.school)}}</span><span '
                 'aria-hidden="true">→</span><strong>{{school(quote.after.school)}}</strong></div>\n'
                 '  ',
                 ''],
                [3098, '', ' data-testid="config-focus"'],
                [3126, '\n   ', ''],
                [3135, 'v-for="slot in slots" :key="slot" :', ''],
                [3142, '{', ''],
                [3149, ':change(slot)}', ''],
                [3205, 'quote.after.loa', 'i'],
                [3207, 'out', 's'],
                [3209, 'slot', '0'],
                [3211, "??(slot==='relic'?'cloud_mirror':'sword_mind')", ''],
                [3220, '', 'p v-for="id in id'],
                [3238, 'pan', '" :key="id"'],
                [3252,
                 '',
                 "cmd.type==='SCHOOL'?name(slot,id)+'：':''}}{{object(slot,id)?.description}}</p></div></article></div>\n"
                 '</template><template v-else-if="view===\'full\'">\n'
                 "<p>{{cmd.type==='SCHOOL'?'择法将更换下列三项功法。已掌握的功法和本命法宝保留。':'此处只更换已掌握或已持有的配装，不研习、不炼制、不旅行。'}}</p>\n"
                 '<p class="configuration-schools">{{school(q.before.school)}} → '
                 '{{school(q.after.school)}}</p>\n'
                 '<div class="configuration-slots">\n'
                 ' <article v-for="(label,slot) in '],
                [3659, '[', '" :key="'],
                [3671, ']}}</', '" :cla'],
                [3678, 'p', 's="{ch'],
                [3686, "><p>{{slot==='r", 'g'],
                [3688, "lic'?relic(", 'd:'],
                [3691, 'uote', ''],
                [3712, '):', '!==q.after.loadout['],
                [3732, 'ki', ''],
                [3733, 'l(qu', ''],
                [3735, '', ']}"><p>{{lab'],
                [3748, '', 'l}}：{{name(slot,q'],
                [3797, '', 'name('],
                [3806, "==='relic'?relic(", ','],
                [3808, 'uote.after.loadout[slot]):skill(quote', ''],
                [3841, 'div></', ''],
                [3850, '  ', ''],
                [3857, '  ', ''],
                [3862, 'v', ':data'],
                [3868, '', 'test'],
                [3873, 'f', 'd'],
                [3876, 'intent.command.type===', ''],
                [3877, 'EQUIP_RELIC\'" class="', ''],
                [3891, '', "'+(slot==='"],
                [3907, '', "'?'relic':'skill')+'"],
                [3935, '" data-testid="configuration-relic-effects', "'"],
                [3940, '>原器：{{qu', ' v-f'],
                [3945, '', 'r="(sta'],
                [3954, '', ',i) in [q'],
                [3970, '.loadout.relic?C.relics[', ','],
                [3972, "uote.before.loadout.relic].description:'未装备，无器物加成'}}</p><p>拟换：{{quote", ''],
                [3978, '.', ']" :key="i">{{i?\'拟换\':s'],
                [4002, 'adou', ''],
                [4003, '.', "==='"],
                [4012, '', "'"],
                [4014, 'C.r', "'原器':'原法'}}：{{"],
                [4029, 'li', 'ffe'],
                [4033, '', 't('],
                [4036, '[quo', 'ta'],
                [4040, ".after.loadout.relic].description:'未装备，无器物加成'", ')'],
                [4054,
                 '  <div v-else-if="comparedSlot" '
                 'data-testid="configuration-skill-effects"><p>原法：{{quote.before.loadout[comparedSlot]?C.skills[quote.before.loadout[comparedSlot]!].description:\'尚未择法，无功法效果\'}}</p><p>拟换：{{quote.after.loadout[comparedSlot]?C.skills[quote.after.loadout[comparedSlot]!].description:\'尚未择法，无功法效果\'}}</p></div>\n'
                 '  <p class="configuration-effects" data-testid="configuration-effects">修炼加成 '
                 '{{quote.before.cultivationBonus}} → {{quote.after.cultivationBonus}} · 护御 '
                 '{{quote.before.guard}} → {{quote.after.guard}}<br>符印伤害 {{quote.before.markDamage}} → '
                 '{{quote.after.markDamage}} · 剑简加成 {{quote.before.manualDamageBonus}} → '
                 '{{quote.after.manualDamageBonus}}</p>\n'
                 '  ',
                 ''],
                [4124, 'intent.', ''],
                [4125, 'o', ''],
                [4126, 'man', ''],
                [4131, '', '<p'],
                [4134, '', 'v-if="view===\'full\'||view===\'effects\'&&q.allowed"'],
                [4184,
                 '',
                 'class="configuration-effects" '
                 ':data-testid="view===\'full\'?\'configuration-effects\':\'config-changes\'">{{effects}}</p>\n'],
                [4338, '  ', ''],
                [4445, 'uote', ''],
                [4472, 'uote', ''],
                [4538, '  ', ''],
                [4987, 'uote', '']],
 'maxComponentBytes': 5643,
 'maxGroupBytes': 60000,
 'group': ['web/src/LearningPlanner.vue',
           'web/src/MarketPlanner.vue',
           'web/src/RecoveryPlanner.vue',
           'web/src/ConfigurationDialog.vue',
           'web/src/preparation-view.ts',
           'web/src/idle-preparation.css'],
 'newRasterAssets': 0,
 'unchanged': {'src/full/configuration.ts': 'ca9880f727c5798a55d4a8590c57c1fbe5ba71ef0e6cfb0c59fdebfb86205520',
               'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73',
               'src/full/queries.ts': 'eab721ecd066440d8babe11f36664300d21df2d1cf15f10d1160c7cb2a880d48',
               'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815',
               'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7',
               'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21',
               'web/src/configuration-persistence.ts': 'a78887adcb6a622a9904a8db070aa9b9fea873ccab1282769660885079696c00',
               'web/src/ConfigurationOutlook.vue': '72768df4cb3d226c5efc029dfa73e68324cfb0fd5962ca6d9348964224619e20',
               'web/src/App.vue': 'ecffa3d113dd0980f272b56e809c379d8fe87842f80aef7298db234dd3e97ec0',
               'web/src/focus.ts': '8ae91e78a4db7a854c293fc4b1bc28f02dd0d542b3119cff383f9245b4944eea',
               'web/src/idle-preparation.css': '9832321f25817d059c4a95e6bc16ac31e7476eac800afaa788575cd00278396a',
               'web/src/art16-schools.css': 'af4798fd2ce2465fc14e9986f46877c071d9aaf1435f519a8b111e825402ae34'},
 'sourceReferences': ['docs/decisions/0109-configuration-focus-uir34-03-contract.md',
                      'goal-4/amendments/2026-11-05-uir34-03-input.md']}
def prior_uir3403_bytes(path,raw):
 if Path(path).name!='ConfigurationDialog.vue':return raw
 if hashlib.sha256(raw).hexdigest()==MANIFEST['beforeSHA256']:return raw
 assert len(raw)==MANIFEST['bytes']and hashlib.sha256(raw).hexdigest()==MANIFEST['sha256'],'UIR34-03 exact complete source'
 text=raw.decode()
 for at,old,new in reversed(MANIFEST['operations']):
  assert text[at:at+len(new)]==new,'UIR34-03 exact display span'
  text=text[:at]+old+text[at+len(new):]
 assert hashlib.sha256(text.encode()).hexdigest()==MANIFEST['beforeSHA256'],'UIR34-03 original whole inverse'
 return text.encode()
def validate_uir3403(root):
 root=Path(root).resolve()
 def local(n):
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'UIR34-03 local source';return p
 if not(root/LEDGER).exists():
  assert b'config-focus'not in local(MANIFEST['path']).read_bytes(),'UIR34-03 unrecorded focus'
  return set(),0
 assert json.loads(local(LEDGER).read_text())==MANIFEST,'UIR34-03 immutable scope'
 raw=local(MANIFEST['path']).read_bytes();old=local(MANIFEST['before']).read_bytes();assert len(raw)==MANIFEST['bytes']and hashlib.sha256(raw).hexdigest()==MANIFEST['sha256'],'UIR34-03 current source';assert hashlib.sha256(old).hexdigest()==MANIFEST['beforeSHA256'],'UIR34-03 original preserved';assert prior_uir3403_bytes(MANIFEST['path'],raw)==old,'UIR34-03 full inverse'
 assert len(raw)<=5643 and sum(local(n).stat().st_size for n in MANIFEST['group'])<=60000,'UIR34-03 original actual cap'
 for n,h in MANIFEST['unchanged'].items():assert hashlib.sha256(prior_uir3405_bytes(n,local(n).read_bytes())).hexdigest()==h,'UIR34-03 original confirmation ownership and rules'
 for n in MANIFEST['sourceReferences']:local(n)
 return{LEDGER,MANIFEST['path'],MANIFEST['before'],*MANIFEST['unchanged'],*MANIFEST['sourceReferences']},sum(local(n).stat().st_size for n in MANIFEST['group'])
