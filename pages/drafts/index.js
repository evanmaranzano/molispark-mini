const { getDrafts, removeById } = require('~/utils/db');
const { withMockFallback } = require('~/utils/mockFallback');
const mock = require('~/mock/community');
const loginGuard = require('~/behaviors/loginGuard');
const { formatTime } = require('~/utils/time');

Page({
  behaviors: [loginGuard],

  data: {
    drafts: [],
    loading: true,
    loadError: false,
  },

  onShow() {
    if (this.checkLoginGuard()) this.loadDrafts();
  },

  onLoginGuardPassed() {
    this.loadDrafts();
  },

  onLogined() {
    this.setData({ showLoginModal: false });
    if (typeof this.onLoginGuardPassed === 'function') this.onLoginGuardPassed();
  },

  onLoginModalClose() {
    this.setData({ showLoginModal: false });
  },

  async loadDrafts() {
    const app = getApp();
    const openid = app.globalData.openid || 'local-openid';
    const result = await withMockFallback(
      () => getDrafts(openid),
      () => mock.drafts
    );
    this.setData({
      drafts: (Array.isArray(result) ? result : []).map((item) => ({ ...item, timeText: formatTime(item.updatedAt || item.time) })),
      loading: false,
      loadError: Boolean(result && result.__loadError),
    });
  },

  retryLoad() {
    this.setData({ loadError: false, loading: true });
    this.loadDrafts();
  },

  navigateBack() {
    wx.navigateBack();
  },

  editDraft(e) {
    wx.navigateTo({
      url: `/pages/publishForm/index?id=${e.currentTarget.dataset.id}`,
    });
  },

  deleteDraft(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await removeById('posts', id);
          this.setData({
            drafts: this.data.drafts.filter((item) => String(item._id || item.id) !== String(id)),
          });
          wx.showToast({ title: '已删除', icon: 'success' });
        } catch (err) {
          wx.showToast({ title: '删除失败', icon: 'none' });
        }
      },
    });
  },
});
