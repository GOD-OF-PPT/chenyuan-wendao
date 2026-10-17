#!/usr/bin/env python3
"""Check the uploaded documentation subset; not a game test or full archive check."""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
required = ["01_设计规格.md", "02_实施计划.md", "03_数据与状态契约.md", "04_验收清单.md", "05_成长与数值系统修订.md"]
for name in required:
    p = root / 'docs/v0.3' / name
    assert p.is_file() and len(p.read_text(encoding='utf-8')) > 100, name
for name in ['opening_event.json', 'growth_example.json']:
    data = json.loads((root / 'docs/v0.3/examples' / name).read_text(encoding='utf-8'))
    assert data['schemaVersion'] == 1
expected = {
    'art/approved/style-preview.webp': '8faa981152143910a591dc5d33ed08e90ebd634417eac8db4d0c4df1b701fbfc',
    'docs/v0.3/reference/approved_main_ui.webp': '8569f0463d3bdd3a5605e41059630bb0d5540c3a8c08effe48e176d0b7f7e030',
}
for name, sha in expected.items():
    assert hashlib.sha256((root / name).read_bytes()).hexdigest() == sha, name
print('PASS: 5 core documents, 2 JSON examples, 2 preview checksums.')
print('NOT CHECKED: original PNG files, full v0.2 archive, game code, gameplay or balance.')

subprocess.run([sys.executable, str(root / "art/tools/check_inventory.py"), "--root", str(root)], check=True)
