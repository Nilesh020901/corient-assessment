import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

// Fetch projects accessible to the current user (filtered by server scope)
export const fetchProjects = createAsyncThunk(
  'projects/fetchProjects',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/projects');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch projects');
    }
  }
);

// Fetch detailed view of a single project including all generated workflow stages
export const fetchProjectById = createAsyncThunk(
  'projects/fetchProjectById',
  async (projectId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/projects/${projectId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch project details');
    }
  }
);

// Provision new project and auto-generate workflow stages from the latest published SOP version
export const createProject = createAsyncThunk(
  'projects/createProject',
  async (projectData, { rejectWithValue }) => {
    try {
      const response = await api.post('/projects', projectData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create project');
    }
  }
);

// Update high level project metadata
export const updateProject = createAsyncThunk(
  'projects/updateProject',
  async ({ id, updateData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/projects/${id}`, updateData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update project');
    }
  }
);

// Remove a project and cascade removal of associated workflow stages
export const deleteProject = createAsyncThunk(
  'projects/deleteProject',
  async (projectId, { rejectWithValue }) => {
    try {
      await api.delete(`/projects/${projectId}`);
      return projectId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete project');
    }
  }
);

const initialState = {
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
  successMessage: null
};

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    clearProjectMessages: (state) => {
      state.error = null;
      state.successMessage = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchProjects
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.projects = action.payload;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // fetchProjectById
      .addCase(fetchProjectById.fulfilled, (state, action) => {
        state.currentProject = action.payload;
      })

      // createProject
      .addCase(createProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.loading = false;
        state.projects.unshift(action.payload);
        state.successMessage = `Project "${action.payload.name}" created with ${action.payload.stages?.length || 0} stages generated!`;
      })
      .addCase(createProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // updateProject
      .addCase(updateProject.fulfilled, (state, action) => {
        const index = state.projects.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.projects[index] = action.payload;
        }
        if (state.currentProject?.id === action.payload.id) {
          state.currentProject = action.payload;
        }
        state.successMessage = 'Project updated successfully';
      })

      // deleteProject
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.projects = state.projects.filter((p) => p.id !== action.payload);
        if (state.currentProject?.id === action.payload) {
          state.currentProject = null;
        }
        state.successMessage = 'Project deleted successfully';
      });
  }
});

export const { clearProjectMessages } = projectsSlice.actions;
export default projectsSlice.reducer;
