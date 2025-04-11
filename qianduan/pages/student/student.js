// pages/student/student.js

Page({
  data: {
    activities: [],      // 活动列表数据
    isLoading: true,     // 加载状态
    errorMsg: '' ,        // 错误信息
    //socket
    socketConnected: false // 新增连接状态标识
  },

  onLoad() {
    this.loadActivities();
    this.initWebSocket(); // 初始化WebSocket
  },

  // 初始化WebSocket连接
  initWebSocket() {
    const that = this
    const socket = wx.connectSocket({
      url: 'ws://localhost:8000/ws/notify/', // 与Django路由一致
      success() {
        console.log('WS连接成功')
        that.setData({ socketConnected: true })
      },
      fail(err) {
        console.error('WS连接失败:', err)
        that.setData({ socketConnected: false })
      }
    })

    // 监听服务器推送
    socket.onMessage(res => {
      const newActivity = JSON.parse(res.data)
      this.handleNewActivity(newActivity)
    })

    // 监听连接关闭
    socket.onClose(() => {
      this.setData({ socketConnected: false })
    })
  },

   // 处理新活动通知
   handleNewActivity(activity) {
    const newList = [activity, ...this.data.activities]
    this.setData({ activities: newList })
    
    wx.showToast({
      title: `新活动：${activity.title}`,
      icon: 'none',
      duration: 2000
    })
  },

  // 完整的加载方法（保留原有数据处理逻辑）
  loadActivities() {
    this.setData({ isLoading: true, errorMsg: '' });
    
    wx.request({
      url: 'http://localhost:8000/api/activity/list/',
      success: (res) => {
        console.log('API响应:', res.data);
        
        // 严格匹配后端数据结构
        if (res.statusCode === 200 && res.data?.code === 0) {
          const rawData = res.data.data || [];
          
          // 转换数据格式（与WebSocket推送格式保持一致）
          const formattedActivities = rawData.map(item => ({
            id: item.id,
            title: item.title,
            publisher: item.publisher,
            content: item.content,
            activity_time: this.formatTime(item.activity_time),
            created_at: this.formatTime(item.created_at)
          }));
          
          this.setData({ 
            activities: formattedActivities,
            isLoading: false
          });
        } else {
          this.handleError(res.data?.msg || '接口返回格式异常');
        }
      },
      fail: (err) => {
        this.handleError('网络异常: ' + err.errMsg);
      },
      complete: () => {
        wx.stopPullDownRefresh();
      }
    });
  },

  onUnload() {
    wx.closeSocket() // 页面卸载时关闭连接
  },

 // 修改 formatTime 方法
formatTime(utcString) {
  if (!utcString) return '时间未设置'
  
  try {
    const date = new Date(utcString)
    if (isNaN(date.getTime())) throw new Error('无效时间格式')
    
    return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')} 
           ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`
  } catch (e) {
    console.error('时间格式化失败:', e)
    return '时间格式错误'
  }
},

  // 错误处理
  handleError(msg) {
    this.setData({ 
      isLoading: false,
      errorMsg: msg
    });
    wx.showToast({ title: msg, icon: 'none' });
  },

  // 手动刷新
  onPullDownRefresh() {
    this.loadActivities();
    wx.stopPullDownRefresh();
  }
})