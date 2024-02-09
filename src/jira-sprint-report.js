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
 * Calculate the status of an issue with respect to a given sprint.
 * Sprint must be closed. Issue and sprint must be related.
 * Issue changelog is expected to be sorted by created date in descending order.
 * @param {Object} issue - Issue object from Jira Get Sprint Issues API, including changelog
 * @param {Object} sprint - Sprint object from Jira Get Sprint API
 * @returns {Object} an object in the following format:
 * {
 *   outcome 'COMPLETED' | 'NOT_COMPLETED' | 'PUNTED' | 'COMPLETED_IN_ANOTHER_SPRINT',
 *   initialEstimate: float,
 *   finalEstimate: float,
 *   addedDuringSprint: boolean,
 * }
 * @throws {Error} if required fields are missing
 */
function issueVsSprint(issue, sprint) {
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
  let lastSprintId = lastSprintIdFromSprintField(issue.fields[CUSTOM_FIELDS.sprint]);

  let finalStoryPoints = storyPoints;
  let finalLastSprintId = lastSprintId;
  let finalStatus = issue.fields.status.name;

  let addedDuringSprint = false;

  for (let history of issue.changelog.histories) {
    const historyTime = new Date(history.created);

    if (historyTime <= startTime || addedDuringSprint) {
      break;
    }

    for (let item of history.items) {
      if (item.fieldId === CUSTOM_FIELDS.storyPoints) {
        storyPoints = item.fromString === null ? null : parseFloat(item.fromString);

        if (historyTime > completeTime) {
          finalStoryPoints = storyPoints;
        }
      } else if (item.fieldId === CUSTOM_FIELDS.sprint) {
        lastSprintId = lastSprintIdFromSprintString(item.from);

        if (historyTime > completeTime) {
          finalLastSprintId = lastSprintId;
        } else {
          const lastToSprintId = lastSprintIdFromSprintString(item.to);
          if (lastToSprintId === sprint.id) {
            lastSprintId = lastToSprintId;
            addedDuringSprint = true;
            break;
          }
        }
      } else if (item.fieldId === 'status') {
        if (historyTime > completeTime) {
          finalStatus = item.fromString;
        }
      }
    }
  }

  let outcome = 'NOT_COMPLETED';
  if (finalStatus === 'Done' && finalLastSprintId === sprint.id) {
    outcome = 'COMPLETED';
  } else if (lastSprintId !== finalLastSprintId) {
    outcome = 'PUNTED';
  }

  const result = {
    outcome: outcome,
    initialEstimate: storyPoints,
    finalEstimate: finalStoryPoints,
    addedDuringSprint: addedDuringSprint,
  };

  return result;
}

export { initCustomFields, issueVsSprint };
