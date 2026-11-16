from uir34_01_inventory import prior_uir3401_bytes
"""ART05 source identity, fixed budget and consumer wiring; not runtime or visual proof."""
import hashlib,json,re
from pathlib import PurePosixPath

NATIVE=[
 'web/src/EncounterTable.vue','web/src/ResponseTable.vue','web/src/LifeScroll.vue',
 'web/src/NarrativeStageHost.vue','web/src/narrative-effects.ts','web/src/narrative-objects.css',
]
REFS=[
 'docs/decisions/0027-narrative-object-art-contract.md',
 'goal-4/amendments/2026-10-24-art05.md','goal-4/research/art05-sources.json',
]
BINDINGS={
 'web/src/FateCatalogue.vue':['import EncounterTable','<EncounterTable','#people'],
 'web/src/NarrativePanel.vue':['import ResponseTable','<ResponseTable','#choices'],
 'web/src/LifeCatalogue.vue':['import LifeScroll','<LifeScroll','#chapters'],
 'web/src/App.vue':['import NarrativeStageHost','<NarrativeStageHost','</NarrativeStageHost>'],
 'web/src/NarrativeStageHost.vue':['narrative-effects','provide(narrativeStageKey,useNarrativeStage','<slot/>'],
 'web/src/EncounterTable.vue':['useNarrativeObject',"import './narrative-objects.css'",'data-testid="encounter-table"'],
 'web/src/ResponseTable.vue':['useNarrativeObject',"import './narrative-objects.css'",'data-testid="response-table"'],
 'web/src/LifeScroll.vue':['useNarrativeObject',"import './narrative-objects.css'",'data-testid="life-scroll"'],
 'web/src/narrative-effects.ts':['useActivityPresentation','narrativeActivityMatches','narrativeObjectMatches','useNarrativeObject','active,7'],
}
OPERATIONS=['EVENT','DECIDE','ANSWER_TRIAL','END','RETIRE','END_LIFE']

def validate_narrative_objects(root):
 root=root.resolve();ledger=root/'art/redesign/narrative-objects.json'
 if not ledger.exists():
  assert not any((root/path).exists() for path in NATIVE),'Unrecorded narrative object source'
  return 0
 assert ledger.resolve().is_relative_to(root) and ledger.is_file(),'Narrative ledger escapes repository'
 m=json.loads(ledger.read_text())
 assert type(m) is dict and set(m)=={'format','version','task','maxNativeBytes','newBitmapAssets','assets','userAcceptance','files','sourceReferences','bindings'},'Narrative ledger shape changed'
 assert m['format']=='chenyuan-narrative-objects' and type(m['version']) is int and m['version']==1 and m['task']=='Goal4 ART05','Narrative header changed'
 assert type(m['maxNativeBytes']) is int and m['maxNativeBytes']==45000,'Narrative budget changed'
 assert type(m['newBitmapAssets']) is int and m['newBitmapAssets']==0 and m['assets']==[],'Narrative bitmap budget changed'
 assert m['userAcceptance'] is False,'Narrative human acceptance cannot be claimed'
 assert m['sourceReferences']==REFS and m['bindings']==BINDINGS,'Narrative source or consumer contract changed'
 def local(path):
  assert type(path) is str and path and '\\' not in path and not PurePosixPath(path).is_absolute() and '..' not in PurePosixPath(path).parts,'Invalid narrative relative path'
  file=(root/path).resolve()
  assert file.is_relative_to(root) and file.is_file(),'Narrative path escapes repository or is missing'
  return file
 for reference in REFS:local(reference)
 assert type(m['files']) is list and all(type(row) is dict and set(row)=={'path','bytes','sha256'} for row in m['files']),'Narrative source identity shape changed'
 assert [row['path'] for row in m['files']]==NATIVE,'Narrative source inventory incomplete'
 total=0
 for row in m['files']:
  data=prior_uir3401_bytes(row['path'],local(row['path']).read_bytes())
  assert type(row['bytes']) is int and row['bytes']==len(data),'Narrative source byte count changed'
  assert type(row['sha256']) is str and re.fullmatch('[0-9a-f]{64}',row['sha256']) and row['sha256']==hashlib.sha256(data).hexdigest(),'Narrative source hash changed'
  total+=len(data)
 assert total<=45000,'Narrative object code exceeds fixed budget'
 for path,fragments in BINDINGS.items():
  text=local(path).read_text()
  assert all(fragment in text for fragment in fragments),'Missing narrative consumer: '+path
 app=local('web/src/App.vue').read_text()
 host=re.search(r'<NarrativeStageHost\b[^>]*>(.*?)</NarrativeStageHost>',app,re.S)
 assert host,'Narrative host is not a stable wrapper'
 for parent in ['FateCatalogue','NarrativePanel','LifeCatalogue']:
  assert re.search(r'<KeepAlive\b[^>]*>\s*<'+parent+r'\b',host[1]),'Narrative host does not own existing KeepAlive: '+parent
 helper=local('web/src/narrative-effects.ts').read_text()
 operations=re.search(r'const operations=\[([^\]]*)\]',helper)
 assert operations and re.findall(r"'([^']*)'",operations[1])==OPERATIONS,'Narrative action domain changed'
 return total
