Page({
  data: {
    groups: [
      ['通用设置', '通知设置'],
      ['深色模式', '字体大小', '播放设置'],
      ['账号安全', '隐私'],
    ],
  },

  navigateBack() {
    wx.navigateBack();
  },

  handleTap(e) {
    wx.showToast({
      title: e.currentTarget.dataset.title,
      icon: 'none',
    });
  },
});
