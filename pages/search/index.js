import { getPosts } from '~/utils/db';
import { withMockFallback } from '~/utils/mockFallback';
import { getPublishedPosts, searchKeywords, searchPosts } from '~/mock/community';

function buildKeywordItems(list, currentValue) {
  return list.map((item) => ({
    label: item,
    value: item,
    className: item === currentValue ? 'keyword keyword--active' : 'keyword',
  }));
}

Page({
  data: {
    activeSearch: '',
    hotKeywords: buildKeywordItems(searchKeywords, ''),
    posts: [],
    resultText: '',
    searching: false,
  },

  onLoad() {
    this.loadAll();
  },

  async loadAll() {
    const posts = await withMockFallback(
      () => getPosts({ limit: 50 }),
      () => getPublishedPosts()
    );
    this.setData({ posts, resultText: `共 ${posts.length} 篇内容` });
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
    const filtered = await withMockFallback(
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
    this.setData({
      posts: filtered,
      hotKeywords: buildKeywordItems(searchKeywords, keyword),
      resultText: `找到 ${filtered.length} 篇相关内容`,
      searching: false,
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

  goBack() {
    wx.navigateBack();
  },
});
