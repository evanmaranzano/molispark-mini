const posts = [
  {
    id: 1,
    title: '如何高效学习一项新技能？',
    desc: '分享我的学习方法和习惯，希望能帮助你建立属于自己的学习系统。',
    author: '星球助手',
    time: '2 小时前',
    category: '学习方法',
    type: '文章',
    views: 1280,
    likes: 256,
    comments: 78,
    status: 'published',
    coverStyle: 'book',
    content: [
      '很多人学习一项新技能时，往往把时间花在“搜资料”和“收藏资料”上，却没有真正进入实践。',
      '我更推荐用“最小闭环”的方法学习。先找到一个能在两到三天内完成的小任务，快速体验完整过程，再逐步增加难度。',
      '比如学写作，就先完成一篇短文；学编程，就先做一个可运行的小页面；学 AI 工具，就先解决一个具体工作问题。',
      '当你持续完成小闭环，你的反馈会更快，学习也更容易保持动力。',
    ],
    heroTitle: 'KEEP LEARNING',
  },
  {
    id: 2,
    title: 'AI 时代的个人成长路径',
    desc: '在快速变化的时代，如何构建可持续的学习和成长体系，分享我的思考与实践。',
    author: '林知远',
    time: '昨天',
    category: 'AI 工具',
    type: '文章',
    views: 982,
    likes: 193,
    comments: 56,
    status: 'published',
    coverStyle: 'ai',
    content: [
      'AI 不只是一个工具集合，它更像是重新定义个人生产力的操作系统。',
      '真正的差异不在于你知道多少工具，而在于你是否能把工具接进自己的工作流。',
      '建议从三个层次搭建：信息获取、内容整理、任务执行。每个层次只保留一到两个真正高频使用的工具。',
      '长期来看，最重要的能力仍然是判断力和表达力，工具只是放大器。',
    ],
    heroTitle: 'AI FOR GROWTH',
  },
  {
    id: 3,
    title: '打造高质量笔记的方法与工具',
    desc: '好笔记让知识沉淀为资产，分享我常用的笔记方法和工具清单。',
    author: '小满',
    time: '2 天前',
    category: '读书笔记',
    type: '文章',
    views: 756,
    likes: 142,
    comments: 34,
    status: 'published',
    coverStyle: 'note',
    content: [
      '高质量笔记不是把内容记全，而是让自己未来还能快速找回、理解、复用。',
      '我通常把笔记拆成三层：原始摘录、自己的理解、未来可执行的动作。',
      '如果一条笔记无法推动下一步行动，那它大概率只是“看起来很努力”。',
      '所以别急着做很多格式，先让笔记真正服务你的复盘和输出。',
    ],
    heroTitle: 'WRITE TO THINK',
  },
  {
    id: 4,
    title: '深度思考的 5 个训练方法',
    desc: '为什么深度思考稀缺？如何在碎片化时代培养深度思考能力？',
    author: '知行小编',
    time: '3 天前',
    category: '自我提升',
    type: '专区',
    views: 632,
    likes: 118,
    comments: 31,
    status: 'published',
    coverStyle: 'book',
    content: [
      '深度思考不是“想得久”，而是能持续围绕一个问题推进，而不被即时反馈打断。',
      '一个简单训练方法是：给自己设定 25 分钟只围绕一个问题写下推演，不查资料、不切任务。',
      '另一个有效方法是写问题树，把一个大问题拆成多个可验证的小问题。',
      '只要你能稳定保留这类思考时段，长期收益会非常明显。',
    ],
    heroTitle: 'THINK DEEPER',
  },
  {
    id: 5,
    title: '番茄工作法的实践与改进',
    desc: '记录我使用番茄工作法的经验和改进思路，提升专注力与效率。',
    author: '星球用户',
    time: '草稿',
    category: '时间管理',
    type: '文章',
    views: 0,
    likes: 0,
    comments: 0,
    status: 'draft',
    coverStyle: 'note',
    content: [
      '这是一篇草稿，准备整理成更完整的效率实践文章。',
    ],
    heroTitle: 'FOCUS BETTER',
  },
];

const comments = [
  {
    name: '林知远',
    time: '1 小时前',
    body: '写得太好了，这套方法我刚好用在学编程上，已经看到效果了。',
    reply: '很高兴对你有帮助，继续加油。',
  },
  {
    name: '小满',
    time: '2 小时前',
    body: '拆解知识结构这个部分特别受用，我以前总是学着学着就乱了。',
    reply: '',
  },
  {
    name: '书海拾贝',
    time: '3 小时前',
    body: '请问作者有推荐的笔记工具吗？想更好地输出和复盘。',
    reply: '',
  },
];

const drafts = [
  {
    id: 101,
    title: '我常用的 AI 工具清单',
    desc: '整理了提升学习、写作和效率的 AI 工具，持续更新中。',
    time: '最后修改：2026-05-12 09:08',
  },
  {
    id: 102,
    title: '如何建立早起习惯？',
    desc: '从目标、环境和奖励机制三个方面拆解早起习惯。',
    time: '最后修改：2026-05-11 16:22',
  },
];

