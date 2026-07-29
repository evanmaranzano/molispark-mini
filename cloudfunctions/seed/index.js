const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

// 预置帖子：作为数据库初始内容，让小程序列表不为空。内容取自项目 mock/community.js 的精华帖。
// 幂等：用确定性 _id（seed-post-N），重复调用只创建一次。
// _openid 设为 seed-author；posts 权限「所有用户可读」，任何用户都能看到，仅云函数可改。
const SEED_POSTS = [
  {
    _id: 'seed-post-1',
    title: '如何高效学习一项新技能？',
    desc: '分享我的学习方法和习惯，希望能帮助你建立属于自己的学习系统。',
    author: '星球助手',
    category: '学习方法',
    type: '文章',
    coverStyle: 'book',
    heroTitle: 'KEEP LEARNING',
    content: [
      '很多人学习一项新技能时，往往把时间花在"搜资料"和"收藏资料"上，却没有真正进入实践。',
      '我更推荐用"最小闭环"的方法学习。先找到一个能在两到三天内完成的小任务，快速体验完整过程，再逐步增加难度。',
      '比如学写作，就先完成一篇短文；学编程，就先做一个可运行的小页面；学 AI 工具，就先解决一个具体工作问题。',
      '当你持续完成小闭环，你的反馈会更快，学习也更容易保持动力。',
    ],
    views: 1280,
    likes: 256,
  },
  {
    _id: 'seed-post-2',
    title: 'AI 时代的个人成长路径',
    desc: '在快速变化的时代，如何构建可持续的学习和成长体系，分享我的思考与实践。',
    author: '林知远',
    category: 'AI 工具',
    type: '文章',
    coverStyle: 'ai',
    heroTitle: 'AI FOR GROWTH',
    content: [
      'AI 不只是一个工具集合，它更像是重新定义个人生产力的操作系统。',
      '真正的差异不在于你知道多少工具，而在于你是否能把工具接进自己的工作流。',
      '建议从三个层次搭建：信息获取、内容整理、任务执行。每个层次只保留一到两个真正高频使用的工具。',
      '长期来看，最重要的能力仍然是判断力和表达力，工具只是放大器。',
    ],
    views: 982,
    likes: 193,
  },
  {
    _id: 'seed-post-3',
    title: '打造高质量笔记的方法与工具',
    desc: '好笔记让知识沉淀为资产，分享我常用的笔记方法和工具清单。',
    author: '小满',
    category: '读书笔记',
    type: '文章',
    coverStyle: 'note',
    heroTitle: 'WRITE TO THINK',
    content: [
      '高质量笔记不是把内容记全，而是让自己未来还能快速找回、理解、复用。',
      '我通常把笔记拆成三层：原始摘录、自己的理解、未来可执行的动作。',
      '如果一条笔记无法推动下一步行动，那它大概率只是"看起来很努力"。',
      '所以别急着做很多格式，先让笔记真正服务你的复盘和输出。',
    ],
    views: 756,
    likes: 142,
  },
  {
    _id: 'seed-post-4',
    title: '深度思考的 5 个训练方法',
    desc: '为什么深度思考稀缺？如何在碎片化时代培养深度思考能力？',
    author: '知行小编',
    category: '自我提升',
    type: '专区',
    coverStyle: 'book',
    heroTitle: 'THINK DEEPER',
    content: [
      '深度思考不是"想得久"，而是能持续围绕一个问题推进，而不被即时反馈打断。',
      '一个简单训练方法是：给自己设定 25 分钟只围绕一个问题写下推演，不查资料、不切任务。',
      '另一个有效方法是写问题树，把一个大问题拆成多个可验证的小问题。',
      '只要你能稳定保留这类思考时段，长期收益会非常明显。',
    ],
    views: 632,
    likes: 118,
  },
  {
    _id: 'seed-post-5',
    title: '番茄工作法：25 分钟专注的实践',
    desc: '记录我使用番茄工作法的经验，提升专注力与效率。',
    author: '周明',
    category: '学习方法',
    type: '文章',
    coverStyle: 'book',
    heroTitle: 'STAY FOCUSED',
    content: [
      '番茄工作法的核心不是计时器，而是「专注一块、休息一块」的节奏。',
      '我通常设 25 分钟纯粹做一件事，期间关闭所有通知，结束后强制休息 5 分钟。',
      '关键在于任务要提前拆到 25 分钟能完成的颗粒度，否则番茄铃响时你还在半路。',
      '一天能稳定完成 6 到 8 个番茄，已经比无序忙碌高效很多。',
    ],
    views: 540,
    likes: 98,
  },
  {
    _id: 'seed-post-6',
    title: '主题阅读：一次读透一个领域',
    desc: '与其零散读书，不如围绕一个主题集中阅读，效率更高。',
    author: '书海拾贝',
    category: '读书笔记',
    type: '文章',
    coverStyle: 'note',
    heroTitle: 'READ DEEPLY',
    content: [
      '主题阅读是先确定一个想搞懂的问题，再围绕它选 3 到 5 本书交叉读。',
      '读的时候不追求每本读完，而是带着同一个问题在不同书里找答案。',
      '把不同作者的观点摆在一起对比，你会发现自己理解的盲区。',
      '最后用自己的话写一篇综合笔记，这个主题才算真正进入你的知识库。',
    ],
    views: 410,
    likes: 76,
  },
  {
    _id: 'seed-post-7',
    title: '用 AI 工具提升日常写作效率',
    desc: 'AI 不是替你写，而是帮你越过启动困难和打磨细节。',
    author: '林知远',
    category: 'AI 工具',
    type: '文章',
    coverStyle: 'ai',
    heroTitle: 'WRITE WITH AI',
    content: [
      'AI 在写作里最值钱的不是生成成品，而是帮你快速越过「面对空白文档」的启动阻力。',
      '我的流程是：先自己列要点，再让 AI 按要点扩写初稿，最后由我逐句改写。',
      '初稿可以糙，但定稿必须是你自己的判断和语气，否则读起来没有温度。',
      '把 AI 当成一个不知疲倦的助理，而不是代笔，效率和质量才能兼顾。',
    ],
    views: 870,
    likes: 165,
  },
  {
    _id: 'seed-post-8',
    title: '每周复盘：一个简单可持续的框架',
    desc: '复盘不需要复杂模板，三个问题就够用一辈子。',
    author: '知行小编',
    category: '自我提升',
    type: '专区',
    coverStyle: 'book',
    heroTitle: 'REVIEW WEEKLY',
    content: [
      '我每周日花 15 分钟做复盘，只回答三个问题：本周做好了什么、没做好什么、下周怎么调整。',
      '关键是写下来而不是想想就过，文字会让你直面那些被忽略的拖延。',
      '不要追求复盘模板的精致，能坚持的简单框架永远胜过用两次就放弃的复杂表格。',
      '半年后回看这些记录，你会清楚地看到自己的成长轨迹。',
    ],
    views: 505,
    likes: 89,
  },
  {
    _id: 'seed-post-9',
    title: '如何建立一个能坚持的早起习惯',
    desc: '早起不是靠意志力，而是靠环境和节奏的设计。',
    author: '周明',
    category: '自我提升',
    type: '文章',
    coverStyle: 'book',
    heroTitle: 'RISE EARLY',
    content: [
      '早起的关键不是定闹钟，而是先把入睡时间往前挪，睡眠够了自然醒得来。',
      '给早起安排一件你真正期待的事，比如一杯好咖啡或一段安静阅读，让起床有动力。',
      '刚开始允许自己失败，但固定起床时间不要变，身体会在两三周后适应。',
      '比起早起本身，更重要的是你用这段不被打扰的时间做了什么。',
    ],
    views: 468,
    likes: 84,
  },
  {
    _id: 'seed-post-10',
    title: '从碎片到体系：知识管理入门',
    desc: '收藏不等于掌握，让零散信息沉淀成可复用的体系。',
    author: '小满',
    category: '学习方法',
    type: '文章',
    coverStyle: 'note',
    heroTitle: 'BUILD SYSTEM',
    content: [
      '多数人的知识管理停留在收藏，但收藏夹里的东西永远不会变成你的能力。',
      '我建议用「收集—整理—连接—输出」四步：先记下，再归类，再和已有知识关联，最后写出来。',
      '连接这一步最关键，一条新信息只有和旧知识挂上钩，才不容易忘。',
      '体系不是一天建成的，而是每次输出时自然长出来的结构。',
    ],
    views: 690,
    likes: 121,
  },
];

