"""Pure image/provenance projections from Git, excluding UI source identities."""
from functools import lru_cache
import io
import json
from pathlib import Path
import subprocess

BASELINE = '691648a357e6ffb5cd431a029782cc366dd442b2'
ROOT = Path(__file__).resolve().parents[2]
IMAGE_FIELDS = {'path', 'exportedPath', 'id', 'sha256', 'bytes', 'dimensions', 'alpha', 'format', 'mode',
                'alphaProof', 'alphaBBox1', 'alphaBBox16', 'rgbaSHA256', 'originalHash', 'sourceType',
                'status', 'availability', 'inputAssets', 'sourceReference', 'generationReceipt', 'rights', 'visualReview'}
BUDGETS = {'maxRuntimeBytes', 'maxRuntimeBytesEach', 'maxRuntimeBytesPerAsset', 'maxRuntimeBytesTotal',
           'maxTotalRuntimeBytes', 'maxItemBytes', 'maxTotalBytes', 'maxSceneBytes', 'maxCharacterBytes',
           'maxEnemyBytes', 'maxPresentationBytes', 'maxCoverBytes', 'maxLeafBytes', 'candidateMaxBytes',
           'personRuntimeBytes', 'caseRuntimeBytes', 'maxRuntimeWidth', 'maxRuntimeHeight', 'runtimeWidth', 'runtimeHeight'}
COUNTS = {'assets', 'newAssets', 'newRasterAssets', 'maxNewRasterAssets', 'sceneMasters', 'stageVariants',
          'characters', 'enemies', 'presentationVariants', 'backgroundAssets'}
IMAGES = {'.png', '.webp', '.jpg', '.jpeg', '.svg'}
CODE = {'.vue', '.ts', '.css', '.py', '.mjs', '.js'}


def provenance(value):
    if isinstance(value, str):
        return value if Path(value.split('#')[0]).suffix not in CODE else None
    if isinstance(value, list):
        return [p for item in value if (p := provenance(item)) is not None]
    if isinstance(value, dict):
        if 'path' in value:
            return {key: value[key] for key in ('path', 'sha256', 'bytes') if key in value} if Path(value['path']).suffix not in CODE else None
        return value
    return value


def projection(value, budget=False):
    if isinstance(value, dict):
        exported = value.get('exportedPath')
        if isinstance(exported, str) and Path(exported).suffix not in IMAGES:
            return None
        image = (isinstance(exported, str) and Path(exported).suffix in IMAGES) or (
            isinstance(value.get('path'), str) and Path(value['path']).suffix in IMAGES and 'sha256' in value)
        if image:
            return {key: provenance(item) if key in {'sourceReference', 'rights', 'generationReceipt', 'visualReview'} else item
                    for key, item in value.items() if key in IMAGE_FIELDS}
        result = {}
        for key, item in value.items():
            if key in BUDGETS or (budget and key in COUNTS and type(item) is int):
                result[key] = item
            elif key in {'receipt', 'receipts', 'prompt', 'prompts', 'audit'}:
                if (entry := provenance(item)) is not None:
                    result[key] = entry
            elif isinstance(item, (dict, list)):
                entry = projection(item, key in {'budget', 'budgets'})
                if entry:
                    result[key] = entry
        return result or None
    if isinstance(value, list):
        return [p for item in value if (p := projection(item, budget))]
    return None


def contract(documents):
    result = {}
    for name, document in documents.items():
        # Producer receipts/audits/exports are immutable artifact data, not the
        # current producer program or UI source. Other ledgers use a projection.
        pure = name.startswith('art/production/') or '/receipts/' in name or name.endswith(('export-facts.json', 'asset-facts.json'))
        entry = document if pure else projection(document)
        if entry:
            result[name] = entry
    return result


@lru_cache(maxsize=1)
def original_contract():
    names = subprocess.check_output(['git', 'ls-tree', '-r', '-z', '--name-only', BASELINE, '--', 'art'], cwd=ROOT).decode('utf-8').split('\0')
    names = [name for name in names if name.endswith('.json')]
    requests = ''.join(BASELINE + ':' + name + '\n' for name in names).encode('utf-8')
    stream = io.BytesIO(subprocess.check_output(['git', 'cat-file', '--batch'], cwd=ROOT, input=requests))
    documents = {}
    for name in names:
        header = stream.readline().decode('ascii').split()
        assert len(header) == 3 and header[1] == 'blob', 'Missing frozen image contract: ' + name
        raw = stream.read(int(header[2]))
        assert stream.read(1) == b'\n', 'Invalid Git image contract stream'
        documents[name] = json.loads(raw)
    return contract(documents)
