const p=(file,title)=>({suite:'persistence',file,title});
const u=(file,title)=>({suite:'ui',file,title});
const row=(id,requirement,evidence)=>({id,requirement,evidence});
/** Reviewed source assertions, not proof of execution. check-recovery-coverage binds actual reports. */
export const recoveryMatrix=[
 row('FR01','same-ID retries, altered payloads and real double clicks never duplicate cost or rewards',[
  p('recovery.spec.ts','two connections commit one copy of the same command despite reordered fields'),
  p('recovery.spec.ts','new-run and import retries are idempotent and altered payloads reject'),
  u('game.spec.ts','double click only commits once while busy')]),
 row('FR02','committed results lost before delivery can be reconciled without replaying mutations',[
  p('fault-matrix.spec.ts','postcommit breakthrough delivery loss retries the original receipt without duplicate cost or rewinding newer progress'),
  ...['create','import','restore'].map(kind=>p('fault-matrix.spec.ts',`postcommit ${kind} delivery loss retains one replacement identity and a retry never repeats its control write`)),
  p('fault-matrix.spec.ts','postcommit ending delivery loss reloads the actual sealed life and never offers a second ending reward'),
  p('fault-matrix.spec.ts','an uncertain committed command cannot retry over a replacement run from another connection')]),
 row('FR03','replacement CREATE/IMPORT failure rolls every record back and a stable retry replaces once',[
  ...['create','import'].flatMap(kind=>['quota','abort'].map(mode=>p('fault-matrix.spec.ts',`${kind} replacement ${mode} retains every old record and a stable retry replaces exactly once`)))]),
 row('FR04','stale revisions and replaced run identities cannot overwrite newer progress',[
  p('recovery.spec.ts','competing actions and competing new runs reject stale intents rather than overwrite'),
  p('recovery.spec.ts','stale/cross-run restore and commands cannot overwrite another tab progress'),
  u('game.spec.ts','stale tab cannot overwrite a newer state'),
  ...['action','restart'].map(change=>u('import-reading.spec.ts',`a late file read cannot replace a newer ${change} on the same page`)),
  u('import-reading.spec.ts','a later selected file owns the import even when the first file finishes last'),
  u('import-reading.spec.ts','a file selected on an empty welcome screen cannot overwrite a subsequently created Game'),
  u('import-reading.spec.ts','a delayed typed demo import cannot undo a newer scoped node reset or create normal data')]),
 row('FR05','malformed action and control receipts are rejected without rerunning an intent',[
  p('recovery.spec.ts','corrupt receipts including null and stored undefined never become new executable intentions'),
  p('recovery.spec.ts','bad control receipts reject without rerunning a new-game operation')]),
 row('FR06','put success followed by abort is not transaction success',[
  p('repository.spec.ts','transaction abort after put success cannot publish a successful action'),
  p('trial-entry.spec.ts','put success is insufficient: transaction abort leaves all entry records untouched'),
  u('game.spec.ts','transaction abort does not publish or save success')]),
 row('FR07','receipt/state/checkpoint quota errors preserve old records and never publish saved success',[
  p('repository.spec.ts','receipt write failure rolls back breakthrough consumption, state and checkpoint together'),
  p('trial-entry.spec.ts','checkpoint, owner and receipt write failures roll the entire entry back without replacing the prior good checkpoint'),
  u('cutover.spec.ts','failed write remains visibly unsaved after reread and original intent retry commits once')]),
 row('FR08','bad JSON, negative resources, unknown IDs and future schema/content cannot replace a good save',[
  p('repository.spec.ts','bad imports and stale replacement tokens preserve current state and receipt records'),
  p('fault-matrix.spec.ts','negative resources, unknown IDs and future schemas leave every good record and the active import UI intact'),
  u('game.spec.ts','bad import never overwrites the current state'),
  u('import-reading.spec.ts','unreadable file errors stay in the import UI and preserve the saved Game'),
  u('pending-inspection.spec.ts','imported name and journal markup remain inert text with no script or resource execution')]),
 row('FR09','known M1/Adventure/full migrations preserve lawful current, previous and checkpoint facts',[
  p('repository.spec.ts','plain M1 state migrates without inventing a school or losing the opening choice'),
  p('repository.spec.ts','actual legacy repository releases its connection on version change and cannot overwrite the migrated run'),
  p('repository.spec.ts','existing full v1 content, previous snapshot and checkpoint migrate atomically with raw backups'),
  ...['opening','battle','foundation'].map(stage=>u('cutover.spec.ts',`production page migrates a real legacy ${stage} save without resetting progress`))]),
 row('FR10','upgrade failure and blocked/old clients never adopt or overwrite the wrong authority',[
  p('repository.spec.ts','quota failure during upgrade rolls back schema/data and a later retry migrates once'),
  p('repository.spec.ts','a blocked open that already rejected never migrates later after the blocker closes'),
  p('recovery.spec.ts','v2 to v3 upgrades the authoritative full state instead of replaying preserved v1 progress'),
  p('recovery.spec.ts','failed v2 scope migration leaves database version and all original records at v2'),
  u('cutover.spec.ts','live database version change disables stale writes and provides a reload path')]),
 row('FR11','non-temple events and unfinished battles import and reload their real context',[
  p('repository.spec.ts','imports reidentify the actual NPC event and preserve an unfinished battle'),
  u('cutover.spec.ts','imported non-temple event refreshes and resolves through its real option'),
  u('game.spec.ts','opening and battle survive reload without reroll'),
  ...['opening','event','battle'].map(phase=>u('pending-inspection.spec.ts',`a pending ${phase} permits readonly inventory and relationships then resumes the exact state`)),
  u('pending-inspection.spec.ts','starting an event from relationships exposes its choices and keeps them available while reading people')]),
 row('FR12','question, gate transitions and committed rounds reopen without rerolls or duplicate settlement',[
  p('trial-journey.spec.ts','both schools preserve the whole question, every battle and three gate transitions across reopening and stable replays'),
  p('trial-journey.spec.ts','question and each gate roll back quota and put-success abort without changing progress, receipt or preparation'),
  ...['sword/accept','talisman/release'].map(route=>u('trial-journey.spec.ts',`${route}: normal new game crosses all gates with exact resources and resumes every stage and round`))]),
 row('FR13','ordinary and twice-failed trial checkpoints restore complete budgets without accumulating items',[
  p('recovery.spec.ts','ordinary checkpoint stays reusable across restores and rewinds the complete budget'),
  p('trial-journey.spec.ts','two real lethal thunder failures can reopen, explain consumed items and restore the same full preparation'),
  u('trial-journey.spec.ts','two actual lethal failures retain exact consumption across reload and restore the whole preparation on mobile')]),
 row('FR14','missing, foreign or malformed checkpoint purpose/version/ownership is never fabricated',[
  p('recovery.spec.ts','bad checkpoint purpose, version or ownership rejects without changing any good record'),
  p('repository.spec.ts','an orphaned full checkpoint or previous snapshot is never mistaken for a new empty run'),
  p('recovery.spec.ts','a foreign checkpoint without scope or migration proof is not adopted during reopening'),
  u('trial-journey.spec.ts','an imported battle resumes its actual gate, then withdrawal has no invented cumulative consumption or checkpoint')]),
 row('FR15','restore failures/races and cancelled retries cannot partially rewind or cross action ownership',[
  p('recovery.spec.ts','restore abort and quota failures retain state, previous, checkpoint, ownership and receipts'),
  p('recovery.spec.ts','a restore racing a live action commits exactly one intent across connections'),
  u('trial-journey.spec.ts','failed complete restore can be cancelled or retried without partial state or a second restore'),
  u('trial-journey.spec.ts','a fixed restore cannot rewind another tab turn or its replacement life')]),
 row('FR16','lifespan and both ending confirmations settle once and preserve cancellation/restore boundaries',[
  p('life-record.spec.ts','actual last-month progress ends once, abort rolls back, and two restores recover the complete real preparation'),
  ...['transmit','depart'].map(ending=>u('ascension.spec.ts',`${ending}: failed closing keeps the completed gates and cancellation discards only its own retry`)),
  u('ascension.spec.ts','two live ending reviews cannot choose twice or end a replacement life')]),
 row('FR17','denied/future storage disables unsafe writes and raw backup never creates or migrates missing data',[
  p('recovery.spec.ts','invalid writes reject through promises and storage denial never falls back to memory'),
  p('recovery.spec.ts','raw backup reads failed and future databases without migration, and missing databases stay missing'),
  u('cutover.spec.ts','unreadable future database disables new-game writes but offers a readonly original backup'),
  u('local-experience.spec.ts','main save-open errors are recorded with a safe code while excluding native error text')]),
 row('FR18','export/site-data-clear/import restores every Game field with fresh identity and honest missing checkpoint',[
  u('site-recovery.spec.ts','export then clear all owned site data and import restores the complete Game without inventing a checkpoint')]),
 row('FR19','local records/settings failure and clear/paused epochs cannot corrupt or relabel Game success',[
  p('local-experience.spec.ts','clear rotates the capture epoch and an old retry cannot erase or re-add newer records'),
  p('local-experience.spec.ts','a delayed export cannot republish a snapshot cleared after its read or download after a foreign clear'),
  p('local-experience.spec.ts','observer exceptions and mutable observer copies cannot change a committed Game or saved status'),
  u('local-experience.spec.ts','record quota failure keeps the real Game committed and offers a truthful memory-only export')]),
 row('FR20','presentation failure, elapsed real time and late callbacks do not execute or replay gameplay',[
  u('game.spec.ts','missing art cannot block the opening'),
  u('navigation.spec.ts','a completed travel cannot overwrite a newer tab choice while save metadata settles'),
  u('local-experience.spec.ts','reading, display choices and a day of real clock movement never grant resources or advance lifespan'),
  u('accessibility.spec.ts','a pending content skip never steals the focus from a newer settings choice after asynchronous startup'),
  u('guidance.spec.ts','guidance can be skipped and reviewed through keyboard help without changing the saved Game'),
  u('guidance.spec.ts','new-player guidance follows committed choices, materials and injury without granting resources'),
  u('guidance.spec.ts','gameplay help remains readable at four viewports and150 percent with a complete focus return'),
  u('pending-inspection.spec.ts','a newer inventory selection survives event commit metadata without stealing focus or changing the event')])
];
