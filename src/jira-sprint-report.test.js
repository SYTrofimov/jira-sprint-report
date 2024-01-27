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
    fields: {
      customfield_10030: 5,
      customfield_10020: [],
    },
  };

  expect(() => issueVsSprint(issue, {})).toThrow('Missing');
});

test('Story Points unchanged', () => {
  const issue = {
    key: 'AC-101',
    changelog: {
      startAt: 0,
      maxResults: 4,
      total: 4,
      histories: [
        {
          created: '2023-12-28T15:32:22.946+0000',
          items: [
            {
              field: 'resolution',
              fieldtype: 'jira',
              fieldId: 'resolution',
              from: null,
              fromString: null,
              to: '10000',
              toString: 'Done',
            },
            {
              field: 'status',
              fieldtype: 'jira',
              fieldId: 'status',
              from: '10000',
              fromString: 'To Do',
              to: '10001',
              toString: 'Done',
            },
          ],
        },
        {
          created: '2023-12-28T15:32:12.279+0000',
          items: [
            {
              field: 'Sprint',
              fieldtype: 'custom',
              fieldId: 'customfield_10020',
              from: '6',
              fromString: 'AC Sprint 2',
              to: '5',
              toString: 'AC Sprint 1',
            },
          ],
        },
        {
          created: '2023-12-28T15:27:13.235+0000',
          items: [
            {
              field: 'Sprint',
              fieldtype: 'custom',
              fieldId: 'customfield_10020',
              from: '',
              fromString: '',
              to: '6',
              toString: 'AC Sprint 2',
            },
          ],
        },
      ],
    },
    fields: {
      customfield_10030: 5,
      resolution: {
        self: 'https://syt-dev.atlassian.net/rest/api/2/resolution/10000',
        id: '10000',
        description: 'Work has been completed on this issue.',
        name: 'Done',
      },
      resolutiondate: '2023-12-28T15:32:22.907+0000',
      created: '2023-12-23T15:05:08.070+0000',
      customfield_10020: [
        {
          id: 5,
          name: 'AC Sprint 1',
          state: 'closed',
          boardId: 3,
          goal: '',
          startDate: '2023-12-28T15:31:29.712Z',
          endDate: '2024-01-11T15:31:11.000Z',
          completeDate: '2023-12-28T15:32:49.472Z',
        },
      ],
      updated: '2023-12-28T15:32:23.150+0000',
      status: {
        self: 'https://syt-dev.atlassian.net/rest/api/2/status/10001',
        description: '',
        iconUrl: 'https://syt-dev.atlassian.net/',
        name: 'Done',
        id: '10001',
        statusCategory: {
          self: 'https://syt-dev.atlassian.net/rest/api/2/statuscategory/3',
          id: 3,
          key: 'done',
          colorName: 'green',
          name: 'Done',
        },
      },
      closedSprints: [
        {
          id: 5,
          self: 'https://syt-dev.atlassian.net/rest/agile/1.0/sprint/5',
          state: 'closed',
          name: 'AC Sprint 1',
          startDate: '2023-12-28T15:31:29.712Z',
          endDate: '2024-01-11T15:31:11.000Z',
          completeDate: '2023-12-28T15:32:49.472Z',
          createdDate: '2023-12-28T15:26:17.954Z',
          originBoardId: 3,
          goal: '',
        },
      ],
    },
  };

  const result = issueVsSprint(issue, SPRINT);

  // const expectedResult = {
  //   status: 'COMPLETED',
  //   initialEstimate: 3,
  //   finalEstimate: 3,
  //   addedDuringSprint: false,
  // };

  expect(result.finalEstimate).toEqual(5);
  expect(result.initialEstimate).toEqual(5);
});
