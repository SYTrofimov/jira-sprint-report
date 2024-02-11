'use strict';
// @ts-check

import { test, expect, describe, beforeAll } from '@jest/globals';
import {
  initCustomFields,
  issueSprintReport,
  issueRemovedFromSprints,
} from './jira-sprint-report.js';

beforeAll(() => {
  initCustomFields({
    storyPoints: 'customfield_storyPoints',
    sprint: 'customfield_sprint',
  });
});

describe('initCustomFields', () => {
  test('Missing storyPoints', () => {
    expect(() => initCustomFields({ sprint: 'customfield_sprint' })).toThrow('Missing storyPoints');
  });

  test('Missing sprint', () => {
    expect(() => initCustomFields({ storyPoints: 'customfield_storyPoints' })).toThrow(
      'Missing sprint',
    );
  });
});

const SPRINT1 = {
  id: 5,
  state: 'closed',
  name: 'AC Sprint 1',
  startDate: '2024-01-10T10:00:29.712Z',
  endDate: '2024-01-24T10:00:11.000Z',
  completeDate: '2024-01-24T09:30:49.472Z',
  createdDate: '2024-01-10T09:00:17.954Z',
};

const BEFORE_SPRINT = '2023-12-28T15:36:42.765+0000';
const DURING_SPRINT1 = '2024-01-15T15:36:42.765+0000';
const DURING_SPRINT2 = '2024-01-16T15:36:42.765+0000';
const JUST_AFTER_SPRINT_COMPLETE = '2024-01-24T09:30:49.765+0000';
const AFTER_SPRINT = '2024-01-27T15:36:42.765+0000';

const SPRINT2 = {
  id: 6,
  state: 'future',
  name: 'AC Sprint 2',
};

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

function toStringOrNull(item) {
  if (item === null) {
    return null;
  }
  return item.toString();
}

function addStoryPointChange(issue, from, to, at) {
  addChange(
    issue,
    {
      fieldId: 'customfield_storyPoints',
      fromString: toStringOrNull(from),
      toString: toStringOrNull(to),
    },
    at,
  );
}

function addSprintChange(issue, from, to, at) {
  addChange(
    issue,
    {
      fieldId: 'customfield_sprint',
      from: from.toString(),
      to: to.toString(),
    },
    at,
  );
}

function addStatusChange(issue, from, to, at) {
  addChange(
    issue,
    {
      fieldId: 'status',
      fromString: from,
      toString: to,
    },
    at,
  );
}

describe('jiraSprintReport input validation', () => {
  test('Issue is undefined', () => {
    expect(() => issueSprintReport(undefined, SPRINT1)).toThrow('issue is undefined');
  });

  test('No changelog.histories in issue', () => {
    const issue = makeMinimalIssue();
    issue.changelog = undefined;

    expect(() => issueSprintReport(issue, SPRINT1)).toThrow('Missing');
  });

  test('No Sprint custom field in issue', () => {
    const issue = makeMinimalIssue();
    issue.fields.customfield_sprint = undefined;

    expect(() => issueSprintReport(issue, SPRINT1)).toThrow('Missing');
  });

  test('No Story Points custom field in issue', () => {
    const issue = makeMinimalIssue();
    issue.fields.customfield_storyPoints = undefined;

    expect(() => issueSprintReport(issue, SPRINT1)).toThrow('Missing');
  });
});

