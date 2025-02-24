'use strict';
import process from 'process';
import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

const DATA_SUFFIX = process.env.DATA_SUFFIX ?? '';

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
 * @param {string} node Node containing the items array
 * @param {number} initialStartAt Initial start index
 * @returns {Promise<any>} Values array
 * @throws {Error} bubbling up from jiraGet()
 */
async function jiraGetItems(route, node = 'values', initialStartAt = 0) {
  const separator = route.includes('?') ? '&' : '?';

  let startAt = initialStartAt;
  let items = [];
  while (true) {
    const response = await jiraGet(route + separator + `startAt=${startAt}`);
    items = items.concat(response[node]);

    startAt += response.maxResults;

    if (startAt >= response.total) {
      break;
    }
  }

  return items;
}

export { jiraGet, jiraGetItems, DATA_SUFFIX };
