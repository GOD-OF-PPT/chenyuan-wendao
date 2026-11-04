"""UX33 exact display projection; old proofs, callbacks, styles and budgets remain owned."""
import hashlib,json,re
from pathlib import Path
LEDGER='art/redesign/ux33.json'
FACTS={'App.vue': {'before': '8487968f775888aed0529e5db8a4a64bb679ff42c93d5e600137b206e6d2ba5e',
             'after': 'ab88622cb1e5e80b504ae21ad19c9562183a16de6825fd66147259cf8107679c',
             'bytes': 159582,
             'beforeBytes': 159508,
             'baseline': 'goal-4/evidence/ux33/App.vue.before.txt'},
 'TrainingActivity.vue': {'before': '5d9d38b60aed8e2cbcb151dd99046dcdc420caff6f844ae679cd3888896e5565',
                          'after': 'cf52d3aa3d5063585ac52dd4b0eb1ff8afc46d088c911ed6b5939ce6601e544c',
                          'bytes': 7716,
                          'beforeBytes': 7573,
                          'baseline': 'goal-4/evidence/ux33/TrainingActivity.vue.before.txt'},
 'activity-view.ts': {'before': '8d08ccebf604e2e1d0285045a30bce54b86eaf71e80d1a31529fa8a46e52ace9',
                      'after': '020a7580936a2019a78e766cb3c1c3863666c48fe4e3707a6b60b8abd74cd5a3',
                      'bytes': 4747,
                      'beforeBytes': 3891,
                      'baseline': 'goal-4/evidence/ux33/activity-view.ts.before.txt'},
 'MarketPlanner.vue': {'before': 'e015c642208184c806464b976f450b3dcca74c6d78c17db42312d7ba7a26b588',
                       'after': 'dd07092b9c8d858181eb5c7b65976532adc6e8efdbc8c3b3c8e5b66acfee4d72',
                       'bytes': 12494,
                       'beforeBytes': 12469,
                       'baseline': 'goal-4/evidence/ux33/MarketPlanner.vue.before.txt'},
 'LearningPlanner.vue': {'before': 'a9202d043c1ba1875a9c7706b7c80bf071667afd966081e7ac203b57c5763a78',
                         'after': '4b8bf6d3980792cd9e5f025a5f3738b90f9b9146480d8d270612192ce39c3756',
                         'bytes': 18553,
                         'beforeBytes': 18625,
                         'baseline': 'goal-4/evidence/ux33/LearningPlanner.vue.before.txt'},
 'RecoveryPlanner.vue': {'before': '3bce24833d9cbf3ecc3d0733520ff4d9e6fafc869ec24d6d526ba33aaa61cb1b',
                         'after': '91acc6f6ef5921ae04749c53d34a6870e840b2664d1a5bc1b48477d4bf7d37cc',
                         'bytes': 8586,
                         'beforeBytes': 8552,
                         'baseline': 'goal-4/evidence/ux33/RecoveryPlanner.vue.before.txt'},
 'MarketCounter.vue': {'before': 'bcde3e3c643a29868995d52a197e6e1553b37745771866bd9e3a69b04f0d780e',
                       'after': '0904ac5fdb5d0079e408deb4c2a898fe1bbc2286620f70023c49e8e85376ad66',
                       'bytes': 10024,
                       'beforeBytes': 10062,
                       'baseline': 'goal-4/evidence/ux33/MarketCounter.vue.before.txt'},
 'RecoveryRitual.vue': {'before': '275effb2cf2c9069c4f0ac87bde0cd367ea5b161b28b346b6113265a42f2b760',
                        'after': 'b89677b3e2e762048540419502c1017f77f7db62eb0de01f8506a0a986ac3826',
                        'bytes': 9504,
                        'beforeBytes': 9542,
                        'baseline': 'goal-4/evidence/ux33/RecoveryRitual.vue.before.txt'},
 'JadeStudyScene.vue': {'before': '10856e9645c1e7944da5ef0d98951a6a3d4a282dedd979863f6e9b2985fb29b9',
                        'after': '18b9c6e9d05d8d1f28c529f64e21dce51700c08e1befb885ecc8ec93d0f741c6',
                        'bytes': 5190,
                        'beforeBytes': 5225,
                        'baseline': 'goal-4/evidence/ux33/JadeStudyScene.vue.before.txt'},
 'RelicAtelier.vue': {'before': '10f5c8a995fd12da9cc92d0cecbd19281ec44319c6c8ca17c498f6dde629f96e',
                      'after': '5c01edde5247c0e01d7aecdb1a8c0a23039ca941ca7357ff25a7439579b4452e',
                      'bytes': 16070,
                      'beforeBytes': 16108,
                      'baseline': 'goal-4/evidence/ux33/RelicAtelier.vue.before.txt'},
 'AlchemyWorkshop.vue': {'before': '151e4af4a995fd21c175adda186755ee35fce811913b994a3d5f57e9e3d1f95a',
                         'after': 'df324eb4f7b25f7cd091e475af413d158162e3fcd49b952d9bb705e24f399a92',
                         'bytes': 12009,
                         'beforeBytes': 12065,
                         'baseline': 'goal-4/evidence/ux33/AlchemyWorkshop.vue.before.txt'},
 'SourcePlanner.vue': {'before': 'c4286f9bbfeac6a1a757ad2aafc0a8e41ee14da14b7212cf23b3a6fb9b34fa49',
                       'after': '7b433cef8f834a2ae98ff63dbca9339c9d5012385b6cb69ca7ed21199255fac5',
                       'bytes': 8403,
                       'beforeBytes': 8338,
                       'baseline': 'goal-4/evidence/ux33/SourcePlanner.vue.before.txt'},
 'SourceObject.vue': {'before': '31adfb2ba5ff140f0b4f438a7b050f3842ba76c0730f9e2dc4df9fec228fa413',
                      'after': 'fd8b7bc3062c935e7fce82214ceb0aa09b5cc6df49e5bd38a3f710bc3e450752',
                      'bytes': 5404,
                      'beforeBytes': 5413,
                      'baseline': 'goal-4/evidence/ux33/SourceObject.vue.before.txt'},
 'StageOutcome.vue': {'before': 'e93379b43cd3c66bd6bbd3bcc34dc198d97dd023367fd1c6073a92a3eaa6133d',
                      'after': 'deb66c8e9e2e58ded008dd10cd26dfcbe51b9204c4fb65a57b1f4cc4a2fdeeaf',
                      'bytes': 4221,
                      'beforeBytes': 4260,
                      'baseline': 'goal-4/evidence/ux33/StageOutcome.vue.before.txt'}}
