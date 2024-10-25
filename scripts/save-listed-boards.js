'use strict';
import fs from 'fs';

import { jiraGet, jiraGetItems, DATA_SUFFIX } from './utils.js';

const MAX_SPRINTS = 10;

const CUSTOM_FIELDS = JSON.parse(fs.readFileSync(`data${DATA_SUFFIX}/custom-fields.json`, 'utf8'));

let fields = `status,${CUSTOM_FIELDS.sprint}`;
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
  const allowedProperties = ['key', 'changelog', 'fields'];
  const allowedFields = [
    'status',
    CUSTOM_FIELDS.sprint,
    CUSTOM_FIELDS.storyPoints,
    CUSTOM_FIELDS.storyPointEstimate,
  ];

  for (const issue of issues) {
    for (const key of Object.keys(issue)) {
      if (allowedProperties.includes(key)) {
        if (key === 'fields') {
          for (const field of Object.keys(issue[key])) {
            if (!allowedFields.includes(field)) {
              delete issue[key][field];
            }
          }
        } else if (key === 'changelog') {
          for (const history of issue[key].histories) {
            for (const key of Object.keys(history)) {
              if (key === 'items') {
                for (const item of history[key]) {
                  if (!allowedFields.includes(item.fieldId)) {
                    const index = history[key].indexOf(item);
                    history[key].splice(index, 1);
                  }
                }
              } else if (key !== 'created') {
                delete history[key];
              }
            }
          }
        }
      } else {
        delete issue[key];
      }
    }
  }
}

await saveListedBoards();
