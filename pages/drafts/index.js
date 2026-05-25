const { getDrafts, removeById } = require('~/utils/db');
const { withMockFallback } = require('~/utils/mockFallback');
const mock = require('~/mock/community');

Page({
  data: {
    drafts: [],
    loading: true,
  },

  onShow() {
    this.loadDrafts();
  },

  async loadDrafts() {
    const app = getApp();
    const openid = app.globalData.openid || 'local-openid';
    const drafts = await withMockFallback(
      () => getDrafts(openid),
      () => mock.drafts
    );
    this.setData({ drafts, loading: false });
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
