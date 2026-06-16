import { getPosts } from '~/utils/db';

function buildTabItems(list, currentValue) {
  return list.map((item) => ({
    label: item,
    value: item,
    className: item === currentValue ? 'segment__item segment__item--active' : 'segment__item',
  }));
}

function buildCategoryItems(list, currentValue) {
  return list.map((item) => ({
    label: item,
    value: item,
    className: item === currentValue ? 'tag tag--active' : 'tag',
  }));
}

const TAB_VALUES = ['推荐', '最新', '关注'];
// 标签值必须和帖子 category 字段精确一致，否则云端 where({category}) 匹配不到、会触发 mock fallback
const CATEGORY_VALUES = ['全部', '学习方法', 'AI 工具', '读书笔记', '自我提升'];
const DEFAULT_TAB = '推荐';
const DEFAULT_CATEGORY = '全部';

Page({
  data: {
    tabs: buildTabItems(TAB_VALUES, DEFAULT_TAB),
    categoryTabs: buildCategoryItems(CATEGORY_VALUES, DEFAULT_CATEGORY),
    currentTab: DEFAULT_TAB,
    currentCategory: DEFAULT_CATEGORY,
    zoneTitle: '',
    posts: [],
    loading: true,
  },

  onLoad(options) {
    if (options.zone) {
      this.setData({ zoneTitle: options.zone });
    }
    this.loadPosts();
  },

  async loadPosts() {
    this.setData({ loading: true });
    const { currentTab, currentCategory } = this.data;
    const where = { status: 'published' };
    if (currentCategory !== '全部') {
      where.category = currentCategory;
    }
    const orderBy = currentTab === '最新' ? 'createdAt' : 'likes';
    const posts = await getPosts({ where, orderBy, limit: 50 });
    this.setData({ posts: posts || [], loading: false });
  },

  handleTabTap(e) {
    const { value } = e.currentTarget.dataset;
    this.setData({
      currentTab: value,
      tabs: buildTabItems(TAB_VALUES, value),
    });
    this.loadPosts();
  },

  handleCategoryTap(e) {
    const { value } = e.currentTarget.dataset;
    this.setData({
      currentCategory: value,
      categoryTabs: buildCategoryItems(CATEGORY_VALUES, value),
    });
    this.loadPosts();
  },

  navigateBack() {
    wx.navigateBack();
  },

  goDetail(e) {
    wx.navigateTo({
      url: `/pages/detail/index?id=${e.currentTarget.dataset.id}`,
    });
  },
});
