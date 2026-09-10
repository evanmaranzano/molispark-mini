const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

function mapScene(scene) {
  const n = Number(scene);
  if (n === 1 || n === 2 || n === 3 || n === 4) return n;
  return 2;
}

// v2 在 openid 无真实小程序访问的场景（如模拟器）会抛 -604101；此时降级 v1 纯文本检测，语义等价拦截。
async function msgSecCheckCompat(content, scene, openid) {
  try {
    const res = await cloud.openapi.security.msgSecCheck({ version: 2, openid, scene, content });
    if (res && (res.errCode === -604101 || /604101/.test(String(res.errMsg || '')))) {
      return cloud.openapi.security.msgSecCheck({ content });
    }
    return res;
  } catch (err) {
    const code = err && (err.errCode || err.code);
    const msg = String((err && (err.errMsg || err.message)) || '');
    if (code === -604101 || /604101/.test(msg)) {
      return cloud.openapi.security.msgSecCheck({ content });
    }
    throw err;
  }
}

function displayReason(err, fallback) {
  const code = err && (err.errCode || err.code);
  const msg = (err && (err.errMsg || err.message)) || '';
  if (code === 87014 || /87014/.test(String(msg))) return '内容含有违法违规信息';
  return fallback || '内容未通过安全审核';
}

function isSecPass(res) {
  if (!res || res.errCode) return false;
  const suggest = res.result && res.result.suggest;
  if (suggest && suggest !== 'pass') return false;
  return true;
}

function guessImageType(fileID) {
  const m = String(fileID || '').split('?')[0].match(/\.([a-zA-Z0-9]+)$/);
  const ext = (m ? m[1] : 'png').toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  return 'image/png';
}

function toContentText(content) {
  if (Array.isArray(content)) return content.map((item) => String(item || '')).join('\n');
  if (typeof content === 'string') return content;
  return String(content || '');
}

async function checkText(text, scene, openid) {
  const content = typeof text === 'string' ? text : String(text || '');
  if (!content.trim()) return { pass: true };
  if (!openid) return { pass: false, reason: '未登录，无法进行安全审核' };
  try {
    const res = await msgSecCheckCompat(content, mapScene(scene), openid);
    if (!isSecPass(res)) {
      return { pass: false, reason: displayReason(res, '内容未通过安全审核'), secCode: res && (res.errCode || res.code) };
    }
    return { pass: true };
  } catch (err) {
    return { pass: false, reason: displayReason(err, '内容未通过安全审核'), secCode: err && (err.errCode || err.code), secMsg: String((err && (err.errMsg || err.message)) || '').slice(0, 120) };
  }
}

async function checkOneImage(fileID) {
  try {
    const down = await cloud.downloadFile({ fileID });
    const value = down && down.fileContent;
    const res = await cloud.openapi.security.imgSecCheck({
      media: {
        contentType: guessImageType(fileID),
        value,
      },
    });
    if (!res || res.errCode) {
      return { fileID, pass: false, reason: displayReason(res, '图片未通过安全审核') };
    }
    return { fileID, pass: true };
  } catch (err) {
    return { fileID, pass: false, reason: displayReason(err, '图片未通过安全审核') };
  }
}

async function checkOneVideo(fileID, openid) {
  let trace_id;
  try {
    const urlRes = await cloud.getTempFileURL({ fileList: [fileID] });
    const item = urlRes && urlRes.fileList && urlRes.fileList[0];
    const mediaUrl = item && item.tempFileURL;
    if (!mediaUrl) {
      return { fileID, pass: false, reason: '无法获取视频地址' };
    }
    const res = await cloud.openapi.security.mediaCheckAsync({
      version: 2,
      openid,
      scene: 2,
      mediaUrl,
      mediaType: 2,
    });
    trace_id = res && (res.trace_id || res.traceId);
    const result = { fileID, pass: !res || res.errCode ? false : true };
    if (trace_id) result.trace_id = trace_id;
    if (!result.pass) result.reason = displayReason(res, '视频未通过安全审核');
    return result;
  } catch (err) {
    const result = {
      fileID,
      pass: false,
      reason: displayReason(err, '视频未通过安全审核'),
    };
    trace_id = err && (err.trace_id || err.traceId);
    if (trace_id) result.trace_id = trace_id;
    return result;
  }
}

