'use strict';
import fs from 'fs';

async function testOnSavedData() {
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

  const issueStatuses = [];

  issueStatuses.push(
    ...sprintReport.contents.completedIssues.map((issue) => ({
      issue: issue,
      status: 'COMPLETED',
    })),
  );

  issueStatuses.push(
    ...sprintReport.contents.issuesNotCompletedInCurrentSprint.map((issue) => ({
      issue: issue,
      status: 'NOT_COMPLETED',
    })),
  );

  issueStatuses.push(
    ...sprintReport.contents.puntedIssues.map((issue) => ({
      issue: issue,
      status: 'PUNTED',
    })),
  );

  issueStatuses.push(
    ...sprintReport.contents.issuesCompletedInAnotherSprint.map((issue) => ({
      issue: issue,
      status: 'COMPLETED_IN_ANOTHER_SPRINT',
    })),
  );

  const issueKeysAddedDuringSprint = new Set();
  for (const issue in sprintReport.contents.issueKeysAddedDuringSprint) {
    issueKeysAddedDuringSprint.add(issue);
  }
  console.log('Issues added during sprint', issueKeysAddedDuringSprint);

  sprintReport.contents.issueKeysAddedDuringSprint;

  for (const { issue, status } of issueStatuses) {
    console.log(`Testing issue ${issue.key} - ${status}`);
  }
}

await testOnSavedData();
