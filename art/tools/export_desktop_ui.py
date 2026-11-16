"""Verify deterministic export against the recorded desktop original; never edit it."""
from pathlib import Path
import hashlib,json,subprocess,tempfile
ROOT=Path(__file__).resolve().parents[2]
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
if __name__=='__main__':
    m=json.loads((ROOT/'art/redesign/desktop-ui-manifest.json').read_text())
    for row in m['assets']:
        source=ROOT/row['source']['path'];assert digest(source)==row['source']['sha256']
        receipt=json.loads((ROOT/row['receipt']['path']).read_text())
        with tempfile.TemporaryDirectory(prefix='chenyuan-desktop-export-')as folder:
            output=Path(folder)/'encoded.webp';command=receipt['encoding']
            subprocess.run([command[0],'-quiet',*command[1:],str(source),'-o',str(output)],check=True)
            assert output.stat().st_size==row['runtime']['bytes'] and digest(output)==row['runtime']['sha256'],'Encoder output differs from selected runtime'
        assert digest(source)==row['source']['sha256']
    print('Desktop original preserved; deterministic runtime export matches the recorded hash.')
