import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import sopReducer from './slices/sopSlice';
import usersReducer from './slices/usersSlice';
import projectsReducer from './slices/projectsSlice';
import stagesReducer from './slices/stagesSlice';
import auditReducer from './slices/auditSlice';

// Centralize state management with Redux Toolkit to provide predictable global application state
export const store = configureStore({
  reducer: {
    auth: authReducer,
    sop: sopReducer,
    users: usersReducer,
    projects: projectsReducer,
    stages: stagesReducer,
    audit: auditReducer
  }
});

export default store;
