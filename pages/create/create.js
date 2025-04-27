
var util = require('../../utils/util.js')
var app = getApp()

Page({
  data: {
    // 表单数据
    formData: {
      title: '',        // 活动标题
      location: '',     // 活动地点
      content: '',      // 活动详情
    },
    
    // 发布时间
    publishDate: '',
    publishTime: '',  
    // 开始时间
    startDate: '',
    startTime: '',
    // 结束时间
    endDate: '',
    endTime: '',

    // 图片相关
    tempFiles: [],      // 暂存的临时文件路径
    tempCover: null,    // 暂存的封面图临时路径
    coverUrl: '',       // 封面图URL
    imageList: [],      // 活动图片列表（最多9张
    isUploading: false,

    // 状态
    isLoading: false,   // 提交加载状态
    wordCount: 0,       // 活动详情字数统计
  },

  onLoad() {
    // this.setDefaultPublishTime();
  },

  // 设置默认发布时间
  setDefaultPublishTime() {
    const now = new Date();
    this.setData({
      publishDate: this.formatDateTime(now, 'date'),
      publishTime: this.formatDateTime(now, 'time'),
    });
  },

  // 统一的时间格式化方法
  formatDateTime(date, type = 'full') {
    if (!date) return '';
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    // 根据类型返回不同格式
    switch (type) {
      case 'date':
        return `${year}-${month}-${day}`;
      case 'time':
        return `${hours}:${minutes}`;
      case 'full':
      default:
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
  },

  // 输入框变化处理
  handleInputChange(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
  },

  // 文本域输入处理（带字数统计）
  handleTextareaInput(e) {
    const content = e.detail.value;
    this.setData({
      'formData.content': content,
      wordCount: content.length
    });
  },
  handleLineChange(e) {
    const maxHeight = 500; // px
    this.setData({
      height: Math.min(e.detail.height, maxHeight)
    });
  },
   // 发布时间选择
  bindPublishDate(e) {
    this.setData({ publishDate: e.detail.value });
    this.checkTimeValidity();
  },
  bindPublishTime(e) {
    this.setData({ publishTime: e.detail.value });
    this.checkTimeValidity();
  },

  // 开始时间选择
  bindStartDate(e) {
    this.setData({ startDate: e.detail.value });
    this.checkTimeValidity();
  },
  bindStartTime(e) {
    this.setData({ startTime: e.detail.value });
    this.checkTimeValidity();
  },

  // 结束时间选择
  bindEndDate(e) {
    this.setData({ endDate: e.detail.value });
    this.checkTimeValidity();
  },
  bindEndTime(e) {
    this.setData({ endTime: e.detail.value });
    this.checkTimeValidity();
  },

  // 时间验证逻辑
  checkTimeValidity() {
    const { publishDate, publishTime, startDate, startTime, endDate, endTime } = this.data;
    
    // 示例：验证结束时间 > 开始时间
    if (startDate && startTime && endDate && endTime) {
      const start = new Date(`${startDate} ${startTime}`);
      const end = new Date(`${endDate} ${endTime}`);
      if (end <= start) {
        wx.showToast({ title: '结束时间必须晚于开始时间', icon: 'none' });
      }
    }
  },

  // 提交时获取完整时间
  getFullTime(type) {
    return `${this.data[`${type}Date`]} ${this.data[`${type}Time`]}`;
  },

    // 删除暂存图片
    removeImage(e) {
      const { index } = e.currentTarget.dataset;
      const { imageList } = this.data;
      imageList.splice(index, 1);
      this.setData({ imageList });
    },
  
    // 预览图片
    previewImage(e) {
      const { url } = e.currentTarget.dataset;
      wx.previewImage({
        current: url,
        urls: this.data.imageList
      });
    },


  // 单张图片上传
  uploadSingleImage(tempFilePath) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${app.globalData.AUTH_API}activities/upload/`,
        filePath: tempFilePath,
        name: 'file',
        header: {
          'Authorization': 'Bearer ' + wx.getStorageSync('auth_token')
        },
        success: (res) => {
          const data = JSON.parse(res.data);
          if (data.code === 200) {
            resolve(data.url);
          } else {
            reject(new Error(data.message || '上传失败'));
          }
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  },

 // 在Page对象中的方法
  validateForm() {
    const { title, content } = this.data.formData;
    const { 
      publishDate, publishTime,
      startDate, startTime,
      endDate, endTime
    } = this.data;

    // 基础字段验证
    if (!title.trim()) {
      wx.showToast({ title: '请填写活动标题', icon: 'none' });
      return false;
    }

    if (!content.trim()) {
      wx.showToast({ title: '请填写活动详情', icon: 'none' });
      return false;
    }

    // 开始时间验证
    if (!startDate || !startTime) {
      wx.showToast({ title: '请选择完整开始时间', icon: 'none' });
      return false;
    }

    // 结束时间验证
    if (!endDate || !endTime) {
      wx.showToast({ title: '请选择完整结束时间', icon: 'none' });
      return false;
    }

    // 时间逻辑验证
    const publishFull = new Date(`${publishDate} ${publishTime}`);
    const startFull = new Date(`${startDate} ${startTime}`);
    const endFull = new Date(`${endDate} ${endTime}`);

    // 发布时间 ≤ 开始时间
    if (publishFull > startFull) {
      wx.showToast({ 
        title: '发布时间不能晚于开始时间', 
        icon: 'none' 
      });
      return false;
    }

    // 开始时间 < 结束时间
    if (startFull >= endFull) {
      wx.showToast({ 
        title: '结束时间必须晚于开始时间', 
        icon: 'none' 
      });
      return false;
    }

    // 开始时间不能早于当前
    if (startFull < new Date()) {
      wx.showToast({ 
        title: '开始时间不能早于当前时间', 
        icon: 'none' 
      });
      return false;
    }
    return true;
  },

  // ISO 8601 时间格式化（用于提交数据）
  formatISOTime(dateStr, timeStr) {
    if (!dateStr || !timeStr) return null;
    return `${dateStr}T${timeStr}:00+08:00`; // 假设时区为 UTC+8
  },

  async uploadAllImages() {
    try {
      // 上传封面图（如果存在）
      if (this.data.tempCover) {
        this.data.coverUrl = await this.uploadSingleImage(this.data.tempCover);
      }
  
      // 上传活动图片（如果存在）
      if (this.data.tempFiles.length > 0) {
        const uploadedUrls = [];
        for (const tempPath of this.data.tempFiles) {
          uploadedUrls.push(await this.uploadSingleImage(tempPath));
        }
        this.data.imageList = [...this.data.imageList, ...uploadedUrls];
      }
  
      return true;
    } catch (error) {
      wx.showToast({ title: '图片上传失败: ' + error.message, icon: 'none' });
      return false;
    }
  },

  async handleSubmit() {
    if (!this.validateForm()) return;
    if (this.data.isUploading) return;
  
    this.setData({ isLoading: true });
  
    // 如果有图片需要上传，先上传图片
    if (this.data.tempCover || this.data.tempFiles.length > 0) {
      const uploadSuccess = await this.uploadAllImages();
      if (!uploadSuccess) {
        this.setData({ isLoading: false });
        return;
      }
    }
  
    // 组装提交数据（允许 coverUrl 和 imageList 为空）
    const postData = {
      title: this.data.formData.title,
      content: this.data.formData.content,
      published_at: this.formatISOTime(this.data.publishDate, this.data.publishTime),
      start_time: this.formatISOTime(this.data.startDate, this.data.startTime),
      end_time: this.formatISOTime(this.data.endDate, this.data.endTime),
      location_name: this.data.formData.location || '',
      cover_image: this.data.coverUrl || '',  // 明确传递 null 表示无封面
      image_gallery: this.data.imageList || []  // 空数组表示无活动图片
    };

    console.log('最终提交数据:', JSON.stringify(postData, null, 2));

    // 提交到服务器
    wx.request({
      url: `${app.globalData.AUTH_API}activities/create/`,
      method: 'POST',
      data: postData,
      header: {
        'Authorization': 'Bearer ' + wx.getStorageSync('auth_token')
      },  
      success: (res) => {
        if (res.statusCode === 201) {
          wx.showToast({ title: '创建成功' });
          setTimeout(() => wx.navigateBack(), 1500);
        } else {
          wx.showToast({ title: '创建失败: ' + (res.data.message || '未知错误'), icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' });
      },
      complete: () => {
        this.setData({ isLoading: false });
      }
    });
  },

  uploadPic() {
    wx.showActionSheet({
        itemList: ['拍摄照片', '从相册选择'],
        success: (res) => {
            // 根据选择类型处理
            const authType = res.tapIndex === 0 ? 'camera' : 'album';
            this.checkAuthBeforeAction(authType);
        }
    });
  },

  checkAuthBeforeAction(authType) {
    // 修正相册权限标识
    const scopeMap = {
        camera: 'scope.camera',
        album: 'scope.album' // 微信官方实际需要 scope.album
    };

    // 获取权限设置
    wx.getSetting({
        success: (res) => {
            const authStatus = res.authSetting[scopeMap[authType]];
            // 首次请求授权
            if (authStatus === undefined) {
                this.requestAuth(authType);
            }
            // 已授权
            else if (authStatus) {
                this.chooseImage(authType);
            }
            // 已拒绝
            else {
                this.showAuthGuide(authType);
            }
        }
    });
  },

  // 显示权限引导
  showAuthGuide(authType) {
    const typeMap = {
        camera: '相机',
        album: '相册'
    }

    wx.showModal({
        title: '需要权限',
        content: `请允许访问${typeMap[authType]}以继续操作`,
        confirmText: '去设置',
        success: (res) => {
            if (res.confirm) wx.openSetting()
        }
    })
  },
  
  chooseImage(sourceType) {
    wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: [sourceType],
        success: (res) => {
            this.handleImageSuccess(res.tempFiles[0].tempFilePath)
        },
        fail: (err) => {
            console.error('选择失败:', err)
            if (err.errMsg.includes('auth')) {
                this.showAuthGuide(sourceType)
            }
        }
    })
  },

  // 请求权限授权
  requestAuth(authType) {
    const scopeMap = {
        camera: 'scope.camera',
        album: 'scope.writePhotosAlbum'
    }

    wx.authorize({
        scope: scopeMap[authType],
        success: () => this.chooseImage(authType),
        fail: () => this.showAuthGuide(authType)
    })
  },

   // 处理选择成功
   handleImageSuccess(tempFilePath) {
    this.setData({
      tempCover: tempFilePath
    })
    wx.showToast({
        title: '选择成功',
        icon: 'success'
    })
  },

    // 添加活动图片（暂存本地）
    addImages() {
      const remaining = 9 - this.data.tempFiles.length-this.data.imageList.length;
      if (remaining <= 0) {
        wx.showToast({ title: '最多添加9张图片', icon: 'none' });
        return;
      }
      wx.chooseMedia({
        count: Math.min(remaining, 9),
        mediaType: ['image'],
        success: (res) => {
          this.setData({
            tempFiles: [...this.data.tempFiles, ...res.tempFiles.map(f => f.tempFilePath)]
          });
        }
      });
    }
});