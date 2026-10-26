"""Export ART10 originals without semantic edits or nonuniform scaling.

Uses Pillow only for this explicit producer, never as a new inventory-validator
dependency. The selected PNG and current finished-object reference stay intact.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
IDS = ('frost_sword', 'jade_seal', 'soul_lamp', 'cloud_mirror')
BASE = 'art/redesign/art10-relic-blanks'
FACTS = BASE + '/export-facts.json'
PRODUCER = 'art/tools/export_art10_blanks.py'
ENCODING = ['cwebp', '-q', '82', '-m', '6', '-alpha_q', '100',
            '-resize', '512', '512', '-metadata', 'none']
ALIGNMENT = dict(method='uniform-contain-alpha16-bottom-center', threshold=16,
                 resampling='Pillow BICUBIC inverse affine', width=512, height=512,
                 nonuniformScale=False, cropPaintedBody=False)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def identity(root, name):
    data = (root / name).read_bytes()
    return dict(path=name, bytes=len(data), sha256=digest(data))


def image_facts(root, name):
    from PIL import Image
    with Image.open(root / name) as opened:
        opened.load()
        original_mode = opened.mode
        image = opened.convert('RGBA')
    alpha = image.getchannel('A')
    histogram = alpha.histogram()
    row = identity(root, name)
    row.update(dimensions=dict(width=image.width, height=image.height),
               format='png' if name.endswith('.png') else 'webp', mode=original_mode,
               alpha=histogram[0] > 0 and sum(histogram[1:]) > 0,
               alphaProof=dict(transparentPixels=histogram[0], solidPixels=sum(histogram[250:]),
                               intermediatePixels=sum(histogram[1:250]),
                               min=alpha.getextrema()[0], max=alpha.getextrema()[1]),
               alphaBBox1=list(alpha.getbbox()),
               alphaBBox16=list(alpha.point(lambda n: 255 if n >= 16 else 0).getbbox()),
               rgbaSHA256=digest(image.tobytes()))
    return image, row


def placement(source, reference):
    raw, target = source['alphaBBox16'], reference['alphaBBox16']
    scale = min((target[2] - target[0]) / (raw[2] - raw[0]),
                (target[3] - target[1]) / (raw[3] - raw[1]))
    x = (target[0] + target[2]) / 2 - scale * (raw[0] + raw[2]) / 2
    y = target[3] - scale * raw[3]
    def projected(box):
        return [box[0] * scale + x, box[1] * scale + y,
                box[2] * scale + x, box[3] * scale + y]
    whole = projected(source['alphaBBox1'])
    assert min(whole) >= 0 and max(whole) <= 512, 'Whole painted source must fit; do not clip or stretch'
    return dict(scale=scale, translateX=x, translateY=y, targetAlphaBBox16=target,
                projectedAlphaBBox1=whole, projectedAlphaBBox16=projected(raw),
                wholePaintedSourceInside=True)


def produce(root, verify=False):
    from PIL import Image, __version__ as pillow_version
    root = root.resolve()
    encoder = subprocess.check_output(['cwebp', '-version'], text=True).strip()
    producer = identity(root, PRODUCER)
    rows = []
    for key in IDS:
        source = f'{BASE}/{key}-blank-v1.png'
        prompt = f'{BASE}/{key}-blank-v1-prompt.json'
        audit = f'{BASE}/receipts/{key}-blank-v1.json'
        ref_source = f'art/redesign/art03-objects/{key}-' + ('v2.png' if key == 'frost_sword' else 'v1.png')
        ref_runtime = f'web/public/art/v2/equipment/{key}-v1.webp'
        runtime = f'web/public/art/v2/equipment/{key}-blank-v1.webp'
        raw, source_row = image_facts(root, source)
        _, reference_row = image_facts(root, ref_runtime)
        assert raw.size == (1254, 1254) and source_row['mode'] == 'RGBA'
        prompt_data = json.loads((root / prompt).read_text())
        audit_data = json.loads((root / audit).read_text())
        assert prompt_data['reference'] == ref_source and prompt_data['transparent_background'] is True
        assert audit_data['copySHA256'] == audit_data['generatedSHA256'] == source_row['sha256']
        assert audit_data['promptSHA256'] == identity(root, prompt)['sha256']
        assert audit_data['referenceSHA256'] == identity(root, ref_source)['sha256']
        transform = placement(source_row, reference_row)
        scale, x, y = (transform[k] for k in ('scale', 'translateX', 'translateY'))
        # One exact scale on both axes; no independent rounded width/height resize.
        canvas = raw.transform((512, 512), Image.Transform.AFFINE,
                               (1 / scale, 0, -x / scale, 0, 1 / scale, -y / scale),
                               resample=Image.Resampling.BICUBIC)
        with tempfile.TemporaryDirectory(prefix='chenyuan-art10-export-') as folder:
            folder = Path(folder)
            aligned, first, second = folder / 'aligned.png', folder / 'first.webp', folder / 'second.webp'
            canvas.save(aligned, format='PNG')
            for output in (first, second):
                subprocess.run([ENCODING[0], '-quiet', *ENCODING[1:], str(aligned), '-o', str(output)], check=True)
            first_data, second_data = first.read_bytes(), second.read_bytes()
            assert first_data == second_data, 'Deterministic re-export differs'
            assert len(first_data) <= 160000, 'ART10 single runtime budget exceeded'
            destination = root / runtime
            if verify:
                assert destination.read_bytes() == first_data, 'Existing ART10 runtime does not reproduce'
            else:
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(first_data)
        _, runtime_row = image_facts(root, runtime)
        assert source_row == image_facts(root, source)[1], 'Source original changed'
        assert reference_row == image_facts(root, ref_runtime)[1], 'Current reference changed'
        assert runtime_row['dimensions'] == dict(width=512, height=512) and runtime_row['alpha']
        prompt_row = identity(root, prompt)
        prompt_row['literalSHA256'] = digest(prompt_data['prompt'].encode())
        transform['actualRuntimeAlphaBBox16'] = runtime_row['alphaBBox16']
        transform['alpha16ResidualToReference'] = [a - b for a, b in zip(runtime_row['alphaBBox16'], reference_row['alphaBBox16'])]
        rows.append(dict(id=key, source=source_row,
                         reference=dict(source=identity(root, ref_source), runtime=reference_row),
                         prompt=prompt_row, audit=identity(root, audit), runtime=runtime_row,
                         transform=transform,
                         exportProof=dict(firstBytes=len(first_data), firstSHA256=digest(first_data),
                                          secondBytes=len(second_data), secondSHA256=digest(second_data),
                                          bytesEqual=True, sourceUnchanged=True, referenceUnchanged=True),
                         visualAcceptance=False))
    assert sum(r['runtime']['bytes'] for r in rows) <= 640000
    record = dict(format='chenyuan-art10-export-facts', version=1, producer=producer,
                  decoder='Pillow', decoderVersion=pillow_version, encoderVersion=encoder,
                  encoding=ENCODING, alignment=ALIGNMENT, assets=rows,
                  scope='Actual decode/alpha/alignment/re-export facts; not pixel or user acceptance',
                  userAcceptance=False)
    if verify:
        assert json.loads((root / FACTS).read_text()) == record, 'Recorded export facts do not reproduce'
    else:
        (root / FACTS).write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
    return record


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify', action='store_true')
    args = parser.parse_args()
    facts = produce(ROOT, args.verify)
    print(json.dumps(dict(verified=args.verify, assets=[dict(id=r['id'], bytes=r['runtime']['bytes'],
          sha256=r['runtime']['sha256'], alphaBBox16=r['runtime']['alphaBBox16'],
          target=r['transform']['targetAlphaBBox16']) for r in facts['assets']],
          totalBytes=sum(r['runtime']['bytes'] for r in facts['assets'])), indent=2))