async function handleCheckMedia(event, openid) {
  const fileIDs = Array.isArray(event.fileIDs) ? event.fileIDs.filter(Boolean) : [];
  const isVideo = event.mediaType === 'video' || event.mediaType === 2;
  const results = [];
  for (let i = 0; i < fileIDs.length; i += 1) {
    const fileID = fileIDs[i];
    results.push(isVideo ? await checkOneVideo(fileID, openid) : await checkOneImage(fileID));
  }
  return { pass: results.every((item) => item.pass), results };
}

async function handlePublishPost(event, openid) {
  if (!openid) return { success: false, code: 'UNAUTHORIZED' };

  const title = typeof event.title === 'string' ? event.title : '';
  const contentText = toContentText(event.content);
  const textCheck = await checkText(`${title}\n${contentText}`, 2, openid);
  if (!textCheck.pass) {
    return { success: false, code: 'CONTENT_REJECTED', reason: textCheck.reason };
  }

  const images = Array.isArray(event.images) ? event.images.filter(Boolean) : [];
  const videos = Array.isArray(event.videos) ? event.videos.filter(Boolean) : [];
  if (videos.length) {
    return { success: false, code: 'VIDEO_DISABLED', reason: '视频发布暂未开放' };
  }

  if (images.length) {
    const media = await handleCheckMedia({ fileIDs: images, mediaType: 'image' }, openid);
    if (!media.pass) {
      const first = media.results.find((item) => !item.pass);
      return {
        success: false,
        code: 'CONTENT_REJECTED',
        reason: (first && first.reason) || '图片未通过安全审核',
      };
    }
  }

  let author = '微信用户';
  try {
    const user = await db.collection('users').doc(openid).get();
    if (user && user.data && typeof user.data.nickName === 'string' && user.data.nickName.trim()) {
      author = user.data.nickName.trim();
    }
  } catch (e) {
    // 资料不存在时保留默认昵称
  }

  const content = Array.isArray(event.content)
    ? event.content
    : contentText.split('\n').map((item) => item.trim()).filter(Boolean);

  const addRes = await db.collection('posts').add({
    data: {
      title,
      content,
      images,
      videos,
      category: event.category || '',
      desc: event.desc || (content[0] ? String(content[0]).slice(0, 60) : ''),
      type: event.type || (images.length > 0 ? '图片' : '文章'),
      coverStyle: event.coverStyle || (images.length > 0 ? 'ai' : 'book'),
      heroTitle: event.heroTitle || title.slice(0, 20).toUpperCase(),
      author,
      status: 'published',
      views: 0,
      likes: 0,
      collectCount: 0,
      commentCount: 0,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
      _openid: openid,
    },
  });

  return { success: true, postId: addRes._id };
}

async function handleReport(event, openid) {
  if (!openid) return { success: false, code: 'UNAUTHORIZED' };
  const targetType = event.targetType === 'comment' ? 'comment' : 'post';
  const targetId = typeof event.targetId === 'string' ? event.targetId : String(event.targetId || '');
  const reason = typeof event.reason === 'string' ? event.reason : '';
  const detail = typeof event.detail === 'string' ? event.detail : '';

  const addRes = await db.collection('reports').add({
    data: {
      targetType,
      targetId,
      reason,
      detail,
      reporterOpenid: openid,
      status: 'open',
      createdAt: db.serverDate(),
      _openid: openid,
    },
  });

  return { success: true, reportId: addRes._id };
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const openid = OPENID || '';
  const action = event.action;

  if (action === 'checkText') return checkText(event.text, event.scene, openid);
  if (action === 'checkMedia') return handleCheckMedia(event, openid);
  if (action === 'publishPost') return handlePublishPost(event, openid);
  if (action === 'report') return handleReport(event, openid);
  return { success: false, code: 'INVALID_ACTION' };
};
