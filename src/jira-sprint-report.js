'use strict';
// @ts-check

let CUSTOM_FIELDS = {};

/**
 * Initialize custom fields
 * @param {Object} customFields - Custom fields from Jira Get Custom Fields API in the following format:
 * {
 *   storyPoints: 'customfield_10002',
 *   sprint: 'customfield_10003',
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
 * Calculate the state of an issue at given times
 * Note: Only Story Points and Status are currently supported
 * @param {string} issue - Issue object from Jira Get Sprint Issues API
 * @param {DateTime} times - Array of times to calculate state at
 * @returns {Object} containing issue state at given times
 */
function issueStateAtTimes(issue, times) {
  const issueState = {};

  times.forEach((time) => {
    issueState[time] = {
      storyPoints: issue.fields.customfield_10002,
      status: issue.fields.status.name,
    };
  });
  return issueState;
}

export { initCustomFields, issueStateAtTimes };
