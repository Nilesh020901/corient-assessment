const projectsService = require('./projects.service');

// Handle creating a project and triggering workflow stage generation from latest SOP version
const createProject = async (req, res, next) => {
  try {
    const { name, description, sopTemplateId, ownerId } = req.body;
    if (!name || !sopTemplateId) {
      return res.status(400).json({ message: 'Project name and sopTemplateId are required' });
    }

    const project = await projectsService.createProject({
      name,
      description,
      sopTemplateId,
      ownerId: ownerId || req.user.id
    });

    return res.status(201).json(project);
  } catch (error) {
    next(error);
  }
};

// Handle listing projects accessible to the current authenticated user
const getProjects = async (req, res, next) => {
  try {
    const projects = await projectsService.getProjects(req.user);
    return res.status(200).json(projects);
  } catch (error) {
    next(error);
  }
};

// Handle retrieving single project details with all workflow stages
const getProjectById = async (req, res, next) => {
  try {
    const project = await projectsService.getProjectById(req.params.id);
    return res.status(200).json(project);
  } catch (error) {
    next(error);
  }
};

// Handle updating project information
const updateProject = async (req, res, next) => {
  try {
    const { name, description, ownerId } = req.body;
    const project = await projectsService.updateProject(req.params.id, { name, description, ownerId });
    return res.status(200).json(project);
  } catch (error) {
    next(error);
  }
};

// Handle deleting a project
const deleteProject = async (req, res, next) => {
  try {
    await projectsService.deleteProject(req.params.id);
    return res.status(200).json({ message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject
};
