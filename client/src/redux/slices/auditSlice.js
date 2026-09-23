import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

// Fetch paginated audit entries with query criteria to review system compliance logs
export const fetchAuditLogs = createAsyncThunk(
  'audit/fetchAuditLogs',
  async ({ page = 1, limit = 15, entityType = '', action = '', startDate = '', endDate = '' } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', limit);
      if (entityType) params.append('entityType', entityType);
      if (action) params.append('action', action);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await api.get(`/audit?${params.toString()}`);
      return response.data; // { logs, total, page, limit, totalPages }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch audit logs');
    }
  }
);

const initialState = {
  logs: [],
  total: 0,
  page: 1,
  limit: 15,
  totalPages: 1,
  loading: false,
  error: null
};

const auditSlice = createSlice({
  name: 'audit',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAuditLogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAuditLogs.fulfilled, (state, action) => {
        state.loading = false;
        state.logs = action.payload.logs;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
        state.totalPages = action.payload.totalPages;
      })
      .addCase(fetchAuditLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export default auditSlice.reducer;
