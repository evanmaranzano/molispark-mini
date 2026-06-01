import { zones } from '~/mock/community';

Page({
  data: {
    zones,
  },

  navigateBack() {
    wx.navigateBack();
  },

  goForum(e) {
    const { title } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/forum/index?zone=${title || ''}` });
  },
});
