import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Perform login and receive access token with populated user role and granular permissions array
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      // Direct call using credentials so httpOnly refresh cookie is set by server
      const response = await axios.post(
        '/api/auth/login',
        { email, password },
        { withCredentials: true }
      );
      return response.data; // { accessToken, user: { id, email, name, role, permissions } }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      return rejectWithValue(message);
    }
  }
);

// Exchange existing httpOnly refresh cookie for a fresh 15-minute access token on app initialization
export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        '/api/auth/refresh',
        {},
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Session expired');
    }
  }
);

// Invalidate server session, clear refresh cookie, and wipe client credentials
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await axios.post('/api/auth/logout', {}, { withCredentials: true });
      return null;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Logout failed');
    }
  }
);

const initialState = {
  user: null, // { id, email, name, role, permissions: [{ module, action }] }
  accessToken: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  isInitialized: false
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Allows interceptors to directly update the token after silent refresh
    setCredentials: (state, action) => {
      state.accessToken = action.payload.accessToken;
      if (action.payload.user) {
        state.user = action.payload.user;
        state.isAuthenticated = true;
      }
    },
    // Allows interceptors to clear credentials on fatal 401
    clearCredentials: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // loginUser lifecycle
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
        state.isInitialized = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })

      // refreshToken lifecycle
      .addCase(refreshToken.pending, (state) => {
        state.loading = true;
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.loading = false;
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.isInitialized = true;
      })
      .addCase(refreshToken.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
        state.isInitialized = true;
      })

      // logoutUser lifecycle
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
        state.error = null;
      });
  }
});

export const { setCredentials, clearCredentials } = authSlice.actions;
export default authSlice.reducer;
