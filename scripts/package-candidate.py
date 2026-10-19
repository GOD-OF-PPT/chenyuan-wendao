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

欢迎页、设置和当前提示可打开玩法帮助；跳过/关闭仅影响本页显示，不改变成长。当前工程审查的源记录见ENGINEERING_REVIEW.md，其源码路径以source.bundle恢复后的仓库根为准；机器回执不代替工程、真人或展示审查。

普通入口从正常新档开始；主菜单“演示节点”进入由正式指令回放生成的9个演示存档。每个演示运行版本/节点拥有独立进度、记录和显示设置；演示页有显式标记，可继续、重载并返回正常游戏。演示不是正常通关证据，不能直接把演示封装导入正常档。清理站点数据会丢本地进度，正常档请明确导出备份。

## 核验与源码复现

外部交付回执提供candidate.zip的SHA-256；`python3 verify.py candidate.zip`核对文件完整性。校验值不是发布者签名。

`git clone --branch candidate source.bundle source` 恢复完整选定源码及必要历史；进入source后使用Node≥22.16、npm与系统Git/tar/Python，执行README的锁定安装/验证命令。`npm --prefix web run build`自动重新回放生成合法演示节点。源码不含生成存档、node_modules、字体或个人数据。本机源码重建的网页/节点须与manifest.runtime逐文件校验；实际干净重建与包运行结果在外部交付回执中绑定同一归档SHA。

固定源码、构建环境及同一份原始验证输入的再次装配使用固定ZIP元数据，归档应同字节。新测试运行的UUID/时长等证据会不同；不声称不同OS/工具版本或新证据归档必然同字节。运行网页体积与包括源码/证据的归档体积分别计算。

## 版本与证据

Game/schema/content/balance：{json.dumps(versions, ensure_ascii=False)}。
锁、源码/构建环境、逐文件SHA、全部原始测试/性能记录和四尺寸代表截图见manifest、checksums及screenshots。规则与功能测试不等于平衡、趣味或美术认可；未执行范围见KNOWN_ISSUES。
''')
        (stage / 'SAVE_COMPATIBILITY.md').write_text('''# 存档与演示兼容

正式网页继续使用full Game外层2/schema2、content full-demo.3、balance full-unbalanced.3、数据库v3。已知M1/Adventure/full旧格式按已测迁移策略保留原件；未知/未来版本拒绝，失败不覆盖好档。新指令必须有commandId/runId/expectedRevision，事务complete后才成功。

正常Game导出不包含独立准备检查点，导入后不伪造CP。演示节点经过正式规则完整回放，载入隔离库时生成新人生身份；渡劫入场仍须实际确认，随后才有真正可重复恢复的完整准备检查点。

演示导出使用chenyuan-demo-save封装，只可载入当前候选版本/节点；正常导入拒绝该封装。手工修改/移除封装不属于演示流程，也不获得合法回放来源证明。各浏览器/端口/站点存储独立，不等于云档。
''')
        (stage / 'KNOWN_ISSUES.md').write_text('''# 已知限制与后续责任

数值未平衡；当前候选尚未完成真人理解观察或最终美术复验，Safari/手机及辅助技术真机未执行。旧版已收到交互不清晰、画面效果不佳的真实负面验收，正按Goal2持续修缮；本候选的工程检查不能推翻该反馈或代表用户已认可。工程审查记录及其来源范围见ENGINEERING_REVIEW.md；机器构建/包测试回执与真人/展示验收分开，附带记录不构成人工签名；没有自动合并、公开部署或发Release。

历史高清美术原件仍有两组缺失；现生产素材来源/规格/发行许可边界见源码art清单，不新增授权或分发字体。WebKit自动化不等于Safari真机，模拟网络/CPU不等于公网或所有设备。

Goal2 T03独立CI按原预算通过；本机高负载下的冷启动/面板性能失败仍保留，全部原因尚未确定，T07继续在稳定本地环境复验。桌面后续流程与装饰细化由T04—T07接续，移动兼容最低优先级T08，最终候选和用户复验为T09/T10。

