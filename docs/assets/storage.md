# 原稿的存储与取回

2026-11-17按用户要求，先将main的741355d完整推送至`codex/backup-main-before-size-reduction-20261117`，再将112份PNG制作原稿从当前跟踪树归档。原路径、Git blob、SHA-256与字节数完整保存在[归档索引](archived-sources.json)，运行WebP、许可/提示词/回执和既有图片校验保持原件。完整Git历史和备份分支不改写、不删除；这会减少当前检出跟踪内容，不代表远端物理空间或完整clone历史已经回收。实施与验证见[本轮记录](size-reduction-20261117.md)。

## 取回既有原稿

普通运行与构建不需要制作PNG。需要制作、图片解码或来源校验时执行：

```sh
npm run prepare:art
```

工具只从固定完整commit取出原字节，不访问网络，不接受分支浮动版本；逐项核对完整112项源树、blob、长度和SHA-256。缺少历史时先执行`git fetch origin codex/backup-main-before-size-reduction-20261117`。已存在的本地文件必须完全相同，否则明确失败且不覆盖；不接受软链接或越界路径。恢复出的原路径按精确清单忽略，不会自动跟踪或忽略其它新画作。

`npm test`、`npm run validate:core`和`python3 scripts/check_docs.py`会先取回再沿原断言校验，不跳过来源或重签hash。CI已有完整历史，因此无需新权限、额外外部存储或LFS上传。取回后本地美术目录会增大约242MB，但当前Git跟踪文件总量仍须严格小于100,000,000字节；门禁`python3 scripts/check-tracked-size.py`按索引逐路径计算，包含根文件和全部目录，不按重复blob去重。

## 未来原稿策略

[0168](../decisions/0168-future-large-original-storage.md)对未来新增/内容改动的LFS策略继续有效；上述归档是本轮对既有制作PNG的明确调整，不迁移或改写已发布Git历史。

## 存入新原稿

原始位图超过1MiB时，使用`art/large-originals/`及Git LFS；该阈值是项目决定。PNG/JPEG/WebP/TIFF/BMP的目录属性已配置，现有其它路径不受自动迁移。不要运行LFS history migration或filter-repo。

```sh
git lfs version
git lfs install --local
# 将已经核对来源与像素的原稿放到专用目录，再添加
git add art/large-originals/my-original.png
git show :art/large-originals/my-original.png
```

索引中应是LFS规范指针（version、SHA256 oid、原图size），工作区仍须是已取回的真实图片。把文件名改到LFS目录而没有安装filter、伪造小指针或只保hash都不能通过。

在[large-originals.json](large-originals.json)的`originals`为每份新原稿登记：`path/sha256/bytes/width/height/hasAlpha/alphaBBox/prompt/receipt/exportRecipe/exports`。路径均为仓库根相对路径，不得外逃或链接。`hasAlpha`为布尔，alphaBBox为实际alpha边界`[left,top,right,bottom]`或null；不得把未下载的指针当像素。prompt是非空制作提示词/手绘说明，receipt是含`sourceSha256/source/rights`的JSON，绑定原字节与实际制作/使用依据。来源记录不自动授予许可。

`exportRecipe`是声明式JSON，格式`chenyuan-image-export`、version1，包含原稿`source/sourceSha256`、实际`pillowVersion`和`outputs`。每个输出指定`path/width/height/lossless/quality/method`；目前只支持Pillow LANCZOS等比由制作者明确指定的尺寸、RGB或RGBA转WebP（不得放大）。宽高由制作者保持所需比例，工具不猜裁切或生成新细节。固定Pillow按[锁文件](../../art/requirements.txt)安装。检查会实际重做每个导出、逐字比较运行文件，不能拿一份刚写的新hash冒确定导出。

`exports`每项为`path/sha256/bytes/consumer`，运行路径须在`web/public/art/`。本门禁支持可直接核验的Vue模板接线：consumer为`web/src/*.vue`，实际模板用`img src="art/..."`，或导入原AssetImage组件后用其静态`path="art/..."`属性。Vue/TypeScript解析器检查真实语法，注释、正文、未使用字符串和静态false分支不算接线。其它动态资产注册方式仍可沿既有资产系统，但须另外补明确的实际消费验证，不把字符串记录塞进此清单冒通过。

此门禁证明来源、确定导出和上述模板接线；运行时是否可达/可见、真实场景截图及交互仍须功能PR的浏览器证据，不能用静态检查替代。生产只消费小型派生，LFS指针永远不能成为运行资源。当前资产/alpha/来源及原预算检查继续，不因存储策略放宽。

```sh
git add docs/assets/large-originals.json docs/assets/my-prompt.md docs/assets/my-receipt.json docs/assets/my-export.json
git add web/public/art/my-export.webp web/src/MyConsumer.vue
python3 scripts/check-large-originals.py --report artifacts/my-assets/storage.json
python3 scripts/check_docs.py
```

门禁读取实际索引（包括新文件），因此先核预期暂存集；未暂存的候选不属于该次存储检查。回报是新的文件，不覆盖旧失败。工具只读，不自动上传LFS对象、推送、改权限或提交。真正递交前按原任务授权核分支、暂存集、对象与远端接收结果；当前没有新大原稿需要上传。

## 干净检出与检查

```sh
git lfs install --local
git lfs pull
npm run validate:core
```

CI当前checkout启用LFS取回；未取回或被更改的原稿明确报错，不能降级为通过。历史基线对象也需完整Git历史，缺提交须正常fetch后再核，不改写历史或重签原件。

`scripts/check-large-originals.py`保固定Q19基线的旧大blob身份；新文件或同名换内容超过阈值必须走LFS。`scripts/test_large_originals.py`在临时Git仓库实际测试clean/smudge回环、坏指针、缺对象/来源/消费、同名改内容及伪造运行hash但不能重现导出的负例，不向真实仓库上传对象。

本轮新清单为空：没有新画作、正式LFS对象或远端上传/账单证据。可以证明策略和本地Git LFS回环，不能据此宣称远端LFS服务、网络、clone大小或物理回收已验收。一般页面兼容/环境性能、真人/长期和整体美术边界保持。

参考[GitHub LFS](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage)与[大文件](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)，只采用未来存储机制，不采用已发布历史移除步骤。
