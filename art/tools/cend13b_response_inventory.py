from cend13c_gap_inventory import prior_preparation_gap_bytes
import hashlib,json,re
from pathlib import Path
LEDGER="art/redesign/cend13b-response.json"
MANIFEST=json.loads(r'''{
  "format": "chenyuan-response-context-cend13b",
  "version": 1,
  "userAcceptance": false,
  "newRasterAssets": 0,
  "maxHelperBytes": 3000,
  "maxStatusLayerBytes": 5000,
  "caps": {
    "story-journey": 48000,
    "narrative-objects": 45000
  },
  "parents": [
    {
      "path": "web/src/ResponseTable.vue",
      "before": "goal-4/evidence/cend13b/before/web/src/ResponseTable.vue",
      "beforeBytes": 5253,
      "beforeSHA256": "8ef738214baf612dd4841080cd138aaf9043893f7679a1cf0f90dddddfacaa2a",
      "bytes": 5609,
      "sha256": "81e123a8aa5f417f7e7fd102a009b6cdd93d79f96113dded1d87e3c4fe4dd38f",
      "operations": [
        {
          "at": 312,
          "old": "import {scenePresentation} from './scene-presentation';",
          "new": "import {scenePresentation} from './scene-presentation';\nimport {responseContext} from './response-context';"
        },
        {
          "at": 1452,
          "old": "const state=computed(()=>store?.error?'failed':phase.value);",
          "new": "const state=computed(()=>store?.error?'failed':phase.value);\nconst context=computed(()=>responseContext({game:props.game,identity:props.identity,mode:props.mode,action:props.action,activity:store?.activity??null,runtime:runtime.value,owned:!!store?.activityOwned,busy:!!store?.busy,blocked:!!(store?.error||store?.syncIssue||!store?.available),pausing:!!store?.activityPausing}));"
        },
        {
          "at": 3435,
          "old": "<small>{{mode==='choices'?'先择一签 · 预选不作回应':'先读来由，再决定如何回应'}}</small>",
          "new": "<small data-testid=\"response-context\" :data-context=\"context.state\">{{context.caption}}</small>"
        }
      ],
      "actualDelta": 356
    },
    {
      "path": "web/src/NarrativePanel.vue",
      "before": "goal-4/evidence/cend13b/before/web/src/NarrativePanel.vue",
      "beforeBytes": 6603,
      "beforeSHA256": "e4166552f75d46d58cb6dd8f3968a030f0b0be80882390bf19b6b7e5001314a5",
      "bytes": 6509,
      "sha256": "e1e415cc4515075d4392939206afc206c0ab67a89b27d23e57554768a34fd07a",
      "operations": [
        {
          "at": 2781,
          "old": "<small>{{running?'当前安排进行中，可继续阅读':'等你决定'}}</small>",
          "new": ""
        },
        {
          "at": 5776,
          "old": "<small v-if=\"journey\" data-testid=\"trial-stage-summary\">{{journey.title}} · 已过 {{journey.completed}} / 3 关</small>",
          "new": "<small v-if=\"journey\" data-testid=\"trial-stage-summary\">已存进度 · 已过 {{journey.completed}} / 3 关</small>"
        },
        {
          "at": 5890,
          "old": "<small v-else>只读预选，确认后才安排。</small>",
          "new": "<small v-else>查看不更改已存安排。</small>"
        }
      ],
      "actualDelta": -94
    }
  ],
  "helper": {
    "path": "web/src/response-context.ts",
    "bytes": 2719,
    "sha256": "408cd91eabb7816c4907ed9c57069588191e599ded095b68f87fa98444348392"
  },
  "hook": {
    "path": "art/tools/cend13a_stage_inventory.py",
    "before": "goal-4/evidence/cend13b/before/art/tools/cend13a_stage_inventory.py",
    "beforeBytes": 13269,
    "beforeSHA256": "07be55443ff79f83e840afd6d3824e34a11d9a32398c5cee140801dec505288d",
    "bytes": 13365,
    "sha256": "893472de4cb9ccd47f1269e0f855f524216037eb7568ae084fd92d0a0c2c8513",
    "prefix": "from cend13b_response_inventory import prior_response_bytes\n",
    "anchor": "def prior_stage_handoff_bytes(path,raw):\n",
    "insertion": " raw=prior_response_bytes(path,raw)\n"
  },
  "authority": {
    "web/src/narrative-effects.ts": "ca77c93e636c43fc5c57b1f7b7a3f85bef58aa00f135affe217919b64470b615",
    "web/src/NarrativeStageHost.vue": "e195b09b7485b48e88883a830ca2c0b352da396e62f6457e5ff30c0168d9630d",
    "web/src/OpeningResponse.vue": "725a3f03b21310890c795509d1c008d9fb28ba408b5c2b2fd7e2a753b987a05a",
    "web/src/store.ts": "cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7",
    "web/src/full-persistence.ts": "d2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21",
    "web/src/activity-persistence.ts": "a5100e6f2d84b627ef17800bfc8f17f3f533566db47f35faab3833da66bab4cf",
    "web/src/activity-clock.ts": "21fc98e4a430464a6dc3554091c022c53b17714938ae6e05491d27e1ab3f0901",
    "web/src/use-activity-effect.ts": "e15a7b41b897e7d4f29e8be277703efd1f8c32d2dec11d278a41a37c89425163",
    "web/src/story-pages.ts": "cdeff2da61fc28199b529c3394c3e881570eb0fe0bcee69770af871e8a104c9c",
    "web/src/reading-memory.ts": "8e7a0718edb07113e30f817df5ea98180455e1ea4a7f481a10c72b3657357808",
    "src/full/activity.ts": "2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815",
    "src/full/engine.ts": "864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73",
    "src/full/milestones.ts": "e91f58cf0002945f679649964b5a70e7226e0890b623719b24df2c02bac09492",
    "src/full/queries.ts": "eab721ecd066440d8babe11f36664300d21df2d1cf15f10d1160c7cb2a880d48",
    "web/src/App.vue": "15ba7e3d7d35e3fd549bd3165cfe794b44bcc602cdf7a20be7f422ac88ccf903"
  },
  "oldLedgers": {
    "art/redesign/narrative-objects.json": "0dc8cdfa6666fa9702d8b9845704075dc62b6f3b4e192013b406457fa68db3c2",
    "art/redesign/story-journey.json": "da8d4de050fc8e2254a0ee2d64fc3e747122db5f0f06709dc6c61f728011c15d",
    "art/redesign/art12.json": "1b81697bbe0dbaa103aee96083f46b3d8990b3734920a91fb99784ae293651f0",
    "art/redesign/art30.json": "2fe9decb1c7b59a98fdc77545464c97606f271a049a9a9656b7bb040ce00a6a9",
    "art/redesign/art31.json": "188a145aa07a2289637ebd91ca679f0107b466410031b6a4750db74c6412aa84",
    "art/redesign/art32.json": "5582eb52404e5128f282fdf2e3da7bf26022abc764442e1034d87ae5ced01cf3",
    "art/redesign/cend13a-stage.json": "64b9a9bfdd10d795c6455ea216e18b9e2f071a2b98b21cfcee0d52587c0a4dbb",
    "art/redesign/cend11-mainline.json": "3dc03451ad328bf6b0c04b557752ba88d1ad175ddfea01553b199dd54f5e2bc2"
  },
  "sourceReferences": [
    "docs/decisions/0146-response-state-cend13b-contract.md",
    "goal-4/amendments/2026-11-10-cend13b-input.md",
    "goal-4/research/cend13b-sources.json"
  ],
  "legacyIdentityAdapter": {
    "path": "art/tools/art32_inventory.py",
    "before": "goal-4/evidence/cend13b/before/art/tools/art32_inventory.py",
    "beforeBytes": 14154,
    "beforeSHA256": "6d5867135bcc61d67ab77f43e5482352177a0531ee4632851e43d1ad4098c417",
    "bytes": 14315,
    "sha256": "6e80b9dd5de63c802d7a2be84f738461b6760d760cddfffca67102f84e554d49",
    "prefix": "from cend13b_response_inventory import prior_response_bytes\n",
    "operations": [
      {
        "old": "type(r['bytes'])is int and local(r['path']).stat().st_size==r['bytes']",
        "new": "type(r['bytes'])is int and len(prior_response_bytes(r['path'],local(r['path']).read_bytes()))==r['bytes']"
      },
      {
        "old": "return local(r['path']).read_bytes()",
        "new": "return prior_response_bytes(r['path'],local(r['path']).read_bytes())"
      },
      {
        "old": "actual=local(n).read_text();assert expand_art32_view",
        "new": "actual=prior_response_bytes(n,local(n).read_bytes()).decode();assert expand_art32_view"
      }
    ]
  }
}''')
def prior_response_bytes(path,raw):
 raw=prior_preparation_gap_bytes(path,raw)
 name=Path(path).name
 row=next((r for r in MANIFEST['parents']if Path(r['path']).name==name),None)
 if not row or hashlib.sha256(raw).hexdigest()!=row['sha256']:return raw
 text=raw.decode()
 # Original offsets remain valid when inverse operations are applied from the front.
 for op in row['operations']:
  at,old,new=op['at'],op['old'],op['new'];assert text[at:at+len(new)]==new,'C13B exact approved display span'
  text=text[:at]+old+text[at+len(new):]
 original=text.encode();assert len(original)==row['beforeBytes']and hashlib.sha256(original).hexdigest()==row['beforeSHA256'],'C13B whole parent inverse'
 return original

