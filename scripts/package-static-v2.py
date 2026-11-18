"""Build a new portable, offline standalone-game directory and ZIP."""
import hashlib
import json
from pathlib import Path
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def package(output):
    output = Path(output).resolve()
    archive = output.parent / (output.name + '.zip')
    if output.exists() or archive.exists():
        raise ValueError('Refusing to overwrite an existing static package')
    record = json.loads((ROOT / 'docs/third-party/dompurify.json').read_text())
    vendor = ROOT / record['path']
    if hashlib.sha256(vendor.read_bytes()).hexdigest() != record['sha256']:
        raise ValueError('Vendored sanitizer differs from its pinned upstream bytes')
    source_map = ROOT / record['sourceMap']['path']
    if hashlib.sha256(source_map.read_bytes()).hexdigest() != record['sourceMap']['sha256']:
        raise ValueError('Vendored source map differs from its pinned upstream bytes')
    folder = 'vendor/dompurify-3.4.18/'
    files = {
        'index.html': (ROOT / 'web/public/playable-v2.html').read_bytes(),
        folder + 'purify.min.js': vendor.read_bytes(),
        folder + 'purify.min.js.map': source_map.read_bytes(),
        folder + 'LICENSE.txt': (ROOT / record['licenseFile']).read_bytes(),
        folder + 'LICENSE-MPL.txt': (ROOT / record['additionalLicenseFile']).read_bytes(),
        'README.txt': ('尘缘问道：独立静态可玩包\n\n解压后保持index.html与vendor目录的相对位置，直接打开index.html，或将整个目录上传到任意静态网站子目录。\n无需包内后端、npm安装或外部CDN。不要只复制HTML；缺少安全组件时页面会停止启动并说明原因。\n\n游戏图片已内嵌。DOMPurify 3.4.18的上游许可随vendor目录分发，生成文件hash见manifest.json。\n').encode(),
    }
    manifest = {'format': 'chenyuan-offline-static-package', 'version': 1,
                'files': [{'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
                          for name, data in sorted(files.items())]}
    files['manifest.json'] = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()
    output.mkdir(parents=True)
    for name, data in files.items():
        target = output / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    with zipfile.ZipFile(archive, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as stream:
        for name, data in sorted(files.items()):
            entry = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o100644 << 16
            stream.writestr(entry, data, compresslevel=9)
    with zipfile.ZipFile(archive) as stream:
        if stream.testzip() is not None:
            raise ValueError('Static package CRC verification failed')
    return {'output': str(output), 'archive': str(archive), 'files': len(files),
            'bytes': archive.stat().st_size, 'sha256': hashlib.sha256(archive.read_bytes()).hexdigest()}


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Usage: python3 scripts/package-static-v2.py <new-output-directory>')
    print(json.dumps(package(sys.argv[1])))
