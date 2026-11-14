# 0168：Q20 未来大原稿的存储

2026-11-14。质量综合第20项要求处理原稿体积。当前实查art跟踪591文件/244826862字节，102个超过1MiB；共同Git pack约530.05MiB是本机快照，不是远端物理占用。本项仅约束未来新增/改动的大原稿，不移动、删除或重写已发布历史，不以新指针宣称现有clone或远端已缩小。

新大原稿采用Git LFS；专用art/large-originals目录明确LFS属性。大于1MiB的新增或内容改变的原始位图不能直接入普通Git，放该目录并记录小型来源清单：原名、SHA256、字节、像素/alpha、提示词/回执、确定导出、实际运行派生/消费。现有原件以本次固定Git基线对象辨识，改了内容不能靠同文件名冒历史豁免。阈值是本项目初值，不是GitHub门槛。

规则检查读实际Git index/tree，对新增大blob拒绝并说明迁入LFS方式；指针须严格结构/oid/size且与可用原稿核同。缺对象、未下载或来源/导出/消费信息缺失要明确失败，不把约百字节指针当图片/校验成功。正常网页加载继续使用原预算内小型运行派生，禁止生产路径消费LFS指针；不把原稿直接塞进web/public。安装/CI说明补LFS前置及取回；检查只读，不自动上传、付费、删旧包或修改仓库设置。

本轮没有新艺术原稿，不为测试制造正式资源或上传LFS对象。用隔离临时Git仓库证明真实git-lfs clean/smudge/oid/字节回环，及新大普通blob、冒旧同名修改、坏指针、漏来源/消费等有意义负例；当前原件/运行派生逐字不变，构建和当前核心门禁实跑。工具故障不能靠跳过当通过。单独PR交Q19；最终全20项C端/代码/安全审查仍须闭合。

实读[GitHub LFS说明](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage)的指针、oid/size与外部对象关系，以及[大文件说明](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)区分普通Git和大对象。本项目不采用页面中的已发布历史移除步骤；政策不证明远端LFS上传可用、缓存策略或存储账单。兼容/环境性能暂停，真人/长期/整体美术和数值平衡仍独立。