OPERATIONS={'App.vue': [["import StageOutcome from './StageOutcome.vue';",
              "import StageOutcome from './StageOutcome.vue';\n"
              "import {recoveryMessage} from './activity-view';"],
             ['<strong '
              'class="error-title">{{store.available?\'本次操作需要处理\':\'存档暂不可用\'}}</strong><p>{{store.error}}</p><p '
              'v-if="store.canRetry" class="small" '
              'data-testid="retry-policy">保存结果尚未确认。重试会核对同一次操作，不会重复结算。</p>',
              '<p '
              'class="error-title"><strong>{{store.canRetry?\'保存待核对\':store.available?\'操作受阻\':\'存档不可用\'}}</strong><span '
              'v-if="store.canRetry" class="small" data-testid="retry-policy"> '
              '· '
              '重试核对原操作，不重复结算。</span></p><p>{{recoveryMessage(store.error,store.canRetry)}}</p>'],
             ['>重试本次操作</button>', '>重试原操作</button>']],
 'TrainingActivity.vue': [["const status=computed(()=>takeover.value?'已保存 · "
                           "本页尚未接管':props.store.activityPausing?'正在暂停':runtime.value?.phase==='saving'?'本轮保存中':runtime.value?(a.value?.version===1?'吐纳进行中':view.value?.noun+'进行中'):a.value?.status==='paused'?view.value?.noun+'已暂停':a.value?.status==='stopped'?'此段活动已结束':'已保存活动安排');",
                           'const '
                           "status=computed(()=>!props.store.available?'进度待核对':props.store.activityPausing?'正在暂停':runtime.value?.phase==='saving'?'正在保存':runtime.value?'进行中':a.value?.status==='paused'?'已暂停':a.value?.status==='stopped'?'本段已结束':props.store.canRetry?'保存待核对':takeover.value?'待接管':'待继续');"],
                          ['const '
                           "notice=computed(()=>compactV6()&&props.store.activityNotice===a.value?.stopReason?.message?'':props.store.activityNotice);",
                           'const notice=computed(()=>{const '
                           'n=props.store.activityNotice;return '
                           "n===a.value?.stopReason?.message||!runtime.value&&a.value?.status!=='stopped'&&n===blocked.value?.message||a.value?.status==='paused'&&!a.value.stopReason&&n==='活动已暂停。未完成的这一轮在继续时重新计时。'?'':n;});"],
                          ['const blockMessage=computed(()=>{const '
                           "m=blocked.value?.message??'';return "
                           "compactV6()&&(m===a.value?.stopReason?.message||m===notice.value)?'':m;});",
                           'const '
                           "blockMessage=computed(()=>blocked.value?.message===a.value?.stopReason?.message?'':a.value?stopMessage(a.value.plan,blocked.value):'');"],
                          ["rail&&a.status==='paused'?'已暂停 · 继续后本轮重计时':status",
                           "rail&&a.status==='paused'&&store.available?'已暂停 · "
                           "续行重计本轮':status"],
                          ["compact&&a.version===6?'继续':'继续'+view.noun",
                           "rail||compact&&a.version===6?'继续':'继续'+view.noun"],
                          ["compact&&a.version===6?'暂停':'暂停'+view.noun",
                           "rail||compact&&a.version===6?'暂停':'暂停'+view.noun"],
                          ["runtime||store.activityPausing||store.canRetry?'primary':'text-button'",
                           "runtime||store.activityPausing?'primary':'text-button'"],
                          ['<button v-if="store.canRetry" '
                           'data-testid="training-retry"',
                           '<button v-if="store.canRetry&&!rail" '
                           'data-testid="training-retry"'],
                          ['>重试本次保存</button>', '>重试原操作</button>']],
 'activity-view.ts': [[" if(reason?.code==='CYCLES_COMPLETE'){",
                       " if(['buy','learn','study'].includes(plan.kind)){\n"
                       '  '
                       "if(reason?.code==='ACTIVITY_BUDGET')return'本段用石额度不足';\n"
                       '  '
                       "if(reason?.code==='INSUFFICIENT_STONES')return'灵石不足';\n"
                       ' }\n'
                       ' '
                       "if((plan.kind==='sell'||plan.kind==='use')&&reason?.code==='INSUFFICIENT_ITEM'&&Object.hasOwn(items,plan.item))return "
                       "items[plan.item].name+'不足';\n"
                       " if(reason?.code==='CYCLES_COMPLETE'){"],
                      ['export function '
                       'activityView(a:Activity,game:Game|null){',
                       'const recoveryCauses=new Map([\n'
                       " ['存储空间不足，本次操作未提交，原进度保留','存储空间不足'],\n"
                       " ['存储事务失败，本次操作未提交，原进度保留','存储事务失败'],\n"
                       " ['本地存储不可访问，已有数据未改动','本地存储不可访问'],\n"
                       ']);\n'
                       '/** Only uncertain known storage reports are '
                       'projected; their original values stay untouched. */\n'
                       'export function '
                       'recoveryMessage(value:string,unconfirmed:boolean){return '
                       'unconfirmed?recoveryCauses.get(value)??value:value;}\n'
                       'export function '
                       'activityView(a:Activity,game:Game|null){']],
 'MarketPlanner.vue': [["import {pausedPlanView} from './preparation-view.ts';",
                        'import {pausedPlanView} from '
                        "'./preparation-view.ts';\n"
                        "import {stopMessage} from './activity-view';"],
                       ["'存档状态待核对，请先恢复或重试'", "'请先处理存档提示'"],
                       ["'当前活动进行中，请先暂停后确认交易安排'", "'先暂停当前活动，再确认交易'"],
                       ["restart.same?'':quote?.failure?.message)",
                        "restart.same?'':stopMessage(plan,quote?.failure))"],
                       ["'预计停止：'+quote.stopReason.message",
                        "'预计停止：'+stopMessage(plan,quote.stopReason)"],
                       ["'突破物不可出售':quote?.failure?.message",
                        "'突破物不可出售':stopMessage(plan,quote?.failure)"],
                       ["'当前行动保存中，请稍候'", "'正在保存，请稍候'"]],
 'LearningPlanner.vue': [['import {pausedPlanView} from '
                          "'./preparation-view.ts';",
                          'import {pausedPlanView} from '
                          "'./preparation-view.ts';\n"
                          "import {stopMessage} from './activity-view';"],
                         ["'存档状态待核对，请先恢复或重试'", "'请先处理存档提示'"],
                         ["'当前活动进行中，请先暂停后确认新安排'", "'先暂停当前活动，再确认新安排'"],
                         ["quote.value?'预计完成 '",
                          "quote.value?.failure?'暂不可开始':quote.value?'预计完成 '"],
                         ["quote.value?.failure?.message??(quote.value?.stopReason?'预计停止：'+quote.value.stopReason.message:'所选费用、资格或已掌握状态变化时停止')",
                          "quote.value?.failure?stopMessage(plan.value,quote.value.failure):quote.value?.stopReason?'预计停止：'+stopMessage(plan.value,quote.value.stopReason):'所选费用、资格或已掌握状态变化时停止'"],
                         ["'当前行动保存中，请稍候'", "'正在保存，请稍候'"],
                         ["'已保存安排；修改后须重新确认'", "'已保存安排'"],
                         ["'下次草案，当前执行见上方'", "'下次草案 · 原活动不变'"],
                         ["'待确认安排，确认后开始'", "'待确认安排'"],
                         ["'已悟记录 · 回看已保存原安排'", "'已悟记录 · 原安排'"],
                         ["'已悟记录 · 此简可随时展读'", "'已悟记录 · 可展读'"],
                         ["'展读经卷 · 查看不入串'", "'查看不入串'"],
                         ['择卷只查看；收入待研卷串与开始研习须另行点击。', '择卷只查看；入串后另行开始研习。'],
                         ['这里只调整待确认草案，关闭保留选择；另行点击开始后才保存并执行。',
                          '关闭保留草案；另行开始后才执行。']],
 'RecoveryPlanner.vue': [['import {pausedPlanView} from '
                          "'./preparation-view.ts';",
                          'import {pausedPlanView} from '
                          "'./preparation-view.ts';\n"
                          "import {stopMessage} from './activity-view';"],
                         ["'存档待核对，请先核对并重试原操作'", "'请先处理存档提示'"],
                         ["'当前活动进行中，请先暂停后安排恢复'", "'先暂停当前活动，再调息'"],
                         ["quote.failure?.message??('预计'",
                          "(quote.failure?stopMessage(plan,quote.failure):null)??('预计'"],
                         ['预计停止：{{quote.stopReason.message}}',
                          '预计停止：{{stopMessage(plan,quote.stopReason)}}'],
                         ["'当前行动保存中，请稍候'", "'正在保存，请稍候'"]],
 'MarketCounter.vue': [["failed:store?.syncIssue?'同步待核对 · 交易已停':'保存待核对 · "
                        "请查看上方提示'",
                        "failed:store?.syncIssue?'进度待核对':'查看上方提示'"]],
 'RecoveryRitual.vue': [["failed:store?.syncIssue?'同步待核对 · 气息已歇':'保存待核对 · "
                         "请查看上方提示'",
                         "failed:store?.syncIssue?'进度待核对':'查看上方提示'"]],
 'JadeStudyScene.vue': [["failed:store?.syncIssue?'存档待核对 · 已停卷':'保存待核对 · "
                         "请查看上方提示'",
                         "failed:store?.syncIssue?'进度待核对':'查看上方提示'"]],
 'RelicAtelier.vue': [["failed:store?.syncIssue?'同步待核对 · 器纹已歇':'保存待核对 · "
                       "请查看上方提示'",
                       "failed:store?.syncIssue?'进度待核对':'查看上方提示'"]],
 'AlchemyWorkshop.vue': [["failed:!props.available||feedbackStore?.syncIssue?'存档待核对 "
                          "· 炉火已歇':feedbackStore?.unresolved?'当前活动保存未确认 · "
                          "请在活动条重试':'上次操作未完成 · 可另行安排'",
                          "failed:!props.available||feedbackStore?.syncIssue?'进度待核对':feedbackStore?.unresolved?'查看上方提示':'上次未完成 "
                          "· 可另行安排'"]],
 'SourcePlanner.vue': [['<span>预计 {{quote?.cycles??0}} 轮',
                        '<span '
                        'v-if="quote?.failure">{{quote.failure.message}}</span><span '
                        'v-else>预计 {{quote?.cycles??0}} 轮'],
                       ["quote?.failure?'暂不可安排：'+quote.failure.message:quote?.stopReason?'预计停止：'+quote.stopReason.message:''",
                        '!quote?.failure && '
                        "quote?.stopReason?'预计停止：'+quote.stopReason.message:''"],
                       ['<template v-if="cycles===\'target\'"> · 按完整一轮结算',
                        '<template v-if="quote?.allowed&&cycles===\'target\'"> '
                        '· 按完整一轮结算'],
                       ["'进度同步待核对，请先重新读取。':'存档待核对，请在活动条重试。'",
                        "'请先重新读取进度。':'请先处理存档提示。'"],
                       ["{{!quote?.allowed?perCycle?.failure?.message:''}}",
                        "{{!quote?.allowed&&perCycle?.failure?.message!==quote?.failure?.message?perCycle?.failure?.message:''}}"]],
 'SourceObject.vue': [["state==='failed'?'已停手，先核对存档'",
                       "state==='failed'?'查看上方提示'"]],
 'StageOutcome.vue': [['已确认的成果保留，请先重新读取当前进度。', '已确认成果保留；请重新读取。'],
                      ['本次未保存</strong><p>进度未结算，请先处理上方原因并重试。',
                       '结果待核对</strong><p>请先查看上方处理提示。']]}
