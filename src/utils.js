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

/**
 * Wrapper for axios.get() with Jira authentication
 * @param {string} route Jira API route
 * @returns {Promise<any>} JSON response
 * @throws {Error} if response is not 200
 */
async function jiraGet(route) {
  try {
    const response = await axios.get(process.env.JIRA_SITE_URL + route, AXIOS_CONFIG);
    return response.data;
  } catch (error) {
    console.error(error.response.data);
  }
}

/**
 * Read all 'values' from a Jira API route, making multiple calls if necessary
 * @param {string} route Jira API route
 * @returns {Promise<any>} Values array
 * @throws {Error} bubbling up from jiraGet()
 */
async function jiraGetValues(route) {
  let startAt = 0;
  let values = [];
  while (true) {
    const response = await jiraGet(route + `?startAt=${startAt}`);
    values = values.concat(response.values);

    if (response.isLast) {
      break;
    }
    startAt += response.maxResults;
  }
  return values;
}

export { jiraGet, jiraGetValues };