T22首次Firefox第8页创建中断未复现、根因未定；原trace与5次原场景/100次空白生命周期、最终复验记录保留。原生进程日志继续采集，不将未知归为已修复。IndexedDB事务检查不承诺所有硬件断电情形永久落盘。
''')
        (stage / 'CHANGELOG.md').write_text('''# 当前工程候选变更

本候选承接凡人至飞升的正式full规则、三开场/双修法/两筹备、12功法/4法宝、选择因果、生平/归隐/寿尽、问心三关与双结尾。原子存档、已知旧档迁移、重复回执/多标签/失败恢复，以及生产美术、四尺寸/字号/键盘、性能与本地记录均有独立版本证据。

此前T23新增9个正式指令回放演示节点、持续演示标记、正常与演示数据隔离、专用导入导出；构建/公开资源来源守卫、完整源码历史bundle、可复现装配、干净锁定重建和实际解包测试回执。普通游戏规则、数值、Game/schema/content/balance及依赖锁未因演示入口改写；数值仍未平衡。

T24修复文件读取期间的导入所有权和异常处理，补行为引导/帮助重看、未决行囊只读查看与仙缘遭遇/记录并列；提示保持简短，完整解释可重看。候选认证绑定当前全部UI/IDB用例清单。Vue精确更新3.5.44、Vite7.3.7及必需传递依赖；其余直接依赖与Game/数值/存档版本不变。详见ENGINEERING_REVIEW.md的具体证据与未执行范围。

Goal2 T02接入七个专属场景和登仙台门势画作；T03实际应用桌面目标稿基础框架、洞府静修与主行动卡，更新五人物及九敌方，战斗决策集中展示意图、状态、动作与结果。T04继续将可执行突破提升为主动作、收拢目标和功法目录、明确本机存档/失败重试及新建/继续入口，并接入同一玩家的透明静修插画。具体当前范围及未完成优化见ART_REVIEW.md、CHARACTER_BATTLE_REVIEW.md、DESKTOP_UI_REVIEW.md与独立素材清单。

历史源SHA、实际测试/产物/截图见manifest和evidence；候选交付不是公开Release或真人/展示验收。
''')
        (stage / 'PLAYTEST_FORM.md').write_text(f'''# 真人观察表 · 空白模板，尚未执行

源码提交 `{source['source']}`。本表没有参与者、观察数据或结论。建议约30分钟观察基础理解，不规定到达任何境界，也不按现实分钟发奖励。开始前征得记录同意，只用匿名编号，不收姓名、聊天全文或无关个人数据。

| 项目 | 待真实填写 |
| --- | --- |
| 匿名编号 / 是否熟悉题材 / 记录同意 | |
| 模式与节点：正常新档 / 独立演示 | |
| 试玩起止与明确暂停；当前源码SHA | |
| 玩家自行选择的目标；主持人提示/代操作 | |
| 首次找不到下一步的位置；无新信息重复点击 | |
| 一次战斗选择与玩家给出的理由 | |
| 记住的选择因果；继续玩的具体目标 | |

约30分钟时，原话记录：修为怎样获得、材料用途、当前突破缺口、一次资源取舍、两种战斗选择为何不同。没有进入战斗可从菜单给独立合法演示节点观察操作，但须标明演示段，不能算正常新档通关。研究中的样本比例不是已确认业务结论；没有数据不判通过。

| 时点/游戏位置 | 真实观察或玩家原话 | 主持人提示 | 设计解释（与观察分栏） | 后续修复/复验责任 |
| --- | --- | --- | --- | --- |
| | | | | |

