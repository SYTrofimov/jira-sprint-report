'use strict';
// @ts-check

import { test, expect, describe, beforeEach } from '@jest/globals';
import {
  initSprintReport,
  uninitialize,
  storyPointFieldValue,
  issueSprintReport,
  removedIssuesBySprintId,
  issueDeltaPlanned,
  issueDeltaCompleted,
  velocityReport,
} from './jira-sprint-report.js';

beforeEach(() => {
  initSprintReport(
    {
      sprint: 'customfield_sprint',
      storyPoints: 'customfield_storyPoints',
      storyPointEstimate: 'customfield_storyPointEstimate',
    },
    ['Done', 'Closed'],
  );
});

describe('initSprintReport', () => {
  test('Missing storyPoints', () => {
    expect(() => initSprintReport({ sprint: 'customfield_sprint' }, [])).toThrow('Missing Story');
  });

  test('Missing sprint', () => {
    expect(() => initSprintReport({ storyPoints: 'customfield_storyPoints' }, [])).toThrow(
      'Missing Sprint',
    );
  });

  test('Does not throw with storyPointEstimate only', () => {
    initSprintReport(
      {
        sprint: 'customfield_sprint',
        storyPointEstimate: 'customfield_storyPointEstimate',
      },
      [],
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

const BEFORE_SPRINT1 = '2023-12-28T15:36:42.765+0000';
const DURING_SPRINT1 = '2024-01-15T15:36:42.765+0000';
const DURING_SPRINT1_2 = '2024-01-16T15:36:42.765+0000';
const DURING_SPRINT1_3 = '2024-01-17T15:36:42.765+0000';
const JUST_AFTER_SPRINT1_COMPLETE = '2024-01-24T09:30:49.765+0000';
const AFTER_SPRINT1 = '2024-01-27T15:36:42.765+0000';

const SPRINT2 = {
  id: 6,
  state: 'future',
  name: 'AC Sprint 2',
  startDate: '2024-02-10T10:00:29.712Z',
  endDate: '2024-02-24T10:00:11.000Z',
  completeDate: '2024-02-24T09:30:49.472Z',
  createdDate: '2024-02-10T09:00:17.954Z',
};

const DURING_SPRINT2 = '2024-02-15T15:36:42.765+0000';

function makeIssue() {
  return {
    key: 'KEY-1',
    changelog: {
      histories: [],
    },
    fields: {
      customfield_storyPoints: 5,
      customfield_sprint: [SPRINT1],
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

function addDummyChange(issue) {
  addChange(issue, {
    fieldId: 'dummy',
  });
}

describe('storyPointFieldValue', () => {
  test('Story Points custom field not initialized', () => {
    const issue = makeIssue();
    uninitialize();
    expect(storyPointFieldValue(issue)).toBeUndefined();
  });

  test('No Story Points related custom fields in issue', () => {
    const issue = makeIssue();
    issue.fields.customfield_storyPoints = undefined;

    expect(storyPointFieldValue(issue)).toBeUndefined();
  });

  test('Only Story Points', () => {
    const issue = makeIssue();
    expect(storyPointFieldValue(issue)).toBe(5);
  });

  test('Only Story Point Estimate', () => {
    const issue = makeIssue();
    issue.fields.customfield_storyPoints = undefined;
    issue.fields.customfield_storyPointEstimate = 3;

    expect(storyPointFieldValue(issue)).toBe(3);
  });

  test('Both Story Points and Story Point Estimate', () => {
    const issue = makeIssue();
    issue.fields.customfield_storyPointEstimate = 3;

    expect(storyPointFieldValue(issue)).toBe(5);
  });
});

describe('issueSprintReport', () => {
  test('Not initialized', () => {
    uninitialize();
    const issue = makeIssue();
    expect(() => issueSprintReport(issue, SPRINT1)).toThrow('not initialized');
  });

  test('Issue is undefined', () => {
    expect(() => issueSprintReport(undefined, SPRINT1)).toThrow('issue is undefined');
  });

  test('No changelog.histories in issue', () => {
    const issue = makeIssue();
    issue.changelog = undefined;

    expect(() => issueSprintReport(issue, SPRINT1)).toThrow('Missing');
  });

  test('No Sprint custom field in issue', () => {
    const issue = makeIssue();
    issue.fields.customfield_sprint = undefined;

    expect(() => issueSprintReport(issue, SPRINT1)).toThrow('Missing');
  });

  test('No Story Points custom field in issue', () => {
    const issue = makeIssue();
    issue.fields.customfield_storyPoints = undefined;

    expect(() => issueSprintReport(issue, SPRINT1)).toThrow('Missing');
  });

  test('Issue not relevant for sprint, never in sprint', () => {
    const issue = makeIssue();
    issue.fields.customfield_sprint = [];
    addDummyChange(issue);

    const result = issueSprintReport(issue, SPRINT1);

    expect(result.outcome).toBe('NOT_RELEVANT');
    expect(result.initialEstimate).toBeUndefined();
    expect(result.finalEstimate).toBeUndefined();
    expect(result.addedDuringSprint).toBeUndefined;
  });

  test('Story Points null and unchanged', () => {
    const issue = makeIssue();
    issue.fields.customfield_storyPoints = null;

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.initialEstimate).toBeNull();
    expect(result.finalEstimate).toBeNull();
  });

  test('Story Points unchanged', () => {
    const issue = makeIssue();

    let result = issueSprintReport(issue, SPRINT1);
    expect(result.initialEstimate).toBe(5);
    expect(result.finalEstimate).toBe(5);

    issue.fields.customfield_storyPoints = 3;
    result = issueSprintReport(issue, SPRINT1);
    expect(result.initialEstimate).toBe(3);
    expect(result.finalEstimate).toBe(3);
  });

  test('Story Points changed before sprint', () => {
    const issue = makeIssue();
    addStoryPointChange(issue, 3, 5, BEFORE_SPRINT1);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.initialEstimate).toBe(5);
    expect(result.finalEstimate).toBe(5);
  });

  test('Story Points changed during sprint', () => {
    const issue = makeIssue();
    addStoryPointChange(issue, 3, 5, DURING_SPRINT1);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.initialEstimate).toBe(3);
    expect(result.finalEstimate).toBe(5);
  });

  test('Story Points changed from null during sprint', () => {
    const issue = makeIssue();
    addStoryPointChange(issue, null, 5, DURING_SPRINT1);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.initialEstimate).toBeNull();
    expect(result.finalEstimate).toBe(5);
  });

  test('Story Points changed to null during sprint', () => {
    const issue = makeIssue();
    issue.fields.customfield_storyPoints = null;
    addStoryPointChange(issue, 5, null, DURING_SPRINT1);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.initialEstimate).toBe(5);
    expect(result.finalEstimate).toBeNull();
  });

  test('Story Points changed after sprint', () => {
    const issue = makeIssue();
    addStoryPointChange(issue, 3, 5, AFTER_SPRINT1);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.initialEstimate).toBe(3);
    expect(result.finalEstimate).toBe(3);
  });

  test('Story Points changed exactly on sprint startDate', () => {
    const issue = makeIssue();
    addStoryPointChange(issue, 3, 5, SPRINT1.startDate);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.initialEstimate).toBe(5);
    expect(result.finalEstimate).toBe(5);
  });

  test('Story Points changed exactly on sprint completeDate', () => {
    const issue = makeIssue();
    addStoryPointChange(issue, 3, 5, SPRINT1.completeDate);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.initialEstimate).toBe(3);
    expect(result.finalEstimate).toBe(5);
  });

  test('Issue never completed', () => {
    const issue = makeIssue();
    issue.fields.status = {
      name: 'To Do',
    };
    addSprintChange(issue, '', SPRINT1.id, BEFORE_SPRINT1);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.outcome).toBe('NOT_COMPLETED');
  });

  test('Issue was in the sprint from the start, completed as Done', () => {
    const issue = makeIssue();
    issue.fields.status = {
      name: 'Done',
    };
    addSprintChange(issue, '', SPRINT1.id, BEFORE_SPRINT1);
    addStatusChange(issue, 'To Do', 'Done', DURING_SPRINT1);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.outcome).toBe('COMPLETED');
    expect(result.addedDuringSprint).toBe(false);
  });

  test('Issue was in the sprint from the start, completed as Closed', () => {
    const issue = makeIssue();
    issue.fields.status = {
      name: 'Closed',
    };
    addSprintChange(issue, '', SPRINT1.id, BEFORE_SPRINT1);
    addStatusChange(issue, 'Open', 'Closed', DURING_SPRINT1);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.outcome).toBe('COMPLETED');
    expect(result.addedDuringSprint).toBe(false);
  });

  test('Issue added during sprint, completed', () => {
    const issue = makeIssue();
    issue.fields.status = {
      name: 'Done',
    };
    addSprintChange(issue, '', SPRINT1.id, DURING_SPRINT1);
    addStatusChange(issue, 'To Do', 'Done', DURING_SPRINT1_2);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.outcome).toBe('COMPLETED');
    expect(result.addedDuringSprint).toBe(true);
  });

  test('Issue removed and added back during sprint, completed', () => {
    const issue = makeIssue();
    issue.fields.status = {
      name: 'Done',
    };
    addSprintChange(issue, SPRINT1.id, '', DURING_SPRINT1);
    addSprintChange(issue, '', SPRINT1.id, DURING_SPRINT1_2);
    addStatusChange(issue, 'To Do', 'Done', DURING_SPRINT1_3);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.outcome).toBe('COMPLETED');
    expect(result.addedDuringSprint).toBe(false);
  });

  test('Issue added from next sprint, not completed', () => {
    const issue = makeIssue();
    issue.fields.customfield_sprint.push(SPRINT2);
    addSprintChange(issue, SPRINT2.id, SPRINT1.id, DURING_SPRINT1);
    addSprintChange(issue, SPRINT1.id, `${SPRINT1.id}, ${SPRINT2.id}`, JUST_AFTER_SPRINT1_COMPLETE);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.outcome).toBe('NOT_COMPLETED');
  });

  test('Issue completed after sprint', () => {
    const issue = makeIssue();
    issue.fields.customfield_sprint.push(SPRINT2);
    issue.fields.status = {
      name: 'Done',
    };
    addSprintChange(issue, '', SPRINT1.id, BEFORE_SPRINT1);
    addSprintChange(issue, SPRINT1.id, `${SPRINT1.id}, ${SPRINT2.id}`, JUST_AFTER_SPRINT1_COMPLETE);
    addStatusChange(issue, 'To Do', 'Done', AFTER_SPRINT1);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.outcome).toBe('NOT_COMPLETED');
  });

  test('Issue removed from sprint', () => {
    const issue = makeIssue();
    issue.fields.customfield_sprint = [SPRINT2];
    issue.fields.status = {
      name: 'Done',
    };
    addSprintChange(issue, '', SPRINT1.id, BEFORE_SPRINT1);
    addSprintChange(issue, SPRINT1.id, SPRINT2.id, DURING_SPRINT1);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.outcome).toBe('PUNTED');
  });

  test('initialEstimate when added, not when sprint started', () => {
    const issue = makeIssue();
    addStoryPointChange(issue, 3, 5, DURING_SPRINT1);
    addSprintChange(issue, SPRINT2.id, SPRINT1.id, DURING_SPRINT1_2);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.initialEstimate).toBe(5);
  });

  test('finalEstimate when sprint complete, even when removed', () => {
    const issue = makeIssue();
    issue.fields.customfield_sprint = [];
    addSprintChange(issue, SPRINT1.id, '', DURING_SPRINT1);
    addStoryPointChange(issue, 3, 5, DURING_SPRINT1_2);

    const result = issueSprintReport(issue, SPRINT1);
    expect(result.outcome).toBe('PUNTED');
    expect(result.finalEstimate).toBe(5);
  });
});

