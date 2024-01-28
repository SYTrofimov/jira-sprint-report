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
  const issue = {
    changelog: {
      histories: [],
    },
    fields: {
      customfield_10030: 5,
      customfield_10020: [],
    },
  };

  expect(() => issueVsSprint(issue, {})).toThrow('Missing');
});

test('Story Points null and unchanged', () => {
  const issue = {
    key: 'KEY-1',
    changelog: {
      histories: [],
    },
    fields: {
      customfield_10030: null,
      customfield_10020: [],
    },
  };

  const result = issueVsSprint(issue, SPRINT);
  expect(result.finalEstimate).toBeNull();
  expect(result.initialEstimate).toBeNull();
});

test('Story Points unchanged', () => {
  const issue = {
    key: 'KEY-1',
    changelog: {
      histories: [],
    },
    fields: {
      customfield_10030: 5,
      customfield_10020: [],
    },
  };

  let result = issueVsSprint(issue, SPRINT);
  expect(result.finalEstimate).toBe(5);
  expect(result.initialEstimate).toBe(5);

  issue.fields.customfield_10030 = 3;
  result = issueVsSprint(issue, SPRINT);
  expect(result.finalEstimate).toBe(3);
  expect(result.initialEstimate).toBe(3);
});

test('Story Points changed before sprint', () => {
  const issue = {
    key: 'KEY-1',
    changelog: {
      histories: [
        {
          created: '2023-12-28T15:36:42.765+0000',
          items: [
            {
              fieldId: 'customfield_10030',
              fromString: '3',
              toString: '5',
            },
          ],
        },
      ],
    },
    fields: {
      customfield_10030: 5,
      customfield_10020: [],
    },
  };

  const result = issueVsSprint(issue, SPRINT);
  expect(result.finalEstimate).toBe(5);
  expect(result.initialEstimate).toBe(5);
});

test('Story Points changed during sprint', () => {
  const issue = {
    key: 'KEY-1',
    changelog: {
      histories: [
        {
          created: '2024-01-15T15:36:42.765+0000',
          items: [
            {
              fieldId: 'customfield_10030',
              fromString: '3',
              toString: '5',
            },
          ],
        },
      ],
    },
    fields: {
      customfield_10030: 5,
      customfield_10020: [],
    },
  };

  const result = issueVsSprint(issue, SPRINT);
  expect(result.finalEstimate).toBe(3);
  expect(result.initialEstimate).toBe(5);
});

test('Story Points changed after sprint', () => {
  const issue = {
    key: 'KEY-1',
    changelog: {
      histories: [
        {
          created: '2024-01-27T15:36:42.765+0000',
          items: [
            {
              fieldId: 'customfield_10030',
              fromString: '3',
              toString: '5',
            },
          ],
        },
      ],
    },
    fields: {
      customfield_10030: 5,
      customfield_10020: [],
    },
  };

  const result = issueVsSprint(issue, SPRINT);
  expect(result.finalEstimate).toBe(3);
  expect(result.initialEstimate).toBe(3);
});
