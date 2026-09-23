import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import api from '../../api/axios';

// Fetch all stages for a selected project to populate the workflow board
export const fetchProjectStages = createAsyncThunk(
  'stages/fetchProjectStages',
  async (projectId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/projects/${projectId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch project stages');
    }
  }
);

// Manually update stage status on the server after optimistic local state application
export const updateStageStatus = createAsyncThunk(
  'stages/updateStageStatus',
  async ({ projectId, stageId, payload, previousStage }, { rejectWithValue }) => {
    try {
      const response = await api.patch(
        `/projects/${projectId}/stages/${stageId}/status`,
        payload
      );
      return response.data;
    } catch (error) {
      // Pass previousStage snapshot so the rejected case can perform an immediate state rollback
      return rejectWithValue({
        stageId,
        previousStage,
        message: error.response?.data?.message || 'Status update failed'
      });
    }
  }
);

// Retrieve full status change history for a single stage
export const fetchStageHistory = createAsyncThunk(
  'stages/fetchStageHistory',
  async ({ projectId, stageId }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/projects/${projectId}/stages/${stageId}/status-history`);
      return { stageId, history: response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch status history');
    }
  }
);

// Add document link or remark without altering workflow status
export const addRemarksOrDocs = createAsyncThunk(
  'stages/addRemarksOrDocs',
  async ({ projectId, stageId, payload }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/projects/${projectId}/stages/${stageId}/remarks`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add remarks');
    }
  }
);

const initialState = {
  project: null,
  stages: [],
  history: {}, // { [stageId]: [historyRecords] }
  loading: false,
  error: null,
  toastMessage: null
};

const stagesSlice = createSlice({
  name: 'stages',
  initialState,
  reducers: {
    // Apply immediate local update to make UI feel instant before network resolution
    optimisticStatusChange: (state, action) => {
      const { stageId, status, blocker, holdReason, completionDate, remarks } = action.payload;
      const stage = state.stages.find((s) => s.id === stageId);
      if (stage) {
        stage.status = status;
        if (blocker !== undefined) stage.blocker = blocker;
        if (holdReason !== undefined) stage.holdReason = holdReason;
        if (completionDate !== undefined) stage.completionDate = completionDate;
        if (remarks !== undefined) stage.remarks = remarks;
      }
    },
    clearStageToast: (state) => {
      state.toastMessage = null;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchProjectStages
      .addCase(fetchProjectStages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjectStages.fulfilled, (state, action) => {
        state.loading = false;
        state.project = action.payload;
        state.stages = action.payload.stages || [];
      })
      .addCase(fetchProjectStages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // updateStageStatus
      .addCase(updateStageStatus.fulfilled, (state, action) => {
        const index = state.stages.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) {
          state.stages[index] = action.payload;
        }
        state.toastMessage = { type: 'success', text: `Stage "${action.payload.name}" status updated to ${action.payload.status}` };
      })
      .addCase(updateStageStatus.rejected, (state, action) => {
        // Rollback optimistic update using the pre-change snapshot
        if (action.payload?.previousStage) {
          const index = state.stages.findIndex((s) => s.id === action.payload.stageId);
          if (index !== -1) {
            state.stages[index] = action.payload.previousStage;
          }
        }
        state.toastMessage = { type: 'error', text: action.payload?.message || 'Status update failed. Rolled back changes.' };
      })

      // fetchStageHistory
      .addCase(fetchStageHistory.fulfilled, (state, action) => {
        state.history[action.payload.stageId] = action.payload.history;
      })

      // addRemarksOrDocs
      .addCase(addRemarksOrDocs.fulfilled, (state, action) => {
        const index = state.stages.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) {
          state.stages[index] = action.payload;
        }
        state.toastMessage = { type: 'success', text: 'Stage notes/documents updated' };
      });
  }
});

// Memoize progress metrics using RTK createSelector to avoid unnecessary recomputations during renders
export const selectWorkflowStats = createSelector(
  [(state) => state.stages.stages],
  (stages) => {
    const total = stages.length;
    if (total === 0) {
      return { total: 0, completed: 0, inProgress: 0, blocked: 0, onHold: 0, notStarted: 0, percentComplete: 0 };
    }

    const completed = stages.filter((s) => s.status === 'COMPLETED').length;
    const inProgress = stages.filter((s) => s.status === 'IN_PROGRESS').length;
    const blocked = stages.filter((s) => s.status === 'BLOCKED').length;
    const onHold = stages.filter((s) => s.status === 'ON_HOLD').length;
    const notStarted = stages.filter((s) => s.status === 'NOT_STARTED').length;

    const percentComplete = Math.round((completed / total) * 100);

    return {
      total,
      completed,
      inProgress,
      blocked,
      onHold,
      notStarted,
      percentComplete
    };
  }
);

export const { optimisticStatusChange, clearStageToast } = stagesSlice.actions;
export default stagesSlice.reducer;
