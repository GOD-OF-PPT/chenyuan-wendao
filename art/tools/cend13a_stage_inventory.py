from cend13b_response_inventory import prior_response_bytes
import hashlib,json
from pathlib import Path
LEDGER="art/redesign/cend13a-stage.json"
MANIFEST=json.loads(r'''{
  "format": "chenyuan-cultivation-start-stage-handoff",
  "version": 1,
  "userAcceptance": false,
  "newRasterAssets": 0,
  "actualAppCap": 159635,
  "maxNewUILogicBytes": 1800,
  "parent": {
    "path": "web/src/App.vue",
    "before": "goal-4/evidence/cend13a/before/web/src/App.vue",
    "beforeBytes": 159623,
    "beforeSHA256": "e48a2a03faad3bb9e4061b4e7c088c122c8a29d12edfe007ebe3e5cb39f9730d",
    "bytes": 159635,
    "sha256": "15ba7e3d7d35e3fd549bd3165cfe794b44bcc602cdf7a20be7f422ac88ccf903",
    "functionBefore": "function startTraining(plan:CultivationPlan=defaultTraining){if(pendingStoryError.value)return;resumeVisible.value=false;trainingInspectionPlan.value=null;return store.startCultivation(plan);}",
    "functionAfter": "async function startTraining(plan:CultivationPlan=defaultTraining){\n if(pendingStoryError.value)return;\n resumeVisible.value=false;trainingInspectionPlan.value=null;\n const from=singleScreen.value&&hubView.value==='cultivation',owner=navigationRevision,owns=inspectionOwner(),previous=store.activity?.id,signature=JSON.stringify(plan),anchor=focus.capture();\n await store.startCultivation(plan);\n const a=store.activity,r=store.activityRuntime,g=game.value;\n if(!from||!owns(owner)||document.hidden||store.error||!store.saved||!store.available||store.busy||store.activityPausing||a?.version!==1||a.status!=='running'||a.id===previous||!store.activityOwned||a.runId!==g?.core.runId||a.gameRevision!==g?.core.revision||r?.id!==a.id||r.generation!==a.generation||JSON.stringify(a.plan)!==signature)return;\n hubTrainingMethod.value=a.plan.method;const current=inspectionOwner(a.id),next=selectTab('修行');await nextTick();\n if(current(next)&&!document.hidden&&!store.error&&!store.activityPausing&&store.activity?.status==='running'&&store.activity.generation===a.generation&&store.activityRuntime?.id===a.id&&store.activityRuntime.generation===a.generation&&store.activityOwned&&focusStillOwned(anchor))focus.target(document.querySelector<HTMLElement>('[data-testid=cultivation-active-pause]'));\n}",
    "indentEdits": [
      [
        648,
        2
      ],
      [
        655,
        2
      ],
      [
        656,
        2
      ],
      [
        657,
        2
      ],
      [
        665,
        2
      ],
      [
        666,
        2
      ],
      [
        667,
        2
      ],
      [
        674,
        2
      ],
      [
        678,
        2
      ],
      [
        679,
        2
      ],
      [
        680,
        4
      ],
      [
        681,
        4
      ],
      [
        682,
        4
      ],
      [
        683,
        4
      ],
      [
        684,
        4
      ],
      [
        685,
        4
      ],
      [
        686,
        4
      ],
      [
        687,
        2
      ],
      [
        693,
        2
      ],
      [
        694,
        2
      ],
      [
        695,
        4
      ],
      [
        696,
        4
      ],
      [
        697,
        6
      ],
      [
        698,
        6
      ],
      [
        699,
        10
      ],
      [
        700,
        11
      ],
      [
        701,
        12
      ],
      [
        702,
        12
      ],
      [
        703,
        12
      ],
      [
        704,
        13
      ],
      [
        705,
        13
      ],
      [
        706,
        14
      ],
      [
        707,
        14
      ],
      [
        708,
        14
      ],
      [
        709,
        14
      ],
      [
        710,
        15
      ],
      [
        711,
        15
      ],
      [
        712,
        15
      ],
      [
        713,
        15
      ],
      [
        714,
        15
      ],
      [
        715,
        15
      ],
      [
        716,
        15
      ],
      [
        717,
        14
      ],
      [
        718,
        13
      ],
      [
        720,
        12
      ],
      [
        721,
        13
      ],
      [
        722,
        11
      ],
      [
        723,
        11
      ],
      [
        724,
        12
      ],
      [
        725,
        12
      ],
      [
        726,
        12
      ],
      [
        727,
        12
      ],
      [
        728,
        12
      ],
      [
        729,
        12
      ],
      [
        731,
        12
      ],
      [
        732,
        14
      ],
      [
        733,
        14
      ],
      [
        734,
        14
      ],
      [
        735,
        14
      ],
      [
        736,
        14
      ],
      [
        737,
        14
      ],
      [
        738,
        14
      ],
      [
        739,
        12
      ],
      [
        740,
        12
      ],
      [
        741,
        12
      ],
      [
        742,
        10
      ],
      [
        743,
        10
      ],
      [
        744,
        10
      ],
      [
        745,
        10
      ],
      [
        746,
        10
      ],
      [
        747,
        8
      ],
      [
        748,
        6
      ],
      [
        749,
        6
      ],
      [
        750,
        6
      ],
      [
        751,
        6
      ],
      [
        752,
        4
      ],
      [
        753,
        4
      ],
      [
        754,
        4
      ],
      [
        755,
        6
      ],
      [
        756,
        6
      ],
      [
        757,
        8
      ],
      [
        759,
        8
      ],
      [
        760,
        8
      ],
      [
        761,
        8
      ],
      [
        762,
        8
      ],
      [
        763,
        8
      ],
      [
        764,
        8
      ],
      [
        765,
        8
      ],
      [
        766,
        8
      ],
      [
        767,
        8
      ],
      [
        768,
        8
      ],
      [
        769,
        8
      ],
      [
        770,
        8
      ],
      [
        771,
        8
      ],
      [
        772,
        8
      ],
      [
        773,
        8
      ],
      [
        774,
        8
      ],
      [
        775,
        8
      ],
      [
        776,
        8
      ],
      [
        777,
        8
      ],
      [
        778,
        8
      ],
      [
        779,
        8
      ],
      [
        780,
        10
      ],
      [
        781,
        10
      ],
      [
        782,
        10
      ],
      [
        783,
        10
      ],
      [
        784,
        12
      ],
      [
        785,
        12
      ],
      [
        786,
        12
      ],
      [
        787,
        14
      ],
      [
        788,
        16
      ],
      [
        789,
        14
      ],
      [
        790,
        12
      ],
      [
        791,
        12
      ],
      [
        792,
        10
      ],
      [
        793,
        10
      ],
      [
        794,
        12
      ],
      [
        795,
        12
      ],
      [
        796,
        12
      ],
      [
        797,
        10
      ],
      [
        798,
        10
      ],
      [
        799,
        12
      ],
      [
        800,
        12
      ],
      [
        801,
        10
      ],
      [
        802,
        10
      ],
      [
        803,
        8
      ]
    ],
    "uiLogicDelta": 1104
  },
  "renderProof": {
    "path": "goal-4/evidence/cend13a/render-equivalence.json",
    "bytes": 790,
    "sha256": "89666ed6be0df03c4e15aeb64b402cfd56e297b50a6c36aee5094a8aaa2b0296"
  },
  "authority": {
    "web/src/store.ts": "cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7",
    "web/src/activity-clock.ts": "21fc98e4a430464a6dc3554091c022c53b17714938ae6e05491d27e1ab3f0901",
    "web/src/full-persistence.ts": "d2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21",
    "web/src/activity-persistence.ts": "a5100e6f2d84b627ef17800bfc8f17f3f533566db47f35faab3833da66bab4cf",
    "web/src/cultivation-effects.ts": "656c74686b1e1cee2f68c61074172d5c3c23f86cf12d5c3eed7205f215de409a",
    "web/src/CultivationOngoing.vue": "36ff8a84502f8031e6d4410f650e5aa264faf3346051ac932f5cc35715726253",
    "web/src/CultivationSite.vue": "b39966928306502220b66ebd3a4bd8f6eaae88243fbd306de80a08aa353072d5",
    "web/src/CultivationStageHost.vue": "006210e41b1e542b948ac57d12775b93f836f4d158ca318b85f00bd440b51753",
    "web/src/cultivation-objects.css": "e72dbbaf48cda74d973d9878cfab6fd7bc4d28d02f1e68d5d24bdb4d8b61b78d",
    "web/src/focus.ts": "8ae91e78a4db7a854c293fc4b1bc28f02dd0d542b3119cff383f9245b4944eea",
    "src/full/activity.ts": "2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815",
    "src/full/engine.ts": "864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73",
    "src/full/content.ts": "e5602fa6c0ccac95372d5f668a3234d7d6054ea5f3a4b36d72798f1b9e40878c"
  },
  "oldLedgers": {
    "art/redesign/cend11-mainline.json": "3dc03451ad328bf6b0c04b557752ba88d1ad175ddfea01553b199dd54f5e2bc2",
    "art/redesign/uir33-01.json": "eddba322cf0c406c946abe586acf5a1cdef40c2aec1cb4589ccb4e5300f97d86",
    "art/redesign/art15.json": "f93c941d6f799a296b67c1ceec19831cf7c398d2193ba9f3241aa40c404c24ca",
    "art/redesign/cultivation-objects.json": "280f616867bc0f01262e68cfc7df1b14d647b215c652e690fc96b42dc367abeb",
    "art/redesign/idle-cultivation.json": "b1443902e2ed89bcfd861b9704ec1a544ac1c3a0c7de7161e64d5553a3838f39",
    "art/redesign/stage-r1.json": "3ce30ea55cf43ef9f335df7a0cc744f0f0c9afc40cdef5997fdf7dcc5dedc967"
  },
  "sourceReferences": [
    "docs/decisions/0145-cultivation-start-stage-cend13a-contract.md",
    "goal-4/amendments/2026-11-10-cend13a-input.md",
    "goal-4/research/cend13a-sources.json"
  ],
  "nativeStyle": {
    "text": "<style>.art06-progress:has(>.art06-harvest){padding-bottom:4px}</style>\n",
    "bytes": 72,
    "sha256": "ea88dca6c3e727d2add7d6d42fad79b5cdb72103b0096709522b712a5bbfe91d",
    "maxBytes": 128
  }
}''')

