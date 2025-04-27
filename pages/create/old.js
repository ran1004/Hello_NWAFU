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
    coverUrl: '',       // 封面图URL
    imageList: [],      // 活动图片列表（最多9张）
    
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


  // 选择封面图
  chooseCover() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        this.uploadImage(res.tempFiles[0].tempFilePath, 'cover');
      }
    });
  },

  // 添加活动图片
  addImages() {
    const remaining = 9 - this.data.imageList.length;
    wx.chooseMedia({
      count: Math.min(remaining, 9),
      mediaType: ['image'],
      success: (res) => {
        res.tempFiles.forEach(file => {
          this.uploadImage(file.tempFilePath, 'activity');
        });
      }
    });
  },

  // 上传图片到服务器
  uploadImage(tempFilePath, type) {
    wx.showLoading({ title: '上传中...' });
    
    // 这里替换为你的实际上传接口
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
          if (type === 'cover') {
            this.setData({ coverUrl: data.url });
          } else {
            this.setData({ 
              imageList: [...this.data.imageList, data.url] 
            });
          }
        }
      },
      complete: () => wx.hideLoading()
    });
  },

  // 删除图片
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

  // 表单提交
  handleSubmit() {
    if (!this.validateForm()) return;
    

    console.log('--------正式开始提数据------');

    this.setData({ isLoading: true });
    
    // 修改时间格式化函数
    const formatISOTime = (dateStr, timeStr) => {
      if (!dateStr || !timeStr) return null;
      return `${dateStr}T${timeStr}:00+08:00`;
    };

    // 提交数据组装
    const postData = {
      title: this.data.formData.title,
      content: this.data.formData.content,
      published_at: formatISOTime(this.data.publishDate, this.data.publishTime),
      start_time: formatISOTime(this.data.startDate, this.data.startTime),
      end_time: formatISOTime(this.data.endDate, this.data.endTime),
      location_name: this.data.formData.location || '',
      cover_image: this.data.coverUrl, // 确保是上传后的URL
      image_gallery: this.data.imageList || [] // 确保是数组
    };

    console.log('最终提交数据:', JSON.stringify(postData, null, 2));

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
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        } else {
          wx.showToast({ title: res.data.message || '创建失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' });
      },
      complete: () => {
        this.setData({ isLoading: false });
      }
    });
  }
});  