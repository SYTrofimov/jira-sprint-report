'use strict';
// @ts-check

let INITIALIZED = false;
const CUSTOM_FIELDS = {};
const DONE_STATUSES = new Set();

/**
 * Initialize sprint report.
 * @param {Object} customFields - Custom fields from Jira Get Custom Fields API in the following format:
 * {
 *   sprint: 'customfield_10001',
 *   storyPoints: 'customfield_10002',
 *   storyPointEstimate: 'customfield_10003',
 * }.
 * @param {Object} doneStatuses - Arrray of 'done' status strings.
 * @throws {Error} if customFields does not have required fields.
 */
function initSprintReport(customFields, doneStatuses) {
  if (!customFields.sprint) {
    throw new Error('Missing Sprint field in customFields');
  }
  if (!customFields.storyPoints && !customFields.storyPointEstimate) {
    throw new Error('Missing Story Points and Story Point Estimate fields in customFields');
  }

  CUSTOM_FIELDS.sprint = customFields.sprint;
  CUSTOM_FIELDS.storyPoints = customFields.storyPoints;
  CUSTOM_FIELDS.storyPointEstimate = customFields.storyPointEstimate;

  DONE_STATUSES.clear();
  for (const status of doneStatuses) {
    DONE_STATUSES.add(status);
  }

  INITIALIZED = true;
}

function uninitialize() {
  delete CUSTOM_FIELDS.sprint;
  delete CUSTOM_FIELDS.storyPoints;
  delete CUSTOM_FIELDS.storyPointEstimate;

  DONE_STATUSES.clear();

  INITIALIZED = false;
}

function storyPointFieldValue(issue) {
  let storyPoints;

  if (CUSTOM_FIELDS.storyPoints) {
    storyPoints = issue.fields[CUSTOM_FIELDS.storyPoints];
  }

  if (storyPoints === undefined && CUSTOM_FIELDS.storyPointEstimate) {
    storyPoints = issue.fields[CUSTOM_FIELDS.storyPointEstimate];
  }

  return storyPoints;
}

function isStoryPointFieldId(fieldId) {
  return fieldId === CUSTOM_FIELDS.storyPoints || fieldId === CUSTOM_FIELDS.storyPointEstimate;
}

function sprintIdSetFromIssue(issue) {
  const sprints = issue.fields[CUSTOM_FIELDS.sprint];
  if (!sprints) {
    return new Set();
  } else {
    return new Set(sprints.map((sprint) => sprint.id));
  }
}

function sprintIdSetFromSprintIdString(sprintIdString) {
  if (!sprintIdString) {
    return new Set();
  }
  return new Set(sprintIdString.split(/, |,/).map((id) => parseInt(id)));
}

/**
 * Determine the relationship of an issue with respect to a given sprint for a sprint report.
 * Sprint must be closed. Issue changelog is expected to be sorted by created date in descending order.
 * @param {Object} issue - Issue object from Jira Get Sprint Issues API, including changelog.
 * @param {Object} sprint - Sprint object from Jira Get Sprint API.
 * @returns {Object} - An object in the following format:
 * {
 *   outcome 'COMPLETED' | 'NOT_COMPLETED' | 'REMOVED' | 'COMPLETED_IN_ANOTHER_SPRINT' | 'NOT_RELEVANT',
 *   initialEstimate: float,
 *   finalEstimate: float,
 *   addedDuringSprint: boolean,
 * }.
 * @throws {Error} if required fields are missing (not all missing fields are handled explicitly).
 */
