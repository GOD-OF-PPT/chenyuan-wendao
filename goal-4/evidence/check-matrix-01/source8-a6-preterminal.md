# source8 A6首读诊断（整轮未收终态）

首失败是begin中的training-countdown硬等12.0秒，不是完成后closure。call@34802从t1514140.452到1522147.018用原8秒，首次已11.9，然后11.8/11.6/.../4.1正常递减。trace 0089c7b3bfecd2e32d847cea4715d2a19096cd7e2d52d1c8bf91abc667a6b773。原确认click返回后约103.19ms才开始这一expect，真实时钟不会为测试回到12.0。

原生快照已受理version7 END，startedAt1792833002052/dueAt1792833014052相差12000，completed0/running/generation0；当前失败上下文仍留道传承运行，剩1.7秒/局部2/12秒。正式完整Game/回执/首次写、局部closure以及新StageFocus最终交接都尚未到验证点；不推断未观察的teardown后是否提交，也不叫保存失败或flaky。source5同名原通过与当前相同spec保留历史，不覆盖当前红。

最小测试前提方案：仅begin加native opt-in，现三real visit/response/ending调用true；默认virtual仍精确总秒。native实际running generation及0<first<=total，随后原真实递减、commit.wall>=dueAt/全Game/唯一回执/原费用/60-8-15全部保。不是等碰到瞬间12.0，不加sleep/推钟/时限/skip；必要只读记录首观察文本与周期身份。

本轮仅新evidence；675/spec/production不改、不跑。等根完整415终态/raw/post归档并授写权后才补最小diff和当前三real复验。原失败、未走到的断言和最终逐声明映射保持区分。
