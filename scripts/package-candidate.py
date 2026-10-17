"""Assemble an immutable candidate from actual same-source validation evidence."""
from pathlib import Path
import argparse
import hashlib
import importlib.util
import json
import os
import platform
import shutil
import stat
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
VERIFY = ROOT / 'scripts/candidate/verify.py'
spec = importlib.util.spec_from_file_location('candidate_integrity', VERIFY)
integrity = importlib.util.module_from_spec(spec)
spec.loader.exec_module(integrity)


def run(*args, cwd=ROOT):
    result = subprocess.run(args, cwd=cwd, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(str(args) + '\n' + result.stdout[-3000:] + result.stderr[-3000:])
    return result.stdout.strip()


def file_info(file, name):
    return {'path': name, 'bytes': file.stat().st_size, 'sha256': hashlib.sha256(file.read_bytes()).hexdigest()}


def source_bundle(destination, source):
    with tempfile.TemporaryDirectory(prefix='chenyuan-source-bundle-') as temp:
        repo = Path(temp) / 'source.git'
        run('git', 'init', '--bare', '--quiet', str(repo))
        objects = Path(run('git', 'rev-parse', '--git-path', 'objects'))
        if not objects.is_absolute():
            objects = ROOT / objects
        (repo / 'objects/info/alternates').write_text(str(objects.resolve()) + '\n')
        run('git', '--git-dir=' + str(repo), 'update-ref', 'refs/heads/candidate', source['source'])
        if source['head'] != source['source']:
            run('git', '--git-dir=' + str(repo), 'update-ref', 'refs/tags/build-checkout', source['head'])
        run('git', '--git-dir=' + str(repo), 'symbolic-ref', 'HEAD', 'refs/heads/candidate')
        run('git', '--git-dir=' + str(repo), '-c', 'pack.threads=1', '-c', 'pack.window=0', 'bundle', 'create', str(destination), '--all')
        run('git', '--git-dir=' + str(repo), 'bundle', 'verify', str(destination))
        audit = Path(temp) / 'audit.git'
        run('git', 'clone', '--bare', '--quiet', str(destination), str(audit))
        actual = set(run('git', '--git-dir=' + str(audit), 'cat-file', '--batch-all-objects', '--batch-check=%(objectname)').splitlines())
        expected = set(run('git', 'rev-list', '--objects', '--no-object-names', source['source'], source['head']).splitlines())
        if actual != expected:
            raise ValueError('Source bundle includes unselected or missing history objects')


def archive_tree(stage, filename):
    with zipfile.ZipFile(filename, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for file in sorted(stage.rglob('*')):
            if file.is_symlink():
                raise ValueError('Candidate source symlink')
            if file.is_file():
                info = zipfile.ZipInfo(file.relative_to(stage).as_posix(), (1980, 1, 1, 0, 0, 0))
                info.create_system = 3
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = (stat.S_IFREG | 0o644) << 16
                archive.writestr(info, file.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)


def package(browser_evidence, journeys, output):
    output = Path(output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='chenyuan-candidate-') as temp:
        temp = Path(temp)
        inputs_file = temp / 'inputs.json'
        print(run('node', '--experimental-strip-types', 'scripts/candidate-evidence.mjs', str(Path(browser_evidence).resolve()), str(Path(journeys).resolve()), str(inputs_file)), flush=True)
        inputs = json.loads(inputs_file.read_text())
        source = inputs['source']
        stage = temp / 'payload'
        stage.mkdir()
        shutil.copytree(ROOT / 'web/dist', stage / 'web')
        for file in inputs['files']:
            target = stage / integrity.safe_name(file['to'])
            target.parent.mkdir(parents=True, exist_ok=True)
            data = Path(file['from']).read_bytes()
            if len(data) != file['bytes'] or hashlib.sha256(data).hexdigest() != file['sha256']:
                raise ValueError('Evidence changed during packaging')
            target.write_bytes(data)
        source_bundle(stage / 'source.bundle', source)
        source_bundle(temp / 'second.bundle', source)
        if hashlib.sha256((stage / 'source.bundle').read_bytes()).digest() != hashlib.sha256((temp / 'second.bundle').read_bytes()).digest():
            raise ValueError('Selected source bundle is not repeatable in this environment')
        for name in ('serve.py', 'verify.py'):
            shutil.copy2(ROOT / 'scripts/candidate' / name, stage / name)
        versions = inputs['versions']
        (stage / 'README.md').write_text(f'''# 尘缘问道 · 工程候选包

源码提交 `{source['source']}`，源码树 `{source['tree']}`。数值未平衡；本包不是最终真人/展示验收。

## 本机运行

需要 Python 3.10+，在本目录执行 `python3 serve.py`，打开 http://127.0.0.1:8000/ 。只监听本机，网页不需要账号、API或联网模型。用HTTP运行，不用file://；Vite preview不是生产托管。

普通入口从正常新档开始；主菜单“演示节点”进入由正式指令回放生成的9个演示存档。每个演示运行版本/节点拥有独立进度、记录和显示设置；演示页有显式标记，可继续、重载并返回正常游戏。演示不是正常通关证据，不能直接把演示封装导入正常档。清理站点数据会丢本地进度，正常档请明确导出备份。

## 核验与源码复现

外部交付回执提供candidate.zip的SHA-256；`python3 verify.py candidate.zip`核对文件完整性。校验值不是发布者签名。

`git clone --branch candidate source.bundle source` 恢复完整选定源码及必要历史；进入source后使用Node≥22.16、npm与系统Git/tar/Python，执行README的锁定安装/验证命令。`npm --prefix web run build`自动重新回放生成合法演示节点。源码不含生成存档、node_modules、字体或个人数据。本机源码重建的网页/节点须与manifest.runtime逐文件校验；实际干净重建与包运行结果在外部交付回执中绑定同一归档SHA。

固定源码、构建环境及同一份原始验证输入的再次装配使用固定ZIP元数据，归档应同字节。新测试运行的UUID/时长等证据会不同；不声称不同OS/工具版本或新证据归档必然同字节。运行网页体积与包括源码/证据的归档体积分别计算。

## 版本与证据

Game/schema/content/balance：{json.dumps(versions, ensure_ascii=False)}。
锁、源码/构建环境、逐文件SHA、全部原始测试/性能记录和四尺寸代表截图见manifest、checksums及evidence/screenshots。规则与功能测试不等于平衡、趣味或美术认可；未执行范围见KNOWN_ISSUES。
''')
        (stage / 'SAVE_COMPATIBILITY.md').write_text('''# 存档与演示兼容

正式网页继续使用full Game外层2/schema2、content full-demo.3、balance full-unbalanced.3、数据库v3。已知M1/Adventure/full旧格式按已测迁移策略保留原件；未知/未来版本拒绝，失败不覆盖好档。新指令必须有commandId/runId/expectedRevision，事务complete后才成功。

正常Game导出不包含独立准备检查点，导入后不伪造CP。演示节点经过正式规则完整回放，载入隔离库时生成新人生身份；渡劫入场仍须实际确认，随后才有真正可重复恢复的完整准备检查点。

演示导出使用chenyuan-demo-save封装，只可载入当前候选版本/节点；正常导入拒绝该封装。手工修改/移除封装不属于演示流程，也不获得合法回放来源证明。各浏览器/端口/站点存储独立，不等于云档。
''')
        (stage / 'KNOWN_ISSUES.md').write_text('''# 已知限制与后续责任

数值未平衡；真人试玩、Safari/手机及辅助技术真机、最终展示/美术认可未执行。工程候选包与T24/CHECK-08最终总审、T25真人反馈分开；没有自动合并、公开部署或发Release。

历史高清美术原件仍有两组缺失；现生产素材来源/规格/发行许可边界见源码art清单，不新增授权或分发字体。WebKit自动化不等于Safari真机，模拟网络/CPU不等于公网或所有设备。

T22首次Firefox第8页创建中断未复现、根因未定；原trace与5次原场景/100次空白生命周期、最终复验记录保留。原生进程日志继续采集，不将未知归为已修复。IndexedDB事务检查不承诺所有硬件断电情形永久落盘。
''')
        inventory = [file_info(file, file.relative_to(stage).as_posix()) for file in sorted(stage.rglob('*')) if file.is_file()]
        manifest = {'format': 'chenyuan-candidate', 'version': 1, 'source': {'commit': source['source'], 'buildCommit': source['head'], 'tree': source['tree'], 'requiredHistory': ['d3f48ef7df6269133c2875d9b6ca035c0a30ca41'], 'runtimeDigest': inputs['build']['sourceDigest']}, 'versions': versions, 'tools': {'node': inputs['build']['source']['node'], 'npm': inputs['build']['source']['npm'], 'assemblyNode': source['node'], 'assemblyNpm': source['npm'], 'python': platform.python_version(), 'git': run('git', '--version'), 'platform': platform.system() + '/' + platform.machine()}, 'locks': inputs['build']['locks'], 'validation': inputs['summary'], 'runtime': {'files': inputs['build']['files'], 'bytes': inputs['build']['bytes']}, 'inventory': inventory}
        manifest_bytes = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()
        (stage / 'manifest.json').write_bytes(manifest_bytes)
        checks = {item['path']: item['sha256'] for item in inventory}
        checks['manifest.json'] = hashlib.sha256(manifest_bytes).hexdigest()
        (stage / 'checksums.sha256').write_text(''.join(checks[name] + '  ' + name + '\n' for name in sorted(checks)))
        first, second = temp / 'candidate.zip', temp / 'repeat.zip'
        archive_tree(stage, first)
        archive_tree(stage, second)
        if first.read_bytes() != second.read_bytes():
            raise ValueError('Fixed-input candidate archive is not reproducible')
        proof = integrity.verify_archive(first)
        candidate_id = source['source'][:12] + '-' + checks['manifest.json'][:12]
        dest = output / candidate_id
        if dest.exists():
            if not (dest / 'candidate.zip').is_file() or hashlib.sha256((dest / 'candidate.zip').read_bytes()).hexdigest() != proof['archiveSha256']:
                raise ValueError('Refusing to overwrite an existing candidate')
        else:
            dest.mkdir()
            shutil.copy2(first, dest / 'candidate.zip')
            integrity.verify_archive(dest / 'candidate.zip', dest / 'runtime')
        integrity.verify_directory(dest / 'runtime', dest / 'candidate.zip')
        record = {'format': 'chenyuan-candidate-assembly', 'version': 1, 'id': candidate_id, 'archive': 'candidate.zip', 'archiveSha256': proof['archiveSha256'], 'manifestSha256': checks['manifest.json'], 'source': manifest['source'], 'runtime': 'runtime', 'fixedInputArchiveReproduced': True, 'sourceBundleReproduced': True, 'ready': False, 'requires': ['clean-source-rebuild', 'packaged-browser-smoke']}
        (dest / 'candidate.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
        if os.environ.get('GITHUB_ENV'):
            with open(os.environ['GITHUB_ENV'], 'a') as env:
                env.write('CANDIDATE_DIRECTORY=' + str(dest / 'runtime') + '\nCANDIDATE_ARCHIVE=' + str(dest / 'candidate.zip') + '\nCANDIDATE_OUTPUT=' + str(dest) + '\n')
        print(json.dumps({**record, 'directory': str(dest), 'runtimeBytes': manifest['runtime']['bytes']}, ensure_ascii=False), flush=True)
        return dest


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--browsers', required=True)
    parser.add_argument('--journeys', required=True)
    parser.add_argument('--output', default='artifacts/candidates')
    args = parser.parse_args()
    package(args.browsers, args.journeys, args.output)
