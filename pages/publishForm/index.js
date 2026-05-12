Page({
  data: {
    title: '',
    category: '学习方法',
    content: '',
  },

  navigateBack() {
    wx.navigateBack();
  },

  handleInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [field]: e.detail.value,
    });
  },

  saveDraft() {
    wx.showToast({
      title: '草稿已保存',
      icon: 'none',
    });
  },

  publish() {
    wx.showToast({
      title: '发布成功',
      icon: 'none',
    });
  },
});
