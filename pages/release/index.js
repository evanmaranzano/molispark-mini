import { getDrafts } from '~/utils/db';
import { drafts as mockDrafts } from '~/mock/community';

const publishOptions = [
  { id: 'post', title: '发帖子', desc: '分享观点、经验和见解', color: '#2fb67d', icon: '✎' },
  { id: 'image', title: '上传图片', desc: '分享图片内容', color: '#4f9df7', icon: '🖼' },
  { id: 'file', title: '发布文件', desc: '上传资料与附件', color: '#ef9c2f', icon: '📄' },
  { id: 'draft', title: '草稿箱', desc: '查看和管理你的草稿', color: '#ef9c2f', icon: '🗂' },
];

Page({
  data: {
    publishOptions,
    draftCount: 0,
  },

  onShow() {
    this.loadDraftCount();
  },

  async loadDraftCount() {
    const app = getApp();
    const { openid } = app.globalData;
    try {
      const drafts = await getDrafts(openid);
      this.setData({ draftCount: drafts.length || mockDrafts.length });
    } catch (err) {
      this.setData({ draftCount: mockDrafts.length });
    }
  },

  handleOptionTap(e) {
    const { id } = e.currentTarget.dataset;
    if (id === 'draft') {
      wx.navigateTo({ url: '/pages/drafts/index' });
      return;
    }
    wx.navigateTo({ url: `/pages/publishForm/index?type=${id}` });
  },
});
