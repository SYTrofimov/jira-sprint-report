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

  // now
  let lastStoryPoints = issue.fields[CUSTOM_FIELDS.storyPoints];
  let lastTime = new Date();

  const result = {};
  result.finalEstimate = lastStoryPoints;

  result.status = issue.fields.status.name === 'Done' ? 'COMPLETED' : 'NOT_COMPLETED';

  for (let history of issue.changelog.histories) {
    const historyTime = new Date(history.created);

    if (historyTime > lastTime) {
      // we will not catch the wrong order before sprint start, but that's okay,
      // as we are testing the unit tests, not Jira API here
      throw new Error('Changelog.histories in the wrong order');
    }

    // crossing the sprint start boundary
    if (historyTime <= startTime) {
      break;
    }

    for (let item of history.items) {
      if (item.fieldId === CUSTOM_FIELDS.storyPoints) {
        lastStoryPoints = item.fromString === null ? null : parseFloat(item.fromString);

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