const SPRINTS_BY_ID = new Map([
  [SPRINT1.id, SPRINT1],
  [SPRINT2.id, SPRINT2],
]);

describe('issueRemovedFromSprints', () => {
  test('Not initialized', () => {
    uninitialize();
    const issues = [makeIssue()];
    expect(() => removedIssuesBySprintId(issues, SPRINTS_BY_ID)).toThrow('not initialized');
  });

  test('No changes in changelog', () => {
    const issues = [makeIssue()];

    const issuesBySprintId = removedIssuesBySprintId(issues, SPRINTS_BY_ID);

    expect(issuesBySprintId.size).toBe(0);
  });

  test('No relevant changes in changelog', () => {
    const issue = makeIssue();
    addDummyChange(issue);
    const issues = [issue];

    const issuesBySprintId = removedIssuesBySprintId(issues, SPRINTS_BY_ID);

    expect(issuesBySprintId.size).toBe(0);
  });

  test('Issue removed from active sprint', () => {
    const issue = makeIssue();
    addSprintChange(issue, '', SPRINT1.id, BEFORE_SPRINT1);
    addSprintChange(issue, SPRINT1.id, '', DURING_SPRINT1);
    const issues = [issue];

    const issuesBySprintId = removedIssuesBySprintId(issues, SPRINTS_BY_ID);

    expect(issuesBySprintId.size).toBe(1);
    expect(issuesBySprintId.get(SPRINT1.id).has(issue)).toBe(true);
  });

  test('Issue removed from unknown sprint', () => {
    const sprintsById = new Map([[SPRINT2.id, SPRINT2]]);

    const issue = makeIssue();
    addSprintChange(issue, '', SPRINT1.id, BEFORE_SPRINT1);
    addSprintChange(issue, SPRINT1.id, '', DURING_SPRINT1);
    const issues = [issue];

    const issuesBySprintId = removedIssuesBySprintId(issues, sprintsById);

    expect(issuesBySprintId.size).toBe(0);
  });

  test('2 issues removed from active sprint', () => {
    const issue1 = makeIssue();
    addSprintChange(issue1, '', SPRINT1.id, BEFORE_SPRINT1);
    addSprintChange(issue1, SPRINT1.id, '', DURING_SPRINT1);
    const issue2 = makeIssue();
    addSprintChange(issue2, '', SPRINT1.id, BEFORE_SPRINT1);
    addSprintChange(issue2, SPRINT1.id, '', DURING_SPRINT1);
    const issues = [issue1, issue2];

    const issuesBySprintId = removedIssuesBySprintId(issues, SPRINTS_BY_ID);

    expect(issuesBySprintId.size).toBe(1);
    expect(issuesBySprintId.get(SPRINT1.id).has(issue1)).toBe(true);
    expect(issuesBySprintId.get(SPRINT1.id).has(issue2)).toBe(true);
  });

  test('Sprint id remains in the Sprint field (issue not completed)', () => {
    const issue = makeIssue();
    addSprintChange(issue, '', SPRINT1.id, BEFORE_SPRINT1);
    addSprintChange(issue, SPRINT1.id, `${SPRINT1.id}, ${SPRINT2.id}`, JUST_AFTER_SPRINT1_COMPLETE);
    const issues = [issue];

    const issuesBySprintId = removedIssuesBySprintId(issues, SPRINTS_BY_ID);

    expect(issuesBySprintId.size).toBe(0);
  });

  test('Issue removed from 2 active sprints', () => {
    const issue = makeIssue();
    addSprintChange(issue, '', SPRINT1.id, BEFORE_SPRINT1);
    addSprintChange(issue, SPRINT1.id, SPRINT2.id, DURING_SPRINT1);
    addSprintChange(issue, SPRINT2.id, '', DURING_SPRINT2);
    const issues = [issue];

    const issuesBySprintId = removedIssuesBySprintId(issues, SPRINTS_BY_ID);

    expect(issuesBySprintId.size).toBe(2);
    expect(issuesBySprintId.get(SPRINT1.id).has(issue)).toBe(true);
    expect(issuesBySprintId.get(SPRINT2.id).has(issue)).toBe(true);
  });

  test('Issue removed from non-active sprint', () => {
    const issue = makeIssue();
    addSprintChange(issue, '', SPRINT1.id, BEFORE_SPRINT1);
    addSprintChange(issue, SPRINT1.id, '', AFTER_SPRINT1);
    const issues = [issue];

    const issuesBySprintId = removedIssuesBySprintId(issues, SPRINTS_BY_ID);

    expect(issuesBySprintId.size).toBe(0);
  });
});

