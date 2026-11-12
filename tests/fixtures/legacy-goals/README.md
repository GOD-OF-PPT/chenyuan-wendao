# Transitional historical test inputs

`inputs.zip` contains only the 348-file input closure still read by
the legacy inventory/art/evidence checks, extracted byte for byte from commit
`c7190e6` (the complete identity is in manifest.json). The manifest records each
Git blob, byte length and SHA-256; it also binds the archive. No test result has
been changed or promoted. Historical failed reports remain failed.

`npm test`, core validation, document checking and Playwright configuration
prepare these fixtures into ignored, generated `goal-*` paths for compatibility
with the old validators. Preparation is offline and independent of Git history,
idempotent, refuses links/conflicting files, and never replaces a player's file.
The archive is test data, not a runtime or production asset.

This is a bridge for Q01, not the intended permanent guard design. Q14 replaces
byte/ledger checks with behavior coverage and removes their now-unused inputs.
Do not add new process evidence or new validators to this archive.

The initial literal-reference scan found 344 files. A complete resource run also
reached four dynamically constructed UX27/UX29 before-source paths; these four
original inputs are included, with the same byte-for-byte Git provenance.
