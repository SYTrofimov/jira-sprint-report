'use strict';
// @ts-check

import fs from 'fs';

import {
  initCustomFields,
  issueSprintReport,
  removedIssuesBySprintId,
} from '../src/jira-sprint-report.js';

async function testOnSavedBoards() {
  const customFields = JSON.parse(fs.readFileSync('data/custom-fields.json', 'utf8'));
  initCustomFields(customFields);

  const boards = JSON.parse(fs.readFileSync('data/boards.json', 'utf8'));
  for (const board of boards) {
    await testOnSavedBoard(board);
  }
}

async function testOnSavedBoard(board) {
  console.log(`Testing velocity on board ${board.id} - ${board.name}`);

  const boardPath = `data/board-${board.id}`;

  const sprints = JSON.parse(fs.readFileSync(boardPath + '/sprints.json', 'utf8'));
  console.log(`Loaded ${sprints.length} board sprints`);
  const sprintsById = new Map(sprints.map((sprint) => [sprint.id, sprint]));

  const updatedIssues = JSON.parse(fs.readFileSync(boardPath + '/updated-issues.json', 'utf8'));
  console.log(`Loaded ${updatedIssues.length} updated issues`);

  const removedIssuesBySprintIdMap = removedIssuesBySprintId(updatedIssues, sprintsById);

  for (const sprint of sprints) {
    await testOnSavedSprint(board, sprint, removedIssuesBySprintIdMap.get(sprint.id) || new Set());
  }
}

async function testOnSavedSprint(board, sprint, removedIssues) {
  if (sprint.state !== 'closed') {
    return;
  }

  console.log(`Testing sprint ${sprint.id} - ${sprint.name}`);

  const sprintPathPrefix = `data/board-${board.id}/${sprint.id}-`;

  const issues = JSON.parse(fs.readFileSync(sprintPathPrefix + 'sprint-issues.json', 'utf8'));
  console.log(`Loaded ${issues.length} issues`);

  const sprintReport = JSON.parse(fs.readFileSync(sprintPathPrefix + 'sprintreport.json', 'utf8'));
  console.log(`Loaded GreenHopper sprint report`);

  // Testing issues

  const sprintReportIssueResults = [];

  const issueKeysAddedDuringSprint = new Set();
  for (const issue in sprintReport.contents.issueKeysAddedDuringSprint) {
    issueKeysAddedDuringSprint.add(issue);
  }
  console.log('Issues added during sprint', issueKeysAddedDuringSprint);

  function issueResult(issue, outcome) {
    const initialEstimate = issue.estimateStatistic.statFieldValue.value;
    const finalEstimate = issue.currentEstimateStatistic.statFieldValue.value;

    return {
      key: issue.key,
      outcome: outcome,
      initialEstimate: initialEstimate === undefined ? null : initialEstimate,
      finalEstimate: finalEstimate === undefined ? null : finalEstimate,
      addedDuringSprint: issueKeysAddedDuringSprint.has(issue.key),
    };
  }

  sprintReportIssueResults.push(
    ...sprintReport.contents.completedIssues.map((issue) => issueResult(issue, 'COMPLETED')),
  );

  sprintReportIssueResults.push(
    ...sprintReport.contents.issuesNotCompletedInCurrentSprint.map((issue) =>
      issueResult(issue, 'NOT_COMPLETED'),
    ),
  );

  sprintReportIssueResults.push(
    ...sprintReport.contents.puntedIssues.map((issue) => issueResult(issue, 'PUNTED')),
  );

  sprintReportIssueResults.push(
    ...sprintReport.contents.issuesCompletedInAnotherSprint.map((issue) =>
      issueResult(issue, 'COMPLETED_IN_ANOTHER_SPRINT'),
    ),
  );

  sprintReport.contents.issueKeysAddedDuringSprint;

  for (const { key, ...jiraResult } of sprintReportIssueResults) {
    console.log('Testing issue', key);

    const jiraResultJSON = JSON.stringify(jiraResult);

    let issue = issues.find((issue) => issue.key === key);
    if (!issue) {
      for (const removedIssue of removedIssues) {
        if (removedIssue.key === key) {
          issue = removedIssue;
          break;
        }
      }
    }

    const ourResult = issueSprintReport(issue, sprint);
    const ourResultJSON = JSON.stringify(ourResult);

    if (jiraResultJSON !== ourResultJSON) {
      console.error('\x1b[31mResults do not match!\x1b[0m');
      console.error('Jira sprint report:', jiraResult);
      console.error('Our sprint report:', ourResult);
    }
  }
}

await testOnSavedBoards();