describe('issueDeltas', () => {
  test('Issue NOT_RELEVANT', () => {
    const issueSprintReport = {
      outcome: 'NOT_RELEVANT',
    };
    expect(issueDeltaPlanned(issueSprintReport)).toBe(0);
    expect(issueDeltaCompleted(issueSprintReport)).toBe(0);
  });

  test('Planned value, when there from the start', () => {
    const issueSprintReport = {
      outcome: undefined,
      initialEstimate: 3,
      addedDuringSprint: false,
    };
    expect(issueDeltaPlanned(issueSprintReport)).toBe(3);
  });

  test('Planned value, when null from the start', () => {
    const issueSprintReport = {
      outcome: undefined,
      initialEstimate: null,
      addedDuringSprint: false,
    };
    expect(issueDeltaPlanned(issueSprintReport)).toBe(0);
  });

  test('Planned value, when added during sprint', () => {
    const issueSprintReport = {
      outcome: undefined,
      initialEstimate: 3,
      addedDuringSprint: true,
    };
    expect(issueDeltaPlanned(issueSprintReport)).toBe(0);
  });

  test('Completed value, when issue NOT_COMPLETED', () => {
    const issueSprintReport = {
      outcome: 'NOT_COMPLETED',
    };
    expect(issueDeltaCompleted(issueSprintReport)).toBe(0);
  });

  test('Completed value, when issue PUNTED', () => {
    const issueSprintReport = {
      outcome: 'PUNTED',
    };
    expect(issueDeltaCompleted(issueSprintReport)).toBe(0);
  });

  test('Completed value, when issue COMPLETED', () => {
    const issueSprintReport = {
      outcome: 'COMPLETED',
      finalEstimate: 5,
    };
    expect(issueDeltaCompleted(issueSprintReport)).toBe(5);
  });

  test('Completed value, when issue COMPLETED, but null', () => {
    const issueSprintReport = {
      outcome: 'COMPLETED',
      finalEstimate: null,
    };
    expect(issueDeltaCompleted(issueSprintReport)).toBe(0);
  });
});

