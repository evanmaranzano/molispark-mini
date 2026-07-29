import { query, _ } from '~/utils/db';
import { withMockFallback } from '~/utils/mockFallback';
import { getHistoryPosts } from '~/mock/community';
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
    if (this.checkLoginGuard()) this.loadHistory();
  },

  onLoginGuardPassed() {
    this.loadHistory();
  },

  async loadHistory() {
    const app = getApp();
    const openid = app.globalData.openid || 'local-openid';
    const result = await withMockFallback(
      async () => {
        const history = await query('history', { openid }, { orderBy: 'viewedAt', order: 'desc', limit: 50 });
        if (!history.length) return [];
        const postIds = history.map((h) => h.postId);
        const posts = await query('posts', { _id: _.in(postIds), status: 'published' });
        return postIds.map((postId) => posts.find((post) => String(post._id || post.id) === String(postId))).filter(Boolean);
      },
      () => getHistoryPosts()
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
});
