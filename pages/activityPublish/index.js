import { createActivity } from '~/utils/db';
import loginGuard from '~/behaviors/loginGuard';

const { getSession } = require('~/utils/auth');

const TIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

Page({
  behaviors: [loginGuard],

  data: {
    isAdmin: false,
    checked: false,
    title: '',
    desc: '',
    location: '',
    startTime: '',
    endTime: '',
    quota: '',
    coverStyle: 'book',
    coverOptions: [
      { key: 'book', label: '绿色' },
      { key: 'ai', label: '青色' },
      { key: 'note', label: '暖色' },
    ],
    submitting: false,
  },

  onShow() {
    if (!this.checkLoginGuard()) return;
    const session = getSession();
    const isAdmin = Boolean(session && session.profile && session.profile.role === 'admin');
    this.setData({ isAdmin, checked: true });
  },

  onLoginGuardPassed() {
    this.onShow();
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: e.detail.value || '' });
  },

  onCoverTap(e) {
    this.setData({ coverStyle: e.currentTarget.dataset.key });
  },

  async onSubmit() {
    if (this.data.submitting) return;
    const { title, desc, location, startTime, endTime, quota, coverStyle } = this.data;

    if (!title.trim()) {
      wx.showToast({ title: '请填写活动标题', icon: 'none' });
      return;
    }
    if (startTime && !TIME_RE.test(startTime.trim())) {
      wx.showToast({ title: '开始时间格式：YYYY-MM-DD HH:mm', icon: 'none' });
      return;
    }
    if (endTime && !TIME_RE.test(endTime.trim())) {
      wx.showToast({ title: '结束时间格式：YYYY-MM-DD HH:mm', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      const result = await createActivity({
        title: title.trim(),
        desc: desc.trim(),
        location: location.trim(),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        quota,
        coverStyle,
      });
      if (result && result.code) {
        wx.showToast({ title: result.code === 'FORBIDDEN' ? '无发布权限' : '发布失败，请重试', icon: 'none' });
        return;
      }
      wx.showToast({ title: '发布成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 800);
    } finally {
      this.setData({ submitting: false });
    }
  },

  navigateBack() {
    wx.navigateBack();
  },
});