const SPRINTS = [SPRINT1, SPRINT2];

function makeIssues() {
  const issue1 = makeIssue();
  issue1.fields.customfield_storyPoints = 3;
  const issue2 = makeIssue();
  issue2.key = 'KEY-2';

  return [issue1, issue2];
}

describe('velocityReport', () => {
  test('Not initialized', () => {
    uninitialize();
    const issues = makeIssues();
    expect(() => velocityReport(issues, SPRINTS)).toThrow('not initialized');
  });

  test('No sprints', () => {
    const issues = makeIssues();
    const report = velocityReport(issues, []);
    expect(report).toEqual([]);
  });

  test('No issues', () => {
    const report = velocityReport([], SPRINTS);
    expect(report).toEqual([
      {
        planned: 0,
        completed: 0,
      },
      {
        planned: 0,
        completed: 0,
      },
    ]);
  });

  test('Issue unrelated to sprint', () => {
    const issues = makeIssues();
    issues[0].fields.customfield_sprint = null;
    issues[1].fields.customfield_sprint = null;
    const report = velocityReport(issues, SPRINTS);
    expect(report).toEqual([
      {
        planned: 0,
        completed: 0,
      },
      {
        planned: 0,
        completed: 0,
      },
    ]);
  });

  test('Issues COMPLETED in SPRINT1, 2nd added during sprint', () => {
    const issues = makeIssues();
    issues[0].fields.status.name = 'Done';
    addStatusChange(issues[0], 'To Do', 'Done', DURING_SPRINT1);
    issues[1].fields.status.name = 'Done';
    addSprintChange(issues[1], '', SPRINT1.id, DURING_SPRINT1_2);
    addStatusChange(issues[1], 'To Do', 'Done', DURING_SPRINT1_3);

    const report = velocityReport(issues, SPRINTS);

    expect(report).toEqual([
      {
        planned: 3,
        completed: 8,
      },
      {
        planned: 0,
        completed: 0,
      },
    ]);
  });

  test('1st issue COMPLETED in SPRINT1, 2nd in SPRINT2', () => {
    const issues = makeIssues();
    issues[0].fields.status.name = 'Done';
    addStatusChange(issues[0], 'To Do', 'Done', DURING_SPRINT1);
    issues[1].fields.status.name = 'Done';
    issues[1].fields.customfield_sprint.push(SPRINT2);
    addSprintChange(
      issues[1],
      SPRINT1.id,
      `${SPRINT1.id}, ${SPRINT2.id}`,
      JUST_AFTER_SPRINT1_COMPLETE,
    );
    addStatusChange(issues[1], 'To Do', 'Done', DURING_SPRINT2);

    const report = velocityReport(issues, SPRINTS);

    expect(report).toEqual([
      {
        planned: 8,
        completed: 3,
      },
      {
        planned: 5,
        completed: 5,
      },
    ]);
  });

  test('1st issue COMPLETED in SPRINT1, 2nd removed from SPRINT1, never completed', () => {
    const issues = makeIssues();
    issues[0].fields.status.name = 'Done';
    addStatusChange(issues[0], 'To Do', 'Done', DURING_SPRINT1);
    issues[1].fields.customfield_sprint = [SPRINT2];
    addSprintChange(issues[1], SPRINT1.id, SPRINT2.id, DURING_SPRINT1_2);

    const report = velocityReport(issues, SPRINTS);

    expect(report).toEqual([
      {
        planned: 8,
        completed: 3,
      },
      {
        planned: 5,
        completed: 0,
      },
    ]);
  });
});
