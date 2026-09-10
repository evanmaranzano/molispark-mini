const { getPostById, saveDraft, publishPost } = require('~/utils/db');
const { chooseAndUploadImages } = require('~/utils/storage');
const loginGuard = require('~/behaviors/loginGuard');

const MAX_IMAGE_COUNT = 9;

Page({
  behaviors: [loginGuard],

  data: {
    id: '',
    title: '',
    categories: ['学习方法', 'AI 工具', '读书笔记', '自我提升'],
    category: '学习方法',
    categoryIndex: 0,
    content: '',
    images: [],
    publishing: false,
    savingDraft: false,
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id });
      this.loadDraft(options.id);
    }
  },

  onShow() {
    this.checkLoginGuard();
  },

  onLogined() {
    this.setData({ showLoginModal: false });
    if (typeof this.onLoginGuardPassed === 'function') this.onLoginGuardPassed();
  },

  onLoginModalClose() {
    this.setData({ showLoginModal: false });
  },

  async loadDraft(id) {
    try {
      const post = await getPostById(id);
      if (post) {
        const app = getApp();
        const { openid } = app.globalData;
        if (post._openid && openid && String(post._openid) !== String(openid)) {
          wx.showToast({ title: '无权编辑该内容', icon: 'none' });
          setTimeout(() => wx.navigateBack(), 300);
          return;
        }
        const category = post.category || '学习方法';
        this.setData({
          title: post.title || '',
          category,
          categoryIndex: Math.max(0, this.data.categories.indexOf(category)),
          content: Array.isArray(post.content) ? post.content.join('\n') : String(post.content || ''),
          images: Array.isArray(post.images) ? post.images.slice(0, MAX_IMAGE_COUNT) : [],
        });
      }
    } catch (err) {
      console.error('loadDraft failed', err);
    }
  },

  navigateBack() {
    wx.navigateBack();
  },

  handleInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: e.detail.value });
  },

  handleCategoryChange(e) {
    const index = Number(e.detail.value);
    this.setData({ categoryIndex: index, category: this.data.categories[index] });
  },

  async handleChooseImage() {
    const remaining = MAX_IMAGE_COUNT - this.data.images.length;
    if (remaining <= 0) return;
    try {
      const fileIDs = await chooseAndUploadImages({ count: remaining });
      this.setData({ images: [...this.data.images, ...fileIDs].slice(0, MAX_IMAGE_COUNT) });
    } catch (err) {
      if (err.errMsg && err.errMsg.includes('cancel')) return;
      wx.showToast({ title: '上传失败', icon: 'none' });
    }
  },

  removeImage(e) {
    const { index } = e.currentTarget.dataset;
    const images = [...this.data.images];
    images.splice(index, 1);
    this.setData({ images });
  },

  async saveDraft() {
    const { title, content, category, images, id, savingDraft } = this.data;
    if (savingDraft || !this.checkLoginGuard()) return;
    if (!title.trim() && !content.trim()) {
      wx.showToast({ title: '请输入内容', icon: 'none' });
      return;
    }
    const app = getApp();
    const { openid } = app.globalData;
    this.setData({ savingDraft: true });
    try {
      await saveDraft({
        _id: id || undefined,
        title,
        category,
        content: content.split('\n').filter(Boolean),
        images,
        coverStyle: 'note',
      }, openid);
      wx.setStorageSync('homeOper', 'save');
      wx.showToast({ title: '草稿已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 500);
    } catch (err) {
      console.error('saveDraft failed', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ savingDraft: false });
    }
  },

  async publish() {
    const { title, content, category, images, id, publishing } = this.data;
    if (publishing || !this.checkLoginGuard()) return;
    const normalizedTitle = title.trim();
    const normalizedContent = content.trim();
    if (!normalizedTitle) {
      wx.showToast({ title: '请输入标题', icon: 'none' });
      return;
    }
    if (!normalizedContent) {
      wx.showToast({ title: '请输入正文', icon: 'none' });
      return;
    }
    this.setData({ publishing: true });
    try {
      const contentArr = normalizedContent.split('\n').map((item) => item.trim()).filter(Boolean);
      const payload = {
        title: normalizedTitle,
        category,
        content: contentArr,
        images: images.slice(0, MAX_IMAGE_COUNT),
        type: images.length > 0 ? '图片' : '文章',
        coverStyle: images.length > 0 ? 'ai' : 'book',
        heroTitle: normalizedTitle.slice(0, 20).toUpperCase(),
        desc: contentArr[0] ? contentArr[0].slice(0, 60) : '',
      };
      const result = await publishPost(payload);
      if (result && result.code === 'CONTENT_REJECTED') {
        wx.showToast({ title: result.reason || '内容未通过审核', icon: 'none' });
        return;
      }
      if (result && result.success === false) {
        wx.showToast({ title: result.reason || '发布失败', icon: 'none' });
        return;
      }

      wx.setStorageSync('homeOper', 'release');
      wx.showToast({ title: '发布成功', icon: 'success' });
      setTimeout(() => wx.switchTab({ url: '/pages/home/index' }), 500);
    } catch (err) {
      console.error('publish failed', err);
      if (err && err.code === 'CONTENT_REJECTED') {
        wx.showToast({ title: err.reason || err.message || '内容未通过审核', icon: 'none' });
      } else {
        wx.showToast({ title: '发布失败', icon: 'none' });
      }
    } finally {
      this.setData({ publishing: false });
    }
  },
});
