import { comments, getPostById } from '~/mock/community';

Page({
  data: {
    post: null,
    comments,
    actionList: [
      { key: 'like', label: '点赞' },
      { key: 'collect', label: '收藏' },
      { key: 'share', label: '分享' },
      { key: 'comment', label: '评论' },
    ],
  },

  onLoad(options) {
    const post = getPostById(options.id);
    this.setData({ post });
  },

  navigateBack() {
    wx.navigateBack();
  },

  handleAction(e) {
    const { label } = e.currentTarget.dataset;
    wx.showToast({
      title: `${label}成功`,
      icon: 'none',
    });
  },
});