function issueSprintReport(issue, sprint) {
  if (!INITIALIZED) {
    throw new Error('jira-sprint-report not initialized. Call initSprintReport() first.');
  }
  if (issue === undefined) {
    throw new Error('issue is undefined');
  }
  if (issue.fields[CUSTOM_FIELDS.sprint] === undefined) {
    throw new Error(`Missing Sprint custom field in issue ${issue.key}`);
  }
  if (storyPointFieldValue(issue) === undefined) {
    throw new Error(`Missing Story Point related custom fields in issue ${issue.key}`);
  }
  if (issue.changelog === undefined || issue.changelog.histories === undefined) {
    throw new Error(`Missing changelog.histories in issue ${issue.key}`);
  }

  const startTime = new Date(sprint.startDate);
  const completeTime = new Date(sprint.completeDate);

  let storyPoints = storyPointFieldValue(issue);
  let sprintIdSet = sprintIdSetFromIssue(issue);
  let status = issue.fields.status.name;

  let storyPointsWhenAdded;

  let finalStoryPoints = storyPoints;
  let finalSprintIdSet = sprintIdSet;
  let finalStatus = status;

  let addedDuringSprint = false;
  let completed = false;
  let reopened = false;

  for (let history of issue.changelog.histories) {
    const historyTime = new Date(history.created);

    if (historyTime <= startTime) {
      break;
    }

    for (let item of history.items) {
      if (isStoryPointFieldId(item.fieldId)) {
        storyPoints = item.fromString === null ? null : parseFloat(item.fromString);

        if (historyTime > completeTime) {
          finalStoryPoints = storyPoints;
        }
      } else if (item.fieldId === CUSTOM_FIELDS.sprint) {
        sprintIdSet = sprintIdSetFromSprintIdString(item.from);

        if (historyTime > completeTime) {
          finalSprintIdSet = sprintIdSet;
        } else {
          const toSprintIdSet = sprintIdSetFromSprintIdString(item.to);
          if (toSprintIdSet.has(sprint.id) && !sprintIdSet.has(sprint.id)) {
            storyPointsWhenAdded = storyPoints;
            addedDuringSprint = true;
          }
        }
      } else if (item.fieldId === 'status') {
        status = item.fromString;

        if (historyTime > completeTime) {
          finalStatus = status;
        } else if (DONE_STATUSES.has(item.toString)) {
          completed = true;
        } else if (DONE_STATUSES.has(item.fromString)) {
          reopened = true;
        }
      }
    }
  }

  if (sprintIdSet.has(sprint.id)) {
    addedDuringSprint = false;
  } else if (!finalSprintIdSet.has(sprint.id) && !addedDuringSprint) {
    return { outcome: 'NOT_RELEVANT' };
  }

  const createTime = new Date(issue.fields.created);
  if (createTime > startTime && !addedDuringSprint) {
    // Issue created in sprint, probably as subtask, so no record of sprint field changes,
    // but it is still added during the sprint
    storyPointsWhenAdded = storyPoints;
    addedDuringSprint = true;
  }

  let outcome;
  if (DONE_STATUSES.has(status) && !completed && !reopened) {
    outcome = 'COMPLETED_IN_ANOTHER_SPRINT';
  } else if (finalSprintIdSet.has(sprint.id)) {
    outcome = DONE_STATUSES.has(finalStatus) ? 'COMPLETED' : 'NOT_COMPLETED';
  } else {
    outcome = 'REMOVED';
  }

  const result = {
    outcome: outcome,
    initialEstimate: addedDuringSprint ? storyPointsWhenAdded : storyPoints,
    finalEstimate: finalStoryPoints,
    addedDuringSprint: addedDuringSprint,
  };

  return result;
}

/**
 * Determine the issues that were removed from active sprints.
 * Issue changelog is expected to be sorted by created date in descending order.
 * @param {Array<Object>} issues - Array of Issue objects from the Jira Get Sprint Issues API call,
 * including changelog.
 * @param {Map<Number, Object>} sprintsById - A map from sprint Id to Sprint objects from the Jira
 * Get Sprint API call.
 * @returns {Map<Number, Set<Object>>} - A Map from SprintIds to a Set of Issues.
 * @throws {Error} if required fields are missing (not all missing fields are handled explicitly).
 */
