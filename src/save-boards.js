'use strict';
import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import fs from 'fs';

/**
 * Saves all Jira board details to a JSON file.
 */
async function saveBoards() {
  try {
    let startAt = 0;
    let boards = [];

    const headers = {
      auth: {
        username: process.env.JIRA_USERNAME ?? '',
        password: process.env.ATLASSIAN_API_TOKEN ?? '',
      },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    };

    while (true) {
      const response = await axios.get(
        process.env.JIRA_SITE_URL + `rest/agile/1.0/board?startAt=${startAt}`,
        headers,
      );

      const json = response.data;

      const newBoards = json.values.map((board) => {
        return {
          id: board.id,
          name: board.name,
        };
      });

      boards = boards.concat(newBoards);

      if (json.isLast) {
        break;
      }
      startAt += json.maxResults;
    }

    fs.writeFile('data/boards.json', JSON.stringify(boards), (err) => {
      if (err) {
        console.error('Saving error', err);
      } else {
        console.log('Saved!');
      }
    });
  } catch (error) {
    console.error(error);
  }
}

await saveBoards();
