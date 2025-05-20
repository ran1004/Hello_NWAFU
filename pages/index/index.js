//index.js

// 引入工具模块 util.js，通常用于封装一些通用的工具函数


var util = require('../../utils/util.js')
// 获取全局应用实例，用于访问全局数据或方法
var app = getApp()

const throttle = (fn, interval = 500) => {
  let lastTime = 0;
  return function(...args) {
    const now = new Date().getTime();
    if (now - lastTime >= interval) {
      fn.apply(this, args);
      lastTime = now;
    }
  };
};


// pages/index/index.js
Page({
  data: {
    activities: [],
    isLoading: false,
    isRefreshing: false,
    hasMore: true,
    page: 1,
    pageSize: 10
  },
  formatTime(time) {
    if (!time) return '';
    const date = new Date(time);
    // 获取年月日
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // 月份从0开始
    const day = date.getDate().toString().padStart(2, '0');
    // 获取时间（HH:mm）
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    // 返回格式：YYYY-MM-DD HH:mm
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },

  onLoad: function(options) {
    console.log('index-----------onload----------------');
    this.loadInitialData();
  },
  loadInitialData: function() {
    // 显示加载状态（骨架屏可用）
    wx.showLoading({
      title: '加载中...',
      mask: true
    });

    // 获取本地缓存数据（提升用户体验）
    const cacheData = wx.getStorageSync('cachedActivities');
    if (cacheData) {
      console.log('加载activities缓存');
      this.setData({ activities: cacheData });
    }

    // 请求API数据
    wx.request({
      url: `${app.globalData.AUTH_API}activities/`,
      method: 'GET',
      data: {
        page: this.data.page,
        page_size: this.data.pageSize
      },
      header: {
        'content-type': 'application/json',
        'Authorization':  wx.getStorageSync('auth_token')
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 200) {
          // 处理并格式化数据
          const formattedData = this.formatActivityData(res.data.data);
          
          // 更新数据和状态
          this.setData({
            activities: formattedData,
            isLoading: false,
            hasMore: res.data.data.length >= this.data.pageSize,
          });
          console.log('---------------res.data.message:', res.data.message);
          console.log('res.data.data.length:', res.data.data.length);
          // 缓存数据
          wx.setStorageSync('cachedActivities', formattedData);
        } else {
          this.handleLoadError(res.data.message || '数据加载失败');
        }
      },
      fail: (err) => {
        this.handleLoadError('网络连接失败');
        console.error('API请求失败:', err);
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },
  /**
   * 格式化活动数据
   */



  formatActivityData: function(data) {
    return data.map(item => ({
      ...item,
      // 添加状态标识
      // 格式化时间字段
      formatted_start_time: this.formatTime(item.start_time),
      formatted_end_time: this.formatTime(item.end_time),
      status: this.getActivityStatus(item.start_time, item.end_time)
    }));
  },

    /**
   * 获取活动状态
   */
  getActivityStatus: function(startTime, endTime) {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (now < start) return '未开始';
    if (now > end) return '已结束';
    return '进行中';
  },

  /**
   * 处理加载错误
   */
  handleLoadError: function(message) {
    this.setData({
      isLoading: false,
      loadError: true
    });
    
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    });
  },

  /**
   * 重新加载数据
   */
  onRetry: function() {
    this.setData({
      loadError: false,
      isLoading: true
    });
    this.loadInitialData();
  },

  // 基础刷新函数
  refreshData: function(resetPage = true) {
    if (this.data.isLoading) return;
    console.log('------------index_refresh---------------------');
    this.setData({
      isLoading: true,
      isRefreshing: resetPage
    });

    const params = {
      page: resetPage ? 1 : this.data.page,
      page_size: this.data.pageSize
    };

    wx.request({
      url: `${app.globalData.AUTH_API}activities/`,
      method: 'GET',
      data: params,
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 200) {
          const newData = this.formatActivityData(res.data.data);
          this.setData({
            activities: resetPage ? newData : [...this.data.activities, ...newData],
            page: params.page,
            hasMore: newData.length >= this.data.pageSize
          });
        } else {
          wx.showToast({
            title: res.data.message || '数据加载失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('请求失败:', err);
        wx.showToast({
          title: '网络连接失败',
          icon: 'none'
        });
      },
      complete: () => {
        this.setData({
          isLoading: false,
          isRefreshing: false
        });
        wx.stopPullDownRefresh();
      }
    });
  },

   /**
   * 页面触底事件的处理函数
   */
  onReachBottom: throttle(function() {
    if (this.shouldNotLoadMore()) {
      return;
    }
    
    console.log('加载下一页，当前页码:', this.data.page);
    
    this.setData({ 
      page: this.data.page + 1 
    });
    
    // this.loadMoreData();
  }, 1000), // 添加节流控制
  
  /**
   * 判断是否应该阻止加载更多
   */
  shouldNotLoadMore: function() {
    return this.data.isLoading || 
           !this.data.hasMore || 
           this.data.loadError;
  },
  
  /**
   * 加载更多数据（与refreshData分离）
   */
  loadMoreData: function() {
    this.refreshData(false);
  },

  handleJoin: function(e) {
    // 安全获取活动数据（兼容两种传递方式）
    const activity = e.currentTarget.dataset.item || 
                    this.data.activities.find(item => item.id === e.currentTarget.dataset.id);
    
    if (!activity) {
      wx.showToast({ title: '活动数据异常', icon: 'none' });
      return;
    }
    // 状态检查（严格模式）
    if (activity.status !== '进行中') {
      wx.showToast({
        title: activity.status === '已结束' ? '活动已结束' : '活动未开始',
        icon: 'none'
      });
      return;
    }
    const basicInfo = {
      id: activity.id,
      title: activity.title,
      cover_url: activity.cover_url,
      status: activity.status,
      formatted_start_time: activity.formatted_start_time, // 保持字段名一致
      formatted_end_time: activity.formatted_end_time,
      location_name: activity.location_name // 保持与图片中完全相同的字段名
    };
    // 跳转逻辑（双保险策略）
    wx.navigateTo({
      url: `/pages/task/task?id=${activity.id}`,
      success: (res) => {
        res.eventChannel.emit('acceptActivityData', basicInfo); // 直接传递平铺对象
      },
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showToast({ title: '系统繁忙，请稍后重试', icon: 'none' });
      }
    });
  },
  
  onPullDownRefresh() {
    console.log('--------下拉刷新触发---------');
    this.refreshData();
  }
});