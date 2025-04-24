// pages/info/profile.js
// 工具函数：将 wx API 转为 Promise----封装成API

const app = getApp();

const promisify = (fn) => (options) => {
    return new Promise((resolve, reject) => {
        fn({
            ...options,
            success: (res) => resolve(res),
            fail: (err) => reject(err),
        });
    });
};
const request = promisify(wx.request);
Page({
    data: {
        //区分编辑模式/注册模式
        isEditMode: false, // 新增编辑模式标识
        tempToken: '', // 来自后端的临时令牌
        code: '', // 微信登录凭证
        avatarUrl: '/images/icon8.jpg', // 默认头像
        userInfo: { // 用户填写的注册信息
            name: '',
            role: '',
            class_name: '',
            student_id: '',
            email: ''
        }
    },
    //加载页面
    onLoad(options) {
        //1.加载本地缓存的草稿数据
        this.loadCachedData()
        // 先检查登录状态
        if (this.checkLoginStatus()) {
            console.log("编辑模式");
            //this.initEditMode(); // 编辑模式初始化
        } else {
            console.log("注册模式");
            this.initRegisterMode(options); // 注册模式初始化
        }

        //调试
        console.log(this.data)
    },
    // 新增登录状态检查方法
    checkLoginStatus() {
        const authToken = wx.getStorageSync('auth_token');
        this.setData({
            isEditMode: !!authToken
        }); //更新状态
        return this.data.isEditMode;; // 直接返回结果---非空则为真
    },
    // 新增注册模式初始化
    initRegisterMode(options) {
        // 参数校验加强版
        if (!options.temp_token || !options.code) {
            wx.showToast({
                title: '参数异常，请重新登录',
                icon: 'none',
                complete: () => {
                    wx.redirectTo({
                        url: '/pages/login/login'
                    });
                }
            });
            return;
        }
        this.setData({
            tempToken: options.temp_token,
            code: options.code
        });
    },
    // 新增编辑模式初始化---暂时没用
    async initEditMode() {
        try {
            const userInfo = await this.fetchUserProfile();
            this.setData({
                userInfo: userInfo,
                avatarUrl: userInfo.avatar || this.data.avatarUrl
            });
        } catch (error) {
            this.handleProfileError(error);
        }
    },
    // 新增获取用户资料方法---禁用
    async fetchUserProfile() {
        const res = await request({
            url: `${app.globalData.AUTH_API}user/profile`,
            header: {
                'Authorization': wx.getStorageSync('auth_token')
            }
        });
        if (res.statusCode !== 200) {
            throw new Error('获取信息失败');
        }
        return res.data;
    },
    // 修改后的主注册方法
    async handleRegistration() {
        if (this.data.isEditMode) {
            await this.handleProfileUpdate(); // 编辑模式处理
        } else {
            await this.handleNewRegistration(); // 注册模式处理
        }
    },
    // 新增资料更新方法
    async handleProfileUpdate() {
        console.log("handleProfileUpdate资料开始更新！！")
        try {
            const updateData = {
                ...this.data.userInfo,
                avatarUrl: await this.processAvatar()
            };
            const token = wx.getStorageSync('auth_token');
            const res = await request({
                url: `${app.globalData.AUTH_API}user/update`,
                method: 'PUT',
                header: {
                    'Authorization': `Bearer ${token}`
                },
                data: updateData
            });
            console.log("retyrn")
            console.log(res)
            if (res.statusCode !== 200) {
                throw new Error('更新失败');
            }
            // 存储用户资料
            wx.setStorageSync('userProfile', {
                userInfo: this.data.userInfo,
                avatarUrl: this.data.avatarUrl
            });
            console.log("保存更新数据")
            wx.showToast({
                title: '更新成功',
                complete: () => {
                    wx.navigateBack();
                }
            });
        } catch (error) {
            this.handleRegistrationError(error);
        }
    },
    //读取本地存储的临时注册数据
    loadCachedData() {
        console.log("开始加载缓存数据：")
        const cachedData = wx.getStorageSync('userProfile')

        console.log('加载缓存数据:', cachedData); // 调试日志
        if (cachedData) {
            // 映射 userInfo 字段
            const userInfo = {
                name: cachedData.userInfo.name || '',
                role: cachedData.userInfo.role || '',
                class_name: cachedData.userInfo.class_name || '',
                student_id: cachedData.userInfo.student_id || '',
                email: cachedData.userInfo.email || ''
            };
            // 更新页面数据
            this.setData({
                userInfo: userInfo,
                avatarUrl: cachedData.avatarUrl || '/images/icon8.jpg'
            });
        }
    },
    // 注册流程
    async handleNewRegistration() {
        console.log("注册 handleNewRegistration！！")
        // 表单验证不通过则中断流程
        if (!this.validateRegistrationForm()) return;

        try {
            // [步骤1] 合并数据：微信资料 + 表单数据
            const registrationData = {
                ...this.data.userInfo, // 用户填写的表单数据
                avatarUrl: await this.processAvatar(), // 处理后的头像路径
                temp_token: this.data.code // 微信会话密钥（实际应来自后端）
            };
            console.log(registrationData)
            // [步骤2] 提交注册请求
            const res = await this.submitRegistration(registrationData);
            console.log("注册成功，返回首页！！！")
            // [步骤3] 处理注册结果
            this.handleRegistrationSuccess(res);
        } catch (error) {
            // 异常处理
            this.handleRegistrationError(error);
        }
    },
    // 表单验证方法
    validateRegistrationForm() {
        // 解构用户信息
        const {
            name,
            student_id
        } = this.data.userInfo;

        // 非空校验
        if (!name || !student_id) {
            wx.showToast({
                title: '姓名和学号为必填项',
                icon: 'none'
            });
            return false;
        }

        // 学号格式校验（8-20位数字）
        if (!/^\d{8,20}$/.test(student_id)) {
            wx.showToast({
                title: '学号格式不正确',
                icon: 'none'
            });
            return false;
        }

        return true; // 验证通过
    },
    // 头像处理方法
    async processAvatar() {
        try {
            // 判断是否为临时路径
            if (this.data.avatarUrl.startsWith('http://tmp/')) {
                // 将临时文件保存为永久文件
                const {
                    savedFilePath
                } = await wx.saveFile({
                    tempFilePath: this.data.avatarUrl
                });
                // 更新页面数据
                this.setData({
                    avatarUrl: savedFilePath
                });
                return savedFilePath;
            }
            // 返回已存在的路径
            return this.data.avatarUrl;
        } catch (error) {
            console.error('头像处理失败:', error);
            return this.data.avatarUrl; // 降级处理
        }
    },
    // 注册请求提交
    async submitRegistration(data) {
        wx.showLoading({
            title: '正在保存...'
        }); // 加载提示
        try {
            // 发起网络请求
            const res = await request({
                url: `${app.globalData.AUTH_API}login/register`, // ✅ 正确写法
                method: 'POST',
                timeout: 10000, // 10秒超时
                data: {
                    temp_token: this.data.tempToken, // 临时令牌
                    user_info: data // 用户数据
                }
            });
            // console.log("{dui}注册成功")
            console.log(res)
            // 响应状态码校验
            if (res.statusCode !== 200 || !res.data.token) {
                throw new Error('注册失败');
            }
            return res.data;
        } finally {
            wx.hideLoading(); // 关闭加载提示
        }
    },

    // 注册成功处理
    handleRegistrationSuccess(res) {
        console.log("执行注册成功处理")
        // 存储认证令牌
        wx.setStorageSync('auth_token', res.token);

        // 显示成功提示
        wx.showToast({
            title: '注册成功',
            icon: 'success',
            complete: () => {
                // 跳转至首页
                // wx.redirectTo({
                //     url: '/pages/info/info'
                // });
                // 如果目标页面是 tab 页面
                wx.switchTab({url: '/pages/info/info'});
            }
        });
    },
    // 错误处理
    handleRegistrationError(error) {
        console.error('注册流程异常:', error);
        // 显示错误提示
        wx.showToast({
            title: error.message || '注册失败',
            icon: 'none'
        });
    },
    // 头像上传入口
    uploadAvatar() {
        wx.showActionSheet({
            itemList: ['拍摄照片', '从相册选择'],
            success: (res) => {
                // 根据选择类型处理
                const authType = res.tapIndex === 0 ? 'camera' : 'album';
                this.checkAuthBeforeAction(authType);
            }
        });
    },

    // 权限检查（需要与profile.js保持统一）
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
    // 统一输入处理--动态显示
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
            'userInfo.class_name': e.detail.value
        })
    },
    bindStudentIdInput(e) {
        this.setData({
            'userInfo.student_id': e.detail.value
        })
    },
    bindEmailInput(e) {
        this.setData({
            'userInfo.email': e.detail.value
        })
    },
    // 在onUnload中保存草稿
    onUnload() {
        if (!this.data.isEditMode) {
            wx.setStorageSync('userProfile', {
                userInfo: this.data.userInfo,
                avatarUrl: this.data.avatarUrl
            });
        }
    }
    // 其他生命周期函数保持原样...
})