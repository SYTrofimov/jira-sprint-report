// @ts-check
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
    const response = await axios.get(process.env.JIRA_SITE_URL + 'rest/agile/1.0/board', {
      auth: {
        username: process.env.JIRA_USERNAME ?? '',
        password: process.env.ATLASSIAN_API_TOKEN ?? '',
      },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    fs.writeFile('data/board-list.json', JSON.stringify(response.data), (err) => {
      if (err) {
        console.error('Saving error', err);
      } else {
        console.log('Saved!');
      }
    });
  } catch (error) {
    console.error('code:', error.code);
    console.error('data:', error.config.data);
    console.error('response:', error.response.data);
  }
}

await saveBoards();