MANIFEST={'format': 'chenyuan-shared-status-ux33',
 'version': 1,
 'userAcceptance': False,
 'newRasterAssets': 0,
 'newCSSBytes': 0,
 'files': [{'path': 'web/src/App.vue',
            'bytes': 159582,
            'sha256': 'ab88622cb1e5e80b504ae21ad19c9562183a16de6825fd66147259cf8107679c'},
           {'path': 'web/src/TrainingActivity.vue',
            'bytes': 7716,
            'sha256': 'cf52d3aa3d5063585ac52dd4b0eb1ff8afc46d088c911ed6b5939ce6601e544c'},
           {'path': 'web/src/activity-view.ts',
            'bytes': 4747,
            'sha256': '020a7580936a2019a78e766cb3c1c3863666c48fe4e3707a6b60b8abd74cd5a3'},
           {'path': 'web/src/MarketPlanner.vue',
            'bytes': 12494,
            'sha256': 'dd07092b9c8d858181eb5c7b65976532adc6e8efdbc8c3b3c8e5b66acfee4d72'},
           {'path': 'web/src/LearningPlanner.vue',
            'bytes': 18553,
            'sha256': '4b8bf6d3980792cd9e5f025a5f3738b90f9b9146480d8d270612192ce39c3756'},
           {'path': 'web/src/RecoveryPlanner.vue',
            'bytes': 8586,
            'sha256': '91acc6f6ef5921ae04749c53d34a6870e840b2664d1a5bc1b48477d4bf7d37cc'},
           {'path': 'web/src/MarketCounter.vue',
            'bytes': 10024,
            'sha256': '0904ac5fdb5d0079e408deb4c2a898fe1bbc2286620f70023c49e8e85376ad66'},
           {'path': 'web/src/RecoveryRitual.vue',
            'bytes': 9504,
            'sha256': 'b89677b3e2e762048540419502c1017f77f7db62eb0de01f8506a0a986ac3826'},
           {'path': 'web/src/JadeStudyScene.vue',
            'bytes': 5190,
            'sha256': '18b9c6e9d05d8d1f28c529f64e21dce51700c08e1befb885ecc8ec93d0f741c6'},
           {'path': 'web/src/RelicAtelier.vue',
            'bytes': 16070,
            'sha256': '5c01edde5247c0e01d7aecdb1a8c0a23039ca941ca7357ff25a7439579b4452e'},
           {'path': 'web/src/AlchemyWorkshop.vue',
            'bytes': 12009,
            'sha256': 'df324eb4f7b25f7cd091e475af413d158162e3fcd49b952d9bb705e24f399a92'},
           {'path': 'web/src/SourcePlanner.vue',
            'bytes': 8403,
            'sha256': '7b433cef8f834a2ae98ff63dbca9339c9d5012385b6cb69ca7ed21199255fac5'},
           {'path': 'web/src/SourceObject.vue',
            'bytes': 5404,
            'sha256': 'fd8b7bc3062c935e7fce82214ceb0aa09b5cc6df49e5bd38a3f710bc3e450752'},
           {'path': 'web/src/StageOutcome.vue',
            'bytes': 4221,
            'sha256': 'deb66c8e9e2e58ded008dd10cd26dfcbe51b9204c4fb65a57b1f4cc4a2fdeeaf'}],
 'sourceReferences': ['docs/decisions/0094-shared-activity-status-ux33-contract.md',
                      'goal-4/amendments/2026-11-04-ux33-input.md',
                      'goal-4/research/ux33-status-clarity-sources.json',
                      'art/redesign/ux33-display-edits.json',
                      'goal-4/evidence/ux33/App.vue.before.txt',
                      'goal-4/evidence/ux33/TrainingActivity.vue.before.txt',
                      'goal-4/evidence/ux33/activity-view.ts.before.txt',
                      'goal-4/evidence/ux33/MarketPlanner.vue.before.txt',
                      'goal-4/evidence/ux33/LearningPlanner.vue.before.txt',
                      'goal-4/evidence/ux33/RecoveryPlanner.vue.before.txt',
                      'goal-4/evidence/ux33/MarketCounter.vue.before.txt',
                      'goal-4/evidence/ux33/RecoveryRitual.vue.before.txt',
                      'goal-4/evidence/ux33/JadeStudyScene.vue.before.txt',
                      'goal-4/evidence/ux33/RelicAtelier.vue.before.txt',
                      'goal-4/evidence/ux33/AlchemyWorkshop.vue.before.txt',
                      'goal-4/evidence/ux33/SourcePlanner.vue.before.txt',
                      'goal-4/evidence/ux33/SourceObject.vue.before.txt',
                      'goal-4/evidence/ux33/StageOutcome.vue.before.txt']}
