// pages/info/profile.js
Page({
    data: {
        avatarUrl: '/images/icon8.jpg',
        userInfo: {
            name: '董嘉晨',
            role: '学生',
            university: '西北农林科技大学',
            studentId: '2018013135',
            email: ''
        }
    },
    // 修改后的保存方法
    async saveProfile() {
        if (!this.validateForm()) return

        try {
            // 1. 缓存头像文件
            const cachedPath = await this.cacheCurrentAvatar()

            // 2. 合并数据
            const profileData = {
                ...this.data.userInfo,
                avatarUrl: cachedPath || this.data.avatarUrl
            }

            // 3. 保存完整数据
            wx.setStorageSync('userProfile', profileData)

            // 4. 上传服务器（示例代码）
            // await this.uploadAllData(profileData)
            // 获取页面栈
            const pages = getCurrentPages()
            // 获取上一页实例
            const prevPage = pages[pages.length - 2]
            // 5. 反馈保存结果
            wx.showToast({
                title: '保存成功',
                icon: 'success',
                duration: 1500,
                success: () => {
                    // 触发上一页更新
                    prevPage.loadUserProfile()
                    wx.navigateBack()
                }
            })
        } catch (error) {
            wx.showToast({
                title: '保存失败',
                icon: 'error'
            })
        }
    },

    // 头像缓存方法
    cacheCurrentAvatar() {
        return new Promise((resolve, reject) => {
            if (this.data.avatarUrl.startsWith('http://tmp/')) {
                wx.saveFile({
                    tempFilePath: this.data.avatarUrl,
                    success: (res) => {
                        wx.setStorageSync('cachedAvatar', res.savedFilePath)
                        resolve(res.savedFilePath)
                    },
                    fail: (err) => reject(err)
                })
            } else {
                resolve(this.data.avatarUrl)
            }
        })
    },

    // 完整数据上传
    uploadAllData(data) {
        return new Promise((resolve, reject) => {
            wx.uploadFile({
                url: 'http://127.0.0.1:8000/api/upload/',
                filePath: data.avatarUrl,
                name: 'avatar',
                formData: {
                    profile: JSON.stringify(data)
                },
                success: resolve,
                fail: reject
            })
        })
    },
    // 表单验证
    validateForm() {
        const {
            name,
            studentId,
            email
        } = this.data.userInfo

        if (!name || !studentId) {
            wx.showToast({
                title: '必填项不能为空',
                icon: 'none'
            })
            return false
        }

        if (email && !this.validateEmail(email)) {
            wx.showToast({
                title: '邮箱格式错误',
                icon: 'none'
            })
            return false
        }

        return true
    },

    // 邮箱验证
    validateEmail(email) {
        const reg = /^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/
        return reg.test(email)
    },

    // 头像上传处理（带权限检查）
    uploadAvatar() {
        wx.showActionSheet({
            itemList: ['拍摄照片', '从相册选择'],
            success: (res) => {
                const authType = res.tapIndex === 0 ? 'camera' : 'album'
                this.checkAuthBeforeAction(authType)
            }
        })
    },

    // 权限检查核心方法
    checkAuthBeforeAction(authType) {
        const scopeMap = {
            camera: 'scope.camera',
            album: 'scope.writePhotosAlbum'
        }

        wx.getSetting({
            success: (res) => {
                const authStatus = res.authSetting[scopeMap[authType]]

                if (authStatus === undefined) { // 首次询问
                    this.requestAuth(authType)
                } else if (authStatus) { // 已授权
                    this.chooseImage(authType)
                } else { // 已拒绝
                    this.showAuthGuide(authType)
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

    // 选择图片/拍摄（优化后）
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

    // 处理选择成功
    handleImageSuccess(tempFilePath) {
        this.setData({
            avatarUrl: tempFilePath
        })
        wx.showToast({
            title: '选择成功',
            icon: 'success'
        })
        //上传服务器
        //this.uploadToServer(tempFilePath)
    },

    // 文件上传（保持原有逻辑）
    uploadToServer(filePath) {
        wx.showLoading({
            title: '上传中...'
        })

        wx.uploadFile({
            url: 'https://your-api-domain.com/upload',
            filePath: filePath,
            name: 'avatar',
            success: (res) => {
                const data = JSON.parse(res.data)
                if (data.code === 200) {
                    wx.showToast({
                        title: '上传成功'
                    })
                }
            },
            complete: () => wx.hideLoading()
        })
    },
    // 统一输入处理
    bindNameInput(e) {
        this.setData({
            'userInfo.name': e.detail.value
        })
    },
    bindRoleInput(e) {
        this.setData({
            'userInfo.role': e.detail.value
        })
    },
    bindUniversityInput(e) {
        this.setData({
            'userInfo.university': e.detail.value
        })
    },
    bindStudentIdInput(e) {
        this.setData({
            'userInfo.studentId': e.detail.value
        })
    },
    bindEmailInput(e) {
        this.setData({
            'userInfo.email': e.detail.value
        })
    },
    // 其他生命周期函数保持原样...
    onLoad() {
        const savedData = wx.getStorageSync('userProfile')
        if (savedData) {
            this.setData({
                userInfo: savedData,
                avatarUrl: savedData.avatarUrl || '/images/icon8.jpg'
            })
        }
    },
    onReady() {},
    onShow() {
        const cachedAvatar = wx.getStorageSync('cachedAvatar')
        if (cachedAvatar) {
            this.setData({
                avatarUrl: cachedAvatar
            })
        }
    },
    onHide() {},
    onUnload() {},
    onPullDownRefresh() {},
    onReachBottom() {},
    onShareAppMessage() {}
})