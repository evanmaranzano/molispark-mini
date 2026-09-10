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

function sortPosts(list, sortBy) {
  const posts = list.slice();
  if (sortBy === 'hot') {
    posts.sort((a, b) => (Number(b.viewCount || b.views) || 0) - (Number(a.viewCount || a.views) || 0));
  } else {
    posts.sort((a, b) => {
      const tb = new Date(b.createdAt || b.time || 0).getTime() || 0;
      const ta = new Date(a.createdAt || a.time || 0).getTime() || 0;
      return tb - ta;
    });
  }
  return posts;
}

Page({
  data: {
    activeSearch: '',
    hotKeywords: buildKeywordItems(searchKeywords, ''),
    posts: [],
    rawPosts: [],
    resultText: '',
    searching: false,
    loadError: false,
    sortBy: 'latest',
    sortLabel: '最新⌄',
  },

  onLoad() {
    this.loadAll();
  },

  applyCurrentSort(list) {
    return sortPosts(list, this.data.sortBy);
  },

  async loadAll() {
    const result = await withMockFallback(
      () => getPosts({ limit: 50 }),
      () => getPublishedPosts()
    );
    const posts = toPostList(result);
    this.setData({
      rawPosts: posts,
      posts: this.applyCurrentSort(posts),
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
      rawPosts: filtered,
      posts: this.applyCurrentSort(filtered),
      hotKeywords: buildKeywordItems(searchKeywords, keyword),
      resultText: `找到 ${filtered.length} 篇相关内容`,
      searching: false,
      loadError: Boolean(result && result.__loadError),
    });
  },

  toggleSort() {
    const sortBy = this.data.sortBy === 'latest' ? 'hot' : 'latest';
    const sortLabel = sortBy === 'latest' ? '最新⌄' : '最热⌄';
    this.setData({
      sortBy,
      sortLabel,
      posts: sortPosts(this.data.rawPosts, sortBy),
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
