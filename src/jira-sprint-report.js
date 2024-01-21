'use strict';
// @ts-check

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

export { issueStateAtTimes };
