const stagesService = require('./stages.service');

// Handle manual stage status updates with conditional required field validation
const updateStageStatus = async (req, res, next) => {
  try {
    const { stageId } = req.params;
    const { status, blocker, holdReason, completionDate, remarks } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const updatedStage = await stagesService.updateStageStatus(
      stageId,
      { status, blocker, holdReason, completionDate, remarks },
      req.user.id
    );

    return res.status(200).json(updatedStage);
  } catch (error) {
    next(error);
  }
};

// Handle retrieving full status transition audit trail for a stage
const getStageHistory = async (req, res, next) => {
  try {
    const { stageId } = req.params;
    const history = await stagesService.getStageHistory(stageId);
    return res.status(200).json(history);
  } catch (error) {
    next(error);
  }
};

// Handle assigning an owner to a workflow stage
const assignStageOwner = async (req, res, next) => {
  try {
    const { stageId } = req.params;
    const { ownerId } = req.body;

    const updatedStage = await stagesService.assignStageOwner(stageId, ownerId);
    return res.status(200).json(updatedStage);
  } catch (error) {
    next(error);
  }
};

// Handle adding remarks or document attachments without mutating stage status
const addStageRemarksOrDocs = async (req, res, next) => {
  try {
    const { stageId } = req.params;
    const { remarks, documents } = req.body;

    const updatedStage = await stagesService.addStageRemarksOrDocs(stageId, { remarks, documents });
    return res.status(200).json(updatedStage);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateStageStatus,
  getStageHistory,
  assignStageOwner,
  addStageRemarksOrDocs
};
