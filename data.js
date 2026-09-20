// Fictional, locally stored demonstration data. No real credentials or messages.
export const SKILLS = ['英语口语', '吉他', 'Vibe Coding', 'PPT 排版', 'Excel 公式', '手机摄影', '短视频剪辑'];
export const TIMES = ['周一晚上', '周二晚上', '周三晚上', '周四晚上', '周五晚上', '周六上午', '周六下午', '周日晚上'];
export const LEVELS = ['零基础', '入门', '有一定基础'];
export const initialProfile = {
  bio: '愿意分享办公技能，也想尝试新的兴趣。',
  teach: [
    { name: 'PPT 排版', level: '零基础、入门', scope: '对齐、留白与信息层级，陪你练习一页排版。', evidence: '可以分享一页排版前后的对比与思路。' },
    { name: 'Excel 公式', level: '零基础、入门', scope: 'SUMIF、基础查找公式与常见报错排查。', evidence: '可以用一张练习表演示条件求和。' }
  ],
  learn: [
    { name: '英语口语', level: '入门', goal: '独立完成一段 60 秒英文自我介绍。' },
    { name: '手机摄影', level: '零基础', goal: '理解构图和曝光，独立拍出一张美食照片。' }
  ],
  times: ['周三晚上', '周六上午'], flexible: true
};
export const people = [
  { id: 'zhou', name: '小周', bio: '有英文汇报经验，擅长把复杂表达拆成简单练习。',
    teach: [{ name: '英语口语', level: '入门、有一定基础', scope: '自我介绍的表达结构与发音反馈。暂不提供考试冲刺辅导。', evidence: '60 秒自我介绍练习', sample: '先说当前角色，再用一个具体例子说明经验，最后表达想做什么。\n练习方式：示范 → 你说一遍 → 反馈 → 脱稿复述。' }],
    learn: [{ name: 'PPT 排版', level: '入门', goal: '理解信息层级，独立调整一页求职作品集。' }], times: ['周三晚上'], flexible: false,
    record: { completed: 4, onTime: 4, feedback: '会解释修改原因，也给我留了自己练习的时间。' } },
  { id: 'chen', name: '小陈', bio: '喜欢口语交流，最近在整理自己的项目数据。',
    teach: [{ name: '英语口语', level: '零基础、入门', scope: '日常表达和英文自我介绍，适合需要开口练习的人。', evidence: '开口练习提纲', sample: '从三个问题开始：你做什么？最近做过什么项目？你希望学到什么？\n先讲清楚意思，再一起改进表达，不要求背诵整段稿件。' }],
    learn: [{ name: 'Excel 公式', level: '零基础', goal: '能独立用 SUMIF 汇总不同类别的数据。' }], times: ['周六上午', '周日晚上'], flexible: true,
    record: { completed: 2, onTime: 2, feedback: '耐心，反馈具体，练习结束后更敢开口了。' } },
  { id: 'lin', name: '小林', bio: '手机摄影爱好者，喜欢用家里的日常物品做练习。',
    teach: [{ name: '手机摄影', level: '零基础、入门', scope: '自然光、构图和曝光。使用自己的手机即可，不涉及专业棚拍。', evidence: '静物摄影练习步骤', sample: '把杯子放在窗边，先关闭闪光灯。\n尝试正面光和侧面光，比较阴影；再调整曝光，保留杯口的高光细节。\n最后换一个物品，由学习者独立拍摄。' }],
    learn: [{ name: 'Excel 公式', level: '零基础', goal: '用条件求和整理每月支出。' }, { name: 'PPT 排版', level: '入门', goal: '自己完成一页摄影作品展示。' }], times: ['周六上午'], flexible: true,
    record: { completed: 3, onTime: 2, feedback: '先演示，再让我换场景自己拍，比较容易理解。' } },
  { id: 'yu', name: '小雨', bio: '喜欢生活摄影，正在提高办公效率。',
    teach: [{ name: '手机摄影', level: '零基础', scope: '生活静物构图与基础修图，不需要专业设备。', evidence: '构图练习清单', sample: '同一个物品拍三张：居中、三分法、留白构图。\n比较主体是否清晰，再挑选最适合表达画面意图的一张。' }],
    learn: [{ name: 'Excel 公式', level: '入门', goal: '学会基础查找公式并排查常见错误。' }], times: ['周日晚上'], flexible: true, record: null },
  { id: 'an', name: '小安', bio: '喜欢弹唱，希望把练习记录做成一个小网页。',
    teach: [{ name: '吉他', level: '零基础', scope: '持琴、调音与基础和弦。需要自备吉他。', evidence: '第一次练习安排', sample: '先检查持琴姿势，再练习按住一个和弦并逐根拨弦。\n目标是识别闷音原因，能够自行调整，而不是一次学完整首歌。' }],
    learn: [{ name: 'Vibe Coding', level: '零基础', goal: '用 AI Coding 工具做一个吉他练习记录页。' }], times: ['周五晚上'], flexible: false, record: null },
  { id: 'xu', name: '小许', bio: '喜欢用 AI 做小工具，想把方案表达得更清楚。',
    teach: [{ name: 'Vibe Coding', level: '零基础、入门', scope: '需求拆解、提示词与网页原型验证。需要电脑，不承诺生成生产级系统。', evidence: '网页原型拆解示例', sample: '把“练习记录工具”拆成：输入练习内容、显示记录、保存到浏览器。\n先约定验收步骤，再请 AI 实现；通过刷新页面验证数据是否保留。' }],
    learn: [{ name: 'PPT 排版', level: '入门', goal: '用一页 PPT 清楚讲述一个产品方案。' }], times: ['周五晚上'], flexible: false, record: null }
];
