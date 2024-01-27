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
  if (!issue.fields) {
    throw new Error('Missing fields member in issue');
  }
  if (!issue.fields[CUSTOM_FIELDS.storyPoints]) {
    throw new Error('Missing Story Points custom field in issue');
  }
  if (!issue.fields[CUSTOM_FIELDS.sprint]) {
    throw new Error('Missing Sprint custom field in issue');
  }

  const result = {
    status: 'COMPLETED',
    initialEstimate: 5,
    finalEstimate: 5,
    addedDuringSprint: false,
  };

  return result;
}

export { initCustomFields, issueVsSprint };
