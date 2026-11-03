"""ART36 draws the error-state reading place; it cannot grant authority or alter old budgets."""
import hashlib,json,re
from pathlib import Path
from art37_inventory import original_art37_main
LEDGER='art/redesign/art36.json'
CSS='web/src/art36-error-stage.css'
MAIN='web/src/main.ts'
IMPORT="import './art36-error-stage.css';\n"
BUDGETS={'cssBytes': 1200, 'mainDeltaBytes': 64, 'combinedArt35CSS': 4800, 'combinedArt35Native': 7200, 'newRasterAssets': 0}
BASELINE_SHA='3f0595b97ee03b6854e99df0183fdae476ec6d77fa69aa55183dc2aa48c32a59'
UNCHANGED={'web/src/JadeStudyScene.vue': '434b16c05e5e6870cb67dc1f6611a81637864b0e20463c8bfd93e4c395d675ed', 'web/src/JadeEngraving.vue': 'f08b03fa397ec566a6ff51ebeb181c7a93e8e6e7974f0c7c6397bd36e7d6814b', 'web/src/LearningPlanner.vue': '916581594274b568bf22fea242edacf375c7cf53a96ec4ca3766adad58db3d1b', 'web/src/equipment-effects.ts': '0946c3b6b76e5ea39ebd80571175e2835ce49abe94fe6499f480b1635a934888', 'web/src/equipment-choreography.ts': '871e41e7555f640fecbc8f26706fac34a5249225a6acb5f1db9c63789a8011bb', 'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7', 'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73', 'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815', 'web/src/jade-paint.ts': 'd9eeb4ac87f3b2ef12e3c1d7c966ecb2af06bdf34b231eceee37432bb08ff1da', 'web/src/art35-study-rest.css': '5229f7d5f301468db7a244dbe97b205bd333a5df39124f39a70f5885f562d6fb', 'art/redesign/art35.json': '74dd630c39fd44587b102116365b3fb98615928807e47caccd58da5f102035b8'}
PREFIX='#app .art10-learning[data-mode=skills] .art10-study-scene[data-state=failed]'
SELECTORS={PREFIX,PREFIX+'>.jade-reading-place',PREFIX+'>.jade-cycle-status',PREFIX+'>.ta09-queue',PREFIX+'>.jade-authorization','#app .art10-learning .art10-study-scene[data-state=failed] .ta09-jade .ta09-jade-inspect'}
def validate_art36(root):
 root=Path(root).resolve()
 if not(root/LEDGER).exists():
  assert not(root/CSS).exists() and (not(root/MAIN).exists() or IMPORT not in (root/MAIN).read_text()),'ART36 unrecorded error-stage style'
  return set(),0,0
 def local(p):
  q=root/p;assert not q.is_symlink() and q.is_file() and q.resolve().is_relative_to(root),'ART36 local input';return q
 m=json.loads(local(LEDGER).read_text());assert m['format']=='chenyuan-error-stage-art36' and m['version']==1 and m['userAcceptance']is False,'ART36 header'
 assert m['budgets']==BUDGETS and all(type(v)is int for v in m['budgets'].values()),'ART36 original combined typed caps'
 assert [r['path']for r in m['files']]==[CSS] and m['consumer']['path']==MAIN and m['baseline']['path']=='goal-4/evidence/art36/main.ts.before.txt' and m['unchanged']==UNCHANGED,'ART36 exact scope'
 recorded={LEDGER,CSS,MAIN,m['baseline']['path'],*UNCHANGED,*m['sourceReferences']}
 for p in m['sourceReferences']:local(p)
 for r in m['files']+[m['consumer'],m['baseline']]:
  data=local(r['path']).read_bytes();data=original_art37_main(root,data)if r['path']==MAIN else data;assert len(data)==r['bytes'] and hashlib.sha256(data).hexdigest()==r['sha256'],'ART36 actual source facts'
 old=local(m['baseline']['path']).read_bytes();assert hashlib.sha256(old).hexdigest()==BASELINE_SHA,'ART36 frozen whole bootstrap'
 main=original_art37_main(root,local(MAIN).read_bytes()).decode();assert main.count(IMPORT)==1 and main.replace(IMPORT,'',1).encode()==old,'ART36 only one pure style import'
 assert len(main.encode())-len(old)<=64 and local(CSS).stat().st_size<=1200,'ART36 bounded style delta'
 for p,h in UNCHANGED.items():assert hashlib.sha256(local(p).read_bytes()).hexdigest()==h,'ART36 original owner or old ledger changed'
 assert local(CSS).stat().st_size+local('web/src/art35-study-rest.css').stat().st_size<=4800 and sum(local(p).stat().st_size for p in [CSS,'web/src/art35-study-rest.css','web/src/jade-paint.ts'])<=7200,'ART36 old combined cap not relaxed'
 css=re.sub(r'/\*.*?\*/','',local(CSS).read_text(),flags=re.S)
 assert not re.search(r'@|!important|font|overflow|opacity|visibility|position|transform|display|https?:|--jade-spread',css),'ART36 hidden text, extra scope or replaced state'
 rules=re.findall(r'([^{}]+)\{([^{}]*)\}',css);assert len(rules)==6 and {s.strip()for s,b in rules}==SELECTORS,'ART36 only the failed reading scene'
 assert 'grid-template-columns:330px minmax(0,1fr)'in css and 'grid-template-columns:470px minmax(0,1fr)'in css and 'padding:0 20px'in css,'ART36 measured error-stage geometry'
 return recorded,0,local(CSS).stat().st_size
