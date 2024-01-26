'use strict';
// @ts-check

import { test, expect, beforeAll } from '@jest/globals';
import { initCustomFields, issueVsSprint } from './jira-sprint-report.js';

beforeAll(() => {
  initCustomFields({
    storyPoints: 'customfield_10001',
    sprint: 'customfield_10002',
  });
});

test('test 1', () => {
  const issue = {};
  const sprint = {};

  const result = issueVsSprint(issue, sprint);

  const expectedResult = {
    status: 'COMPLETED',
    initialEstimate: 3,
    finalEstimate: 3,
    addedDuringSprint: false,
  };

  expect(result).toEqual(expectedResult);
});
