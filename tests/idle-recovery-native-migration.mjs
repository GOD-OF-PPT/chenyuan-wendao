// Explicit semantic migration; old test bodies and failed raw reports remain preserved.
export const idleNativeMigration = {
  "format": "chenyuan-idle-native-migration",
  "version": 1,
  "legacyDeclarationCount": 82,
  "includedLegacyTests": [
    {
      "file": "ascension.spec.ts",
      "title": "both schools and endings atomically preserve facts, the trial checkpoint and exact replay identity"
    },
    {
      "file": "ascension.spec.ts",
      "title": "imported completed gates and finished lives never invent a preparation checkpoint or repeat rewards"
    },
    {
      "file": "ascension.spec.ts",
      "title": "quota and put-success abort keep completed gates and every stored record intact before a single closing retry"
    },
    {
      "file": "ascension.spec.ts",
      "title": "two competing connections can commit only one of the two successful conclusions"
    },
    {
      "file": "ascension.spec.ts",
      "title": "two complete endings restore the same full entry preparation and reject old-life closing commands"
    },
    {
      "file": "causal-migration.spec.ts",
      "title": "failure while committing the new content identity preserves the entire exact old source database for retry"
    },
    {
      "file": "causal-migration.spec.ts",
      "title": "later sword study commits ownership and payment together, retrying one intent only once"
    },
    {
      "file": "causal-migration.spec.ts",
      "title": "never-published content/balance cross pairs are refused without overwriting records"
    },
    {
      "file": "causal-migration.spec.ts",
      "title": "old pending events keep identity context while newly confirmed decisions use the new branch once"
    },
    {
      "file": "causal-migration.spec.ts",
      "title": "six exact old-source reunion choices migrate atomically with original receipts and usable repeated checkpoints"
    },
    {
      "file": "economy-migration.spec.ts",
      "title": "balance migration preserves snapshots and all raw receipts, creates a new run and is repeatable"
    },
    {
      "file": "economy-migration.spec.ts",
      "title": "quota failure while archiving a receipt aborts the whole balance migration, then retry works"
    },
    {
      "file": "economy-migration.spec.ts",
      "title": "unknown balance cannot migrate, mutate or discard the original"
    },
    {
      "file": "fault-matrix.spec.ts",
      "title": "an uncertain committed command cannot retry over a replacement run from another connection"
    },
    {
      "file": "fault-matrix.spec.ts",
      "title": "create replacement abort retains every old record and a stable retry replaces exactly once"
    },
    {
      "file": "fault-matrix.spec.ts",
      "title": "create replacement quota retains every old record and a stable retry replaces exactly once"
    },
    {
      "file": "fault-matrix.spec.ts",
      "title": "import replacement abort retains every old record and a stable retry replaces exactly once"
    },
    {
      "file": "fault-matrix.spec.ts",
      "title": "import replacement quota retains every old record and a stable retry replaces exactly once"
    },
    {
      "file": "fault-matrix.spec.ts",
      "title": "negative resources, unknown IDs and future schemas leave every good record and the active import UI intact"
    },
    {
      "file": "fault-matrix.spec.ts",
      "title": "postcommit breakthrough delivery loss retries the original receipt without duplicate cost or rewinding newer progress"
    },
    {
      "file": "fault-matrix.spec.ts",
      "title": "postcommit create delivery loss retains one replacement identity and a retry never repeats its control write"
    },
    {
      "file": "fault-matrix.spec.ts",
      "title": "postcommit ending delivery loss reloads the actual sealed life and never offers a second ending reward"
    },
    {
      "file": "fault-matrix.spec.ts",
      "title": "postcommit import delivery loss retains one replacement identity and a retry never repeats its control write"
    },
    {
      "file": "fault-matrix.spec.ts",
      "title": "postcommit restore delivery loss retains one replacement identity and a retry never repeats its control write"
    },
    {
      "file": "life-record.spec.ts",
      "title": "a derived life record is never imported as a Game save over existing progress"
    },
    {
      "file": "life-record.spec.ts",
      "title": "a reviewed ending command cannot retire a changed revision or a newly created life"
    },
    {
      "file": "life-record.spec.ts",
      "title": "ending inside a pending event is refused without a receipt or false saved ending"
    },
    {
      "file": "life-record.spec.ts",
      "title": "retirement state and receipt commit together, quota failure preserves the active life and one retry does not age it"
    },
    {
      "file": "recovery.spec.ts",
      "title": "T04 migrated checkpoints acquire verified scope once without changing the saved game"
    },
    {
      "file": "recovery.spec.ts",
      "title": "a foreign checkpoint without scope or migration proof is not adopted during reopening"
    },
    {
      "file": "recovery.spec.ts",
      "title": "bad control receipts reject without rerunning a new-game operation"
    },
    {
      "file": "recovery.spec.ts",
      "title": "corrupt receipts including null and stored undefined never become new executable intentions"
    },
    {
      "file": "recovery.spec.ts",
      "title": "failed v2 scope migration leaves database version and all original records at v2"
    },
    {
      "file": "recovery.spec.ts",
      "title": "invalid writes reject through promises and storage denial never falls back to memory"
    },
    {
      "file": "recovery.spec.ts",
      "title": "new-run and import retries are idempotent and altered payloads reject"
    },
    {
      "file": "recovery.spec.ts",
      "title": "quota during v2 scope upgrade rolls schema and ownership back and permits a clean retry"
    },
    {
      "file": "recovery.spec.ts",
      "title": "raw backup reads failed and future databases without migration, and missing databases stay missing"
    },
    {
      "file": "recovery.spec.ts",
      "title": "raw backup refuses unavailable enumeration without opening an absent database"
    },
    {
      "file": "recovery.spec.ts",
      "title": "raw export preserves an undefined entry explicitly and refuses lossy structured values"
    },
    {
      "file": "recovery.spec.ts",
      "title": "unknown v2 schema or empty full stores beside legacy progress never upgrade into a fresh run"
    },
    {
      "file": "recovery.spec.ts",
      "title": "v2 to v3 upgrades the authoritative full state instead of replaying preserved v1 progress"
    },
    {
      "file": "repository.spec.ts",
      "title": "a blocked open that already rejected never migrates later after the blocker closes"
    },
    {
      "file": "repository.spec.ts",
      "title": "actual legacy repository releases its connection on version change and cannot overwrite the migrated run"
    },
    {
      "file": "repository.spec.ts",
      "title": "an orphaned full checkpoint or previous snapshot is never mistaken for a new empty run"
    },
    {
      "file": "repository.spec.ts",
      "title": "bad imports and stale replacement tokens preserve current state and receipt records"
    },
    {
      "file": "repository.spec.ts",
      "title": "existing full v1 content, previous snapshot and checkpoint migrate atomically with raw backups"
    },
    {
      "file": "repository.spec.ts",
      "title": "fresh storage waits for explicit creation and survives close/reopen"
    },
    {
      "file": "repository.spec.ts",
      "title": "imports reidentify the actual NPC event and preserve an unfinished battle"
    },
    {
      "file": "repository.spec.ts",
      "title": "invalid and future legacy snapshots abort the entire database upgrade"
    },
    {
      "file": "repository.spec.ts",
      "title": "native IDB upgrades preserve nine real Adventure stages: help/sword"
    },
    {
      "file": "repository.spec.ts",
      "title": "native IDB upgrades preserve nine real Adventure stages: help/talisman"
    },
    {
      "file": "repository.spec.ts",
      "title": "native IDB upgrades preserve nine real Adventure stages: leave/sword"
    },
    {
      "file": "repository.spec.ts",
      "title": "native IDB upgrades preserve nine real Adventure stages: leave/talisman"
    },
    {
      "file": "repository.spec.ts",
      "title": "native IDB upgrades preserve nine real Adventure stages: trade/sword"
    },
    {
      "file": "repository.spec.ts",
      "title": "native IDB upgrades preserve nine real Adventure stages: trade/talisman"
    },
    {
      "file": "repository.spec.ts",
      "title": "newer database versions close stale repositories and remain intact when older code reopens"
    },
    {
      "file": "repository.spec.ts",
      "title": "plain M1 state migrates without inventing a school or losing the opening choice"
    },
    {
      "file": "repository.spec.ts",
      "title": "quota failure during upgrade rolls back schema/data and a later retry migrates once"
    },
    {
      "file": "repository.spec.ts",
      "title": "unknown full content and inconsistent checkpoint metadata never overwrite existing full records"
    },
    {
      "file": "trial-entry.spec.ts",
      "title": "entry preview identities lose races to another action or life replacement without consuming a seal"
    }
  ],
  "supersededLegacyTests": [
    {
      "file": "life-record.spec.ts",
      "title": "actual last-month progress ends once, abort rolls back, and two restores recover the complete real preparation",
      "replacementTitlePrefixes": [
        "M04-N9 ",
        "prepared selection captures stable Game",
        "all nine finite actions"
      ],
      "reason": "Explicit finite selection and full 12-second life closing replace instant END_LIFE/RETIRE; canonical review CAS and last-month restoration are checked separately."
    },
    {
      "file": "recovery.spec.ts",
      "title": "two connections commit one copy of the same command despite reordered fields",
      "replacementTitlePrefixes": [
        "M04-N13 "
      ],
      "reason": "The same original identity, full-budget, all-store rollback and race obligation is bound to current Activity/control APIs; new instant execute setup cannot reach this subject."
    },
    {
      "file": "recovery.spec.ts",
      "title": "competing actions and competing new runs reject stale intents rather than overwrite",
      "replacementTitlePrefixes": [
        "M04-N13 "
      ],
      "reason": "The same original identity, full-budget, all-store rollback and race obligation is bound to current Activity/control APIs; new instant execute setup cannot reach this subject."
    },
    {
      "file": "recovery.spec.ts",
      "title": "ordinary checkpoint stays reusable across restores and rewinds the complete budget",
      "replacementTitlePrefixes": [
        "M04-N4 "
      ],
      "reason": "The same original identity, full-budget, all-store rollback and race obligation is bound to current Activity/control APIs; new instant execute setup cannot reach this subject."
    },
    {
      "file": "recovery.spec.ts",
      "title": "two real trial failures can each restore their complete preparation and seal exactly once",
      "replacementTitlePrefixes": [
        "M04-N3 "
      ],
      "reason": "The same original identity, full-budget, all-store rollback and race obligation is bound to current Activity/control APIs; new instant execute setup cannot reach this subject."
    },
    {
      "file": "recovery.spec.ts",
      "title": "restore abort and quota failures retain state, previous, checkpoint, ownership and receipts",
      "replacementTitlePrefixes": [
        "M04-N4 "
      ],
      "reason": "The same original identity, full-budget, all-store rollback and race obligation is bound to current Activity/control APIs; new instant execute setup cannot reach this subject."
    },
    {
      "file": "recovery.spec.ts",
      "title": "stale/cross-run restore and commands cannot overwrite another tab progress",
      "replacementTitlePrefixes": [
        "M04-N5 "
      ],
      "reason": "The same original identity, full-budget, all-store rollback and race obligation is bound to current Activity/control APIs; new instant execute setup cannot reach this subject."
    },
    {
      "file": "recovery.spec.ts",
      "title": "bad checkpoint purpose, version or ownership rejects without changing any good record",
      "replacementTitlePrefixes": [
        "M04-N6 "
      ],
      "reason": "The same original identity, full-budget, all-store rollback and race obligation is bound to current Activity/control APIs; new instant execute setup cannot reach this subject."
    },
    {
      "file": "recovery.spec.ts",
      "title": "a restore racing a live action commits exactly one intent across connections",
      "replacementTitlePrefixes": [
        "M04-N14 "
      ],
      "reason": "The same original identity, full-budget, all-store rollback and race obligation is bound to current Activity/control APIs; new instant execute setup cannot reach this subject."
    },
    {
      "file": "repository.spec.ts",
      "title": "transaction abort after put success cannot publish a successful action",
      "replacementTitlePrefixes": [
        "checkpoint, owner, activity and receipt faults",
        "M04-N2 ",
        "M04-N4 "
      ],
      "reason": "Current complete-cycle atomic checkpoint/receipt and repeated-control tests preserve the old failure obligation; the instant new-action setup is obsolete."
    },
    {
      "file": "repository.spec.ts",
      "title": "receipt write failure rolls back breakthrough consumption, state and checkpoint together",
      "replacementTitlePrefixes": [
        "checkpoint, owner, activity and receipt faults",
        "M04-N2 ",
        "M04-N4 "
      ],
      "reason": "Current complete-cycle atomic checkpoint/receipt and repeated-control tests preserve the old failure obligation; the instant new-action setup is obsolete."
    },
    {
      "file": "repository.spec.ts",
      "title": "arguments are captured before asynchronous writes and committed retries return the original result with latest state",
      "replacementTitlePrefixes": [
        "M04-N15 "
      ],
      "reason": "Caller plan/mutation and cycle tick are mutated immediately after actual submission; the captured original full outcome and replay over later real travel are checked without replacing command identity."
    },
    {
      "file": "repository.spec.ts",
      "title": "full breakthroughs and trial questions/battles persist their complete preparing checkpoint",
      "replacementTitlePrefixes": [
        "all nine finite actions",
        "M04-N1 ",
        "M04-N2 "
      ],
      "reason": "Current complete-cycle atomic checkpoint/receipt and repeated-control tests preserve the old failure obligation; the instant new-action setup is obsolete."
    },
    {
      "file": "trial-entry.spec.ts",
      "title": "real entry atomically replaces a breakthrough checkpoint with the complete pre-consumption state and stable retry",
      "replacementTitlePrefixes": [
        "M04-N2 "
      ],
      "reason": "Actual START_TRIAL uses the fifteen-second Activity and full prior ordinary checkpoint, owner, activity and receipt transaction; old new execute writes are intentionally refused."
    },
    {
      "file": "trial-entry.spec.ts",
      "title": "checkpoint, owner and receipt write failures roll the entire entry back without replacing the prior good checkpoint",
      "replacementTitlePrefixes": [
        "M04-N2 "
      ],
      "reason": "Actual START_TRIAL uses the fifteen-second Activity and full prior ordinary checkpoint, owner, activity and receipt transaction; old new execute writes are intentionally refused."
    },
    {
      "file": "trial-entry.spec.ts",
      "title": "put success is insufficient: transaction abort leaves all entry records untouched",
      "replacementTitlePrefixes": [
        "M04-N2 "
      ],
      "reason": "Actual START_TRIAL uses the fifteen-second Activity and full prior ordinary checkpoint, owner, activity and receipt transaction; old new execute writes are intentionally refused."
    },
    {
      "file": "trial-entry.spec.ts",
      "title": "two real entries and complete restores never accumulate or partially return entry materials",
      "replacementTitlePrefixes": [
        "M04-N2 "
      ],
      "reason": "Actual START_TRIAL uses the fifteen-second Activity and full prior ordinary checkpoint, owner, activity and receipt transaction; old new execute writes are intentionally refused."
    },
    {
      "file": "trial-journey.spec.ts",
      "title": "both schools preserve the whole question, every battle and three gate transitions across reopening and stable replays",
      "replacementTitlePrefixes": [
        "M04-N1 ",
        "M04-N3 ",
        "M04-N8 ",
        "M04-N12 "
      ],
      "reason": "Question, three gates, lethal failures and imported no-checkpoint stages now use actual 6/3-second cycle commands and full stored proofs; current cases compare every Game and checkpoint."
    },
    {
      "file": "trial-journey.spec.ts",
      "title": "question and each gate roll back quota and put-success abort without changing progress, receipt or preparation",
      "replacementTitlePrefixes": [
        "M04-N1 ",
        "M04-N3 ",
        "M04-N8 ",
        "M04-N12 "
      ],
      "reason": "Question, three gates, lethal failures and imported no-checkpoint stages now use actual 6/3-second cycle commands and full stored proofs; current cases compare every Game and checkpoint."
    },
    {
      "file": "trial-journey.spec.ts",
      "title": "two real lethal thunder failures can reopen, explain consumed items and restore the same full preparation",
      "replacementTitlePrefixes": [
        "M04-N1 ",
        "M04-N3 ",
        "M04-N8 ",
        "M04-N12 "
      ],
      "reason": "Question, three gates, lethal failures and imported no-checkpoint stages now use actual 6/3-second cycle commands and full stored proofs; current cases compare every Game and checkpoint."
    },
    {
      "file": "trial-journey.spec.ts",
      "title": "a restore fixed before another connection turn is stale and its successful replay never rolls back later preparation",
      "replacementTitlePrefixes": [
        "M04-N1 ",
        "M04-N3 ",
        "M04-N8 ",
        "M04-N12 "
      ],
      "reason": "Question, three gates, lethal failures and imported no-checkpoint stages now use actual 6/3-second cycle commands and full stored proofs; current cases compare every Game and checkpoint."
    },
    {
      "file": "trial-journey.spec.ts",
      "title": "an imported ongoing trial has no invented checkpoint or total consumption after a real withdrawal",
      "replacementTitlePrefixes": [
        "M04-N1 ",
        "M04-N3 ",
        "M04-N8 ",
        "M04-N12 "
      ],
      "reason": "Question, three gates, lethal failures and imported no-checkpoint stages now use actual 6/3-second cycle commands and full stored proofs; current cases compare every Game and checkpoint."
    }
  ],
  "pageCompatibilityAccepted": false
};
