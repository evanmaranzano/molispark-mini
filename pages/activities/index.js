import { getActivities } from '~/utils/db';
import { withMockFallback } from '~/utils/mockFallback';
import { getActivities as getMockActivities } from '~/mock/community';

const { getSession } = require('~/utils/auth');

function decorate(item) {
  const quota = Number(item.quota) || 0;
  const count = item.signupCount || 0;
  return {
    ...item,
    timeText: item.startTime || '',
    quotaText: quota > 0 ? `${count}/${quota} 人` : `${count} 人已报名`,
    full: quota > 0 && count >= quota,
  };
}

Page({
  data: {
    activities: [],
    loading: true,
    loadError: false,
    isAdmin: false,
  },

  onLoad() {
    const session = getSession();
    this.setData({
      isAdmin: Boolean(session && session.profile && session.profile.role === 'admin'),
    });
    this.loadActivities();
  },

  onShow() {
    // 报名/取消后返回刷新人数
    if (!this.data.loading) this.loadActivities();
  },

  async loadActivities() {
    const result = await withMockFallback(
      () => getActivities(),
      () => getMockActivities()
    );
    this.setData({
      activities: (Array.isArray(result) ? result : []).map(decorate),
      loading: false,
      loadError: Boolean(result && result.__loadError),
    });
  },

  navigateBack() {
    wx.navigateBack();
  },

  goDetail(e) {
    wx.navigateTo({ url: `/pages/activityDetail/index?id=${e.currentTarget.dataset.id}` });
  },

  goPublish() {
    wx.navigateTo({ url: '/pages/activityPublish/index' });
  },
});