GROUPS={'idle-cultivation': {'cap': 22000,
                      'files': ['web/src/activity-clock.ts',
                                'web/src/TrainingActivity.vue',
                                'web/src/TrainingPlanner.vue',
                                'web/src/idle-activity.css'],
                      'ledgerSHA256': 'b1443902e2ed89bcfd861b9704ec1a544ac1c3a0c7de7161e64d5553a3838f39'},
 'idle-production': {'cap': 26000,
                     'files': ['web/src/ProductionPlanner.vue',
                               'web/src/idle-production.css',
                               'web/src/activity-view.ts'],
                     'ledgerSHA256': 'c14fcd8b33061ef85369511ad7e765462c60ebb15f56b37f07bd2a307580b569'},
 'idle-preparation': {'cap': 60000,
                      'files': ['web/src/LearningPlanner.vue',
                                'web/src/MarketPlanner.vue',
                                'web/src/RecoveryPlanner.vue',
                                'web/src/ConfigurationDialog.vue',
                                'web/src/preparation-view.ts',
                                'web/src/idle-preparation.css'],
                      'ledgerSHA256': 'bad1cbd7a8e23cdf505f6e055c6cf75ab4886a009a500f8f041e6ef94c58cf51'},
 'art03': {'cap': 45000,
           'files': ['web/src/JadeStudyScene.vue',
                     'web/src/RelicAtelier.vue',
                     'web/src/LoadoutConstellation.vue',
                     'web/src/equipment-effects.ts',
                     'web/src/art03-equipment.css'],
           'ledgerSHA256': 'a2a078e6ee338a17286a6c159767334f26a2698cd5848767932993ad7f124cef'},
 'art04': {'cap': 40000,
           'files': ['web/src/InventoryStage.vue',
                     'web/src/MarketCounter.vue',
                     'web/src/RecoveryRitual.vue',
                     'web/src/supply-effects.ts'],
           'ledgerSHA256': '3c974385497778839dce79472058baffbfec33a56f5610bcf7e1221fdb7e7953'},
 'idle-sources': {'cap': 24000,
                  'files': ['web/src/SourcePlanner.vue',
                            'web/src/idle-sources.css'],
                  'ledgerSHA256': '8933162178a3c16c0af38cb50487a265b6d692d0bc1e53837b7a7032c1d76131'},
 'alchemy-workshop': {'cap': 22000,
                      'files': ['web/src/AlchemyWorkshop.vue',
                                'web/src/alchemy-workshop.css',
                                'web/src/alchemy-feedback.ts'],
                      'ledgerSHA256': 'bf770f33e405cea888c33c6f4485b014f8b29b11d83614745758f7240c29a12f'},
 'catalogue-art/manifest': {'cap': 18000,
                            'files': ['web/src/CatalogueArt.vue',
                                      'web/src/StageOutcome.vue',
                                      'web/src/catalogue-art.css'],
                            'ledgerSHA256': '33e06718012b516e423ae0c10c55dbb5ca7b7abe150f49c0b9c9fe3ac7520952'},
 'ta08': {'cap': 42000,
          'files': ['web/src/SourceObject.vue',
                    'web/src/SourceCommission.vue',
                    'web/src/SourceSatchel.vue',
                    'web/src/source-choreography.ts',
                    'web/src/ta08-source.css'],
          'ledgerSHA256': '3dacde3abdbbc6f2476213ed353bd89b5c9ddaab6b9d656f0d4e316a5270db37'}}