实际反馈由T25承接。自动化日志、脚本可达、截图生成、此空表都不是真人反馈或美术认可。
''')
        shutil.copy2(ROOT / 'art/asset-manifest.json', stage / 'asset-manifest.json')
        redesign = ROOT / 'art/redesign/manifest.json'
        if redesign.exists():
            shutil.copy2(redesign, stage / 'redesign-asset-manifest.json')
            shutil.copy2(ROOT / 'art/redesign/REVIEW.md', stage / 'ART_REVIEW.md')
        character_battle = ROOT / 'art/redesign/character-battle-manifest.json'
        if character_battle.exists():
            shutil.copy2(character_battle, stage / 'character-battle-manifest.json')
            shutil.copy2(ROOT / 'art/redesign/CHARACTER_BATTLE_REVIEW.md', stage / 'CHARACTER_BATTLE_REVIEW.md')
        desktop_ui = ROOT / 'art/redesign/desktop-ui-manifest.json'
        if desktop_ui.exists():
            shutil.copy2(desktop_ui, stage / 'desktop-ui-manifest.json')
            shutil.copy2(ROOT / 'art/redesign/DESKTOP_UI_REVIEW.md', stage / 'DESKTOP_UI_REVIEW.md')
        single_screen = ROOT / 'art/redesign/single-screen-native.json'
        if single_screen.exists():
            shutil.copy2(single_screen, stage / 'single-screen-native.json')
            shutil.copy2(ROOT / 'art/redesign/SINGLE_SCREEN_REVIEW.md', stage / 'SINGLE_SCREEN_REVIEW.md')
        (stage / 'ASSET_SOURCES.md').write_text('''# 素材来源与许可边界

附带的asset-manifest.json逐项记录来源、原件/派生hash、规格、用途、状态及使用依据；其中路径指源码仓库位置，完整资料可从source.bundle恢复。网页运行资源位于web/art，生产文件hash另以本包manifest.runtime为准。原图、运行图与参考预览分开，不把预览放大伪称生产原件。

历史基线包含4场景/5肖像，40符号与4类表现为项目原生代码。若本包附有redesign-asset-manifest.json，则当前另有7个专属场景与登仙台2个门势阶段变体，来源和实际路径以该表及ART_REVIEW.md为准；完整原稿、提示词与回执从source.bundle恢复。若附有character-battle-manifest.json，则五人物、九敌方及洞府静修表现变体的新原稿/运行图与逐图来源由该表及CHARACTER_BATTLE_REVIEW.md记录，旧肖像历史保留。若附有desktop-ui-manifest.json，则静修动作卡透明插画的原稿、运行导出和工具回执由该表及DESKTOP_UI_REVIEW.md记录，文字/数值和动作仍由DOM与原有命令驱动。若附有single-screen-native.json，则单屏游戏主舞台新增原生样式的来源/预算和实际范围见该表及SINGLE_SCREEN_REVIEW.md；它不表示物资/剧情等全部长内容已经完成分页。两组历史高清原件仍未取得可回读文件，相关historical/reported状态不当作当前存在。production表示项目内有据使用，不新增发行授权、开源许可证或用户最终美术认可。

不分发本机字体；界面使用用户系统可用字体。无已授权音乐则不加入音乐。截图中字体像素不是字体文件；本候选不附个人存档/密钥/node_modules。发行许可与最终展示决定仍需用户依据现有权利确认，本包与CI不擅自授予新许可。
''')
        review_path = ROOT / 'docs/implementation/goal-1-final-review.md'
        shutil.copy2(review_path, stage / 'ENGINEERING_REVIEW.md')
        inventory = [file_info(file, file.relative_to(stage).as_posix()) for file in sorted(stage.rglob('*')) if file.is_file()]
        manifest = {'format': 'chenyuan-candidate', 'version': 1, 'source': {'commit': source['source'], 'buildCommit': source['head'], 'tree': source['tree'], 'requiredHistory': ['d3f48ef7df6269133c2875d9b6ca035c0a30ca41'], 'runtimeDigest': inputs['build']['sourceDigest']}, 'versions': versions, 'tools': {'node': inputs['build']['source']['node'], 'npm': inputs['build']['source']['npm'], 'assemblyNode': source['node'], 'assemblyNpm': source['npm'], 'python': platform.python_version(), 'git': run('git', '--version'), 'platform': platform.system() + '/' + platform.machine()}, 'locks': inputs['build']['locks'], 'validation': inputs['summary'], 'runtime': {'files': inputs['build']['files'], 'bytes': inputs['build']['bytes']}, 'inventory': inventory}
        review_entry = next(item for item in inventory if item['path'] == 'ENGINEERING_REVIEW.md')
        manifest['reviewRecord'] = {'path': review_entry['path'], 'sha256': review_entry['sha256'], 'scope': 'agent-engineering-review-record'}
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
