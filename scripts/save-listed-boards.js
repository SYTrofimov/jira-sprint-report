'use strict';
import fs from 'fs';

import { jiraGet, jiraGetItems, DATA_SUFFIX } from './utils.js';

const MAX_SPRINTS = 10;

const CUSTOM_FIELDS = JSON.parse(fs.readFileSync(`data${DATA_SUFFIX}/custom-fields.json`, 'utf8'));

let fields = `created,status,${CUSTOM_FIELDS.sprint}`;
if (CUSTOM_FIELDS.storyPoints) {
  fields += `,${CUSTOM_FIELDS.storyPoints}`;
}
if (CUSTOM_FIELDS.storyPointEstimate) {
  fields += `,${CUSTOM_FIELDS.storyPointEstimate}`;
}
const FIELDS = fields;

async function saveListedBoards() {
  const boards = JSON.parse(fs.readFileSync(`data${DATA_SUFFIX}/boards.json`, 'utf8'));
  for (const board of boards) {
    await saveBoard(board);
  }
}

async function saveBoard(board) {
  console.log(`Saving board ${board.id} - ${board.name}`);

  const boardPath = `data${DATA_SUFFIX}/board-${board.id}`;

  if (!fs.existsSync(boardPath)) {
    fs.mkdirSync(boardPath);
  }

  const allSprints = await jiraGetItems(`rest/agile/1.0/board/${board.id}/sprint`);
  allSprints.sort((a, b) => (a.startDate > b.startDate ? 1 : -1));
  const sprints = allSprints.filter((sprint) => sprint.state === 'closed').slice(-MAX_SPRINTS);
  cleanSprints(sprints);
  fs.writeFileSync(boardPath + '/sprints.json', JSON.stringify(sprints, null, 2));
  console.log(`Saved ${sprints.length} board sprints`);

  const velocity = await jiraGet(
    `rest/greenhopper/1.0/rapid/charts/velocity?rapidViewId=${board.id}`,
  );
  fs.writeFileSync(boardPath + '/velocity.json', JSON.stringify(velocity, null, 2));
  console.log('Saved GreenHopper velocity report');

  let url = `rest/agile/1.0/board/${board.id}/issue` + `?fields=${FIELDS}` + `&expand=changelog`;
  if (sprints.length > 0 && sprints[0].startDate !== undefined) {
    url += `&jql=updated>="${sprints[0].startDate.substring(0, 10)}"`;
  }
  const updatedIssues = await jiraGetItems(url, 'issues');
  cleanIssues(updatedIssues);
  fs.writeFileSync(boardPath + '/updated-issues.json', JSON.stringify(updatedIssues, null, 2));
  console.log(`Saved ${updatedIssues.length} updated issues`);

  for (const sprint of sprints) {
    await saveSprint(board, sprint);
  }
}

async function saveSprint(board, sprint) {
  console.log(`Saving sprint ${sprint.id} - ${sprint.name}`);

  const sprintPathPrefix = `data${DATA_SUFFIX}/board-${board.id}/${sprint.id}-`;

  const issues = await jiraGetItems(
    `rest/agile/1.0/board/${board.id}/sprint/${sprint.id}/issue` +
      `?fields=${FIELDS}` +
      `&expand=changelog`,
    'issues',
  );
  cleanIssues(issues);
  fs.writeFileSync(sprintPathPrefix + 'sprint-issues.json', JSON.stringify(issues, null, 2));
  console.log(`Saved ${issues.length} issues`);

  const sprintReport = await jiraGet(
    `rest/greenhopper/1.0/rapid/charts/sprintreport?rapidViewId=${board.id}&sprintId=${sprint.id}`,
  );
  fs.writeFileSync(sprintPathPrefix + 'sprintreport.json', JSON.stringify(sprintReport, null, 2));
  console.log('Saved GreenHopper sprint report');
}

function cleanSprints(sprints) {
  const allowedProperties = ['id', 'state', 'name', 'startDate', 'completeDate'];

  for (const sprint of sprints) {
    for (const key of Object.keys(sprint)) {
      if (!allowedProperties.includes(key)) {
        delete sprint[key];
      }
    }
  }
}

function cleanIssues(issues) {
  const allowedIssueProperties = ['key', 'changelog', 'fields'];
  const allowedFields = [
    'created',
    'status',
    CUSTOM_FIELDS.sprint,
    CUSTOM_FIELDS.storyPoints,
    CUSTOM_FIELDS.storyPointEstimate,
  ];
  const allowedHistoryProperties = ['created', 'items'];

  for (const issue of issues) {
    for (const issueProperty of Object.keys(issue)) {
      if (!allowedIssueProperties.includes(issueProperty)) {
        delete issue[issueProperty];
      }
    }

    for (const field of Object.keys(issue.fields)) {
      if (!allowedFields.includes(field)) {
        delete issue.fields[field];
      }
    }

    if (issue.changelog) {
      const histories = issue.changelog.histories;
      for (let historyIndex = histories.length - 1; historyIndex >= 0; historyIndex--) {
        const history = histories[historyIndex];

        for (const historyProperty of Object.keys(history)) {
          if (!allowedHistoryProperties.includes(historyProperty)) {
            delete history[historyProperty];
          }
        }

        for (let itemIndex = history.items.length - 1; itemIndex >= 0; itemIndex--) {
          const historyItem = history.items[itemIndex];
          if (!allowedFields.includes(historyItem.fieldId)) {
            history.items.splice(itemIndex, 1);
          }
        }

        if (history.items.length === 0) {
          histories.splice(historyIndex, 1);
        }
      }
    }
  }
}

await saveListedBoards();
