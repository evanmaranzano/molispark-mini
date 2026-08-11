import { getActivities } from '~/utils/db';
import { withMockFallback } from '~/utils/mockFallback';
import { getActivities as getMockActivities } from '~/mock/community';

const { getSession } = require('~/utils/auth');
const { isActivityClosed } = require('~/utils/activityStatus');

function decorate(item) {
  const quota = Number(item.quota) || 0;
  const count = item.signupCount || 0;
  const full = quota > 0 && count >= quota;
  const ended = isActivityClosed(item);
  let statusText = '报名中';
  if (full) statusText = '名额已满';
  if (ended) statusText = '已结束';
  return {
    ...item,
    timeText: item.startTime || '',
    quotaText: quota > 0 ? `${count}/${quota} 人` : `${count} 人已报名`,
    full,
    ended,
    statusText,
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
    const activities = (Array.isArray(result) ? result : [])
      .map(decorate)
      .sort((a, b) => Number(a.ended) - Number(b.ended));
    this.setData({
      activities,
      loading: false,
      loadError: Boolean(result && result.__loadError),
    });
  },

  retryLoad() {
    this.setData({ loadError: false, loading: true });
    this.loadActivities();
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
