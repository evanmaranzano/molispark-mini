import { getFavoritePosts } from '~/mock/community';

Page({
  data: {
    posts: getFavoritePosts(),
  },

  navigateBack() {
    wx.navigateBack();
  },

  goDetail(e) {
    wx.navigateTo({
      url: `/pages/detail/index?id=${e.currentTarget.dataset.id}`,
    });
  },
});
