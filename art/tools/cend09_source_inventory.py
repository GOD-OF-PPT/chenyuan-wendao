import hashlib,json,re
from pathlib import Path
LEDGER='art/redesign/cend09-source.json'
MANIFEST={'format': 'chenyuan-source-stage-hierarchy',
 'version': 1,
 'userAcceptance': False,
 'newRasterAssets': 0,
 'maxCSSBytes': 6800,
 'maxParentBytes': 6683,
 'parent': {'path': 'web/src/SourceField.vue',
            'before': 'goal-4/evidence/cend09-source/before/web/src/SourceField.vue',
            'beforeBytes': 6683,
            'beforeSHA256': '0f3a665944b28a27d52843c6bbe6e05925b3e9a5aaad8e859459fa69091c36be',
            'bytes': 6681,
            'sha256': '360709cea5fa93a86e01f254b70248b410dbc2cf62c37a22c2658a4d42a3e46d',
            'oldImport': "import './ta08-source.css';",
            'newImport': "import './src-stage.css';"},
 'display': {'path': 'web/src/src-stage.css',
             'bytes': 3655,
             'sha256': '50f1693b7c8406a79111bb0891155c37c460bd0c5a819a5dd3bdef648cd67d59'},
 'authority': {'web/src/SourcePlanner.vue': 'ea42a57110db234205d8ef8f1d46f4969802a7757ed16ede9d0ff3e33e3b9e72',
               'web/src/SourceSatchel.vue': 'f28a144f928cd9358df91e600118fcb19aaef2667f9eb3cb198ccb15cc8521fd',
               'web/src/SourceObject.vue': '8ec7be7122c5e6601de61332533fde63e0e0768cb1ecfc5dc42795b57e89defb',
               'web/src/SourceCommission.vue': '07fc788df3be32fabc0f329780e81fdc240a6acd629252f4dc8302e8531be3c7',
               'web/src/SourceMaterials.vue': '18df045148e7d08a686c9388a1d838680517deb574438e74ac80dc20bc0d0884',
               'web/src/ta08-source.css': '0bcaa542dca4f1dc9bb862e63ead388dee2f996bf483507d77813710181f3522',
               'web/src/art02-source.css': '0baf30d5065609265e7ba9baf45a5bde25e2b4d3d31bb62cdbe7badfbe921188',
               'web/src/source-choreography.ts': '665cb8c1d7bf0537b992b628720ff3be2bf0206536b36f487799bf67fe1f96f2',
               'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7',
               'web/src/activity-clock.ts': '21fc98e4a430464a6dc3554091c022c53b17714938ae6e05491d27e1ab3f0901',
               'web/src/activity-persistence.ts': 'a5100e6f2d84b627ef17800bfc8f17f3f533566db47f35faab3833da66bab4cf',
               'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21',
               'web/src/activity-effects.ts': 'dd697069d134e4e9a935c0186758ebd243d26b29dd9856f4100d21596b4a0f8b',
               'web/src/use-activity-effect.ts': 'e15a7b41b897e7d4f29e8be277703efd1f8c32d2dec11d278a41a37c89425163',
               'web/src/focus.ts': '8ae91e78a4db7a854c293fc4b1bc28f02dd0d542b3119cff383f9245b4944eea',
               'web/src/AssetImage.vue': 'ecfc476d074c16c14b181abbf62863ebc6d5c014d9473d3118e761433115a8da',
               'src/full/content.ts': 'e5602fa6c0ccac95372d5f668a3234d7d6054ea5f3a4b36d72798f1b9e40878c',
               'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815',
               'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73',
               'src/full/receipts.ts': '185597443e21bf88949232a97afa426410b0dcc8ce8e07cf240a08af0f2dd0ae'},
 'oldLedgers': {'art/redesign/ta08.json': '3dacde3abdbbc6f2476213ed353bd89b5c9ddaab6b9d656f0d4e316a5270db37',
                'art/redesign/art34.json': 'aacbda4147649c7cde847ab464ef6495ca596ab754889dce041b7212a471d4e0',
                'art/redesign/idle-sources.json': '8933162178a3c16c0af38cb50487a265b6d692d0bc1e53837b7a7032c1d76131',
                'art/redesign/cend08-f03.json': '55f489d8a9c681fcb6b84117697a2f880a36e00d0b0f5719478cfe666d5a127d'},
 'sourceReferences': ['docs/decisions/0139-source-stage-hierarchy-cend09-contract.md',
                      'goal-4/amendments/2026-11-09-cend09-source-input.md',
                      'goal-4/research/cend09-source-sources.json']}
def prior_source_stage_bytes(path,raw):
 row=MANIFEST['parent']
 if Path(path).name!=Path(row['path']).name or row['newImport'].encode() not in raw:return raw
 assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'SH09 exact current whole parent'
 text=raw.decode();assert text.count(row['newImport'])==1,'SH09 single approved import'
 text=text.replace(row['newImport'],row['oldImport'],1)
 assert len(text.encode())==row['beforeBytes']and hashlib.sha256(text.encode()).hexdigest()==row['beforeSHA256'],'SH09 exact whole original'
 return text.encode()
def validate_source_stage(root):
 root=Path(root).resolve()
 def local(n):
  assert type(n)is str and n and not Path(n).is_absolute()and '..'not in Path(n).parts and '\\'not in n,'SH09 local path'
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'SH09 actual local source'
  return p
 if not(root/LEDGER).exists():
  assert not(root/MANIFEST['display']['path']).exists(),'SH09 missing ledger'
  p=root/MANIFEST['parent']['path'];assert not p.exists()or MANIFEST['parent']['newImport'].encode()not in p.read_bytes(),'SH09 missing ledger current parent'
  return set(),0
 assert json.dumps(json.loads(local(LEDGER).read_text()),sort_keys=True)==json.dumps(MANIFEST,sort_keys=True),'SH09 immutable ledger and typed caps'
 row=MANIFEST['parent'];raw=local(row['path']).read_bytes();old=local(row['before']).read_bytes()
 assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'SH09 complete current parent'
 assert len(old)==row['beforeBytes']and hashlib.sha256(old).hexdigest()==row['beforeSHA256'],'SH09 preserved original parent'
 assert prior_source_stage_bytes(row['path'],raw)==old and len(raw)<=6683,'SH09 unchanged complete script template and cap'
 d=MANIFEST['display'];css=local(d['path']).read_bytes();assert len(css)==d['bytes']and hashlib.sha256(css).hexdigest()==d['sha256']and len(css)<=6800,'SH09 exact scoped CSS'
 assert css.startswith(b"@import './ta08-source.css';"),'SH09 original material stylesheet still imported'
 assert not re.search(rb'@media|@font-face|https?:|display\s*:\s*none|visibility\s*:\s*hidden|overflow\s*:\s*(?:hidden|auto|scroll)|(?<![\w-])content\s*:|font-size\s*:\s*(?:[0-9]|1[0-3])px',css),'SH09 no compatibility hiding scrolling fake text or small fonts'
 for field,label in [('authority','original authority'),('oldLedgers','old ledgers')]:
  for n,h in MANIFEST[field].items():assert hashlib.sha256(local(n).read_bytes()).hexdigest()==h,'SH09 '+label
 for n in MANIFEST['sourceReferences']:local(n)
 return{LEDGER,row['path'],row['before'],d['path'],*MANIFEST['authority'],*MANIFEST['oldLedgers'],*MANIFEST['sourceReferences']},len(css)
