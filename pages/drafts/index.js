import { drafts } from '~/mock/community';

Page({
  data: {
    drafts,
  },

  navigateBack() {
    wx.navigateBack();
  },

  editDraft() {
    wx.navigateTo({
      url: '/pages/publishForm/index',
    });
  },

  deleteDraft() {
    wx.showToast({
      title: '已删除',
      icon: 'none',
    });
  },
});
