'use strict';
// @ts-check

const CUSTOM_FIELDS = {};

/**
 * Initialize custom fields.
 * @param {Object} customFields - Custom fields from Jira Get Custom Fields API in the following format:
 * {
 *   storyPoints: 'customfield_10001',
 *   sprint: 'customfield_10002',
 * }.
 * @throws {Error} if customFields does not have required fields.
 */
function initCustomFields(customFields) {
  if (!customFields.storyPoints) {
    throw new Error('Missing storyPoints field in customFields');
  }
  if (!customFields.sprint) {
    throw new Error('Missing sprint field in customFields');
  }

  CUSTOM_FIELDS.storyPoints = customFields.storyPoints;
  CUSTOM_FIELDS.sprint = customFields.sprint;
}

function lastSprintIdFromSprintField(sprintField) {
  if (!sprintField || sprintField.length === 0) {
    return null;
  }
  return sprintField[sprintField.length - 1].id;
}

function lastSprintIdFromSprintString(sprintString) {
  if (!sprintString) {
    return null;
  }
  const chunks = sprintString.split(/, |,/);
  return parseInt(chunks[chunks.length - 1]);
}

/**
 * Determine the relationship of an issue with respect to a given sprint for a sprint report.
 * Sprint must be closed. Issue changelog is expected to be sorted by created date in descending order.
 * @param {Object} issue - Issue object from Jira Get Sprint Issues API, including changelog.
 * @param {Object} sprint - Sprint object from Jira Get Sprint API.
 * @returns {Object} - An object in the following format:
 * {
 *   outcome 'COMPLETED' | 'NOT_COMPLETED' | 'PUNTED' | 'NOT_RELEVANT',
 *   initialEstimate: float,
 *   finalEstimate: float,
 *   addedDuringSprint: boolean,
 * }.
 * @throws {Error} if required fields are missing (not all missing fields are handled explicitly).
 */
function issueSprintReport(issue, sprint) {
  if (issue === undefined) {
    throw new Error('issue is undefined');
  }
  if (issue.fields[CUSTOM_FIELDS.sprint] === undefined) {
    throw new Error(`Missing Sprint custom field in issue ${issue.key}`);
  }
  if (issue.fields[CUSTOM_FIELDS.storyPoints] === undefined) {
    throw new Error(`Missing Story Points custom field in issue ${issue.key}`);
  }
  if (issue.changelog === undefined || issue.changelog.histories === undefined) {
    throw new Error(`Missing changelog.histories in issue ${issue.key}`);
  }

  const startTime = new Date(sprint.startDate);
  const completeTime = new Date(sprint.completeDate);

  let storyPoints = issue.fields[CUSTOM_FIELDS.storyPoints];
  let sprintId = lastSprintIdFromSprintField(issue.fields[CUSTOM_FIELDS.sprint]);

  let storyPointsWhenAdded;

  let finalStoryPoints = storyPoints;
  let finalSprintId = sprintId;
  let finalStatus = issue.fields.status.name;

  let addedDuringSprint = false;

  for (let history of issue.changelog.histories) {
    const historyTime = new Date(history.created);

    if (historyTime <= startTime) {
      break;
    }

    for (let item of history.items) {
      if (item.fieldId === CUSTOM_FIELDS.storyPoints) {
        storyPoints = item.fromString === null ? null : parseFloat(item.fromString);

        if (historyTime > completeTime) {
          finalStoryPoints = storyPoints;
        }
      } else if (item.fieldId === CUSTOM_FIELDS.sprint) {
        sprintId = lastSprintIdFromSprintString(item.from);

        if (historyTime > completeTime) {
          finalSprintId = sprintId;
        } else {
          const lastToSprintId = lastSprintIdFromSprintString(item.to);
          if (lastToSprintId === sprint.id) {
            storyPointsWhenAdded = storyPoints;
            addedDuringSprint = true;
          }
        }
      } else if (item.fieldId === 'status') {
        if (historyTime > completeTime) {
          finalStatus = item.fromString;
        }
      }
    }
  }

  if (sprintId === sprint.id) {
    addedDuringSprint = false;
  } else if (finalSprintId !== sprint.id && !addedDuringSprint) {
    return { outcome: 'NOT_RELEVANT' };
  }

  let outcome;
  if (finalSprintId === sprint.id) {
    outcome = finalStatus === 'Done' ? 'COMPLETED' : 'NOT_COMPLETED';
  } else {
    outcome = 'PUNTED';
  }

  const result = {
    outcome: outcome,
    initialEstimate: addedDuringSprint ? storyPointsWhenAdded : storyPoints,
    finalEstimate: finalStoryPoints,
    addedDuringSprint: addedDuringSprint,
  };

  return result;
}

function sprintIdsFromSprintString(sprintString) {
  if (!sprintString) {
    return null;
  }

  const chunks = sprintString.split(/, |,/);

  const sprintIds = new Set();
  for (let chunk of chunks) {
    sprintIds.add(parseInt(chunk));
  }

  return sprintIds;
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
  const removedIssuesBySprintIdMap = new Map();
  for (const issue of issues) {
    for (let history of issue.changelog.histories) {
      for (let item of history.items) {
        if (item.fieldId === CUSTOM_FIELDS.sprint) {
          const fromSprintId = lastSprintIdFromSprintString(item.from);
          const toSprintIds = sprintIdsFromSprintString(item.to);
          if (fromSprintId !== null && (!toSprintIds || !toSprintIds.has(fromSprintId))) {
            const sprint = sprintsById.get(fromSprintId);

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

    const sprintIssues = new Set();
    for (const sprintId of sprintIds) {
      if (!issuesBySprintIdMap.has(sprintId)) {
        issuesBySprintIdMap.set(sprintId, new Set());
      }
      const sprintIssues = issuesBySprintIdMap.get(sprintId);
      sprintIssues.add(issue);
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
 * @returns {Object} - An object in the following format:
 * {
 *   planned: float,
 *   completed: float,
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
  initCustomFields,
  issueSprintReport,
  removedIssuesBySprintId,
  issueDeltaPlanned,
  issueDeltaCompleted,
  velocityReport,
};
