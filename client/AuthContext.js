import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
};

const Actions = {
  SET_AUTH: 'SET_AUTH',
  CLEAR_AUTH: 'CLEAR_AUTH',
  SET_LOADING: 'SET_LOADING',
  UPDATE_USER: 'UPDATE_USER',
  UPDATE_TOKENS: 'UPDATE_TOKENS',
};

const authReducer = (state, action) => {
  switch (action.type) {
    case Actions.SET_AUTH:
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      };
    case Actions.CLEAR_AUTH:
      return {
        ...state,
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case Actions.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };
    case Actions.UPDATE_USER:
      return {
        ...state,
        user: action.payload,
      };
    case Actions.UPDATE_TOKENS:
      return {
        ...state,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken || state.refreshToken,
      };
    default:
      return state;
  }
};

const AuthContext = createContext({
  ...initialState,
  login: () => {},
  logout: () => {},
  refreshTokenFn: () => {},
  updateUserData: () => {},
  authFetch: () => {},
});

const API_URL = 'http://192.168.43.231:5000/api';

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const isRefreshing = useRef(false);
  const refreshPromise = useRef(null);
  // 用ref存储最新state，让callback函数引用稳定
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        dispatch({ type: Actions.SET_LOADING, payload: true });

        const accessToken = await AsyncStorage.getItem('accessToken');
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        const userStr = await AsyncStorage.getItem('user');

        if (accessToken && refreshToken && userStr) {
          const user = JSON.parse(userStr);
          dispatch({
            type: Actions.SET_AUTH,
            payload: {
              user,
              accessToken,
              refreshToken,
            },
          });
        } else {
          dispatch({ type: Actions.SET_LOADING, payload: false });
        }
      } catch (error) {
        console.error('Check auth error:', error);
        dispatch({ type: Actions.SET_LOADING, payload: false });
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (userData) => {
    try {
      await AsyncStorage.setItem('accessToken', userData.accessToken);
      await AsyncStorage.setItem('refreshToken', userData.refreshToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData.user));

      dispatch({
        type: Actions.SET_AUTH,
        payload: userData,
      });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, []);

  const doLogout = useCallback(async (callApi = true) => {
    try {
      if (callApi && stateRef.current.accessToken) {
        try {
          await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${stateRef.current.accessToken}`,
            },
          });
        } catch (error) {
          console.error('Logout API error:', error);
        }
      }

      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      await AsyncStorage.removeItem('user');

      dispatch({ type: Actions.CLEAR_AUTH });
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }, []);

  const doRefreshToken = useCallback(async () => {
    if (isRefreshing.current && refreshPromise.current) {
      return refreshPromise.current;
    }

    isRefreshing.current = true;

    refreshPromise.current = (async () => {
      try {
        const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
        if (!storedRefreshToken) {
          throw new Error('No refresh token');
        }

        const refreshController = new AbortController();
        const refreshTimeoutId = setTimeout(() => refreshController.abort(), 10000);
        let response;
        try {
          response = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken: storedRefreshToken }),
            signal: refreshController.signal,
          });
        } catch (fetchErr) {
          clearTimeout(refreshTimeoutId);
          throw new Error('Token刷新超时');
        }
        clearTimeout(refreshTimeoutId);

        const data = await response.json();

        if (data.success) {
          const { accessToken: newAccessToken, refreshToken: newRefreshToken, user } = data.data;

          await AsyncStorage.setItem('accessToken', newAccessToken);
          if (newRefreshToken) {
            await AsyncStorage.setItem('refreshToken', newRefreshToken);
          }
          if (user) {
            await AsyncStorage.setItem('user', JSON.stringify(user));
            dispatch({
              type: Actions.SET_AUTH,
              payload: {
                user,
                accessToken: newAccessToken,
                refreshToken: newRefreshToken || storedRefreshToken,
              },
            });
          } else {
            dispatch({
              type: Actions.UPDATE_TOKENS,
              payload: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
              },
            });
          }

          return newAccessToken;
        } else {
          throw new Error('Token refresh failed');
        }
      } catch (error) {
        console.error('Refresh token error:', error);
        // 不能直接调用doLogout，因为它是useCallback可能还没更新
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('refreshToken');
        await AsyncStorage.removeItem('user');
        dispatch({ type: Actions.CLEAR_AUTH });
        throw error;
      } finally {
        isRefreshing.current = false;
        refreshPromise.current = null;
      }
    })();

    return refreshPromise.current;
  }, []);

  const authFetch = useCallback(async (url, options = {}) => {
    const headers = {
      ...options.headers,
    };

    // 只在有body的请求中设置Content-Type
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    if (stateRef.current.accessToken) {
      headers['Authorization'] = `Bearer ${stateRef.current.accessToken}`;
    }

    // 添加超时机制：默认15秒超时
    const timeout = options.timeout || 15000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response;
    try {
      response = await fetch(url, { ...options, headers, signal: controller.signal });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('请求超时，请检查网络连接');
      }
      throw fetchError;
    }
    clearTimeout(timeoutId);

    // 如果返回401，尝试刷新token后重新请求
    if (response.status === 401) {
      try {
        const newAccessToken = await doRefreshToken();
        headers['Authorization'] = `Bearer ${newAccessToken}`;
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), timeout);
        try {
          response = await fetch(url, { ...options, headers, signal: controller2.signal });
        } catch (fetchError2) {
          clearTimeout(timeoutId2);
          if (fetchError2.name === 'AbortError') {
            throw new Error('请求超时，请检查网络连接');
          }
          throw fetchError2;
        }
        clearTimeout(timeoutId2);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // 如果是超时错误，直接抛出
        if (refreshError.message && refreshError.message.includes('超时')) {
          throw refreshError;
        }
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('refreshToken');
        await AsyncStorage.removeItem('user');
        dispatch({ type: Actions.CLEAR_AUTH });
      }
    }

    return response;
  }, [doRefreshToken]);

  const updateUserData = useCallback(async (userData) => {
    try {
      const updatedUser = { ...stateRef.current.user, ...userData };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

      dispatch({
        type: Actions.UPDATE_USER,
        payload: updatedUser,
      });
    } catch (error) {
      console.error('Update user data error:', error);
      throw error;
    }
  }, []);

  const contextValue = useMemo(() => ({
    ...state,
    login,
    logout: doLogout,
    refreshTokenFn: doRefreshToken,
    updateUserData,
    authFetch,
  }), [state, login, doLogout, doRefreshToken, updateUserData, authFetch]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
