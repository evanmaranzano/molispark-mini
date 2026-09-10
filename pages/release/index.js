import { getDrafts } from '~/utils/db';
import { withMockFallback } from '~/utils/mockFallback';
import { drafts as mockDrafts } from '~/mock/community';
import loginGuard from '~/behaviors/loginGuard';

const publishOptions = [
  { id: 'post', title: '写文章', desc: '分享观点、经验和见解', color: '#2f8a62', icon: '✎' },
  { id: 'image', title: '图文分享', desc: '用图片记录你的观察', color: '#5c8fd7', icon: '🖼' },
  { id: 'draft', title: '草稿箱', desc: '继续未完成的内容', color: '#b77a38', icon: '🗂' },
];

Page({
  behaviors: [loginGuard],

  data: {
    publishOptions,
    draftCount: 0,
  },

  onShow() {
    this.syncTabBar();
    if (this.checkLoginGuard()) this.loadDraftCount();
  },

  onLoginGuardPassed() {
    this.loadDraftCount();
  },

  onLogined() {
    this.setData({ showLoginModal: false });
    if (typeof this.onLoginGuardPassed === 'function') this.onLoginGuardPassed();
  },

  onLoginModalClose() {
    this.setData({ showLoginModal: false });
  },

  syncTabBar() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar && tabBar.syncActiveTab) tabBar.syncActiveTab();
  },

  async loadDraftCount() {
    const app = getApp();
    const { openid } = app.globalData;
    if (!openid) {
      this.setData({ draftCount: 0 });
      return;
    }
    const result = await withMockFallback(
      () => getDrafts(openid),
      () => mockDrafts
    );
    this.setData({ draftCount: Array.isArray(result) ? result.length : 0 });
  },

  handleOptionTap(e) {
    if (!this.checkLoginGuard()) return;
    const { id } = e.currentTarget.dataset;
    if (id === 'draft') {
      wx.navigateTo({ url: '/pages/drafts/index' });
      return;
    }
    wx.navigateTo({ url: `/pages/publishForm/index?type=${id}` });
  },
});
