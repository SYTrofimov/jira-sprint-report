'use strict';
// @ts-check

import { test, expect, beforeAll } from '@jest/globals';
import { initCustomFields, issueVsSprint } from './jira-sprint-report.js';

beforeAll(() => {
  initCustomFields({
    storyPoints: 'customfield_10030',
    sprint: 'customfield_10020',
  });
});

const SPRINT = {
  id: 5,
  state: 'closed',
  name: 'AC Sprint 1',
  startDate: '2024-01-10T10:00:29.712Z',
  endDate: '2024-01-24T10:00:11.000Z',
  completeDate: '2024-01-24T09:30:49.472Z',
  createdDate: '2024-01-10T09:00:17.954Z',
};

test('Required issue fields missing', () => {
  expect(() => issueVsSprint({}, SPRINT)).toThrow('Missing');
});

test('Required sprint fields missing', () => {
  const issue = makeMinimalIssue();

  expect(() => issueVsSprint(issue, {})).toThrow('Missing');
});

test('Story Points null and unchanged', () => {
  const issue = makeMinimalIssue();
  issue.fields.customfield_10030 = null;

  const result = issueVsSprint(issue, SPRINT);
  expect(result.initialEstimate).toBeNull();
  expect(result.finalEstimate).toBeNull();
});

test('Story Points unchanged', () => {
  const issue = makeMinimalIssue();

  let result = issueVsSprint(issue, SPRINT);
  expect(result.initialEstimate).toBe(5);
  expect(result.finalEstimate).toBe(5);

  issue.fields.customfield_10030 = 3;
  result = issueVsSprint(issue, SPRINT);
  expect(result.initialEstimate).toBe(3);
  expect(result.finalEstimate).toBe(3);
});

test('Story Points changed before sprint', () => {
  const issue = makeMinimalIssue();
  addStoryPointChange(issue, '3', '5', '2023-12-28T15:36:42.765+0000');

  const result = issueVsSprint(issue, SPRINT);
  expect(result.initialEstimate).toBe(5);
  expect(result.finalEstimate).toBe(5);
});

test('Story Points changed during sprint', () => {
  const issue = makeMinimalIssue();
  addStoryPointChange(issue, '3', '5', '2024-01-15T15:36:42.765+0000');

  const result = issueVsSprint(issue, SPRINT);
  expect(result.initialEstimate).toBe(3);
  expect(result.finalEstimate).toBe(5);
});

test('Story Points changed from null during sprint', () => {
  const issue = makeMinimalIssue();
  addStoryPointChange(issue, null, '5', '2024-01-15T15:36:42.765+0000');

  const result = issueVsSprint(issue, SPRINT);
  expect(result.initialEstimate).toBeNull();
  expect(result.finalEstimate).toBe(5);
});

test('Story Points changed to null during sprint', () => {
  const issue = makeMinimalIssue();
  issue.fields.customfield_10030 = null;
  addStoryPointChange(issue, '5', null, '2024-01-15T15:36:42.765+0000');

  const result = issueVsSprint(issue, SPRINT);
  expect(result.initialEstimate).toBe(5);
  expect(result.finalEstimate).toBeNull();
});

test('Story Points changed after sprint', () => {
  const issue = makeMinimalIssue();
  addStoryPointChange(issue, '3', '5', '2024-01-27T15:36:42.765+0000');

  const result = issueVsSprint(issue, SPRINT);
  expect(result.initialEstimate).toBe(3);
  expect(result.finalEstimate).toBe(3);
});

test('Story Points changed exactly on sprint startDate', () => {
  const issue = makeMinimalIssue();
  addStoryPointChange(issue, '3', '5', SPRINT.startDate);

  const result = issueVsSprint(issue, SPRINT);
  expect(result.initialEstimate).toBe(5);
  expect(result.finalEstimate).toBe(5);
});

test('Story Points changed exactly on sprint completeDate', () => {
  const issue = makeMinimalIssue();
  addStoryPointChange(issue, '3', '5', SPRINT.completeDate);

  const result = issueVsSprint(issue, SPRINT);
  expect(result.initialEstimate).toBe(3);
  expect(result.finalEstimate).toBe(5);
});

function makeMinimalIssue() {
  return {
    key: 'KEY-1',
    changelog: {
      histories: [],
    },
    fields: {
      customfield_10030: 5,
      customfield_10020: [],
    },
  };
}

function addStoryPointChange(issue, from, to, at) {
  issue.changelog.histories.push({
    created: at,
    items: [
      {
        fieldId: 'customfield_10030',
        fromString: from,
        toString: to,
      },
    ],
  });
}
