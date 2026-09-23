const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./modules/auth/auth.routes');
const rolesRoutes = require('./modules/roles/roles.routes');
const usersRoutes = require('./modules/users/users.routes');
const sopRoutes = require('./modules/sop/sop.routes');
const projectsRoutes = require('./modules/projects/projects.routes');
const stagesRoutes = require('./modules/stages/stages.routes');
const auditRoutes = require('./modules/audit/audit.routes');

const app = express();

// Configure CORS to allow credentials so httpOnly refresh cookies can be transmitted across origins
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  })
);

app.use(express.json());
app.use(cookieParser());

// Health check endpoint for Render / monitoring services
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Mount module routes
app.use('/api/auth', authRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/sop', sopRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/projects/:projectId/stages', stagesRoutes);
app.use('/api/projects/:id/stages', stagesRoutes);
app.use('/api/audit', auditRoutes);

// Centralized error handling middleware to keep controller try/catch blocks clean
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    console.error('[Error Details]:', err);
  }

  res.status(statusCode).json({ message });
});

module.exports = app;
