'use strict';
import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import fs from 'fs';

const AXIOS_CONFIG = {
  auth: {
    username: process.env.JIRA_USERNAME ?? '',
    password: process.env.ATLASSIAN_API_TOKEN ?? '',
  },
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
};

async function jiraGet(route) {
  try {
    const response = await axios.get(process.env.JIRA_SITE_URL + route, AXIOS_CONFIG);
    return response.data;
  } catch (error) {
    console.error(error.response.data);
  }
}

async function saveListedBoardData() {
  fs.readFile('data/boards.json', 'utf8', async (err, data) => {
    if (err) {
      console.error('Reading error', err);
    } else {
      const boards = JSON.parse(data);
      for (const board of boards) {
        await saveBoardData(board);
      }
    }
  });
}

async function saveBoardData(board) {
  console.log(`Saving board ${board.id} - ${board.name}`);

  // Create a new folder for the board
  if (!fs.existsSync(`data/${board.id}`)) {
    fs.mkdirSync(`data/${board.id}`);
  }

  // Get all sprints
  let sprints = [];
  let startAt = 0;
  while (true) {
    const json = await jiraGet(`rest/agile/1.0/board/${board.id}/sprint?startAt=${startAt}`);
    sprints = sprints.concat(json.values);

    if (json.isLast) {
      break;
    }
    startAt += json.maxResults;
  }

  fs.writeFile(`data/${board.id}/sprints.json`, JSON.stringify(sprints), (err) => {
    if (err) {
      console.error('Saving error', err);
    } else {
      console.log('Saved!');
    }
  });

  // Get GreenHopper velocity report
  const velocity = await jiraGet(
    `rest/greenhopper/1.0/rapid/charts/velocity?rapidViewId=${board.id}`,
  );
  console.log(velocity);
}

await saveListedBoardData();
