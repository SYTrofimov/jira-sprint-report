'use strict';
import fs from 'fs';

import { jiraGetItems, DATA_SUFFIX } from './utils.js';

async function saveBoardList() {
  if (!fs.existsSync(`data${DATA_SUFFIX}`)) {
    fs.mkdirSync(`data${DATA_SUFFIX}`);
  }

  const boards = await jiraGetItems('rest/agile/1.0/board');
  cleanBoardList(boards);
  fs.writeFileSync(`data${DATA_SUFFIX}/boards.json`, JSON.stringify(boards, null, 2));
  console.log('Saved board list');
}

function cleanBoardList(boards) {
  const allowedProperties = ['id', 'name', 'type'];

  for (const board of boards) {
    for (const key of Object.keys(board)) {
      if (!allowedProperties.includes(key)) {
        delete board[key];
      }
    }
  }
}

await saveBoardList();
