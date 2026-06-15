import { getPosts } from '~/utils/db';
import { withMockFallback } from '~/utils/mockFallback';
import { getPublishedPosts } from '~/mock/community';

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
const CATEGORY_VALUES = ['全部', '学习', '职场', 'AI', '读书'];
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
    const posts = await withMockFallback(
      () => getPosts({ where, orderBy, limit: 50 }),
      () => {
        const filtered = getPublishedPosts().filter(
          (item) => currentCategory === '全部' || item.category.includes(currentCategory)
        );
        if (currentTab === '最新') {
          return filtered;
        }
        return filtered.slice().sort((a, b) => (b.likes || 0) - (a.likes || 0));
      }
    );
    this.setData({ posts, loading: false });
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
