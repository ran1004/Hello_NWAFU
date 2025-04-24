// pages/clock_calendar/clock_calendar.js

const app = getApp();

Page({
  data: {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    days: [],
    punchRecords: {}, // 存储后端返回的打卡日期
    totalPunchedDays: 0, // 本月总打卡天数
    currentStreak: 0,    // 本月连续打卡天数
    longestStreak: 0,    // 本月最长连续打卡天数
    weekDays: ['日', '一', '二', '三', '四', '五', '六'], // 星期标题
    isLoading: true,     // 加载状态
    error: null          // 错误信息
  },

  onLoad() {
    this.loadPunchRecords(this.data.currentYear, this.data.currentMonth);
  },

  // 加载打卡记录
  loadPunchRecords(year, month) {
    const userId = getApp().globalData.userId; // 假设用户ID存储在全局数据中
    this.setData({ isLoading: true, error: null });

    wx.request({
      url: '${app.globalData.AUTH_API}api/checkins/',// 替换为的后端接口地址
      method: 'GET',
      data: {
        // year: year,
        // month: month
        userId: userId
      },
      success: (res) => {
        if (res.data.status === 'success') {
          // console.log('后端返回的打卡记录:', res.data.data);
          // 1. 提取日期并格式化
          const formattedDates = res.data.checkins.map(item => {
          const date = new Date(item.checkin_time);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份补零
          const day = String(date.getDate()).padStart(2, '0');        // 日期补零
          return `${year}-${month}-${day}`; // 格式化为 "YYYY-MM-DD"
  });
            console.log(res.data.checkins);
            console.log(formattedDates)

          // 确保返回的数据是数组
          if (Array.isArray(formattedDates)) {
            const punchRecords = {};
            formattedDates.forEach(date => {
            // 使用 formatDate 方法确保日期格式一致
            const formattedDate = this.formatDate(new Date(date));
            punchRecords[formattedDate] = true;
            });
            console.log('处理后的打卡记录:', punchRecords);
            
            this.setData({
              punchRecords: punchRecords,
              isLoading: false
            }, () => {
              // 在回调中确保数据已更新
              this.generateCalendar(year, month); 
              this.calculateStats();  // 同时计算统计
              console.log('回调后的打卡记录:', punchRecords);
            });
          } else {
            console.error('后端返回的打卡记录不是数组:', res.data.data);
            this.setData({
              isLoading: false,
              error: '打卡记录格式错误'
            });
          }
        } else {
          console.error('后端返回失败:', res.data.message || '未知错误');
          this.setData({
            isLoading: false,
            error: res.data.message || '加载打卡记录失败'
          });
        }
      },
      fail: (err) => {
        console.error('网络请求失败:', err);
        this.setData({
          isLoading: false,
          error: err.message || '网络请求失败'
        });
      }
    });
  },

  // 格式化日期为 'YYYY-MM-DD'
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 生成日历
  generateCalendar(year, month) {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();

    const days = [];
    // 填充空白日期
    for (let i = 0; i < startDay; i++) {
      days.push({});
    }

    // 填充有效日期
    for (let i = 1; i <= daysInMonth; i++) {
      const dateObj = new Date(year, month - 1, i);
      const dateStr = this.formatDate(dateObj);
      const isToday = this.isToday(dateStr);
      const punched = this.data.punchRecords[dateStr] || false;
      
      // 调试日志
      // console.log('punchRecords:', this.data.punchRecords);
      // console.log(`日期: ${dateStr}, 是否今天: ${isToday}, 是否打卡: ${punched}`);
      
      days.push({
        date: dateStr,
        day: i,
        punched: punched,
        isToday: this.isToday(dateStr)
      });
    }

    console.log('生成的日历天数:', days);
    this.setData({ days });

    // 增加
    this.setData({ days }, () => {
      this.calculateStats(); // 确保在日历渲染后计算统计
    });
  },
  
  //判断是否为今天
isToday(dateStr) {
  const today = new Date();
  const target = new Date(dateStr);
  return (
    today.getFullYear() === target.getFullYear() &&
    today.getMonth() === target.getMonth() && // 移除+1
    today.getDate() === target.getDate()
  );
},

  // 计算统计信息
  calculateStats() {
    const { days, punchRecords } = this.data;
    let totalPunched = 0;
    let currentStreak = 0;
    let longestStreak = 0;
    let currentSequence = 0;

    days.forEach(day => {
      if (day.punched) {
        totalPunched += 1;
        currentSequence += 1;
        if (currentSequence > currentStreak) {
          currentStreak = currentSequence;
        }
      } else {
        currentSequence = 0;
      }
    });

    // 简单的最长连续打卡天数（不跨月）
    longestStreak = currentStreak;

    this.setData({
      totalPunchedDays: totalPunched,
      currentStreak: currentStreak,
      longestStreak: longestStreak
    });
  },

  // 切换到上一月
  prevMonth() {
    let { currentYear, currentMonth } = this.data;
    if (currentMonth === 1) {
      currentYear -= 1;
      currentMonth = 12;
    } else {
      currentMonth -= 1;
    }
    this.setData({ currentYear, currentMonth });
    this.loadPunchRecords(currentYear, currentMonth);
  },

  // 切换到下一月
  nextMonth() {
    let { currentYear, currentMonth } = this.data;
    if (currentMonth === 12) {
      currentYear += 1;
      currentMonth = 1;
    } else {
      currentMonth += 1;
    }
    this.setData({ currentYear, currentMonth });
    this.loadPunchRecords(currentYear, currentMonth);
  },

  // 页面显示时确保显示当前月份
  onShow() {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    if (this.data.currentYear !== currentYear || this.data.currentMonth !== currentMonth) {
      this.setData({ currentYear, currentMonth });
      this.loadPunchRecords(currentYear, currentMonth);
    }
  },

  // 处理加载错误
  handleError() {
    wx.showToast({
      title: this.data.error,
      icon: 'none'
    });
  }
});