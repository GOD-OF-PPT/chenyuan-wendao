# Historical guard tests

The version inventory/old UI replacement verifier tests are archived in Git at
`691648a357e6ffb5cd431a029782cc366dd442b2`:

- `tests/idle-matrix-evidence.test.mjs`
- `tests/idle-trial-ui-replacements.test.mjs`
- Python source byte/inverse/budget guards and their full negative suite under
  `art/tools/` at that same revision.

Run `npm run test:historical` for the original 166 verifier cases plus the old
source/art positive gate. Add `-- --full` for the original complete Python suite.
The command creates/reuses an exact clean detached worktree under artifacts,
retains separate reports, and refuses to reset a dirty or different checkout.
It never labels historical success as current behavior coverage.

Current `npm test` keeps the rule, effect, image mapping, protocol and tool tests.
Current resource facts use `art/tools/current_assets.py`. Fixed desktop behavior
is checked through the native persistence suite and the quality UI profile.
Old failure records remain in their original Git history and Q01 artifacts.