def prior_stage_handoff_bytes(path,raw):
 raw=prior_response_bytes(path,raw)
 row=MANIFEST['parent']
 if Path(path).name!='App.vue' or hashlib.sha256(raw).hexdigest()!=row['sha256']:return raw
 style=MANIFEST['nativeStyle']['text'];text=raw.decode()
 assert text.endswith(style)and text.count(style)==1,'C13 exact native result clearance'
 lines=text[:-len(style)].splitlines(keepends=True)
 for index,count in row['indentEdits']:
  assert type(index)is int and type(count)is int and 0<=index<len(lines)and count>0,'C13 exact indentation record'
  lines[index]=' '*count+lines[index]
 text=''.join(lines);assert text.count(row['functionAfter'])==1,'C13 unique original start UI function'
 raw=text.replace(row['functionAfter'],row['functionBefore'],1).encode()
 assert len(raw)==row['beforeBytes']and hashlib.sha256(raw).hexdigest()==row['beforeSHA256'],'C13 exact complete App original'
 return raw

def validate_stage_handoff(root):
 root=Path(root).resolve()
 def local(n):
  assert type(n)is str and n and not Path(n).is_absolute()and '..'not in Path(n).parts and '\\'not in n,'C13 local source'
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'C13 actual local source'
  return p
 row=MANIFEST['parent']
 if not(root/LEDGER).exists():
  p=root/row['path'];assert not(p.exists()or p.is_symlink())or hashlib.sha256(local(row['path']).read_bytes()).hexdigest()==row['beforeSHA256'],'C13 missing ledger current parent'
  return set(),0
 assert json.dumps(json.loads(local(LEDGER).read_text()),sort_keys=True)==json.dumps(MANIFEST,sort_keys=True),'C13 immutable typed ledger'
 raw=local(row['path']).read_bytes();old=local(row['before']).read_bytes()
 assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'C13 exact current App'
 assert len(raw)<=159635 and len(raw)<=MANIFEST['actualAppCap'],'C13 actual original App cap'
 assert len(old)==159623==row['beforeBytes']and hashlib.sha256(old).hexdigest()==row['beforeSHA256'],'C13 preserved complete parent'
 assert prior_stage_handoff_bytes(row['path'],raw)==old,'C13 complete original inverse'
 delta=len(row['functionAfter'].encode())-len(row['functionBefore'].encode());style=MANIFEST['nativeStyle'];data=style['text'].encode()
 assert len(data)==style['bytes']and len(data)<=128==style['maxBytes']and hashlib.sha256(data).hexdigest()==style['sha256'],'C13 exact native result style'
 assert delta==row['uiLogicDelta']and 0<delta and delta+len(data)<=1800,'C13 exact UI logic budget'
 proof=MANIFEST['renderProof'];data=local(proof['path']).read_bytes();assert len(data)==proof['bytes']and hashlib.sha256(data).hexdigest()==proof['sha256'],'C13 exact actual compiler proof'
 facts=json.loads(data);assert facts['beforeAppSHA256']==row['beforeSHA256']and facts['currentAppSHA256']==row['sha256']and facts['sameRenderCode']is True,'C13 changed inputs actual render proof'
 assert facts['beforeTemplateSHA256']!=facts['currentTemplateSHA256']and facts['renderBytes']>0,'C13 actual different template proof'
 for key in ['authority','oldLedgers']:
  for n,h in MANIFEST[key].items():assert hashlib.sha256(local(n).read_bytes()).hexdigest()==h,'C13 original '+key
 for n in MANIFEST['sourceReferences']:local(n)
 return{LEDGER,row['path'],row['before'],proof['path'],*MANIFEST['authority'],*MANIFEST['oldLedgers'],*MANIFEST['sourceReferences']},delta
