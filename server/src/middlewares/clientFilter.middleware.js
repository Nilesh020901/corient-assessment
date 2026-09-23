// Sanitize individual workflow stage objects by stripping restricted internal data
const sanitizeStage = (stage) => {
  if (!stage || typeof stage !== 'object') return stage;

  // Clone stage object and exclude sensitive internal fields
  const { documents, remarks, history, ...safeStage } = stage;
  return safeStage;
};

// Sanitize a project object by removing non-clientVisible stages and redacting stage metadata
const sanitizeProject = (project) => {
  if (!project || typeof project !== 'object') return project;

  const sanitized = { ...project };

  if (Array.isArray(sanitized.stages)) {
    // Exclude hidden stages entirely and sanitize remaining client-visible stages
    sanitized.stages = sanitized.stages
      .filter((stage) => stage.clientVisible === true)
      .map(sanitizeStage);
  }

  return sanitized;
};

// Deeply filter responses going to Client users at the Express API layer to prevent confidential data exposure
const filterClientData = (req, res, next) => {
  // Only apply sanitization rules when the authenticated user belongs to the CLIENT role
  if (!req.user || req.user.role !== 'CLIENT') {
    return next();
  }

  // Intercept Express res.json to filter payload before sending over the network
  const originalJson = res.json.bind(res);

  res.json = (data) => {
    if (!data) {
      return originalJson(data);
    }

    let sanitizedData = data;

    // Handle array of projects (e.g. GET /api/projects)
    if (Array.isArray(data)) {
      sanitizedData = data.map((item) => {
        if (item && item.stages) {
          return sanitizeProject(item);
        }
        if (item && item.clientVisible !== undefined) {
          return sanitizeStage(item);
        }
        return item;
      });
    } else if (typeof data === 'object') {
      // Handle single project object (e.g. GET /api/projects/:id)
      if (data.stages) {
        sanitizedData = sanitizeProject(data);
      } else if (data.clientVisible !== undefined) {
        // Handle single stage object
        if (!data.clientVisible) {
          return res.status(403).json({ message: 'Access denied: Stage is not client visible' });
        }
        sanitizedData = sanitizeStage(data);
      }
    }

    return originalJson(sanitizedData);
  };

  next();
};

module.exports = {
  filterClientData
};
