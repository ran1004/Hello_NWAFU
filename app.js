

// 工具函数：将 wx API 转为 Promise----封装成API
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

App({
  globalData: {
    // AUTH_API: 'http://127.0.0.1:8000/',// ✅ 真正的全局变量
    AUTH_API: 'https://iecwxdk.nwafu.edu.cn/' // ✅ 真正的全局变量
  },
    // 确保在onLaunch触发
    onLaunch() {
        console.log("[DEBUG] 应用初始化完成")
        this.initializeLogin()
    },

    // 封装初始化流程
    async initializeLogin() {
        try {
            const isSessionValid = await this.checkSession()
            console.log(`会话状态: ${isSessionValid ? '有效' : '已过期'}`)
            
            if (!isSessionValid) {
                await this.executeLogin()
            } else {
                // 会话有效时检查本地是否存在token
                const token = wx.getStorageSync('auth_token')
                if (token) {
                    //跳转到首页
                  
                    this.navigateToMain()
                } else {
                    // 存在会话但无token的异常情况，重新登录
                    await this.executeLogin()
                }
            }
        } catch (error) {
            console.error("初始化登录失败:", error)
        }
    },

    checkSession() {
        return new Promise(resolve => {
            wx.checkSession({
                success: () => resolve(true),
                fail: () => resolve(false)
            })
        })
    },

    async executeLogin() {
        try {
            console.log("[STEP 1] 获取登录code")
            const {code} = await wx.login()
            console.log("[STEP 2] 请求后端认证，code:", code)
            const res = await request({
                url: `${this.globalData.AUTH_API}login/test`,
                method: "POST",
                header: {
                    "Content-Type": "application/json",
                },
                data: {
                    code
                },
            });
            console.log("[DEBUG] 响应数据:", res.data);
            if (res.data.status === 'require_registration') {
                console.log("[STEP 3] 需要用户注册")
                this.navigateToRegistration(res.data.temp_token, code)
            }else{
                console.log("[STEP 4] 存储认证令牌")
                //已经存储了临时的Token
                wx.setStorageSync('auth_token', res.data.token)
                this.navigateToMain()
            }
        } catch (error) {
            console.error("[ERROR] 登录流程异常:", error)
            wx.showToast({ title: '登录失败，请重试', icon: 'none' })
        }
    },
    //跳转到首页
    navigateToMain() {
        if (this.isLaunching) {  // 防止重复跳转
            wx.switchTab({ url: '/pages/index/index' })
            this.isLaunching = false
        }
    },
    navigateToRegistration(tempToken, code) {
        if (this.isLaunching) {
            wx.redirectTo({
                //传递参数
                url: `/pages/info/profile?temp_token=${tempToken}&code=${code}`
            })
            this.isLaunching = false
        }
    },
    // 添加全局状态标记
    isLaunching: true

})