async function seedPost(post) {
  try {
    await db.collection('posts').doc(post._id).get();
    return { _id: post._id, status: 'exists' };
  } catch (e) {
    const now = db.serverDate();
    try {
      await db.collection('posts').add({
        data: {
          ...post,
          status: 'published',
          time: '精华',
          images: [],
          collectCount: 0,
          commentCount: 0,
          _openid: 'seed-author',
          createdAt: now,
          updatedAt: now,
        },
      });
      return { _id: post._id, status: 'created' };
    } catch (err) {
      await db.collection('posts').doc(post._id).get();
      return { _id: post._id, status: 'exists' };
    }
  }
}

// 预置活动：活动报名功能的初始内容。幂等：确定性 _id（seed-activity-N），重复调用只创建一次。
// 权限同 posts：「所有用户可读」，任何用户可见，报名/取消走 activity 云函数。
const SEED_ACTIVITIES = [
  {
    _id: 'seed-activity-1',
    title: '周末共读会：主题阅读实战',
    desc: '带一本你最近在读的书，现场完成一次主题阅读练习，并分享你的问题清单。',
    location: '线上 · 腾讯会议',
    startTime: '2026-08-08 14:00',
    endTime: '2026-08-08 16:00',
    quota: 30,
    signupCount: 0,
    coverStyle: 'book',
    heroTitle: 'READ TOGETHER',
  },
  {
    _id: 'seed-activity-2',
    title: 'AI 工具工作坊：搭建个人工作流',
    desc: '从信息获取、内容整理到任务执行，现场搭一个属于你自己的 AI 工作流。',
    location: '上海 · 创智天地 3 号楼',
    startTime: '2026-08-15 10:00',
    endTime: '2026-08-15 12:00',
    quota: 20,
    signupCount: 0,
    coverStyle: 'ai',
    heroTitle: 'AI WORKFLOW',
  },
  {
    _id: 'seed-activity-3',
    title: '21 天早起打卡营（第 5 期）',
    desc: '每天 7:30 前打卡，群内互相监督。完成 21 天打卡可领取结营证书。',
    location: '线上 · 微信群',
    startTime: '2026-08-01 07:00',
    endTime: '2026-08-21 23:59',
    quota: 0,
    signupCount: 0,
    coverStyle: 'note',
    heroTitle: 'RISE EARLY',
  },
  {
    _id: 'seed-activity-4',
    title: '摩力AI亲子公益沙龙 第三期：不会写代码，也能做游戏？',
    desc: '小学女创客现场教你！让孩子从「玩家」变成「创作者」，用 WorkBuddy 做一款属于你的小游戏。主办：鼓楼区人工智能产业加速中心公共服务平台、福州摩力创境运营管理有限公司、五凤街道党工委/办事处、广厦社区。',
    location: '福州市鼓楼区五凤街道铜盘路323号 人工智能产业加速中心二楼共享中心',
    startTime: '2026-07-25 09:30',
    endTime: '2026-07-25 11:30',
    quota: 0,
    signupCount: 0,
    cover: '/assets/activities/moli-salon-3.jpg',
    coverStyle: 'ai',
    heroTitle: 'AI KIDS MAKER',
  },
];

async function seedActivity(activity) {
  try {
    await db.collection('activities').doc(activity._id).get();
    return { _id: activity._id, status: 'exists' };
  } catch (e) {
    const now = db.serverDate();
    try {
      await db.collection('activities').add({
        data: {
          ...activity,
          status: 'published',
          _openid: 'seed-author',
          createdAt: now,
          updatedAt: now,
        },
      });
      return { _id: activity._id, status: 'created' };
    } catch (err) {
      await db.collection('activities').doc(activity._id).get();
      return { _id: activity._id, status: 'exists' };
    }
  }
}

exports.main = async () => {
  const results = await Promise.all(SEED_POSTS.map((post) => seedPost(post)));
  const activityResults = await Promise.all(SEED_ACTIVITIES.map((activity) => seedActivity(activity)));
  return {
    success: true,
    total: SEED_POSTS.length + SEED_ACTIVITIES.length,
    results,
    activityResults,
  };
};
