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
];

exports.main = async () => {
  const results = [];

  for (const post of SEED_POSTS) {
    let exists = false;
    try {
      await db.collection('posts').doc(post._id).get();
      exists = true;
    } catch (e) {
      // 文档不存在，继续插入
    }

    if (exists) {
      results.push({ _id: post._id, status: 'exists' });
      continue;
    }

    const now = db.serverDate();
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
    results.push({ _id: post._id, status: 'created' });
  }

  return { success: true, total: SEED_POSTS.length, results };
};