MARKERS={'App.vue': "import StageOutcome from './StageOutcome.vue';\n"
            "import {recoveryMessage} from './activity-view';",
 'TrainingActivity.vue': 'const '
                         "blockMessage=computed(()=>blocked.value?.message===a.value?.stopReason?.message?'':a.value?stopMessage(a.value.plan,blocked.value):'');",
 'activity-view.ts': " if(['buy','learn','study'].includes(plan.kind)){\n"
                     "  if(reason?.code==='ACTIVITY_BUDGET')return'本段用石额度不足';\n"
                     "  if(reason?.code==='INSUFFICIENT_STONES')return'灵石不足';\n"
                     ' }\n'
                     ' '
                     "if((plan.kind==='sell'||plan.kind==='use')&&reason?.code==='INSUFFICIENT_ITEM'&&Object.hasOwn(items,plan.item))return "
                     "items[plan.item].name+'不足';\n"
                     " if(reason?.code==='CYCLES_COMPLETE'){",
 'MarketPlanner.vue': "import {pausedPlanView} from './preparation-view.ts';\n"
                      "import {stopMessage} from './activity-view';",
 'LearningPlanner.vue': 'import {pausedPlanView} from '
                        "'./preparation-view.ts';\n"
                        "import {stopMessage} from './activity-view';",
 'RecoveryPlanner.vue': 'import {pausedPlanView} from '
                        "'./preparation-view.ts';\n"
                        "import {stopMessage} from './activity-view';",
 'MarketCounter.vue': "failed:store?.syncIssue?'进度待核对':'查看上方提示'",
 'RecoveryRitual.vue': "failed:store?.syncIssue?'进度待核对':'查看上方提示'",
 'JadeStudyScene.vue': "failed:store?.syncIssue?'进度待核对':'查看上方提示'",
 'RelicAtelier.vue': "failed:store?.syncIssue?'进度待核对':'查看上方提示'",
 'AlchemyWorkshop.vue': "failed:!props.available||feedbackStore?.syncIssue?'进度待核对':feedbackStore?.unresolved?'查看上方提示':'上次未完成 "
                        "· 可另行安排'",
 'SourcePlanner.vue': '<span '
                      'v-if="quote?.failure">{{quote.failure.message}}</span><span '
                      'v-else>预计 {{quote?.cycles??0}} 轮',
 'SourceObject.vue': "state==='failed'?'查看上方提示'",
 'StageOutcome.vue': '已确认成果保留；请重新读取。'}
