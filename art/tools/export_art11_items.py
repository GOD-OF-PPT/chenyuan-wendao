"""Deterministically export independent ART11 originals, preserving every alpha pixel.

Pillow is used only by this explicit producer. Inventory validation keeps its
existing byte/header reader and does not acquire a Pillow dependency.
"""
import argparse
import json
from pathlib import Path
import subprocess
import tempfile
from export_art10_blanks import digest, identity, image_facts, ENCODING

ROOT = Path(__file__).resolve().parents[2]
IDS = ('herb', 'dew', 'core', 'jade', 'lotus', 'soul', 'dao', 'healing_pill',
       'spirit_pill', 'foundation_pill', 'golden_pill', 'nascent_pill',
       'spirit_seed', 'ascension_seal')
BASE = 'art/redesign/art11-items'
FACTS = BASE + '/export-facts.json'
PRODUCER = 'art/tools/export_art11_items.py'
HELPER = 'art/tools/export_art10_blanks.py'
ALIGNMENT = dict(method='uniform-contain-alpha1-margin32-bottom-center', threshold=1,
                 resampling='Pillow BICUBIC inverse affine', width=512, height=512,
                 margin=32, samplingGuard=2, nonuniformScale=False, cropPaintedBody=False)


def placement(source):
    box = source['alphaBBox1']
    lo, hi = ALIGNMENT['margin'] + ALIGNMENT['samplingGuard'], 512 - ALIGNMENT['margin'] - ALIGNMENT['samplingGuard']
    scale = min((hi-lo)/(box[2]-box[0]), (hi-lo)/(box[3]-box[1]))
    x, y = 256-scale*(box[0]+box[2])/2, hi-scale*box[3]
    def projected(value):
        return [value[0]*scale+x, value[1]*scale+y, value[2]*scale+x, value[3]*scale+y]
    return dict(scale=scale, translateX=x, translateY=y, targetBox=[lo,lo,hi,hi],
                projectedAlphaBBox1=projected(box), projectedAlphaBBox16=projected(source['alphaBBox16']),
                wholePaintedSourceInside=True)


