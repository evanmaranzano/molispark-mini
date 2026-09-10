import { getCollectedPosts, toggleCollect } from '~/utils/db';
import { withMockFallback } from '~/utils/mockFallback';
import { getFavoritePosts } from '~/mock/community';
import loginGuard from '~/behaviors/loginGuard';

const { formatTime } = require('~/utils/time');

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

  onLogined() {
    this.setData({ showLoginModal: false });
    if (typeof this.onLoginGuardPassed === 'function') this.onLoginGuardPassed();
  },

  onLoginModalClose() {
    this.setData({ showLoginModal: false });
  },

  async loadFavorites() {
    const app = getApp();
    const openid = app.globalData.openid || 'local-openid';
    const result = await withMockFallback(
      () => getCollectedPosts(openid),
      () => getFavoritePosts()
    );
    this.setData({
      posts: (Array.isArray(result) ? result : []).map((item) => ({ ...item, timeText: formatTime(item.createdAt || item.time) })),
      loading: false,
      loadError: Boolean(result && result.__loadError),
    });
  },

  retryLoad() {
    this.setData({ loadError: false, loading: true });
    this.loadFavorites();
  },

  navigateBack() {
    wx.navigateBack();
  },

  async onUncollect(e) {
    const { id } = e.currentTarget.dataset;
    const app = getApp();
    const openid = app.globalData.openid || 'local-openid';
    try {
      await toggleCollect(id, openid, true);
      this.setData({ posts: this.data.posts.filter((item) => String(item._id || item.id) !== String(id)) });
      wx.showToast({ title: '已取消收藏', icon: 'none' });
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  goDetail(e) {
    wx.navigateTo({ url: `/pages/detail/index?id=${e.currentTarget.dataset.id}` });
  },
});
