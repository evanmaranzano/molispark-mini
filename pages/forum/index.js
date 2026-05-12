import { getPublishedPosts } from '~/mock/community';

Page({
  data: {
    tabs: ['推荐', '最新', '关注'],
    categoryTabs: ['学习', '职场', 'AI', '读书'],
    currentTab: '推荐',
    currentCategory: '学习',
    posts: getPublishedPosts(),
  },

  handleTabTap(e) {
    this.setData({ currentTab: e.currentTarget.dataset.value });
  },

  handleCategoryTap(e) {
    this.setData({ currentCategory: e.currentTarget.dataset.value });
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