function removedIssuesBySprintId(issues, sprintsById) {
  if (!INITIALIZED) {
    throw new Error('jira-sprint-report not initialized. Call initSprintReport() first.');
  }

  const removedIssuesBySprintIdMap = new Map();

  for (const issue of issues) {
    for (const history of issue.changelog.histories) {
      for (const item of history.items) {
        if (item.fieldId === CUSTOM_FIELDS.sprint) {
          const fromSprintIds = sprintIdSetFromSprintIdString(item.from);
          const toSprintIds = sprintIdSetFromSprintIdString(item.to);

          // iterate over fromSprintIds to find the sprint the issue was removed from
          for (const fromSprintId of fromSprintIds) {
            if (!toSprintIds.has(fromSprintId)) {
              const sprint = sprintsById.get(fromSprintId);

              if (!sprint) {
                continue;
              }

              const startTime = new Date(sprint.startDate);
              const completeTime = new Date(sprint.completeDate);
              const historyTime = new Date(history.created);

              if (historyTime >= startTime && historyTime <= completeTime) {
                if (!removedIssuesBySprintIdMap.has(sprint.id)) {
                  removedIssuesBySprintIdMap.set(sprint.id, new Set());
                }
                removedIssuesBySprintIdMap.get(sprint.id).add(issue);
              }
            }
          }
        }
      }
    }
  }

  return removedIssuesBySprintIdMap;
}

function issueDeltaPlanned(issueSprintReport) {
  return issueSprintReport.outcome === 'NOT_RELEVANT' ||
    issueSprintReport.addedDuringSprint ||
    issueSprintReport.initialEstimate === null
    ? 0
    : issueSprintReport.initialEstimate;
}

function issueDeltaCompleted(issueSprintReport) {
  return issueSprintReport.outcome === 'NOT_RELEVANT' ||
    issueSprintReport.outcome !== 'COMPLETED' ||
    issueSprintReport.finalEstimate === null
    ? 0
    : issueSprintReport.finalEstimate;
}

function sprintIdsFromSprintField(sprintField) {
  const sprintIds = [];

  if (!sprintField) {
    return sprintIds;
  }

  for (let sprint of sprintField) {
    sprintIds.push(sprint.id);
  }

  return sprintIds;
}

function issuesBySprintId(issues) {
  const issuesBySprintIdMap = new Map();
  for (const issue of issues) {
    const sprintIds = sprintIdsFromSprintField(issue.fields[CUSTOM_FIELDS.sprint]);

    for (const sprintId of sprintIds) {
      if (!issuesBySprintIdMap.has(sprintId)) {
        issuesBySprintIdMap.set(sprintId, new Set());
      }
      issuesBySprintIdMap.get(sprintId).add(issue);
    }
  }
  return issuesBySprintIdMap;
}

function sprintsById(sprints) {
  const sprintsByIdMap = new Map();
  for (const sprint of sprints) {
    sprintsByIdMap.set(sprint.id, sprint);
  }
  return sprintsByIdMap;
}

function mergeSets(set1, set2) {
  const mergedSet = new Set(set1);

  for (const item of set2) {
    mergedSet.add(item);
  }

  return mergedSet;
}

/**
 * Calculate velocity report.
 * @param {Array<Object>} issues - An array of issue updated since the start of the first sprint in sprints,
 * as obtainedrom the Jira Get Board Issues API call, including changelog.
 * @param {Array<Object>} sprints - An array of Sprint objects from the Jira Get Board Sprints API call.
 * @returns {Array} - An array of objects corresponding to sprints in the following format:
 * {
 *   planned: Number,
 *   completed: Number,
 * }.
 * @throws {Error} if required fields are missing (not all missing fields are handled explicitly)
 */
function velocityReport(issues, sprints) {
  const issuesBySprintIdMap = issuesBySprintId(issues);
  const sprintsByIdMap = sprintsById(sprints);
  const removedIssuesBySprintIdMap = removedIssuesBySprintId(issues, sprintsByIdMap);

  const reports = [];

  for (const sprint of sprints) {
    let planned = 0;
    let completed = 0;

    const sprintIssuesSet = issuesBySprintIdMap.get(sprint.id) || new Set();
    const removedIssuesSet = removedIssuesBySprintIdMap.get(sprint.id) || new Set();
    const issuesSet = mergeSets(sprintIssuesSet, removedIssuesSet);

    for (const issue of issuesSet) {
      const result = issueSprintReport(issue, sprint);
      planned += issueDeltaPlanned(result);
      completed += issueDeltaCompleted(result);
    }

    reports.push({
      planned: planned,
      completed: completed,
    });
  }

  return reports;
}

export {
  initSprintReport,
  uninitialize,
  storyPointFieldValue,
  issueSprintReport,
  removedIssuesBySprintId,
  issueDeltaPlanned,
  issueDeltaCompleted,
  velocityReport,
};
