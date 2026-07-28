const { submitFeedback } = require('~/utils/db');

Page({
  data: {
    content: '',
    submitting: false,
  },

  navigateBack() {
    wx.navigateBack();
  },

  handleInput(e) {
    this.setData({ content: e.detail.value });
  },

  async submit() {
    const content = this.data.content.trim();
    if (!content) {
      wx.showToast({ title: '请先输入反馈内容', icon: 'none' });
      return;
    }
    if (content.length > 500) {
      wx.showToast({ title: '反馈请控制在 500 字以内', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    try {
      const app = getApp();
      const { openid } = app.globalData;
      await submitFeedback(content, openid);
      wx.showToast({ title: '反馈已提交', icon: 'success' });
      this.setData({ content: '' });
      setTimeout(() => wx.navigateBack(), 500);
    } catch (err) {
      console.error('submit feedback failed', err);
      wx.showToast({ title: '提交失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
