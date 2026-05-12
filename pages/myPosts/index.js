import { getMyPosts } from '~/mock/community';

Page({
  data: {
    posts: getMyPosts(),
  },

  navigateBack() {
    wx.navigateBack();
  },

  goDetail(e) {
    wx.navigateTo({
      url: `/pages/detail/index?id=${e.currentTarget.dataset.id}`,
    });
  },

  editPost() {
    wx.navigateTo({
      url: '/pages/publishForm/index',
    });
  },

  deletePost() {
    wx.showToast({
      title: '已删除',
      icon: 'none',
    });
  },
});
