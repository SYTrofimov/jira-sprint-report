'use strict';
// @ts-check

let CUSTOM_FIELDS = {};

/**
 * Initialize custom fields
 * @param {Object} customFields - Custom fields from Jira Get Custom Fields API in the following format:
 * {
 *   storyPoints: 'customfield_10001',
 *   sprint: 'customfield_10002',
 * }
 * @throws {Error} if customFields does not have required fields
 */
function initCustomFields(customFields) {
  if (!customFields.storyPoints) {
    throw new Error('Missing storyPoints field in customFields');
  }
  if (!customFields.sprint) {
    throw new Error('Missing sprint field in customFields');
  }

  CUSTOM_FIELDS = customFields;
}

function lastSprintIdFromSprintField(sprintField) {
  if (sprintField.length === 0) {
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
 * Determine the relationship of an issue with respect to a given sprint that can be used
 * in a sprint report. Sprint must be closed. Issue and sprint must be related.
 * Issue changelog is expected to be sorted by created date in descending order.
 * @param {Object} issue - Issue object from Jira Get Sprint Issues API, including changelog
 * @param {Object} sprint - Sprint object from Jira Get Sprint API
 * @returns {Object} - An object in the following format:
 * {
 *   outcome 'COMPLETED' | 'NOT_COMPLETED' | 'PUNTED' | 'NOT_RELEVANT',
 *   initialEstimate: float,
 *   finalEstimate: float,
 *   addedDuringSprint: boolean,
 * }
 * @throws {Error} if required fields are missing (not all missing fields are handled explicitly)
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
 * Return a Set of sprint Ids, from which a given issue was removed, while they were active.
 * Issue changelog is expected to be sorted by created date in descending order.
 * @param {Object} issue - Issue object from the Jira Get Sprint Issues API call, including changelog
 * @param {Map} sprintsById - A map from sprint Id to Sprint objects from the Jira Get Sprint API call
 * @returns {Set} - A set of sprint Ids
 * @throws {Error} if required fields are missing (not all missing fields are handled explicitly)
 */
function issueRemovedFromActiveSprints(issue, sprintsById) {
  const sprintIds = new Set();

  for (let history of issue.changelog.histories) {
    for (let item of history.items) {
      if (item.fieldId === CUSTOM_FIELDS.sprint) {
        const lastFromSprintId = lastSprintIdFromSprintString(item.from);
        const toSprintIds = sprintIdsFromSprintString(item.to);
        if (lastFromSprintId !== null && (!toSprintIds || !toSprintIds.has(lastFromSprintId))) {
          const sprint = sprintsById.get(lastFromSprintId);

          const startTime = new Date(sprint.startDate);
          const completeTime = new Date(sprint.completeDate);
          const historyTime = new Date(history.created);

          if (historyTime >= startTime && historyTime <= completeTime) {
            sprintIds.add(lastFromSprintId);
          }
        }
      }
    }
  }

  return sprintIds;
}

export { initCustomFields, issueSprintReport, issueRemovedFromActiveSprints };