describe('jiraSprintReport', () => {
  test('Story Points null and unchanged', () => {
    const issue = makeMinimalIssue();
    issue.fields.customfield_storyPoints = null;

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.initialEstimate).toBeNull();
    expect(result.finalEstimate).toBeNull();
  });

  test('Story Points unchanged', () => {
    const issue = makeMinimalIssue();

    let result = issueSprintReport(issue, SPRINT1);
    expect(result.initialEstimate).toBe(5);
    expect(result.finalEstimate).toBe(5);

    issue.fields.customfield_storyPoints = 3;
    result = issueSprintReport(issue, SPRINT1);
    expect(result.initialEstimate).toBe(3);
    expect(result.finalEstimate).toBe(3);
  });

  test('Story Points changed before sprint', () => {
    const issue = makeMinimalIssue();
    addStoryPointChange(issue, 3, 5, BEFORE_SPRINT);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.initialEstimate).toBe(5);
    expect(result.finalEstimate).toBe(5);
  });

  test('Story Points changed during sprint', () => {
    const issue = makeMinimalIssue();
    addStoryPointChange(issue, 3, 5, DURING_SPRINT1);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.initialEstimate).toBe(3);
    expect(result.finalEstimate).toBe(5);
  });

  test('Story Points changed from null during sprint', () => {
    const issue = makeMinimalIssue();
    addStoryPointChange(issue, null, 5, DURING_SPRINT1);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.initialEstimate).toBeNull();
    expect(result.finalEstimate).toBe(5);
  });

  test('Story Points changed to null during sprint', () => {
    const issue = makeMinimalIssue();
    issue.fields.customfield_storyPoints = null;
    addStoryPointChange(issue, 5, null, DURING_SPRINT1);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.initialEstimate).toBe(5);
    expect(result.finalEstimate).toBeNull();
  });

  test('Story Points changed after sprint', () => {
    const issue = makeMinimalIssue();
    addStoryPointChange(issue, 3, 5, AFTER_SPRINT);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.initialEstimate).toBe(3);
    expect(result.finalEstimate).toBe(3);
  });

  test('Story Points changed exactly on sprint startDate', () => {
    const issue = makeMinimalIssue();
    addStoryPointChange(issue, 3, 5, SPRINT1.startDate);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.initialEstimate).toBe(5);
    expect(result.finalEstimate).toBe(5);
  });

  test('Story Points changed exactly on sprint completeDate', () => {
    const issue = makeMinimalIssue();
    addStoryPointChange(issue, 3, 5, SPRINT1.completeDate);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.initialEstimate).toBe(3);
    expect(result.finalEstimate).toBe(5);
  });

  test('Issue never completed', () => {
    const issue = makeMinimalIssue();
    issue.fields.customfield_sprint.push(SPRINT1);
    issue.fields.status = {
      name: 'To Do',
    };
    addSprintChange(issue, '', SPRINT1.id, BEFORE_SPRINT);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.outcome).toBe('NOT_COMPLETED');
  });

  test('Issue completed in the sprint, was there from the start', () => {
    const issue = makeMinimalIssue();
    issue.fields.customfield_sprint.push(SPRINT1);
    issue.fields.status = {
      name: 'Done',
    };
    addSprintChange(issue, '', SPRINT1.id, BEFORE_SPRINT);
    addStatusChange(issue, 'To Do', 'Done', DURING_SPRINT1);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.outcome).toBe('COMPLETED');
    expect(result.addedDuringSprint).toBe(false);
  });

  test('Issue completed in the sprint, added during sprint', () => {
    const issue = makeMinimalIssue();
    issue.fields.customfield_sprint.push(SPRINT1);
    issue.fields.status = {
      name: 'Done',
    };
    addSprintChange(issue, '', SPRINT1.id, DURING_SPRINT1);
    addStatusChange(issue, 'To Do', 'Done', DURING_SPRINT2);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.outcome).toBe('COMPLETED');
    expect(result.addedDuringSprint).toBe(true);
  });

  test('Issue added from next sprint, not completed', () => {
    const issue = makeMinimalIssue();
    issue.fields.customfield_sprint.push(SPRINT1);
    issue.fields.customfield_sprint.push(SPRINT2);
    addSprintChange(issue, SPRINT2.id, SPRINT1.id, DURING_SPRINT1);
    addSprintChange(issue, SPRINT1.id, `${SPRINT1.id}, ${SPRINT2.id}`, JUST_AFTER_SPRINT_COMPLETE);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.outcome).toBe('NOT_COMPLETED');
  });

  test('Issue completed after spring', () => {
    const issue = makeMinimalIssue();
    issue.fields.customfield_sprint.push(SPRINT1);
    issue.fields.customfield_sprint.push(SPRINT2);
    issue.fields.status = {
      name: 'Done',
    };
    addSprintChange(issue, '', SPRINT1.id, BEFORE_SPRINT);
    addSprintChange(issue, SPRINT1.id, `${SPRINT1.id}, ${SPRINT2.id}`, JUST_AFTER_SPRINT_COMPLETE);
    addStatusChange(issue, 'To Do', 'Done', AFTER_SPRINT);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.outcome).toBe('NOT_COMPLETED');
  });

  test('Issue removed from sprint', () => {
    const issue = makeMinimalIssue();
    issue.fields.customfield_sprint.push(SPRINT2);
    issue.fields.status = {
      name: 'Done',
    };
    addSprintChange(issue, '', SPRINT1.id, BEFORE_SPRINT);
    addSprintChange(issue, SPRINT1.id, SPRINT2.id, DURING_SPRINT1);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.outcome).toBe('PUNTED');
  });

  test('initialEstimate when added, not when sprint started', () => {
    const issue = makeMinimalIssue();
    issue.fields.customfield_sprint.push(SPRINT1);
    addStoryPointChange(issue, 3, 5, DURING_SPRINT1);
    addSprintChange(issue, SPRINT2.id, SPRINT1.id, DURING_SPRINT2);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.initialEstimate).toBe(5);
  });
});

describe('issueRemovedFromSprints', () => {
  test('Issue removed from sprint', () => {
    const issue = makeMinimalIssue();
    addSprintChange(issue, '', SPRINT1.id, DURING_SPRINT1);
    addSprintChange(issue, SPRINT1.id, '', DURING_SPRINT1);

    const sprintIds = issueRemovedFromSprints(issue);

    expect(sprintIds.size).toBe(1);
    expect(sprintIds.has(SPRINT1.id)).toBe(true);
  });

  test('Issue removed from 2 sprints', () => {
    const issue = makeMinimalIssue();
    addSprintChange(issue, '', SPRINT1.id, DURING_SPRINT1);
    addSprintChange(issue, SPRINT1.id, SPRINT2.id, DURING_SPRINT2);
    addSprintChange(issue, SPRINT2.id, '', AFTER_SPRINT);

    const sprintIds = issueRemovedFromSprints(issue);

    expect(sprintIds.size).toBe(2);
    expect(sprintIds.has(SPRINT1.id)).toBe(true);
    expect(sprintIds.has(SPRINT2.id)).toBe(true);
  });
});
