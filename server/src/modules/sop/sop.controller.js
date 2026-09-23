const sopService = require('./sop.service');

// Handle creating a new SOP template in draft mode
const createTemplate = async (req, res, next) => {
  try {
    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Template title is required' });
    }

    const template = await sopService.createTemplate({ title, description });
    return res.status(201).json(template);
  } catch (error) {
    next(error);
  }
};

// Handle listing all SOP templates
const getTemplates = async (req, res, next) => {
  try {
    const templates = await sopService.getTemplates();
    return res.status(200).json(templates);
  } catch (error) {
    next(error);
  }
};

// Handle fetching a single SOP template with stages and versions
const getTemplateById = async (req, res, next) => {
  try {
    const template = await sopService.getTemplateById(req.params.id);
    return res.status(200).json(template);
  } catch (error) {
    next(error);
  }
};

// Handle updating template title and description
const updateTemplate = async (req, res, next) => {
  try {
    const { title, description } = req.body;
    const template = await sopService.updateTemplate(req.params.id, { title, description });
    return res.status(200).json(template);
  } catch (error) {
    next(error);
  }
};

// Handle deleting an unreferenced SOP template
const deleteTemplate = async (req, res, next) => {
  try {
    await sopService.deleteTemplate(req.params.id);
    return res.status(200).json({ message: 'SOP Template deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Handle adding a stage to an SOP template
const addStage = async (req, res, next) => {
  try {
    const { name, order, clientVisible } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Stage name is required' });
    }

    const stage = await sopService.addStage(req.params.id, { name, order, clientVisible });
    return res.status(201).json(stage);
  } catch (error) {
    next(error);
  }
};

// Handle updating stage properties like clientVisible and name
const updateStage = async (req, res, next) => {
  try {
    const { name, clientVisible } = req.body;
    const stage = await sopService.updateStage(req.params.stageId, { name, clientVisible });
    return res.status(200).json(stage);
  } catch (error) {
    next(error);
  }
};

// Handle deleting a stage, enforcing draft-status constraints
const deleteStage = async (req, res, next) => {
  try {
    await sopService.deleteStage(req.params.id, req.params.stageId);
    return res.status(200).json({ message: 'Stage deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Handle bulk reordering of stages within a template
const reorderStages = async (req, res, next) => {
  try {
    const { stageOrders } = req.body;
    if (!Array.isArray(stageOrders)) {
      return res.status(400).json({ message: 'stageOrders array is required' });
    }

    const updated = await sopService.reorderStages(req.params.id, stageOrders);
    return res.status(200).json({ message: 'Stages reordered successfully', stages: updated });
  } catch (error) {
    next(error);
  }
};

// Handle publishing an SOP template to generate an immutable version
const publishTemplate = async (req, res, next) => {
  try {
    const result = await sopService.publishTemplate(req.params.id);
    return res.status(200).json({
      message: `SOP published successfully as version ${result.version.versionNumber}`,
      version: result.version,
      template: result.template
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  addStage,
  updateStage,
  deleteStage,
  reorderStages,
  publishTemplate
};
