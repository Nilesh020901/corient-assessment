import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

// Load user roster to display in the user administration directory
export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/users');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch users');
    }
  }
);

// Load available system roles so administrators can assign roles when creating or editing accounts
export const fetchRoles = createAsyncThunk(
  'users/fetchRoles',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/roles');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch roles');
    }
  }
);

// Provision a new user account with specified credentials and role
export const createUser = createAsyncThunk(
  'users/createUser',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post('/users', userData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create user');
    }
  }
);

// Update existing user profile properties such as name, email, or role
export const updateUser = createAsyncThunk(
  'users/updateUser',
  async ({ id, updateData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/users/${id}`, updateData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update user');
    }
  }
);

// Attempt deactivation, capturing 409 conflict responses so the UI can launch the stage reassignment modal
export const deactivateUser = createAsyncThunk(
  'users/deactivateUser',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/users/${userId}/deactivate`);
      return response.data.user;
    } catch (error) {
      // Pass structured conflict payload when active assignments block deactivation
      if (error.response?.status === 409) {
        return rejectWithValue({
          isConflict: true,
          userId,
          message: error.response.data.message,
          activeAssignments: error.response.data.activeAssignments || []
        });
      }
      return rejectWithValue({
        isConflict: false,
        message: error.response?.data?.message || 'Failed to deactivate user'
      });
    }
  }
);

// Transfer all active workflow stage assignments from one user to another to resolve deactivation blockers
export const reassignStages = createAsyncThunk(
  'users/reassignStages',
  async ({ userId, targetUserId }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/users/${userId}/reassign`, { targetUserId });
      return { userId, targetUserId, data: response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reassign stages');
    }
  }
);

const initialState = {
  users: [],
  roles: [],
  loading: false,
  error: null,
  successMessage: null,
  // State for the 409 Reassignment Modal
  reassignModal: {
    isOpen: false,
    userToDeactivate: null,
    activeAssignments: [],
    loading: false,
    error: null
  }
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    closeReassignModal: (state) => {
      state.reassignModal.isOpen = false;
      state.reassignModal.userToDeactivate = null;
      state.reassignModal.activeAssignments = [];
      state.reassignModal.error = null;
    },
    clearUserMessages: (state) => {
      state.error = null;
      state.successMessage = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchUsers
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // fetchRoles
      .addCase(fetchRoles.fulfilled, (state, action) => {
        state.roles = action.payload;
      })

      // createUser
      .addCase(createUser.fulfilled, (state, action) => {
        state.users.unshift(action.payload);
        state.successMessage = 'User account created successfully';
      })
      .addCase(createUser.rejected, (state, action) => {
        state.error = action.payload;
      })

      // updateUser
      .addCase(updateUser.fulfilled, (state, action) => {
        const index = state.users.findIndex((u) => u.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
        state.successMessage = 'User updated successfully';
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.error = action.payload;
      })

      // deactivateUser
      .addCase(deactivateUser.fulfilled, (state, action) => {
        const index = state.users.findIndex((u) => u.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
        state.successMessage = 'User deactivated successfully';
        state.reassignModal.isOpen = false;
      })
      .addCase(deactivateUser.rejected, (state, action) => {
        if (action.payload?.isConflict) {
          // Open reassignment modal and populate blocking assignments
          const targetUser = state.users.find((u) => u.id === action.payload.userId);
          state.reassignModal.isOpen = true;
          state.reassignModal.userToDeactivate = targetUser;
          state.reassignModal.activeAssignments = action.payload.activeAssignments;
          state.reassignModal.error = null;
        } else {
          state.error = action.payload?.message || 'Deactivation failed';
        }
      })

      // reassignStages
      .addCase(reassignStages.pending, (state) => {
        state.reassignModal.loading = true;
        state.reassignModal.error = null;
      })
      .addCase(reassignStages.fulfilled, (state) => {
        state.reassignModal.loading = false;
      })
      .addCase(reassignStages.rejected, (state, action) => {
        state.reassignModal.loading = false;
        state.reassignModal.error = action.payload;
      });
  }
});

export const { closeReassignModal, clearUserMessages } = usersSlice.actions;
export default usersSlice.reducer;
