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
        (repo / 'objects/info/alternates').write_text(objects.resolve().as_posix() + '\n', encoding='utf-8', newline='\n')
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


def write_candidate_notes(stage, source, versions):
    """Render reader-facing notes only; assembly/evidence/receipt gates stay in package()."""
    (stage / 'README.md').write_text(f'''# 尘缘问道 · 工程候选包

源码提交 `{source['source']}`，源码树 `{source['tree']}`。长期放置、有限安排、逐周期积累；数值未平衡。工程包、机器回执与真人/整体美术/长期平衡验收分开。

## 本机运行

需要 Python 3.10+，在本目录执行 `python3 serve.py`，打开 http://127.0.0.1:8000/ 。本机HTTP运行不依赖Pillow、npm、账号、API或联网模型，只监听本机；不用file://双击HTML，Vite preview不是生产托管。

玩家选择目标、方式和有限授权，游戏执行已确认的在线单周期；读秒结束后先原子保存，保存后才算真实成果。运行、暂停、保存失败与同意图重试各有状态。查看/阅读/预览不执行游戏行动；择法与功法/法宝配装是即时原子确认，不加假倒计时。不以快速突破、现实分钟奖励或自动连跳境界代替成长。欢迎页、设置和当前提示可打开玩法帮助。

普通入口从正常新档开始。主菜单“演示节点”的9个节点由正式指令回放生成，始终显式标记，按运行版本/节点隔离进度、记录和设置；可继续、重载并返回正常进度。演示不是正常通关证明，不能把演示封装直接导入正常档。不同浏览器、端口与站点存储独立；换试玩入口不迁移进度。清理数据会丢档，先通过游戏明确导出备份。

## 核验与源码复现

`python3 verify.py candidate.zip`核完整性，外部交付回执提供归档SHA-256；校验值不是发布者签名。只有assembly不等于ready或发布许可，局部本机试玩包不能冒正式候选。

`git clone --branch candidate source.bundle source`恢复选定源码及必要历史。进入source后要求Node≥22.16.0、npm、系统Git/tar/Python；源码校验的资源步骤还要求锁定的Pillow。先在仓库外准备校验环境，再按原门槛校验和构建：

```sh
python3 -m venv ../chenyuan-build-venv
. ../chenyuan-build-venv/bin/activate
python3 -m pip install -r art/requirements.txt
npm ci --ignore-scripts --no-audit --no-fund
node scripts/check_lock.mjs
npm --prefix web ci --ignore-scripts --no-audit --no-fund
npm run validate:core
npm --prefix web run build
```

不要在系统Python或仓库中安装临时包。运行网页只需标准库；Pillow属于源码校验工具。当前本地工具与CI环境以真实日志记录，不把安装成功说成多环境/性能已验。

固定源码、环境和同一原始验证输入装配使用固定ZIP元数据；新运行UUID/时长会不同，不保证跨环境或新证据归档同字节。重建载荷须与manifest.runtime逐文件核对；完整重建与解包浏览器证明由外部回执绑定本归档SHA。源码不含个人存档、密钥、node_modules或字体。

## 版本、历史与证据

Game/schema/content/balance：{json.dumps(versions, ensure_ascii=False)}。锁/工具/原始证据/逐文件SHA以本包manifest和checksums为准，旧报告不换成当前源码身份。

ENGINEERING_REVIEW.md是原Goal1 T24历史评审，不是当前放置版最终评审。它保留来源和原范围，机器回执也不替代新一轮最大C端/代码/安全评审。当前全部页面兼容与环境性能专项暂停；原正式候选仍要求完整三浏览器/布局/字号/正常路线/恢复/性能/解包门槛，未被删除或降低。当前暂停范围不能因运行本机包而自动恢复，后续须用户明确恢复后另行执行。

完整同源最终矩阵、正式候选、最大评审及真人/整体美术/长期平衡仍有独立责任；具体未完成项见KNOWN_ISSUES.md。已有局部测试、历史CI或演示节点不能代替它们。
''', encoding='utf-8', newline='\n')
    (stage / 'SAVE_COMPATIBILITY.md').write_text('''# 存档与隔离边界

正式full Game外层2/schema2、content full-demo.3、balance full-unbalanced.3，当前数据库v9。DB9的活动/检查点/回执同行原子保存；新指令严格核commandId/runId/expectedRevision及实际活动CAS。先原子提交再展示成功；原意图重试读取原回执，不能扩大授权、重复扣费或发奖。普通读页不改变Game或重建时钟。

已知旧格式按正式迁移合同保留原件，未知/未来版本拒绝，不覆盖好档。回滚不降级新数据库，也不以旧读取器强开DB9；保留原档与可读版本，先明确导出备份。不同来源的存储独立，不是云档，不自动搬档。

正常Game导出不包含独立准备检查点，导入后不伪造CP。演示经正式回放，载入隔离库时生成新人生身份；渡劫入场仍须确认，之后才有真正完整准备检查点。演示导出为chenyuan-demo-save封装，仅当前候选版本/节点可用，正常导入拒绝。手改/去封装不获得合法来源证明。

活动、暂停、恢复、失败和接管均按真实已保存身份处理；离线不自动补发收益或消耗寿元，旧回执不演成新奖励。具体周期来自实际安排，阅读不催促，突破/未知关键分支仍待玩家明确决定。事务检查不承诺所有硬件断电情形永久落盘。
''', encoding='utf-8', newline='\n')
    (stage / 'KNOWN_ISSUES.md').write_text('''# 已知限制与后续责任

数值未平衡。真人理解观察、整体美术与长期平衡仍待验收；历史“交互不清晰、画面效果不佳”的负面反馈不能由局部工程绿灯推翻。当前正式候选须逐项核完整同源UI/存储/正常路线/恢复/性能矩阵与解包运行，局部预览包/基线重建不是完整候选。原门槛保留，机器回执不代表发布许可；不自动合并、公开部署、改变权限或发Release。

当前全部页面兼容与环境性能专项暂停，包括跨浏览器、移动/响应式、分辨率、字号和环境性能矩阵。固定1440×900/font1单Chromium必要功能验证不算兼容验收。旧CI仍包含三浏览器和性能，当前不得push/dispatch触发；原core作业5分钟、旧矩阵规模/依赖和远端环境没有在本项实跑，补Pillow安装不等于CI已经通过。恢复这些专项需要用户明确决定，不删旧例或抬预算换ready。

保留J01 unknown、ART17原性能四红、ART28-OBS-01、COMPAT-OBS-1200-01、原始输入补录限制及所有历史失败/unknown；不能凭旧报告或一次绿色覆盖。原T22 Firefox第8页中断及旧本地高负载失败保留，各自证据和根因未知不改标签。最大C端/代码/安全评审仍待当前版本实际执行；ENGINEERING_REVIEW.md是历史来源，不是假定当前最终完成。

历史两组高清原件仍有缺失，当前素材按source.bundle内art/production、art/redesign与实际manifest.runtime逐项核；旧附表不代表当前全部美术覆盖，不分发字体、不新增发行许可。WebKit自动化不等于Safari真机，模拟网络/CPU不等于公网/所有设备，自动化不是真人复验。
''', encoding='utf-8', newline='\n')
    (stage / 'CHANGELOG.md').write_text('''# 当前放置版与历史边界

当前按长期积累、低频决定、阶段筹备组织25类行动。每段有限授权、真实逐周期读秒、保存后才展示成果；预算按累计实际支出，暂停/恢复/失败/接管及原意图重试保留。择法与功法/法宝配装采用即时原子确认，不强加周期或假读秒。突破仍须修为、物资和明确确认，流程可达不等于快速通关。查看、阅读和配置比较不暗中旅行/采购/开战，离线不凭经过时间补奖。

原full规则涵盖凡人至飞升、三开场/双修法/筹备来源、12功法/4法宝、人物因果、生平/归隐/寿尽、问心与结尾。八入口一屏、青黛墨绿舞台、逐玩法物件/反馈及失败恢复持续迭代；不宣称全部用户体验已通过。Game外层/内容/数值身份和实际DB9以源码为准，数值未平衡。

T23的9个正式回放演示节点、正常/演示隔离、完整选定历史bundle、固定输入装配、干净锁定重建和解包回执仍保。当前源依赖Vue3.5.44/Vite7.3.7及既有锁未因说明修改改变；Pillow12.3.0是已存在资源校验前置，非新增游戏依赖。

历史Goal1/Goal2美术、兼容和性能报告只证明各自原提交/范围，ENGINEERING_REVIEW.md是原T24记录。当前兼容与环境性能暂停；正式候选的原门槛/最终完整同源矩阵、最大评审和真人/整体美术/长期平衡责任不缩。实际源码/载荷/原始证据见manifest，未执行范围见KNOWN_ISSUES.md。
''', encoding='utf-8', newline='\n')
    (stage / 'PLAYTEST_FORM.md').write_text(f'''# 真人观察表 · 空白模板，尚未执行

源码提交 `{source['source']}`。没有参与者、观察数据或结论。建议约30分钟观察基本玩法理解，不规定到达任何境界，不按现实分钟发奖励。先征得记录同意，只用匿名编号，不收姓名、聊天全文或无关个人数据。

| 项目 | 待真实填写 |
| --- | --- |
| 匿名编号 / 题材经验 / 记录同意 | |
| 源码SHA / 正常新档或独立演示 / 浏览器来源 | |
| 起止时间与明确暂停 / 玩家自行目标 / 主持人提示或代操作 | |
| 当前活动、本段安排与有限预算/保留量是否能理解 | |
| 逐周期读秒 / 保存中、成果和原意图重试是否可区分 | |
| 首次找不到下一步 / 重复无信息点击 / 何时愿意回来调整 | |
| 材料用途 / 突破缺口 / 一次资源或配装/战策取舍的理由 | |
| 人物因果 / 继续玩的具体目标 / 画面与反馈感受 | |

约30分钟只观察实际积累和理解；没有进入战斗，可明确另开独立合法演示观察操作，标注演示段，它不是正常新档通关。不要用演示/脚本加物或快速走境界证明长期玩法。没有真实数据不判通过。

| 时点/游戏位置 | 真实观察或玩家原话 | 主持人提示 | 设计解释（与观察分栏） | 后续修复/复验责任 |
| --- | --- | --- | --- | --- |
| | | | | |

此空表、自动化日志、可达回放和生成截图都不是真人反馈或美术认可。真实用户复验与长期平衡另行完成，不能预填成功结论。
''', encoding='utf-8', newline='\n')


