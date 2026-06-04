// ============================================================
// API 工具类
// ============================================================
import { useAuth } from '../AuthContext';

// 创建基础API实例
const createAPI = () => {
  const api = require('axios').create({
    baseURL: '/api',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // 请求拦截器
  api.interceptors.request.use(
    async (config) => {
      const { accessToken } = useAuth();
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // 响应拦截器
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // 如果是401错误且没有尝试过刷新
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const { refreshToken, getAPI } = useAuth();
          const refreshApi = getAPI();

          const response = await refreshApi.post('/auth/refresh', {
            refreshToken: refreshToken,
          });

          if (response.data.success) {
            const newAccessToken = response.data.data.accessToken;
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          // 刷新失败，返回原始错误
          return Promise.reject(error);
        }
      }

      return Promise.reject(error);
    }
  );

  return api;
};

// 认证相关API
export const authAPI = {
  sendCode: (phone) => createAPI().post('/auth/send-code', { phone }),
  login: (phone, code) => createAPI().post('/auth/login', { phone, code }),
  register: (phone, code, nickname) => createAPI().post('/auth/register', { phone, code, nickname }),
  logout: () => createAPI().post('/auth/logout'),
  getProfile: () => createAPI().get('/auth/profile'),
  updateProfile: (data) => createAPI().put('/auth/profile', data),
};

// 聊天相关API
export const chatAPI = {
  sendMessage: (message, options = {}) => {
    const { model = 'deepseek-chat', role = 'normal', webSearch = false, image, imageType } = options;
    return createAPI().post('/chat', {
      message,
      model,
      role,
      webSearch,
      image,
      imageType,
    });
  },
  clearHistory: () => createAPI().post('/clear'),
};

// 用户相关API
export const userAPI = {
  getProfile: () => createAPI().get('/auth/profile'),
  updateProfile: (data) => createAPI().put('/auth/profile', data),
};

// 健康检查
export const healthAPI = {
  check: () => createAPI().get('/health'),
};