Page({
  data: {
    content: '',
  },

  navigateBack() {
    wx.navigateBack();
  },

  handleInput(e) {
    this.setData({
      content: e.detail.value,
    });
  },

  submit() {
    wx.showToast({
      title: '反馈已提交',
      icon: 'none',
    });
  },
});
