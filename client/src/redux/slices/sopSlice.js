import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

// Fetch all SOP templates to populate template selector and inventory
export const fetchTemplates = createAsyncThunk(
  'sop/fetchTemplates',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/sop');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load templates');
    }
  }
);

// Fetch full details of an active template including its stages and version history
export const fetchTemplateById = createAsyncThunk(
  'sop/fetchTemplateById',
  async (templateId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/sop/${templateId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load template details');
    }
  }
);

// Create a new SOP template in draft state
export const createTemplate = createAsyncThunk(
  'sop/createTemplate',
  async ({ title, description }, { rejectWithValue }) => {
    try {
      const response = await api.post('/sop', { title, description });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create template');
    }
  }
);

// Append a new workflow stage to the template
export const addStage = createAsyncThunk(
  'sop/addStage',
  async ({ templateId, stageData }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/sop/${templateId}/stages`, stageData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add stage');
    }
  }
);

// Update stage attributes like name or client visibility flag
export const updateStage = createAsyncThunk(
  'sop/updateStage',
  async ({ templateId, stageId, updateData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/sop/${templateId}/stages/${stageId}`, updateData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update stage');
    }
  }
);

// Delete a stage from a draft template
export const deleteStage = createAsyncThunk(
  'sop/deleteStage',
  async ({ templateId, stageId }, { rejectWithValue }) => {
    try {
      await api.delete(`/sop/${templateId}/stages/${stageId}`);
      return stageId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete stage');
    }
  }
);

// Batch persist the reordered sequence of stages
export const reorderStages = createAsyncThunk(
  'sop/reorderStages',
  async ({ templateId, stageOrders }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/sop/${templateId}/stages-reorder`, { stageOrders });
      return response.data.stages;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reorder stages');
    }
  }
);

// Publish template into an immutable version snapshot
export const publishTemplate = createAsyncThunk(
  'sop/publishTemplate',
  async (templateId, { rejectWithValue }) => {
    try {
      const response = await api.post(`/sop/${templateId}/publish`);
      return response.data; // { message, version, template }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to publish template');
    }
  }
);

const initialState = {
  templates: [],
  selectedTemplate: null,
  loading: false,
  error: null,
  actionSuccess: null
};

const sopSlice = createSlice({
  name: 'sop',
  initialState,
  reducers: {
    clearSopError: (state) => {
      state.error = null;
      state.actionSuccess = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchTemplates
      .addCase(fetchTemplates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTemplates.fulfilled, (state, action) => {
        state.loading = false;
        state.templates = action.payload;
        if (!state.selectedTemplate && action.payload.length > 0) {
          state.selectedTemplate = action.payload[0];
        }
      })
      .addCase(fetchTemplates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // fetchTemplateById
      .addCase(fetchTemplateById.fulfilled, (state, action) => {
        state.selectedTemplate = action.payload;
      })

      // createTemplate
      .addCase(createTemplate.fulfilled, (state, action) => {
        state.templates.unshift(action.payload);
        state.selectedTemplate = action.payload;
        state.actionSuccess = 'Template created successfully';
      })

      // addStage
      .addCase(addStage.fulfilled, (state, action) => {
        if (state.selectedTemplate) {
          state.selectedTemplate.stages.push(action.payload);
        }
        state.actionSuccess = 'Stage added successfully';
      })
      .addCase(addStage.rejected, (state, action) => {
        state.error = action.payload;
      })

      // updateStage
      .addCase(updateStage.fulfilled, (state, action) => {
        if (state.selectedTemplate) {
          const index = state.selectedTemplate.stages.findIndex((s) => s.id === action.payload.id);
          if (index !== -1) {
            state.selectedTemplate.stages[index] = action.payload;
          }
        }
      })

      // deleteStage
      .addCase(deleteStage.fulfilled, (state, action) => {
        if (state.selectedTemplate) {
          state.selectedTemplate.stages = state.selectedTemplate.stages.filter(
            (s) => s.id !== action.payload
          );
        }
        state.actionSuccess = 'Stage deleted successfully';
      })
      .addCase(deleteStage.rejected, (state, action) => {
        state.error = action.payload;
      })

      // reorderStages
      .addCase(reorderStages.fulfilled, (state, action) => {
        if (state.selectedTemplate) {
          state.selectedTemplate.stages = action.payload;
        }
      })

      // publishTemplate
      .addCase(publishTemplate.fulfilled, (state, action) => {
        state.selectedTemplate = action.payload.template;
        const index = state.templates.findIndex((t) => t.id === action.payload.template.id);
        if (index !== -1) {
          state.templates[index] = action.payload.template;
        }
        state.actionSuccess = action.payload.message;
      })
      .addCase(publishTemplate.rejected, (state, action) => {
        state.error = action.payload;
      });
  }
});

export const { clearSopError } = sopSlice.actions;
export default sopSlice.reducer;
