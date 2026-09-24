const openprojectStub = require('./openproject.stub');
const timesheetStub = require('./timesheet.stub');

const syncOpenProjectStage = async (req, res, next) => {
  try {
    const { stageId } = req.params;
    const result = await openprojectStub.syncWorkPackage(stageId, req.user);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getOpenProjectStatus = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const result = await openprojectStub.getProjectSyncStatus(projectId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const logTimesheet = async (req, res, next) => {
  try {
    const result = await timesheetStub.logTimeEntry(req.body, req.user);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const getStageTimesheets = async (req, res, next) => {
  try {
    const { stageId } = req.params;
    const result = await timesheetStub.getTimesheets(stageId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  syncOpenProjectStage,
  getOpenProjectStatus,
  logTimesheet,
  getStageTimesheets
};
