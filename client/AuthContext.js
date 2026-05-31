import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
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

  const login = async (userData) => {
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
  };

  const doLogout = async (callApi = true) => {
    try {
      if (callApi && state.accessToken) {
        try {
          await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${state.accessToken}`,
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
  };

  const doRefreshToken = async () => {
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

        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: storedRefreshToken }),
        });

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
        await doLogout(false);
        throw error;
      } finally {
        isRefreshing.current = false;
        refreshPromise.current = null;
      }
    })();

    return refreshPromise.current;
  };

  const authFetch = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (state.accessToken) {
      headers['Authorization'] = `Bearer ${state.accessToken}`;
    }

    let response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      try {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          // Ignore parse error
        }
        
        if (errorData && (errorData.code === 'TOKEN_EXPIRED' || errorData.code === 'SESSION_INVALID')) {
          try {
            const newAccessToken = await doRefreshToken();
            headers['Authorization'] = `Bearer ${newAccessToken}`;
            response = await fetch(url, { ...options, headers });
          } catch (refreshError) {
            console.error('Auto refresh failed, logging out:', refreshError);
            await doLogout(false);
          }
        } else {
          // 其他 401 情况，直接登出
          console.error('Unauthorized, logging out');
          await doLogout(false);
        }
      } catch (error) {
        console.error('Error handling 401:', error);
        await doLogout(false);
      }
    }

    return response;
  };

  const updateUserData = async (userData) => {
    try {
      const updatedUser = { ...state.user, ...userData };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

      dispatch({
        type: Actions.UPDATE_USER,
        payload: updatedUser,
      });
    } catch (error) {
      console.error('Update user data error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout: doLogout,
        refreshTokenFn: doRefreshToken,
        updateUserData,
        authFetch,
      }}
    >
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
