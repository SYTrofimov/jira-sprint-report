'use strict';
import fs from 'fs';

import { jiraGet, jiraGetItems } from './utils.js';

async function saveListedBoardSprints() {
  const boards = JSON.parse(fs.readFileSync('data/boards.json', 'utf8'));
  for (const board of boards) {
    await saveBoardData(board);
  }
}

async function saveBoardData(board) {
  console.log(`Saving board ${board.id} - ${board.name}`);

  const boardPath = `data/board-${board.id}`;

  // Create a new folder for the board
  if (!fs.existsSync(boardPath)) {
    fs.mkdirSync(boardPath);
  }

  const sprints = await jiraGetItems(`rest/agile/1.0/board/${board.id}/sprint`);
  fs.writeFileSync(boardPath + '/sprints.json', JSON.stringify(sprints, null, 2));
  console.log(`Saved ${sprints.length} board sprints`);

  // Get GreenHopper velocity report
  const velocity = await jiraGet(
    `rest/greenhopper/1.0/rapid/charts/velocity?rapidViewId=${board.id}`,
  );
  fs.writeFileSync(boardPath + '/velocity.json', JSON.stringify(velocity, null, 2));

  for (const sprint of sprints) {
    await saveSprintData(board, sprint);
  }
}

async function saveSprintData(board, sprint) {
  console.log(`Saving sprint ${sprint.id} - ${sprint.name}`);

  const sprintPathPrefix = `data/board-${board.id}/${sprint.id}-`;

  // Get sprint issues
  const issues = await jiraGetItems(
    `rest/agile/1.0/board/${board.id}/sprint/${sprint.id}/issue?expand=changelog`,
    'issues',
  );
  fs.writeFileSync(sprintPathPrefix + 'sprint-issues.json', JSON.stringify(issues, null, 2));
  console.log(`Saved ${issues.length} issues`);

  // Get GreenHopper sprint report
  const report = await jiraGet(
    `rest/greenhopper/1.0/rapid/charts/sprintreport?rapidViewId=${board.id}&sprintId=${sprint.id}`,
  );
  fs.writeFileSync(sprintPathPrefix + 'sprintreport.json', JSON.stringify(report, null, 2));
}

await saveListedBoardSprints();
