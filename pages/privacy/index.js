Page({
  data: {
    scrollInto: '',
  },

  onLoad(options) {
    const section = options && options.section ? String(options.section) : '';
    if (section === 'terms' || section === 'privacy') {
      this.setData({ scrollInto: section });
    }
  },

  navigateBack() {
    wx.navigateBack({
      fail: () => {
        wx.switchTab({ url: '/pages/home/index' });
      },
    });
  },
});
