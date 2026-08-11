import { getActivityById, getSignup, signupActivity, cancelSignup, removeActivity } from '~/utils/db';
import { getTempFileURL } from '~/utils/storage';
import { withMockFallbackOne } from '~/utils/mockFallback';
import { getActivityById as getMockActivityById } from '~/mock/community';

const { getSession, isProfileComplete } = require('~/utils/auth');
const { isActivityClosed } = require('~/utils/activityStatus');

const SIGNUP_ERROR_TEXT = {
  QUOTA_FULL: '名额已满',
  ACTIVITY_CLOSED: '报名已截止',
  ACTIVITY_NOT_FOUND: '活动不存在',
  MISSING_NAME: '请填写姓名',
  NAME_TOO_LONG: '姓名过长',
  INVALID_PHONE: '手机号格式不正确',
  NOTE_TOO_LONG: '备注过长',
};

Page({
  data: {
    activity: null,
    loading: true,
    loadError: false,
    signed: false,
    name: '',
    phone: '',
    note: '',
    submitting: false,
    showLoginModal: false,
    isAdmin: false,
  },

  onLoad(option) {
    this.activityId = option && option.id ? String(option.id) : '';
    if (!this.activityId) {
      this.setData({ loading: false, loadError: true });
      return;
    }
    this.loadAll();
  },

  async loadAll() {
    await this.loadActivity();
    await this.loadSignupState();
  },

  async loadActivity() {
    const result = await withMockFallbackOne(
      () => getActivityById(this.activityId),
      () => getMockActivityById(this.activityId)
    );
    if (result && result.__loadError) {
      this.setData({ activity: null, loading: false, loadError: true });
      return;
    }
    this.setData({
      activity: result ? this.decorate(result) : null,
      loading: false,
      loadError: !result,
      isAdmin: this.computeIsAdmin(),
    });
    if (result) this.resolveVideos(result.videos);
  },

  async resolveVideos(videos) {
    if (!videos || !videos.length) return;
    try {
      const urls = await getTempFileURL(videos);
      this.setData({ 'activity.videos': urls });
    } catch (err) {
      // 静默失败，保留原 fileID
    }
  },

  computeIsAdmin() {
    const session = getSession();
    return Boolean(session && session.profile && session.profile.role === 'admin');
  },

  decorate(item) {
    const quota = Number(item.quota) || 0;
    const count = item.signupCount || 0;
    return {
      ...item,
      quotaText: quota > 0 ? `${count}/${quota} 人` : `${count} 人已报名（不限名额）`,
      full: quota > 0 && count >= quota,
      ended: isActivityClosed(item),
    };
  },

  async loadSignupState() {
    const session = getSession();
    if (!session || !session.openid) return;
    try {
      const signup = await getSignup(this.activityId, session.openid);
      const signed = Boolean(signup && signup.status === 'signed');
      this.setData({
        signed,
        name: signed ? signup.name || '' : this.data.name,
        phone: signed ? signup.phone || '' : this.data.phone,
      });
    } catch (err) {
      // 静默失败，保持未报名态
    }
  },

  isLoggedIn() {
    const session = getSession();
    return isProfileComplete(session ? session.profile : null);
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value || '' });
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value || '' });
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value || '' });
  },

  async onSignup() {
    if (this.data.submitting || this.data.signed) return;
    if (!this.data.activity || isActivityClosed(this.data.activity)) {
      if (this.data.activity && !this.data.activity.ended) {
        this.setData({ 'activity.ended': true });
      }
      wx.showToast({ title: '报名已截止', icon: 'none' });
      return;
    }
    if (!this.isLoggedIn()) {
      this.setData({ showLoginModal: true });
      return;
    }

    const name = (this.data.name || '').trim();
    const phone = (this.data.phone || '').trim();
    const note = (this.data.note || '').trim();
    if (!name) {
      wx.showToast({ title: '请填写姓名', icon: 'none' });
      return;
    }
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      const result = await signupActivity(this.activityId, { name, phone, note });
      if (result && result.signed) {
        wx.showToast({ title: '报名成功', icon: 'success' });
        this.setData({ signed: true });
        await this.loadActivity();
      } else {
        const text = SIGNUP_ERROR_TEXT[result && result.code] || '报名失败，请重试';
        wx.showToast({ title: text, icon: 'none' });
      }
    } finally {
      this.setData({ submitting: false });
    }
  },

  onCancel() {
    if (this.data.submitting || !this.data.signed) return;
    wx.showModal({
      title: '取消报名',
      content: '确定取消本次报名吗？',
      success: async (res) => {
        if (!res.confirm) return;
        this.setData({ submitting: true });
        try {
          await cancelSignup(this.activityId);
          wx.showToast({ title: '已取消报名', icon: 'none' });
          this.setData({ signed: false });
          await this.loadActivity();
        } finally {
          this.setData({ submitting: false });
        }
      },
    });
  },

  onRemove() {
    if (!this.data.isAdmin || this.data.submitting) return;
    wx.showModal({
      title: '删除活动',
      content: '删除后不可恢复，该活动的报名记录也会一并清除。确定删除吗？',
      confirmColor: '#e6432d',
      success: async (res) => {
        if (!res.confirm) return;
        this.setData({ submitting: true });
        try {
          const result = await removeActivity(this.activityId);
          if (result && result.code) {
            wx.showToast({ title: result.code === 'FORBIDDEN' ? '无删除权限' : '删除失败', icon: 'none' });
            return;
          }
          wx.showToast({ title: '已删除', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 800);
        } finally {
          this.setData({ submitting: false });
        }
      },
    });
  },

  onLogined() {
    this.setData({ showLoginModal: false });
    this.loadSignupState();
  },

  retryLoad() {
    this.setData({ loadError: false, loading: true });
    this.loadAll();
  },

  navigateBack() {
    wx.navigateBack();
  },
});
