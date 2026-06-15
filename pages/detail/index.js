import {
  _,
  addComment,
  callInteract,
  getComments,
  getPostById,
  isCollected,
  isLiked,
  recordHistory,
  toggleCollect,
  toggleLike,
  updatePost,
} from '~/utils/db';
import { withMockFallback, withMockFallbackOne } from '~/utils/mockFallback';
import { getPostById as mockGetPostById, comments as mockComments } from '~/mock/community';

function withNameInitial(list = []) {
  return list.map((item) => ({
    ...item,
    nameInitial: item.name ? item.name.slice(0, 1) : '',
  }));
}

function withAuthorInitial(post) {
  return {
    ...post,
    authorInitial: post.author ? post.author.slice(0, 1) : '',
  };
}

Page({
  data: {
    post: null,
    comments: [],
    liked: false,
    collected: false,
    commentText: '',
    showCommentInput: false,
    actionList: [
      { key: 'like', label: '点赞', icon: '👍' },
      { key: 'collect', label: '收藏', icon: '⭐' },
      { key: 'share', label: '分享', icon: '📤' },
      { key: 'comment', label: '评论', icon: '💬' },
    ],
  },

  onLoad(options) {
    this.postId = options.id;
    this.loadPost();
    this.loadComments();
    this.checkInteractionState();
  },

  async loadPost() {
    const post = await withMockFallbackOne(
      () => getPostById(this.postId),
      (id) => mockGetPostById(id),
      this.postId
    );
    if (post) {
      this.setData({ post: withAuthorInitial(post) });
      this.incrementViews(post);
      this.recordHistory();
    }
  },

  async loadComments() {
    const comments = await withMockFallback(
      () => getComments(this.postId),
      () => mockComments
    );
    this.setData({ comments: withNameInitial(comments) });
  },

  async checkInteractionState() {
    const app = getApp();
    const { openid } = app.globalData;
    if (!openid) return;
    try {
      const [liked, collected] = await Promise.all([
        isLiked(this.postId, openid),
        isCollected(this.postId, openid),
      ]);
      this.setData({ liked, collected });
    } catch (err) {
      // 静默失败
    }
  },

  async incrementViews(post) {
    try {
      const result = await callInteract({ action: 'view', postId: this.postId });
      if (result && result.success) {
        this.setData({ 'post.views': result.counts.views });
        return;
      }
      await updatePost(this.postId, { views: _.inc(1) });
      this.setData({ 'post.views': (post.views || 0) + 1 });
    } catch (err) {
      // 静默失败
    }
  },

  async recordHistory() {
    const app = getApp();
    const { openid } = app.globalData;
    try {
      await recordHistory(this.postId, openid);
    } catch (err) {
      // 静默失败
    }
  },

  navigateBack() {
    wx.navigateBack();
  },

  async handleAction(e) {
    const { key } = e.currentTarget.dataset;
    const app = getApp();
    const { openid } = app.globalData;

    if (key === 'share') {
      wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] });
      return;
    }

    if (key === 'comment') {
      this.setData({ showCommentInput: !this.data.showCommentInput });
      return;
    }

    if (!openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    if (key === 'like') {
      try {
        const result = await toggleLike(this.postId, openid);
        const updateData = { liked: result.liked };
        if (result.likes !== undefined) {
          updateData['post.likes'] = result.likes;
        } else {
          const delta = result.liked ? 1 : -1;
          updateData['post.likes'] = Math.max((this.data.post.likes || 0) + delta, 0);
        }
        this.setData(updateData);
        wx.showToast({ title: result.liked ? '点赞成功' : '已取消点赞', icon: 'none' });
      } catch (err) {
        wx.showToast({ title: '操作失败', icon: 'none' });
      }
      return;
    }

    if (key === 'collect') {
      try {
        const result = await toggleCollect(this.postId, openid);
        const updateData = { collected: result.collected };
        if (result.collectCount !== undefined) {
          updateData['post.collectCount'] = result.collectCount;
        }
        this.setData(updateData);
        wx.showToast({ title: result.collected ? '收藏成功' : '已取消收藏', icon: 'none' });
      } catch (err) {
        wx.showToast({ title: '操作失败', icon: 'none' });
      }
    }
  },

  onCommentInput(e) {
    this.setData({ commentText: e.detail.value });
  },

  async submitComment() {
    const { commentText } = this.data;
    if (!commentText.trim()) {
      wx.showToast({ title: '请输入评论内容', icon: 'none' });
      return;
    }
    const app = getApp();
    const { openid } = app.globalData;
    if (!openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    try {
      const { userInfo: profile = {} } = app.globalData;
      const result = await addComment({
        postId: this.postId,
        name: profile.nickName || '微信用户',
        body: commentText,
      });
      this.setData({ commentText: '', showCommentInput: false });
      if (result && result.commentCount !== undefined) {
        this.setData({ 'post.commentCount': result.commentCount });
      } else {
        this.setData({ 'post.commentCount': (this.data.post.commentCount || 0) + 1 });
      }
      wx.showToast({ title: '评论成功', icon: 'success' });
      this.loadComments();
    } catch (err) {
      wx.showToast({ title: '评论失败', icon: 'none' });
    }
  },

  onShareAppMessage() {
    const { post } = this.data;
    return {
      title: post ? post.title : '知行社',
      path: `/pages/detail/index?id=${this.postId}`,
    };
  },
});
