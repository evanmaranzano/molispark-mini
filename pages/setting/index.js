const SETTINGS_KEY = 'appSettings';

Page({
  navigateBack() {
    wx.navigateBack();
  },

  clearCache() {
    wx.removeStorageSync(SETTINGS_KEY);
    wx.removeStorageSync('homeOper');
    wx.showToast({ title: '本地缓存已清除', icon: 'none' });
  },

  goPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/index' });
  },

  showAbout() {
    wx.showModal({
      title: '关于摩力创境',
      content: '摩力创境社区小程序\n版本 0.1.0',
      showCancel: false,
    });
  },
});
