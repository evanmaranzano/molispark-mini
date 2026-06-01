/**
 * 云存储上传封装
 * 支持图片和文件上传到微信云存储
 */
function isCloudReady() {
  try {
    const app = getApp();
    return Boolean(wx.cloud && app.globalData && app.globalData.cloudReady);
  } catch (err) {
    return false;
  }
}

/**
 * 上传文件到云存储
 * @param {string} filePath 本地临时文件路径
 * @param {string} cloudPath 云端文件路径，如 'images/xxx.jpg'
 * @returns {Promise<string>} 文件的云存储 URL
 */
async function uploadFile(filePath, cloudPath) {
  if (!isCloudReady()) {
    return filePath;
  }
  const res = await wx.cloud.uploadFile({
    filePath,
    cloudPath,
  });
  return res.fileID;
}

/**
 * 批量上传图片
 * @param {string[]} filePaths 本地图片路径数组
 * @param {string} prefix 云端路径前缀，如 'images/posts/'
 * @returns {Promise<string[]>} fileID 数组
 */
async function uploadImages(filePaths, prefix = 'images/posts/') {
  const tasks = filePaths.map((filePath, index) => {
    const ext = filePath.split('.').pop() || 'jpg';
    const cloudPath = `${prefix}${Date.now()}-${index}.${ext}`;
    return uploadFile(filePath, cloudPath);
  });
  return Promise.all(tasks);
}

/**
 * 获取临时文件链接
 * @param {string|string[]} fileIDs 云存储 fileID 或数组
 * @returns {Promise<string|string[]>} 临时访问链接
 */
async function getTempFileURL(fileIDs) {
  if (!isCloudReady()) {
    return fileIDs;
  }
  if (typeof fileIDs === 'string') {
    const res = await wx.cloud.getTempFileURL({ fileList: [fileIDs] });
    return res.fileList[0].tempFileURL;
  }
  const res = await wx.cloud.getTempFileURL({ fileList: fileIDs });
  return res.fileList.map((item) => item.tempFileURL);
}

/**
 * 删除云存储文件
 * @param {string[]} fileIDs
 */
async function deleteFiles(fileIDs) {
  if (!isCloudReady()) {
    return { fileList: fileIDs };
  }
  return wx.cloud.deleteFile({ fileList: fileIDs });
}

/**
 * 选择图片并上传
 * @param {object} options wx.chooseMedia 参数
 * @param {string} prefix 云端路径前缀
 * @returns {Promise<string[]>} fileID 数组
 */
async function chooseAndUploadImages(options = {}, prefix = 'images/posts/') {
  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count: options.count || 9,
      mediaType: ['image'],
      sourceType: options.sourceType || ['album', 'camera'],
      success: async (res) => {
        try {
          const filePaths = res.tempFiles.map((f) => f.tempFilePath);
          const fileIDs = await uploadImages(filePaths, prefix);
          resolve(fileIDs);
        } catch (err) {
          reject(err);
        }
      },
      fail: reject,
    });
  });
}

module.exports = {
  uploadFile,
  uploadImages,
  getTempFileURL,
  deleteFiles,
  chooseAndUploadImages,
};
