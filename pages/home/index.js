import Message from 'tdesign-miniprogram/message/index';
import { getPublishedPosts, quickActions } from '~/mock/community';

Page({
  data: {
    enable: false,
    quickActions,
    recommendList: getPublishedPosts().slice(0, 4),
    unreadCount: 6,
  },
  onLoad(option) {
    if (option.oper === 'release') {
      this.showOperMsg('发布成功');
    } else if (option.oper === 'save') {
      this.showOperMsg('草稿已保存');
    }
  },
  onRefresh() {
    this.setData({ enable: true });
    setTimeout(() => {
      this.setData({ enable: false });
    }, 500);
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
    wx.navigateTo({
      url: `/pages/detail/index?id=${id}`,
    });
  },
  goSearch() {
    wx.navigateTo({
      url: '/pages/search/index',
    });
  },
  goZones() {
    wx.navigateTo({
      url: '/pages/zones/index',
    });
  },
  goForum() {
    wx.navigateTo({
      url: '/pages/forum/index',
    });
  },
  goMessages() {
    wx.navigateTo({
      url: '/pages/message/index',
    });
  },
  goMy() {
    wx.switchTab({
      url: '/pages/my/index',
    });
  },
  goRelease() {
    wx.switchTab({
      url: '/pages/release/index',
    });
  },
});
