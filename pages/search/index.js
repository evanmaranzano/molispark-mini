import { getPosts } from '~/utils/db';
import { withMockFallback } from '~/utils/mockFallback';
import { getPublishedPosts, searchKeywords, searchPosts } from '~/mock/community';

const { formatTime } = require('~/utils/time');

function buildKeywordItems(list, currentValue) {
  return list.map((item) => ({
    label: item,
    value: item,
    className: item === currentValue ? 'keyword keyword--active' : 'keyword',
  }));
}

function toPostList(result) {
  const list = Array.isArray(result) ? result : [];
  return list.map((item) => ({ ...item, timeText: formatTime(item.createdAt || item.time) }));
}

Page({
  data: {
    activeSearch: '',
    hotKeywords: buildKeywordItems(searchKeywords, ''),
    posts: [],
    resultText: '',
    searching: false,
    loadError: false,
  },

  onLoad() {
    this.loadAll();
  },

  async loadAll() {
    const result = await withMockFallback(
      () => getPosts({ limit: 50 }),
      () => getPublishedPosts()
    );
    const posts = toPostList(result);
    this.setData({
      posts,
      resultText: `共 ${posts.length} 篇内容`,
      loadError: Boolean(result && result.__loadError),
    });
  },

  handleInput(e) {
    this.setData({ activeSearch: e.detail.value });
  },

  async doSearch() {
    const keyword = this.data.activeSearch.trim();
    if (!keyword) {
      this.loadAll();
      return;
    }
    this.setData({ searching: true });
    const result = await withMockFallback(
      async () => {
        const allPosts = await getPosts({ limit: 100 });
        return allPosts.filter(
          (item) =>
            (item.title && item.title.includes(keyword)) ||
            (item.desc && item.desc.includes(keyword)) ||
            (item.category && item.category.includes(keyword)) ||
            (item.author && item.author.includes(keyword))
        );
      },
      () => searchPosts(keyword)
    );
    const filtered = toPostList(result);
    this.setData({
      posts: filtered,
      hotKeywords: buildKeywordItems(searchKeywords, keyword),
      resultText: `找到 ${filtered.length} 篇相关内容`,
      searching: false,
      loadError: Boolean(result && result.__loadError),
    });
  },

  applyKeyword(e) {
    const { keyword } = e.currentTarget.dataset;
    this.setData({ activeSearch: keyword });
    this.doSearch();
  },

  clearSearch() {
    this.setData({ activeSearch: '' });
    this.loadAll();
  },

  goDetail(e) {
    wx.navigateTo({ url: `/pages/detail/index?id=${e.currentTarget.dataset.id}` });
  },

  retryLoad() {
    this.setData({ loadError: false, loading: true });
    this.loadAll();
  },

  goBack() {
    wx.navigateBack();
  },
});
