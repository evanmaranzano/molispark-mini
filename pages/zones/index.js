import { zones } from '~/mock/community';
import loginGuard from '~/behaviors/loginGuard';

Page({
  behaviors: [loginGuard],
  data: {
    zones,
  },

  onShow() {
    this.checkLoginGuard();
  },

  navigateBack() {
    wx.navigateBack();
  },

  goForum(e) {
    const { title } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/forum/index?zone=${title || ''}` });
  },
});
