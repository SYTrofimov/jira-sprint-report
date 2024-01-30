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
 * Calculate the status of an issue with respect to a given sprint
 * Note: Only Story Points and Status are currently supported
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
  if (!issue.key) {
    throw new Error('Missing the key property in issue');
  }
  if (!issue.fields) {
    throw new Error(`Missing the fields property in issue ${issue.key}`);
  }
  if (issue.fields[CUSTOM_FIELDS.storyPoints] === undefined) {
    // null is allowed
    throw new Error(`Missing the Story Points custom field in issue ${issue.key}`);
  }
  if (!issue.fields[CUSTOM_FIELDS.sprint]) {
    throw new Error(`Missing the Sprint custom field in issue ${issue.key}`);
  }
  if (!issue.changelog || !issue.changelog.histories) {
    throw new Error(`Missing changelog.histories in issue ${issue.key}`);
  }

  if (!sprint.name) {
    throw new Error('Missing the name property in sprint');
  }
  if (!sprint.id) {
    throw new Error(`Missing the id property in sprint '${sprint.name}'`);
  }

  const startTime = new Date(sprint.startDate);
  const completeTime = new Date(sprint.completeDate);

  // now
  let lastStoryPoints = issue.fields[CUSTOM_FIELDS.storyPoints];
  let lastTime = new Date();

  const result = {};
  result.finalEstimate = lastStoryPoints;

  // iterate over changelog histories backward in time
  for (let history of issue.changelog.histories) {
    const historyTime = new Date(history.created);

    // crossing the sprint start boundary
    if (historyTime < startTime) {
      break;
    }

    for (let item of history.items) {
      if (item.fieldId === CUSTOM_FIELDS.storyPoints) {
        lastStoryPoints = parseFloat(item.fromString);

        // update finalEstimate, until we cross the sprint complete boundary
        if (historyTime > completeTime) {
          result.finalEstimate = lastStoryPoints;
        }
      }
    }

    lastTime = historyTime;
  }

  result.initialEstimate = lastStoryPoints;

  return result;
}

export { initCustomFields, issueVsSprint };
