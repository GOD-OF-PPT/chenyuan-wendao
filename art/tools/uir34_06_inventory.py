"""Strict current-only character folio with all original component source retained."""
import hashlib,json
from pathlib import Path
LEDGER='art/redesign/uir34-06.json'
MANIFEST={'format': 'chenyuan-uir34-06-character-folio',
 'version': 1,
 'userAcceptance': False,
 'path': 'web/src/CharacterPanel.vue',
 'bytes': 10690,
 'sha256': 'e65b4a0b3584cd76615eb15c1c53454d182c0c171c8090be3d4a2297f0a4a04d',
 'before': 'goal-4/evidence/uir34-06/before/web/src/CharacterPanel.vue',
 'beforeBytes': 6603,
 'beforeSHA256': 'f92981c82db646aee274be8113e395540708a7a8a8b08d6190effa151c0f586c',
 'operations': [[315, '', ".vue';\nimport GameIcon from './GameIcon"],
                [922, '', '" :class="{\'character-folio\':detailsOnly}" :data-layout="detailsOnly?\'folio\':undefined'],
                [2736, '', 'component :is="'],
                [2758, '', 'Only?\'section\':\'details\'"'],
                [2898, '', ' v-if="!detailsOnly"'],
                [3112,
                 '',
                 'figure v-if="detailsOnly" class="folio-person" data-testid="character-folio-person"><PortraitImage id="player" '
                 'fallback="道" aria-hidden="true"/><h2 data-testid="character-folio-name">{{player.name}}</h2><span '
                 'class="realm-badge" data-testid="character-folio-realm">{{realm.name}}</span></figure>\n'
                 '        <'],
                [3591,
                 '',
                 'small v-if="detailsOnly" '
                 'data-testid="character-life-context">{{game.status===\'active\'&&life.remainingMonths!==null?\'余寿 '
                 "'+life.remainingMonths+' 游戏月':'此生已收卷'}}</small><"],
                [3842, '', ' :data-testid="detailsOnly?\'character-slot-mind\':undefined" :data-empty="!game.loadout.mind"'],
                [3938, '', '><GameIcon v-if="detailsOnly&&game.loadout.mind" kind="skill" :id="game.loadout.mind!"/'],
                [4116, '', ' :data-testid="detailsOnly?\'character-slot-builder\':undefined" :data-empty="!game.loadout.builder"'],
                [4218, '', '><GameIcon v-if="detailsOnly&&game.loadout.builder" kind="skill" :id="game.loadout.builder!"/'],
                [4405, '', ' :data-testid="detailsOnly?\'character-slot-finisher\':undefined" :data-empty="!game.loadout.finisher"'],
                [4509, '', '><GameIcon v-if="detailsOnly&&game.loadout.finisher" kind="skill" :id="game.loadout.finisher!"/'],
                [4700, '', ' :data-testid="detailsOnly?\'character-slot-relic\':undefined" :data-empty="!game.loadout.relic"'],
                [4798, '', '><GameIcon v-if="detailsOnly&&game.loadout.relic" kind="relic" :id="game.loadout.relic!"/'],
                [5004, 'd', 'compon'],
                [5011, '', 'n'],
                [5013, 'ails', ''],
                [7554,
                 '',
                 '\n'
                 '/* The current single-screen personal folio is a readonly game object; original modes retain their styles. */\n'
                 '.single-screen '
                 '.character-folio{background:transparent!important;border:0!important;box-shadow:none!important;padding:8px '
                 '12px!important}\n'
                 '.character-folio>section{height:100%;min-height:0}\n'
                 '.character-folio .character-details{height:100%;min-height:0;display:grid;grid-template-columns:230px '
                 'minmax(0,1fr);grid-template-rows:auto auto minmax(0,1fr);gap:12px '
                 '32px;border:0!important;align-content:center;align-items:start}\n'
                 '.character-folio .folio-person{grid-column:1;grid-row:1/4;display:grid;grid-template-rows:minmax(130px,240px) auto '
                 'auto;align-content:center;justify-items:center;gap:10px;height:100%;min-width:0;margin:0;padding:0 24px 0 '
                 '0;border-right:1px solid #91ad8a55;text-align:center}\n'
                 '.character-folio '
                 '.folio-person>.portrait-image{width:100%;height:100%;min-height:0;background:radial-gradient(ellipse,#829f8666,transparent '
                 '70%)}\n'
                 '.single-screen .character-sheet.character-folio::before,.single-screen '
                 '.character-sheet.character-folio::after{content:none!important;display:none!important}\n'
                 '.character-folio .folio-person>.portrait-image{mask-image:linear-gradient(#000 85%,transparent)}\n'
                 '.character-folio .folio-person '
                 ':deep(.portrait-fallback){background:transparent;color:#dae2c9;border-color:#849d8166}\n'
                 '.character-folio .folio-person '
                 'h2{font-size:24px!important;line-height:1.4;margin:0;max-width:100%;overflow-wrap:anywhere}\n'
                 '.character-folio .folio-person>.realm-badge{font-size:14px;line-height:1.6}\n'
                 '.character-folio '
                 '.character-pair{grid-column:2;grid-row:1;display:grid;grid-template-columns:1fr;gap:6px;margin:0!important;padding:8px '
                 '0 16px;border-bottom:1px solid #91ad8a55}\n'
                 '.character-folio .character-pair>span,.character-folio '
                 '.character-pair>small{font-size:14px;line-height:1.5;color:#c6d7c3}\n'
                 '.character-folio .character-pair>b{font-size:22px!important;line-height:1.5;font-weight:400}\n'
                 '.character-folio '
                 '.character-details>h3{grid-column:2;grid-row:2;margin:0;font-size:18px;line-height:1.6;font-weight:400;color:#d5e4cc}\n'
                 '.character-folio '
                 '.character-loadout{grid-column:2;grid-row:3;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-content:start;gap:20px '
                 '24px;margin:0;padding-top:8px}\n'
                 '.character-folio .character-loadout>div{min-width:0;margin:0;padding:12px 0 16px;border-bottom:1px solid '
                 '#91ad8a44}\n'
                 '.character-folio .character-loadout '
                 'dt{display:flex;align-items:center;gap:8px;font-size:14px;line-height:1.7;color:#c6d7c3}\n'
                 '.character-folio .character-loadout dd{font-size:18px!important;line-height:1.7;margin:10px 0 0}\n'
                 '.character-folio .character-loadout>div[data-empty=true] dd{color:#bdcdbb!important}\n']],
 'maxAddedNativeBytes': 6000,
 'newRasterAssets': 0,
 'unchanged': {'web/src/App.vue': '5e6a59b75b7021914ab4bdd356ef6608ec3f391d3522c9ac6eb8272698e7146a',
               'web/src/GameHud.vue': '43cde88a2e545bce6d475735783bc6d66f487a7ffb8643220ac8297b63a529c5',
               'web/src/PrimaryNav.vue': '0a123cc765624ce9bc0fdb1bd934d2dfae65c2a10269034122862a22004ab6d2',
               'web/src/SealedLifeNav.vue': '4879ebe19d0784264a4ca137b0a5a52721b2b618488f6ccc7b2c2cc4cd771c67',
               'web/src/PortraitImage.vue': 'e7b4b55bdce38f13e38960327bf0d8d767e69058671dc7adf42ce1adf87d5208',
               'web/src/GameIcon.vue': 'bb3f16dcb5952299de409a6666e55901e044bb4890cf8e2ddb720f0122d3d061',
               'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7',
               'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21',
               'web/src/activity-persistence.ts': 'a5100e6f2d84b627ef17800bfc8f17f3f533566db47f35faab3833da66bab4cf',
               'web/src/activity-clock.ts': '21fc98e4a430464a6dc3554091c022c53b17714938ae6e05491d27e1ab3f0901',
               'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73',
               'src/full/queries.ts': 'eab721ecd066440d8babe11f36664300d21df2d1cf15f10d1160c7cb2a880d48',
               'src/full/content.ts': 'e5602fa6c0ccac95372d5f668a3234d7d6054ea5f3a4b36d72798f1b9e40878c',
               'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815',
               'web/src/stage-r1.css': '1ed138017fb93db1156aea3db518ea7f930864a0503e3adb7363f4e4eb68112d'},
 'sourceReferences': ['docs/decisions/0113-character-folio-focus.md', 'goal-4/amendments/2026-11-06-uir34-06-input.md']}