const quickActions = [
  { key: 'forum', title: '论坛', desc: '交流讨论', icon: 'chat', color: '#2fb67d', path: '/pages/forum/index' },
  { key: 'zones', title: '专区', desc: '精选内容', icon: 'diamond', color: '#ffb74a', path: '/pages/zones/index' },
  { key: 'search', title: '头条', desc: '最新动态', icon: 'star', color: '#4f9df7', path: '/pages/search/index' },
];

const zones = [
  {
    id: 'zone-1',
    title: '高效学习研究所',
    desc: '掌握科学学习方法，提升学习效率。',
    members: '12.3 万成员',
    coverStyle: 'book',
  },
  {
    id: 'zone-2',
    title: 'AI 实战研究所',
    desc: '探索 AI 工具与应用，解决真实工作问题。',
    members: '8.7 万成员',
    coverStyle: 'ai',
  },
  {
    id: 'zone-3',
    title: '读书笔记专区',
    desc: '记录书籍精华，沉淀思考与收获。',
    members: '15.6 万成员',
    coverStyle: 'note',
  },
  {
    id: 'zone-4',
    title: '个人成长营',
    desc: '建立成长系统，成为更好的自己。',
    members: '9.4 万成员',
    coverStyle: 'book',
  },
];

const messages = [
  {
    id: 'msg-1',
    name: '论坛助手',
    avatarText: '论',
    preview: '你关注的帖子新增了 12 条回复，建议优先查看。',
    time: '8 分钟前',
    scene: '论坛回复',
    unreadCount: 3,
  },
  {
    id: 'msg-2',
    name: '知行社运营',
    avatarText: '社',
    preview: '本周精选专区已更新，新增 4 篇深度内容。',
    time: '1 小时前',
    scene: '星球通知',
    unreadCount: 1,
  },
  {
    id: 'msg-3',
    name: '小满',
    avatarText: '满',
    preview: '你的那篇学习方法文章我很喜欢，想和你交流一下细节。',
    time: '昨天',
    scene: '私信会话',
    unreadCount: 0,
  },
  {
    id: 'msg-4',
    name: '头条提醒',
    avatarText: '头',
    preview: 'AI 工具专区热度上升，本周讨论量提升了 37%。',
    time: '昨天',
    scene: '头条提醒',
    unreadCount: 2,
  },
];

const profile = {
  name: '星球用户',
  level: 'LV.3',
  brief: '持续学习，知行合一。',
  avatarText: '星',
};

const myStats = [
  { label: '我的帖子', value: '12' },
  { label: '收到的赞', value: '36' },
  { label: '我的收藏', value: '8' },
];

const myMenus = [
  { title: '我的帖子', desc: '查看已发布与草稿内容', color: '#2fb67d' },
  { title: '我的收藏', desc: '管理收藏的内容详情', color: '#ffb74a' },
  { title: '浏览记录', desc: '继续阅读最近浏览内容', color: '#4f9df7' },
  { title: '下载管理', desc: '查看图片、文件下载记录', color: '#2fb67d' },
];

const myServices = [
  { title: '设置', desc: '账号管理、通知和隐私设置', color: '#dfe5ea', url: '/pages/setting/index' },
  { title: '帮助与反馈', desc: '提交问题与功能建议', color: '#dfe5ea', url: '/pages/feedback/index' },
];

const favoritePostIds = [1, 4];
const historyPostIds = [1, 2, 3];
const myPostIds = [1, 5];

const searchKeywords = ['学习方法', '时间管理', 'AI 工具', '读书笔记', '自我提升'];

function getPublishedPosts() {
  return posts.filter((item) => item.status === 'published');
}

function getDraftPosts() {
  return posts.filter((item) => item.status === 'draft');
}

function getPostById(id) {
  const postId = Number(id);
  return posts.find((item) => item.id === postId) || posts[0];
}

function getPostsByIds(ids = []) {
  return ids.map((id) => getPostById(id)).filter(Boolean);
}

function searchPosts(keyword) {
  const value = (keyword || '').trim();
  if (!value) return getPublishedPosts();
  return getPublishedPosts().filter(
    (item) =>
      item.title.includes(value) ||
      item.desc.includes(value) ||
      item.category.includes(value) ||
      item.author.includes(value),
  );
}

function getMessageSummary() {
  const unreadCount = messages.reduce((sum, item) => sum + item.unreadCount, 0);
  return [
    { label: '待处理', value: String(unreadCount).padStart(2, '0') },
    { label: '会话数', value: String(messages.length).padStart(2, '0') },
    { label: '今日更新', value: '12' },
  ];
}

function getFavoritePosts() {
  return getPostsByIds(favoritePostIds).filter((item) => item.status === 'published');
}

function getHistoryPosts() {
  return getPostsByIds(historyPostIds).filter((item) => item.status === 'published');
}

function getMyPosts() {
  return getPostsByIds(myPostIds);
}

export {
  comments,
  drafts,
  favoritePostIds,
  historyPostIds,
  myMenus,
  myServices,
  myStats,
  myPostIds,
  posts,
  profile,
  quickActions,
  searchKeywords,
  zones,
  messages,
  getDraftPosts,
  getFavoritePosts,
  getHistoryPosts,
  getMessageSummary,
  getMyPosts,
  getPostById,
  getPostsByIds,
  getPublishedPosts,
  searchPosts,
};
