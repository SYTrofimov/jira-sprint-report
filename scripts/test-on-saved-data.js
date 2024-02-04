'use strict';
import fs from 'fs';

import { initCustomFields, issueVsSprint } from '../src/jira-sprint-report.js';

async function testOnSavedData() {
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

  for (const sprint of sprints) {
    await testOnSavedSprint(board, sprint);
  }
}

async function testOnSavedSprint(board, sprint) {
  if (sprint.state !== 'closed') {
    return;
  }

  console.log(`Testing sprint ${sprint.id} - ${sprint.name}`);

  const sprintPathPrefix = `data/board-${board.id}/${sprint.id}-`;

  // Get sprint issues
  const issues = JSON.parse(fs.readFileSync(sprintPathPrefix + 'sprint-issues.json', 'utf8'));
  console.log(`Loaded ${issues.length} issues`);

  // Get GreenHopper sprint report
  const sprintReport = JSON.parse(fs.readFileSync(sprintPathPrefix + 'sprintreport.json', 'utf8'));
  console.log(`Loaded GreenHopper sprint report`);

  // Testing issues

  const sprintReportIssueResults = [];

  sprintReportIssueResults.push(
    ...sprintReport.contents.completedIssues.map((issue) => ({
      issue: issue,
      outcome: 'COMPLETED',
    })),
  );

  sprintReportIssueResults.push(
    ...sprintReport.contents.issuesNotCompletedInCurrentSprint.map((issue) => ({
      issue: issue,
      outcome: 'NOT_COMPLETED',
    })),
  );

  sprintReportIssueResults.push(
    ...sprintReport.contents.puntedIssues.map((issue) => ({
      issue: issue,
      outcome: 'PUNTED',
    })),
  );

  sprintReportIssueResults.push(
    ...sprintReport.contents.issuesCompletedInAnotherSprint.map((issue) => ({
      issue: issue,
      outcome: 'COMPLETED_IN_ANOTHER_SPRINT',
    })),
  );

  const issueKeysAddedDuringSprint = new Set();
  for (const issue in sprintReport.contents.issueKeysAddedDuringSprint) {
    issueKeysAddedDuringSprint.add(issue);
  }
  console.log('Issues added during sprint', issueKeysAddedDuringSprint);

  sprintReport.contents.issueKeysAddedDuringSprint;

  for (const { issue, outcome } of sprintReportIssueResults) {
    console.log(`Testing issue ${issue.key} - ${outcome}`);
  }
}

await testOnSavedData();