def prior_uir3406_bytes(raw):
 assert len(raw)==MANIFEST['bytes'] and hashlib.sha256(raw).hexdigest()==MANIFEST['sha256'],'UIR34-06 exact complete source'
 text=raw.decode()
 for at,old,new in reversed(MANIFEST['operations']):
  assert text[at:at+len(new)]==new,'UIR34-06 exact readonly display span'
  text=text[:at]+old+text[at+len(new):]
 assert hashlib.sha256(text.encode()).hexdigest()==MANIFEST['beforeSHA256'],'UIR34-06 original inverse'
 return text.encode()
def validate_uir3406(root):
 root=Path(root).resolve()
 def local(n):
  p=root/n;assert p.is_file() and not p.is_symlink() and p.resolve().is_relative_to(root),'UIR34-06 local source';return p
 if not(root/LEDGER).exists():
  assert b'character-folio'not in local(MANIFEST['path']).read_bytes(),'UIR34-06 unrecorded view'
  return set(),0
 canonical=lambda x:json.dumps(x,sort_keys=True,separators=(',',':'),ensure_ascii=False)
 assert canonical(json.loads(local(LEDGER).read_text()))==canonical(MANIFEST),'UIR34-06 immutable typed scope'
 raw=local(MANIFEST['path']).read_bytes();old=local(MANIFEST['before']).read_bytes();assert len(old)==MANIFEST['beforeBytes'] and hashlib.sha256(old).hexdigest()==MANIFEST['beforeSHA256'],'UIR34-06 original preserved';assert prior_uir3406_bytes(raw)==old,'UIR34-06 whole original component'
 delta=len(raw)-len(old);assert delta<=6000,'UIR34-06 added native cap'
 for n,h in MANIFEST['unchanged'].items():assert hashlib.sha256(local(n).read_bytes()).hexdigest()==h,'UIR34-06 original writing controls clocks and stage'
 for n in MANIFEST['sourceReferences']:local(n)
 return{LEDGER,MANIFEST['path'],MANIFEST['before'],*MANIFEST['unchanged'],*MANIFEST['sourceReferences']},delta
