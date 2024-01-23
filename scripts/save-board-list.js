'use strict';
import fs from 'fs';

import { jiraGetItems } from './utils.js';

async function saveBoardList() {
  if (!fs.existsSync('data')) {
    fs.mkdirSync('data');
  }

  const boards = await jiraGetItems('rest/agile/1.0/board');
  fs.writeFileSync('data/boards.json', JSON.stringify(boards, null, 2));
  console.log('Saved board list');
}

await saveBoardList();
