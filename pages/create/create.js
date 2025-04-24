// create.js
const app = getApp()

Page({
  data: {
    startDate: '2023-01-01',
    endDate: '2030-12-31',
    selectedDate: '',    // 格式：'YYYY-MM-DD'
    selectedTime: '',    // 格式：'HH:mm:ss'
    dateStr: '',
    timeStr: ''
  },

   // 初始化当前时间
   onLoad() {
    const now = new Date()
    this.setData({
      selectedDate: this.formatDate(now),
      selectedTime: this.formatTime(now),
      dateStr: this.formatDate(now, true),
      timeStr: this.formatTime(now, true)
    })
  },

  // 日期选择
  bindDateChange(e) {
    const date = new Date(e.detail.value)
    this.setData({
      selectedDate: this.formatDate(date),
      dateStr: this.formatDate(date, true)
    })
    this.updateFinalTime()
  },

  // 时间选择
  bindTimeChange(e) {
    const [hour, minute] = e.detail.value.split(':')
    const date = new Date()
    date.setHours(hour)
    date.setMinutes(minute)
    
    this.setData({
      selectedTime: this.formatTime(date),
      timeStr: this.formatTime(date, true)
    })
    this.updateFinalTime()
  },

  // 组合最终时间
  updateFinalTime() {
    if (this.data.selectedDate && this.data.selectedTime) {
      const finalTime = `${this.data.selectedDate} ${this.data.selectedTime}`
      console.log('最终时间:', finalTime) // 可用于提交数据
    }
  },

  // 格式化工具
  formatDate(date, show = false) {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return show ? `${year}年${month}月${day}日` : `${year}-${month}-${day}`
  },

  formatTime(date, show = false) {
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    const second = date.getSeconds().toString().padStart(2, '0')
    return show ? `${hour}:${minute}:${second}` : `${hour}:${minute}:${second}`
  },

  // 表单提交
  formSubmit(e) {
    const { title, content } = e.detail.value
    const activityData = {
      title,
      content,
      //datetime: this.data.selectedTime,
      // activity_time: `${this.data.selectedDate} ${this.data.selectedTime}:00`,  // 格式：YYYY-MM-DD HH:mm:ss
      activity_time: `${this.data.selectedDate} ${this.data.selectedTime}`,  // 格式：YYYY-MM-DD HH:mm:ss
      //publisher: app.globalData.userInfo.id // 假设已存储用户信息
       publisher: 'wangc'
    }

    // 表单验证
    if (!title || !content || !this.data.selectedTime) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }

    // 发送请求
    wx.request({
     url:'http://localhost:8000/api/activity/create/',
     //url:'http://localhost:8000/create/',
      method: 'POST',
      data: activityData,
      header: {
        'content-type': 'application/json',
        'Authorization': wx.getStorageSync('auth_token')
      },
      success: (res) => {
        if (res.data.code === 200) {
          wx.showToast({ title: '发布成功' })
          setTimeout(() => wx.navigateBack(), 1500)
        } else {
          this.handleError(res.data)
        }
      },
      fail: (err) => {
        this.handleError(err)
      }
    })
  },

  handleError(error) {
    console.error(error)
    wx.showToast({ 
      title: error.msg || '发布失败，请重试',
      icon: 'none'
    })
  }
})