import { drafts } from '~/mock/community';

const publishOptions = [
  { id: 'post', title: '发帖子', desc: '分享观点、经验和见解', color: '#2fb67d', icon: '✎' },
  { id: 'image', title: '上传图片', desc: '分享图片内容', color: '#4f9df7', icon: '🖼' },
  { id: 'file', title: '发布文件', desc: '上传资料与附件', color: '#ef9c2f', icon: '📄' },
  { id: 'draft', title: '草稿箱', desc: '查看和管理你的草稿', color: '#ef9c2f', icon: '🗂' },
];

Page({
  data: {
    publishOptions,
    draftList: drafts.slice(0, 1),
  },
  handleOptionTap(e) {
    const { id } = e.currentTarget.dataset;
    if (id === 'draft') {
      wx.navigateTo({
        url: '/pages/drafts/index',
      });
      return;
    }
    wx.navigateTo({
      url: '/pages/publishForm/index',
    });
  },
  saveDraft() {
    wx.showToast({
      title: '草稿已保存',
      icon: 'none',
    });
  },
  release() {
    wx.showToast({
      title: '发布成功',
      icon: 'none',
    });
  },
});