def package(browser_evidence, journeys, output):
    output = Path(output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='chenyuan-candidate-') as temp:
        temp = Path(temp)
        inputs_file = temp / 'inputs.json'
        print(run('node', '--experimental-strip-types', 'scripts/candidate-evidence.mjs', str(Path(browser_evidence).resolve()), str(Path(journeys).resolve()), str(inputs_file)), flush=True)
        inputs = json.loads(inputs_file.read_text(encoding='utf-8'))
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
        write_candidate_notes(stage, source, versions)
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
        panel_materials = ROOT / 'art/redesign/panel-materials.json'
        if panel_materials.exists():
            shutil.copy2(panel_materials, stage / 'panel-materials.json')
            shutil.copy2(ROOT / 'art/redesign/PANEL_MATERIALS_REVIEW.md', stage / 'PANEL_MATERIALS_REVIEW.md')
        immersive_ui = ROOT / 'art/redesign/immersive-ui.json'
        if immersive_ui.exists():
            shutil.copy2(immersive_ui, stage / 'immersive-ui.json')
            shutil.copy2(ROOT / 'docs/implementation/goal-2-global-theme-feedback.md', stage / 'IMMERSIVE_UI_REVIEW.md')
        action_feedback = ROOT / 'art/redesign/action-feedback.json'
        if action_feedback.exists():
            shutil.copy2(action_feedback, stage / 'action-feedback.json')
            shutil.copy2(ROOT / 'docs/implementation/goal-2-action-feedback.md', stage / 'ACTION_FEEDBACK_REVIEW.md')
        playable_flow = ROOT / 'art/redesign/playable-flow.json'
        if playable_flow.exists():
            shutil.copy2(playable_flow, stage / 'playable-flow.json')
            shutil.copy2(ROOT / 'docs/implementation/goal-2-playable-flow.md', stage / 'PLAYABLE_FLOW_REVIEW.md')
        story_journey = ROOT / 'art/redesign/story-journey.json'
        if story_journey.exists():
            shutil.copy2(story_journey, stage / 'story-journey.json')
            shutil.copy2(ROOT / 'docs/implementation/goal-2-story-journey.md', stage / 'STORY_JOURNEY_REVIEW.md')
        catalogue_art = ROOT / 'art/redesign/catalogue-art/manifest.json'
        if catalogue_art.exists():
            shutil.copy2(catalogue_art, stage / 'catalogue-art.json')
            shutil.copy2(ROOT / 'docs/implementation/goal-2-art-coverage.md', stage / 'CATALOGUE_ART_REVIEW.md')
        (stage / 'ASSET_SOURCES.md').write_text('''# 素材来源与许可边界

附带的asset-manifest.json逐项记录来源、原件/派生hash、规格、用途、状态及使用依据；其中路径指源码仓库位置，完整资料可从source.bundle恢复。网页运行资源位于web/art，生产文件hash另以本包manifest.runtime为准。原图、运行图与参考预览分开，不把预览放大伪称生产原件。

历史基线包含4场景/5肖像，40符号与4类表现为项目原生代码。若本包附有redesign-asset-manifest.json，则当前另有7个专属场景与登仙台2个门势阶段变体，来源和实际路径以该表及ART_REVIEW.md为准；完整原稿、提示词与回执从source.bundle恢复。若附有character-battle-manifest.json，则五人物、九敌方及洞府静修表现变体的新原稿/运行图与逐图来源由该表及CHARACTER_BATTLE_REVIEW.md记录，旧肖像历史保留。若附有desktop-ui-manifest.json，则静修动作卡透明插画的原稿、运行导出和工具回执由该表及DESKTOP_UI_REVIEW.md记录，文字/数值和动作仍由DOM与原有命令驱动。若附有single-screen-native.json，则单屏游戏主舞台新增原生样式的来源/预算和实际范围见该表及SINGLE_SCREEN_REVIEW.md；它不表示物资/剧情等全部长内容已经完成分页。若附有panel-materials.json，当前主舞台的宣纸/水墨原稿、编辑输入、运行派生、原生样式与提示词/回执见该表及PANEL_MATERIALS_REVIEW.md；不表示整体美术通过。若附有immersive-ui.json，则当前全局青黛墨绿主题、对话/进度只读交互与提示展开的原生代码范围/预算和实际验证见该表及IMMERSIVE_UI_REVIEW.md，未新增图像或改规则存档。若附有action-feedback.json，则逐动作原生交互/有界视觉效果与真实回执消费范围、预算/验证由该表及ACTION_FEEDBACK_REVIEW.md记录，不代表新增玩法或整体美术认可。若附有playable-flow.json，则主流程筹备、单屏目录/历练、行动耗时与真实读秒的代码/预算和验证由该表及PLAYABLE_FLOW_REVIEW.md记录，不表示已完成全部剧情长内容分页或用户验收。若附有story-journey.json，则剧情/人物/生平/渡劫的完整分页代码、预算及实际验证见该表和STORY_JOURNEY_REVIEW.md，不代表最终美术与用户验收。两组历史高清原件仍未取得可回读文件，相关historical/reported状态不当作当前存在。production表示项目内有据使用，不新增发行授权、开源许可证或用户最终美术认可。

若本包附有catalogue-art.json，则物资、丹炉、功法法宝及筹备的三份透明主题绘画、持续结果与状态舞台的代码范围和真实验证见该表及CATALOGUE_ART_REVIEW.md；数量、成本、读秒和结算仍由原Game与原子命令决定，不代表完整美术或游戏验收。

不分发本机字体；界面使用用户系统可用字体。无已授权音乐则不加入音乐。截图中字体像素不是字体文件；本候选不附个人存档/密钥/node_modules。发行许可与最终展示决定仍需用户依据现有权利确认，本包与CI不擅自授予新许可。
''', encoding='utf-8', newline='\n')
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
        (stage / 'checksums.sha256').write_text(''.join(checks[name] + '  ' + name + '\n' for name in sorted(checks)), encoding='utf-8', newline='\n')
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
        (dest / 'candidate.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
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
