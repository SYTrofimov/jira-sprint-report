'use strict';
import fs from 'fs';

import { jiraGet, jiraGetValues } from './utils.js';

async function saveListedBoardData() {
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

  const sprints = await jiraGetValues(`rest/agile/1.0/board/${board.id}/sprint`);
  fs.writeFileSync(boardPath + '/sprints.json', JSON.stringify(sprints, null, 2));
  console.log(`Saved ${sprints.length} sprints`);

  // Get GreenHopper velocity report
  const velocity = await jiraGet(
    `rest/greenhopper/1.0/rapid/charts/velocity?rapidViewId=${board.id}`,
  );
  fs.writeFileSync(boardPath + '/velocity.json', JSON.stringify(velocity, null, 2));
}

await saveListedBoardData();
