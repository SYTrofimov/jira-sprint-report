'use strict';
// @ts-check

import { test, expect, beforeAll } from '@jest/globals';
import { initCustomFields, issueVsSprint } from './jira-sprint-report.js';

beforeAll(() => {
  initCustomFields({
    storyPoints: 'customfield_storyPoints',
    sprint: 'customfield_sprint',
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

const BEFORE_SPRINT = '2023-12-28T15:36:42.765+0000';
const DURING_SPRINT = '2024-01-15T15:36:42.765+0000';
const AFTER_SPRINT = '2024-01-27T15:36:42.765+0000';

function makeMinimalIssue() {
  return {
    key: 'KEY-1',
    changelog: {
      histories: [],
    },
    fields: {
      customfield_storyPoints: 5,
      customfield_sprint: [],
      status: {
        name: 'To Do',
      },
    },
  };
}

function addChange(issue, changeItem, at) {
  const histories = issue.changelog.histories;

  if (histories.length === 0) {
    issue.changelog.histories.push({
      created: at,
      items: [changeItem],
    });
  } else {
    const topDate = new Date(histories[0].created);
    const newDate = new Date(at);

    if (newDate === topDate) {
      histories[0].items.push(changeItem);
    } else if (newDate < topDate) {
      throw new Error('Changes are not added in the chronological order');
    } else {
      issue.changelog.histories.unshift({
        created: at,
        items: [changeItem],
      });
    }
  }
}

function addStoryPointChange(issue, from, to, at) {
  addChange(
    issue,
    {
      fieldId: 'customfield_storyPoints',
      fromString: from,
      toString: to,
    },
    at,
  );
}

function addSprintChange(issue, from, to, at) {
  addChange(
    issue,
    {
      fieldId: 'customfield_sprint',
      from: from,
      to: to,
    },
    at,
  );
}

function addStatusChange(issue, from, to, at) {
  addChange(
    issue,
    {
      fieldId: 'status',
      from: from,
      to: to,
    },
    at,
  );
}

test('Changelog.histories missing in issue', () => {
  const issue = makeMinimalIssue();
  issue.changelog = undefined;

  expect(() => issueVsSprint(issue, SPRINT)).toThrow('Missing');
});

test('Story Points null and unchanged', () => {
  const issue = makeMinimalIssue();
  issue.fields.customfield_storyPoints = null;

  const result = issueVsSprint(issue, SPRINT);
  expect(result.initialEstimate).toBeNull();
  expect(result.finalEstimate).toBeNull();
});

test('Story Points unchanged', () => {
  const issue = makeMinimalIssue();

  let result = issueVsSprint(issue, SPRINT);
  expect(result.initialEstimate).toBe(5);
  expect(result.finalEstimate).toBe(5);

  issue.fields.customfield_storyPoints = 3;
  result = issueVsSprint(issue, SPRINT);
  expect(result.initialEstimate).toBe(3);
  expect(result.finalEstimate).toBe(3);
});

test('Story Points changed before sprint', () => {
  const issue = makeMinimalIssue();
  addStoryPointChange(issue, '3', '5', BEFORE_SPRINT);

  const result = issueVsSprint(issue, SPRINT);
  expect(result.initialEstimate).toBe(5);
  expect(result.finalEstimate).toBe(5);
});

test('Story Points changed during sprint', () => {
  const issue = makeMinimalIssue();
  addStoryPointChange(issue, '3', '5', DURING_SPRINT);

  const result = issueVsSprint(issue, SPRINT);
  expect(result.initialEstimate).toBe(3);
  expect(result.finalEstimate).toBe(5);
});

test('Story Points changed from null during sprint', () => {
  const issue = makeMinimalIssue();
  addStoryPointChange(issue, null, '5', DURING_SPRINT);

  const result = issueVsSprint(issue, SPRINT);
  expect(result.initialEstimate).toBeNull();
  expect(result.finalEstimate).toBe(5);
});

test('Story Points changed to null during sprint', () => {
  const issue = makeMinimalIssue();
  issue.fields.customfield_storyPoints = null;
  addStoryPointChange(issue, '5', null, DURING_SPRINT);

  const result = issueVsSprint(issue, SPRINT);
  expect(result.initialEstimate).toBe(5);
  expect(result.finalEstimate).toBeNull();
});

test('Story Points changed after sprint', () => {
  const issue = makeMinimalIssue();
  addStoryPointChange(issue, '3', '5', AFTER_SPRINT);

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

test('Issue never completed', () => {
  const issue = makeMinimalIssue();
  issue.fields.customfield_sprint.push(SPRINT);
  issue.fields.status = {
    name: 'To Do',
  };
  addSprintChange(issue, '', `${SPRINT.id}`, BEFORE_SPRINT);
  addSprintChange(issue, `${SPRINT.id}`, `${SPRINT.id + 1}`, DURING_SPRINT);

  const result = issueVsSprint(issue, SPRINT);
  expect(result.status).toBe('NOT_COMPLETED');
});

test('Issue completed in the sprint', () => {
  const issue = makeMinimalIssue();
  issue.fields.customfield_sprint.push(SPRINT);
  issue.fields.status = {
    name: 'Done',
  };
  addSprintChange(issue, '', SPRINT.id, BEFORE_SPRINT);
  addStatusChange(issue, 'To Do', 'Done', DURING_SPRINT);

  const result = issueVsSprint(issue, SPRINT);
  expect(result.status).toBe('COMPLETED');
});

// test('Issue completed after sprint', () => {
//   const issue = makeMinimalIssue();
//   issue.fields.customfield_sprint.push(SPRINT);
//   issue.fields.status = {
//     name: 'Done',
//   };
//   addSprintChange(issue, '', SPRINT.id, BEFORE_SPRINT);
//   addSprintChange(issue, `${SPRINT.id}`, `${SPRINT.id + 1}`, DURING_SPRINT);
//   addStatusChange(issue, 'To Do', 'Done', AFTER_SPRINT);

//   const result = issueVsSprint(issue, SPRINT);
//   expect(result.outcome).toBe('NOT_COMPLETED');
// });
