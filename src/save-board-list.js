'use strict';
import fs from 'fs';

import { jiraGetValues } from './utils.js';

async function saveBoardList() {
  const boards = await jiraGetValues(`rest/agile/1.0/board`);
  fs.writeFileSync('data/boards.json', JSON.stringify(boards, null, 2));
  console.log('Saved board list');
}

await saveBoardList();
