'use strict';
import fs from 'fs';

import { jiraGet, jiraGetItems } from './utils.js';

const CUSTOM_FIELDS = JSON.parse(fs.readFileSync('data/custom-fields.json', 'utf8'));

async function saveListedBoardSprints() {
  const boards = JSON.parse(fs.readFileSync('data/boards.json', 'utf8'));
  for (const board of boards) {
    await saveBoardData(board);
  }
}

async function saveBoardData(board) {
  console.log(`Saving board ${board.id} - ${board.name}`);

  const boardPath = `data/board-${board.id}`;

  if (!fs.existsSync(boardPath)) {
    fs.mkdirSync(boardPath);
  }

  const sprints = await jiraGetItems(`rest/agile/1.0/board/${board.id}/sprint`);
  fs.writeFileSync(boardPath + '/sprints.json', JSON.stringify(sprints, null, 2));
  console.log(`Saved ${sprints.length} board sprints`);

  const velocity = await jiraGet(
    `rest/greenhopper/1.0/rapid/charts/velocity?rapidViewId=${board.id}`,
  );
  fs.writeFileSync(boardPath + '/velocity.json', JSON.stringify(velocity, null, 2));
  console.log('Saved GreenHopper velocity report');

  const backlogIssues = await jiraGetItems(
    `rest/agile/1.0/board/${board.id}/backlog` +
      `?fields=status,${CUSTOM_FIELDS.sprint},${CUSTOM_FIELDS.storyPoints}` +
      `&expand=changelog`,
    'issues',
  );
  fs.writeFileSync(boardPath + '/backlog-issues.json', JSON.stringify(backlogIssues, null, 2));
  console.log(`Saved ${backlogIssues.length} backlog issues`);

  for (const sprint of sprints) {
    await saveSprintData(board, sprint);
  }
}

async function saveSprintData(board, sprint) {
  console.log(`Saving sprint ${sprint.id} - ${sprint.name}`);

  const sprintPathPrefix = `data/board-${board.id}/${sprint.id}-`;

  const issues = await jiraGetItems(
    `rest/agile/1.0/board/${board.id}/sprint/${sprint.id}/issue` +
      `?fields=status,${CUSTOM_FIELDS.sprint},${CUSTOM_FIELDS.storyPoints}` +
      `&expand=changelog`,
    'issues',
  );
  fs.writeFileSync(sprintPathPrefix + 'sprint-issues.json', JSON.stringify(issues, null, 2));
  console.log(`Saved ${issues.length} issues`);

  const sprintReport = await jiraGet(
    `rest/greenhopper/1.0/rapid/charts/sprintreport?rapidViewId=${board.id}&sprintId=${sprint.id}`,
  );
  fs.writeFileSync(sprintPathPrefix + 'sprintreport.json', JSON.stringify(sprintReport, null, 2));
  console.log('Saved GreenHopper sprint report');
}

await saveListedBoardSprints();
