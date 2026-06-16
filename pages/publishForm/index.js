const { createPost, getPostById, saveDraft, updatePost } = require('~/utils/db');
const { chooseAndUploadImages } = require('~/utils/storage');

Page({
  data: {
    id: '',
    title: '',
    categories: ['学习方法', 'AI 工具', '读书笔记', '自我提升'],
    category: '学习方法',
    categoryIndex: 0,
    content: '',
    images: [],
    publishing: false,
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id });
      this.loadDraft(options.id);
    }
  },

  async loadDraft(id) {
    try {
      const post = await getPostById(id);
      if (post) {
        const category = post.category || '学习方法';
        this.setData({
          title: post.title || '',
          category,
          categoryIndex: Math.max(0, this.data.categories.indexOf(category)),
          content: (post.content || []).join('\n'),
          images: post.images || [],
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
    try {
      const fileIDs = await chooseAndUploadImages({ count: 9 });
      this.setData({ images: [...this.data.images, ...fileIDs] });
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
    const { title, content, category, images, id } = this.data;
    if (!title.trim() && !content.trim()) {
      wx.showToast({ title: '请输入内容', icon: 'none' });
      return;
    }
    const app = getApp();
    const { openid } = app.globalData;
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
    }
  },

  async publish() {
    const { title, content, category, images, id, publishing } = this.data;
    if (publishing) return;
    if (!title.trim()) {
      wx.showToast({ title: '请输入标题', icon: 'none' });
      return;
    }
    if (!content.trim()) {
      wx.showToast({ title: '请输入正文', icon: 'none' });
      return;
    }
    this.setData({ publishing: true });
    try {
      const contentArr = content.split('\n').filter(Boolean);
      const payload = {
        title,
        category,
        content: contentArr,
        images,
        type: images.length > 0 ? '图片' : '文章',
        coverStyle: images.length > 0 ? 'ai' : 'book',
        heroTitle: title.slice(0, 20).toUpperCase(),
        desc: contentArr[0] ? contentArr[0].slice(0, 60) : '',
      };
      if (id) {
        await updatePost(id, { ...payload, status: 'published' });
      } else {
        await createPost(payload);
      }
      wx.setStorageSync('homeOper', 'release');
      wx.showToast({ title: '发布成功', icon: 'success' });
      setTimeout(() => wx.switchTab({ url: '/pages/home/index' }), 500);
    } catch (err) {
      console.error('publish failed', err);
      wx.showToast({ title: '发布失败', icon: 'none' });
    } finally {
      this.setData({ publishing: false });
    }
  },
});