def prior_ux33_bytes(path,raw):
 name=Path(path).name
 if name not in FACTS or MARKERS[name].encode() not in raw:return raw
 assert hashlib.sha256(raw).hexdigest()==FACTS[name]['after'], 'UX33 complete display source changed'
 text=raw.decode()
 for before,after in reversed(OPERATIONS[name]):
  assert after and text.count(after)==1, 'UX33 unique whole inverse'
  text=text.replace(after,before,1)
 assert hashlib.sha256(text.encode()).hexdigest()==FACTS[name]['before'], 'UX33 original whole source'
 return text.encode()
def validate_ux33(root):
 root=Path(root).resolve()
 def local(n):
  f=root/n
  assert f.is_file() and not f.is_symlink() and f.resolve().is_relative_to(root), 'UX33 local file'
  return f
 if not(root/LEDGER).exists():
  assert not any((root/'web/src'/n).exists() and MARKERS[n].encode() in (root/'web/src'/n).read_bytes() for n in FACTS), 'UX33 unrecorded display'
  return set(),0
 assert json.loads(local(LEDGER).read_text())==MANIFEST, 'UX33 exact current ledger'
 assert json.loads(local('art/redesign/ux33-display-edits.json').read_text())==OPERATIONS, 'UX33 exact changes'
 for n,f in FACTS.items():
  raw=local('web/src/'+n).read_bytes();old=local(f['baseline']).read_bytes()
  assert len(raw)==f['bytes'] and hashlib.sha256(raw).hexdigest()==f['after'], 'UX33 current source'
  assert len(old)==f['beforeBytes'] and hashlib.sha256(old).hexdigest()==f['before'], 'UX33 original source'
  assert prior_ux33_bytes(n,raw)==old, 'UX33 full inverse'
  assert re.findall(rb'@[\w:.-]+="[^"]*"',raw)==re.findall(rb'@[\w:.-]+="[^"]*"',old), 'UX33 original event callbacks'
  assert re.findall(rb'<style.*?</style>',raw,re.S)==re.findall(rb'<style.*?</style>',old,re.S), 'UX33 unchanged styles'
 for n,g in GROUPS.items():
  assert hashlib.sha256(local('art/redesign/'+n+'.json').read_bytes()).hexdigest()==g['ledgerSHA256'], 'UX33 old ledger immutable'
  assert sum(local(x).stat().st_size for x in g['files'])<=g['cap'], 'UX33 original regional cap'
 assert local('web/src/App.vue').stat().st_size<=159635 and local('web/src/RecoveryRitual.vue').stat().st_size<=9658, 'UX33 original parent caps'
 for ref in MANIFEST['sourceReferences']:local(ref)
 return {LEDGER,*MANIFEST['sourceReferences'],*['web/src/'+n for n in FACTS]},sum(f['bytes']for f in FACTS.values())
