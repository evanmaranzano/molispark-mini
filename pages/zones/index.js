import { zones } from '~/mock/community';

Page({
  data: {
    zones,
  },

  navigateBack() {
    wx.navigateBack();
  },

  goForum() {
    wx.navigateTo({
      url: '/pages/forum/index',
    });
  },
});
