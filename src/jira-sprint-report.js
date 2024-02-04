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

/**
 * Convert a sprint field object to a JSON string of sprint IDs
 * @param {Object} sprint - Sprint field object from Jira Get Sprint Issues API
 * @returns {string} JSON string of sprint IDs
 */
function sprintFieldToJSONString(sprint) {
  return JSON.stringify(sprint.map((s) => parseInt(s.id)));
}

/**
 * Convert a comma/space-separated string of sprint IDs to a JSON string
 * @param {Object} sprint - Sprint field object from Jira Get Sprint Issues API
 * @returns {string} a comma/space of sprint IDs
 */
function sprintStringToJSONString(sprint) {
  return JSON.stringify(sprint.split(/, |,/).map((s) => parseInt(s)));
}

/**
 * Calculate the status of an issue with respect to a given sprint.
 * Sprint must be closed. Issue and sprint must be related.
 * Issue changelog is expected to be sorted by created date in descending order.
 * @param {Object} issue - Issue object from Jira Get Sprint Issues API, including changelog
 * @param {Object} sprint - Sprint object from Jira Get Sprint API
 * @returns {Object} an object in the following format:
 * {
 *   status: 'COMPLETED' | 'NOT_COMPLETED' | 'PUNTED' | 'COMPLETED_IN_ANOTHER_SPRINT',
 *   initialEstimate: float,
 *   finalEstimate: float,
 *   addedDuringSprint: boolean,
 * }
 * @throws {Error} if required fields are missing
 */
function issueVsSprint(issue, sprint) {
  if (!issue.changelog) {
    throw new Error(`Missing changelog in issue ${issue.key}`);
  }

  const startTime = new Date(sprint.startDate);
  const completeTime = new Date(sprint.completeDate);

  let storyPoints = issue.fields[CUSTOM_FIELDS.storyPoints];
  let sprints = sprintFieldToJSONString(issue.fields[CUSTOM_FIELDS.sprint]);
  let status = issue.fields.status.name;

  let finalStoryPoints = storyPoints;
  let finalStatus = status;
  let finalSprints = sprints;

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
        sprints = sprintStringToJSONString(item.from);

        if (historyTime > completeTime) {
          finalSprints = sprints;
        }
      } else if (item.fieldId === 'status') {
        status = item.fromString;

        if (historyTime > completeTime) {
          finalStatus = status;
        }
      }
    }
  }

  console.log(sprints, finalSprints);

  let outcome = 'NOT_COMPLETED';
  if (finalStatus === 'Done' && sprints === finalSprints) {
    outcome = 'COMPLETED';
  } else if (sprints !== finalSprints) {
    outcome = 'PUNTED';
  }

  const result = {
    initialEstimate: storyPoints,
    finalEstimate: finalStoryPoints,
    outcome: outcome,
  };

  return result;
}

export { initCustomFields, issueVsSprint };
