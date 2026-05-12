import { getPublishedPosts, searchKeywords, searchPosts } from '~/mock/community';

Page({
  data: {
    activeSearch: '学习方法',
    hotKeywords: searchKeywords,
    posts: searchPosts('学习方法'),
    fallbackCount: getPublishedPosts().length,
  },

  handleInput(e) {
    this.setData({
      activeSearch: e.detail.value,
    });
  },

  doSearch() {
    const keyword = this.data.activeSearch.trim();
    this.setData({
      activeSearch: keyword,
      posts: searchPosts(keyword),
    });
  },

  applyKeyword(e) {
    const { keyword } = e.currentTarget.dataset;
    this.setData({
      activeSearch: keyword,
      posts: searchPosts(keyword),
    });
  },

  clearSearch() {
    this.setData({
      activeSearch: '',
      posts: getPublishedPosts(),
    });
  },

  goDetail(e) {
    wx.navigateTo({
      url: `/pages/detail/index?id=${e.currentTarget.dataset.id}`,
    });
  },

  goBack() {
    wx.navigateBack();
  },
});
