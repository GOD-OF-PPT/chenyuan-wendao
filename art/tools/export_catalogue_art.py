"""Verify reproducible encoding without modifying the selected image originals."""
from pathlib import Path
import hashlib,json,subprocess,tempfile
ROOT=Path(__file__).resolve().parents[2]
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
if __name__=='__main__':
 m=json.loads((ROOT/'art/redesign/catalogue-art/manifest.json').read_text())
 for row in m['assets']:
  source=ROOT/row['source']['path'];assert digest(source)==row['source']['sha256']
  r=json.loads((ROOT/row['receipt']['path']).read_text())
  with tempfile.TemporaryDirectory(prefix='chenyuan-catalogue-export-')as folder:
   output=Path(folder)/'encoded.webp';command=r['encoding']
   subprocess.run([command[0],'-quiet',*command[1:],str(source),'-o',str(output)],check=True)
   assert output.stat().st_size==row['runtime']['bytes'] and digest(output)==row['runtime']['sha256']
  assert digest(source)==row['source']['sha256']
 print('Three original paintings preserved; deterministic WebP exports verified.')
