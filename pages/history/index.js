import { getHistoryPosts } from '~/mock/community';

Page({
  data: {
    posts: getHistoryPosts(),
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
