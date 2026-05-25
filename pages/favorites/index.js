import { getCollectedPosts } from '~/utils/db';
import { withMockFallback } from '~/utils/mockFallback';
import { getFavoritePosts } from '~/mock/community';

Page({
  data: {
    posts: [],
    loading: true,
  },

  onShow() {
    this.loadFavorites();
  },

  async loadFavorites() {
    const app = getApp();
    const openid = app.globalData.openid || 'local-openid';
    const posts = await withMockFallback(
      () => getCollectedPosts(openid),
      () => getFavoritePosts()
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
