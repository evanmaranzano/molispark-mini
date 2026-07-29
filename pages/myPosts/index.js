const { query, removeById } = require('~/utils/db');
const { withMockFallback } = require('~/utils/mockFallback');
const mock = require('~/mock/community');
const loginGuard = require('~/behaviors/loginGuard');
const { formatTime } = require('~/utils/time');

Page({
  behaviors: [loginGuard],

  data: {
    posts: [],
    loading: true,
    loadError: false,
  },

  onShow() {
    if (this.checkLoginGuard()) this.loadPosts();
  },

  onLoginGuardPassed() {
    this.loadPosts();
  },

  async loadPosts() {
    const app = getApp();
    const openid = app.globalData.openid || 'local-openid';
    const result = await withMockFallback(
      () => query('posts', { _openid: openid }, { orderBy: 'updatedAt', order: 'desc' }),
      () => mock.getMyPosts()
    );
    this.setData({
      posts: (Array.isArray(result) ? result : []).map((item) => ({ ...item, timeText: formatTime(item.createdAt || item.time) })),
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

  editPost(e) {
    wx.navigateTo({ url: `/pages/publishForm/index?id=${e.currentTarget.dataset.id}` });
  },

  deletePost(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await removeById('posts', id);
          this.setData({ posts: this.data.posts.filter((item) => String(item._id || item.id) !== String(id)) });
          wx.showToast({ title: '已删除', icon: 'success' });
        } catch (err) {
          wx.showToast({ title: '删除失败', icon: 'none' });
        }
      },
    });
  },
});
