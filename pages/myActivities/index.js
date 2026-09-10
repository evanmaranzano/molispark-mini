import { getMySignups } from '~/utils/db';
import { withMockFallback } from '~/utils/mockFallback';
import loginGuard from '~/behaviors/loginGuard';

Page({
  behaviors: [loginGuard],

  data: {
    signups: [],
    loading: true,
    loadError: false,
  },

  onShow() {
    if (this.checkLoginGuard()) this.loadSignups();
  },

  onLoginGuardPassed() {
    this.loadSignups();
  },

  onLogined() {
    this.setData({ showLoginModal: false });
    if (typeof this.onLoginGuardPassed === 'function') this.onLoginGuardPassed();
  },

  onLoginModalClose() {
    this.setData({ showLoginModal: false });
  },

  async loadSignups() {
    const app = getApp();
    const openid = app.globalData.openid || 'local-openid';
    const result = await withMockFallback(
      () => getMySignups(openid),
      () => []
    );
    this.setData({
      signups: Array.isArray(result) ? result : [],
      loading: false,
      loadError: Boolean(result && result.__loadError),
    });
  },

  retryLoad() {
    this.setData({ loadError: false, loading: true });
    this.loadSignups();
  },

  navigateBack() {
    wx.navigateBack();
  },

  goDetail(e) {
    wx.navigateTo({ url: `/pages/activityDetail/index?id=${e.currentTarget.dataset.id}` });
  },

  goActivities() {
    wx.navigateTo({ url: '/pages/activities/index' });
  },
});
