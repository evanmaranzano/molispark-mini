import { getCollectedPosts } from '~/utils/db';
import { withMockFallback } from '~/utils/mockFallback';
import { getFavoritePosts } from '~/mock/community';
import loginGuard from '~/behaviors/loginGuard';

Page({
  behaviors: [loginGuard],

  data: {
    posts: [],
    loading: true,
    loadError: false,
  },

  onShow() {
    if (this.checkLoginGuard()) this.loadFavorites();
  },

  onLoginGuardPassed() {
    this.loadFavorites();
  },

  async loadFavorites() {
    const app = getApp();
    const openid = app.globalData.openid || 'local-openid';
    const result = await withMockFallback(
      () => getCollectedPosts(openid),
      () => getFavoritePosts()
    );
    this.setData({
      posts: Array.isArray(result) ? result : [],
      loading: false,
      loadError: Boolean(result && result.__loadError),
    });
  },

  navigateBack() {
    wx.navigateBack();
  },

  goDetail(e) {
    wx.navigateTo({ url: `/pages/detail/index?id=${e.currentTarget.dataset.id}` });
  },
});