def produce(root, verify=False, available=False):
    from PIL import Image, __version__ as pillow_version
    root = root.resolve()
    present = [key for key in IDS if all((root/path).is_file() for path in
               [f'{BASE}/{key}-v1.png', f'{BASE}/{key}-v1-prompt.json', f'{BASE}/receipts/{key}-v1.json'])]
    pending = [key for key in IDS if key not in present]
    if pending and not available:
        raise FileNotFoundError('ART11 originals/prompt/local audit pending: ' + ', '.join(pending))
    assert present, 'No actual ART11 painting is ready; no placeholders exported'
    rows = []
    encoder = subprocess.check_output(['cwebp', '-version'], text=True).strip()
    for key in present:
        source = f'{BASE}/{key}-v1.png'
        prompt = f'{BASE}/{key}-v1-prompt.json'
        audit = f'{BASE}/receipts/{key}-v1.json'
        runtime = f'web/public/art/v2/items/{key}-v1.webp'
        raw, source_row = image_facts(root, source)
        assert raw.size == (1254,1254) and source_row['mode'] == 'RGBA' and source_row['alpha'], 'Original is not the actual transparent RGBA painting'
        p = json.loads((root/prompt).read_text())
        a = json.loads((root/audit).read_text())
        assert p['id'] == a['id'] == key and p['builtin'] is True and p['transparentRequested'] is True
        assert type(p['prompt']) is str and p['prompt']
        assert a['kind'] == 'local imagegen audit not provider-signed receipt' and a['requestId'] is None and a['model'] is None
        assert a['workspaceRaw'] == source and a['rawSha256'] == source_row['sha256'] and a['originalKept'] is True
        assert a['generatedOriginal'] == p['generatedPath'] and a['generatedOriginal'].endswith('.png')
        assert a['dimensions'] == [raw.width,raw.height] and a['mode'] == 'RGBA'
        assert a['alphaExtrema'] == [source_row['alphaProof']['min'],source_row['alphaProof']['max']] and a['alpha16Bbox'] == source_row['alphaBBox16']
        generated = Path(a['generatedOriginal'])
        if generated.exists():
            assert digest(generated.read_bytes()) == source_row['sha256'], 'Workspace copy differs from preserved generated original'
        transform = placement(source_row)
        scale, x, y = (transform[name] for name in ('scale','translateX','translateY'))
        canvas = raw.transform((512,512), Image.Transform.AFFINE,
                               (1/scale,0,-x/scale,0,1/scale,-y/scale),
                               resample=Image.Resampling.BICUBIC)
        with tempfile.TemporaryDirectory(prefix='chenyuan-art11-export-') as folder:
            folder = Path(folder)
            aligned, first, second = folder/'aligned.png',folder/'first.webp',folder/'second.webp'
            canvas.save(aligned,format='PNG')
            for output in (first,second):
                subprocess.run([ENCODING[0],'-quiet',*ENCODING[1:],str(aligned),'-o',str(output)],check=True)
            first_data, second_data = first.read_bytes(),second.read_bytes()
            assert first_data == second_data, 'ART11 deterministic re-export differs'
            assert len(first_data) <= 120000, 'ART11 single runtime exceeds 120000 bytes'
            destination = root/runtime
            if verify:
                assert destination.read_bytes() == first_data, 'Existing ART11 runtime does not reproduce'
            else:
                destination.parent.mkdir(parents=True,exist_ok=True)
                destination.write_bytes(first_data)
        _, runtime_row = image_facts(root,runtime)
        assert image_facts(root,source)[1] == source_row, 'Original source changed'
        box = runtime_row['alphaBBox1']
        assert runtime_row['alpha'] and runtime_row['dimensions'] == dict(width=512,height=512)
        assert min(box[:2]) >= 32 and max(box[2:]) <= 480, 'Actual runtime alpha infringes the 32px margin'
        prompt_row = identity(root,prompt)
        prompt_row['literalSHA256'] = digest(p['prompt'].encode())
        transform['actualRuntimeAlphaBBox1'] = box
        transform['actualRuntimeAlphaBBox16'] = runtime_row['alphaBBox16']
        rows.append(dict(id=key,source=source_row,prompt=prompt_row,audit=identity(root,audit),
                         runtime=runtime_row,transform=transform,
                         exportProof=dict(firstBytes=len(first_data),firstSHA256=digest(first_data),
                                          secondBytes=len(second_data),secondSHA256=digest(second_data),
                                          bytesEqual=True,sourceUnchanged=True),visualAcceptance=False))
    assert sum(r['runtime']['bytes'] for r in rows) <= 1680000, 'ART11 total runtime budget exceeded'
    record = dict(format='chenyuan-art11-export-facts',version=1,producer=identity(root,PRODUCER),
                  helper=identity(root,HELPER),decoder='Pillow',decoderVersion=pillow_version,
                  encoderVersion=encoder,encoding=ENCODING,alignment=ALIGNMENT,
                  complete=not pending,pending=pending,assets=rows,
                  scope='Actual decode/alpha/whole-body alignment/double-export facts; not pixel or user acceptance',
                  userAcceptance=False)
    if verify:
        assert json.loads((root/FACTS).read_text()) == record, 'Recorded ART11 export facts do not reproduce'
    else:
        (root/FACTS).write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
    return record


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify',action='store_true')
    parser.add_argument('--available',action='store_true',help='Export actual ready assets only, recording incomplete/pending explicitly')
    args = parser.parse_args()
    record = produce(ROOT,args.verify,args.available)
    print(json.dumps(dict(verified=args.verify,complete=record['complete'],pending=record['pending'],
          assets=[dict(id=r['id'],bytes=r['runtime']['bytes'],sha256=r['runtime']['sha256'],
                       alphaBBox1=r['runtime']['alphaBBox1']) for r in record['assets']],
          totalBytes=sum(r['runtime']['bytes'] for r in record['assets'])),indent=2))
