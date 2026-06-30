import Message from 'tdesign-miniprogram/message/index';
import { getPosts, count } from '~/utils/db';
import { withMockFallback } from '~/utils/mockFallback';
import { getPublishedPosts, quickActions } from '~/mock/community';
import loginGuard from '~/behaviors/loginGuard';

function withAuthorInitial(list = []) {
  return list.map((item) => ({
    ...item,
    authorInitial: item.author ? item.author.slice(0, 1) : '',
  }));
}

Page({
  behaviors: [loginGuard],
  data: {
    enable: false,
    quickActions,
    recommendList: [],
    unreadCount: 0,
    loading: true,
  },

  onLoad(option) {
    this.consumeOperResult(option.oper);
    this.loadRecommend();
  },

  onShow() {
    this.syncTabBar();
    this.checkLoginGuard();
    this.consumeOperResult();
    this.loadUnreadCount();
  },

  syncTabBar() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar && tabBar.syncActiveTab) tabBar.syncActiveTab();
  },

  async loadRecommend() {
    const posts = await withMockFallback(
      () => getPosts({ limit: 4 }),
      () => getPublishedPosts().slice(0, 4)
    );
    this.setData({ recommendList: withAuthorInitial(posts), loading: false });
  },

  async loadUnreadCount() {
    try {
      const app = getApp();
      const { openid } = app.globalData;
      if (!openid) return;
      const total = await count('messages', { toOpenid: openid, read: false });
      this.setData({ unreadCount: total });
    } catch (err) {
      // 静默失败
    }
  },

  async onRefresh() {
    this.setData({ enable: true });
    try {
      await this.loadRecommend();
      await this.loadUnreadCount();
    } finally {
      this.setData({ enable: false });
    }
  },

  consumeOperResult(fallbackOper) {
    const oper = fallbackOper || wx.getStorageSync('homeOper');
    if (!oper) return;
    if (oper === 'release') {
      this.showOperMsg('发布成功');
    } else if (oper === 'save') {
      this.showOperMsg('草稿已保存');
    }
    wx.removeStorageSync('homeOper');
  },

  showOperMsg(content) {
    Message.success({
      context: this,
      offset: [96, 24],
      duration: 2400,
      content,
    });
  },

  handleFeatureTap(e) {
    const { path } = e.currentTarget.dataset;
    wx.navigateTo({ url: path });
  },

  handlePostTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/detail/index?id=${id}` });
  },

  goSearch() {
    wx.navigateTo({ url: '/pages/search/index' });
  },

  goZones() {
    wx.navigateTo({ url: '/pages/zones/index' });
  },

  goForum() {
    wx.navigateTo({ url: '/pages/forum/index' });
  },

  goMessages() {
    wx.navigateTo({ url: '/pages/message/index' });
  },

  goMy() {
    wx.switchTab({ url: '/pages/my/index' });
  },

  goRelease() {
    wx.switchTab({ url: '/pages/release/index' });
  },
});
