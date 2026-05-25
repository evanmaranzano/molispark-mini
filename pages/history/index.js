import { query, _ } from '~/utils/db';
import { withMockFallback } from '~/utils/mockFallback';
import { getHistoryPosts } from '~/mock/community';

Page({
  data: {
    posts: [],
    loading: true,
  },

  onShow() {
    this.loadHistory();
  },

  async loadHistory() {
    const app = getApp();
    const openid = app.globalData.openid || 'local-openid';
    const posts = await withMockFallback(
      async () => {
        const history = await query('history', { openid }, { orderBy: 'viewedAt', order: 'desc', limit: 50 });
        if (!history.length) return [];
        const postIds = history.map((h) => h.postId);
        return query('posts', { _id: _.in(postIds) });
      },
      () => getHistoryPosts()
    );
    this.setData({ posts, loading: false });
  },

  navigateBack() {
    wx.navigateBack();
  },

  goDetail(e) {
    wx.navigateTo({ url: `/pages/detail/index?id=${e.currentTarget.dataset.id}` });
  },
});
