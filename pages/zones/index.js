import { getPosts } from '~/utils/db';
import { withMockFallback } from '~/utils/mockFallback';
import { getFeaturedPosts } from '~/mock/community';
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
    if (this.checkLoginGuard()) this.loadFeatured();
  },

  onLoginGuardPassed() {
    this.loadFeatured();
  },

  async loadFeatured() {
    const result = await withMockFallback(
      () => getPosts({ where: { featured: true }, limit: 20 }),
      () => getFeaturedPosts()
    );
    this.setData({
      posts: (Array.isArray(result) ? result : []).map((item) => ({ ...item, timeText: formatTime(item.createdAt || item.time) })),
      loading: false,
      loadError: Boolean(result && result.__loadError),
    });
  },

  retryLoad() {
    this.setData({ loadError: false, loading: true });
    this.loadFeatured();
  },

  navigateBack() {
    wx.navigateBack();
  },

  goDetail(e) {
    wx.navigateTo({ url: `/pages/detail/index?id=${e.currentTarget.dataset.id}` });
  },
});