def validate_response_context(root):
 root=Path(root).resolve()
 def local(n):
  assert type(n)is str and n and not Path(n).is_absolute()and '..'not in Path(n).parts and chr(92)not in n,'C13B local source'
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'C13B actual local source';return p
 if not(root/LEDGER).exists():
  assert not(root/MANIFEST['helper']['path']).exists()and not(root/MANIFEST['helper']['path']).is_symlink(),'C13B missing ledger helper'
  for r in MANIFEST['parents']:
   p=root/r['path'];assert not p.is_symlink(),'C13B missing ledger parent symlink'
   if p.exists():assert hashlib.sha256(local(r['path']).read_bytes()).hexdigest()==r['beforeSHA256'],'C13B missing ledger exact old parent'
  return set(),{}
 assert json.dumps(json.loads(local(LEDGER).read_text()),sort_keys=True)==json.dumps(MANIFEST,sort_keys=True),'C13B immutable typed ledger'
 records={LEDGER};delta=0
 for r in MANIFEST['parents']:
  raw=local(r['path']).read_bytes();old=local(r['before']).read_bytes();assert len(raw)==r['bytes']and hashlib.sha256(raw).hexdigest()==r['sha256'],'C13B exact current parent'
  assert len(old)==r['beforeBytes']and hashlib.sha256(old).hexdigest()==r['beforeSHA256'],'C13B exact original parent'
  assert prior_response_bytes(r['path'],raw)==old,'C13B full display inverse';delta+=max(0,len(raw)-len(old));records.update([r['path'],r['before']])
 r=MANIFEST['helper'];raw=local(r['path']).read_bytes();assert len(raw)==r['bytes']and hashlib.sha256(raw).hexdigest()==r['sha256'],'C13B exact readonly status source'
 assert len(raw)<=3000==MANIFEST['maxHelperBytes']and len(raw)+delta<=5000==MANIFEST['maxStatusLayerBytes'],'C13B actual helper and layer caps'
 assert not re.search(r'\b(?:watch|useGame|useNarrativeObject|setTimeout|setInterval|fetch|emit)\s*\(|indexedDB|localStorage',raw.decode()),'C13B independent IO clock or result ownership'
 records.add(r['path']);h=MANIFEST['hook'];code=local(h['path']).read_bytes();original=local(h['before']).read_bytes();assert len(code)==h['bytes']and hashlib.sha256(code).hexdigest()==h['sha256'],'C13B exact C13A hook'
 text=code.decode();assert text.startswith(h['prefix'])and text.count(h['anchor']+h['insertion'])==1,'C13B unique C13A hook';text=text[len(h['prefix']):].replace(h['anchor']+h['insertion'],h['anchor'],1)
 assert text.encode()==original and len(original)==h['beforeBytes']and hashlib.sha256(original).hexdigest()==h['beforeSHA256'],'C13B original complete C13A guard'
 records.update([h['path'],h['before']]);h=MANIFEST['legacyIdentityAdapter'];code=local(h['path']).read_bytes();old=local(h['before']).read_bytes()
 assert len(code)==h['bytes']and hashlib.sha256(code).hexdigest()==h['sha256'],'C13B exact ART32 historical identity adapter'
 text=code.decode();assert text.startswith(h['prefix']),'C13B ART32 unique adapter';text=text[len(h['prefix']):]
 for op in reversed(h['operations']):assert text.count(op['new'])==1,'C13B exact ART32 adapter span';text=text.replace(op['new'],op['old'],1)
 assert text.encode()==old and len(old)==h['beforeBytes']and hashlib.sha256(old).hexdigest()==h['beforeSHA256'],'C13B original complete ART32 validator'
 records.update([h['path'],h['before']]);totals={}
 for group,cap in MANIFEST['caps'].items():
  d=json.loads(local('art/redesign/'+group+'.json').read_text());assert d['maxNewBytes'if group=='story-journey'else'maxNativeBytes']==cap,'C13B original group caps'
  total=sum(local(r['path']).stat().st_size for r in d['files'])+(len(raw)if group=='narrative-objects'else 0);assert total<=cap,'C13B actual complete group including helper';totals[group]=total
 for key in ['authority','oldLedgers']:
  for n,digest in MANIFEST[key].items():assert hashlib.sha256(local(n).read_bytes()).hexdigest()==digest,'C13B original '+key;records.add(n)
 for n in MANIFEST['sourceReferences']:local(n);records.add(n)
 return records,{'helperBytes':len(raw),'addedParentBytes':delta,'layerBytes':delta+len(raw),'actualGroups':totals}
