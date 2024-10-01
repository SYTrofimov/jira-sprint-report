'use strict';
// @ts-check

import fs from 'fs';
import process from 'process';

import {
  initSprintReport,
  issueSprintReport,
  removedIssuesBySprintId,
  velocityReport,
} from '../src/jira-sprint-report.js';

function parseCommandLineArgs() {
  const args = process.argv.slice(2);
  const parsedArgs = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      if (key === 'sprint') {
        const sprintId = Number(value);
        if (!Number.isInteger(sprintId) || sprintId <= 0) {
          console.error('\x1b[31mError: Sprint ID must be a positive integer\x1b[0m');
          process.exit(1);
        }
        parsedArgs[key] = sprintId;
      } else {
        parsedArgs[key] = value;
      }
      i++;
    }
  }

  return parsedArgs;
}

async function testOnSavedBoards() {
  const customFields = JSON.parse(fs.readFileSync('data/custom-fields.json', 'utf8'));
  initSprintReport(customFields, ['Done', 'Closed', 'Requires Acceptance']);

  const boards = JSON.parse(fs.readFileSync('data/boards.json', 'utf8'));

  const args = parseCommandLineArgs();

  for (const board of boards) {
    await testOnSavedBoard(board, args.sprint);
  }
}

async function testOnSavedBoard(board, sprintId) {
  console.log(`Testing velocity on board ${board.id} - ${board.name}`);

  const boardPath = `data/board-${board.id}`;

  const sprints = JSON.parse(fs.readFileSync(boardPath + '/sprints.json', 'utf8'));
  console.log(`Loaded ${sprints.length} board sprints`);
  const sprintsById = new Map(sprints.map((sprint) => [sprint.id, sprint]));

  const updatedIssues = JSON.parse(fs.readFileSync(boardPath + '/updated-issues.json', 'utf8'));
  console.log(`Loaded ${updatedIssues.length} updated issues`);

  const velocity = JSON.parse(fs.readFileSync(boardPath + '/velocity.json', 'utf8'));
  console.log('Loaded GreenHopper velocity report');

  testVelocityReport(velocity, updatedIssues, sprints, sprintId);

  const removedIssuesBySprintIdMap = removedIssuesBySprintId(updatedIssues, sprintsById);

  for (const sprint of sprints) {
    if (sprintId && sprint.id !== sprintId) {
      continue; // Skip sprints that don't match the specified sprint ID
    }
    await testOnSavedSprint(board, sprint, removedIssuesBySprintIdMap.get(sprint.id) || new Set());
  }
}

function testVelocityReport(jiraVelocityReport, issues, sprints, sprintId) {
  console.log('Testing against Greenhopper velocity report');

  const ourVelocityReport = velocityReport(issues, sprints);

  for (let i = 0; i < sprints.length; i++) {
    if (sprintId && sprints[i].id !== sprintId) {
      continue; // Skip sprints that don't match the specified sprint ID
    }

    const jiraStats = jiraVelocityReport.velocityStatEntries[sprints[i].id];
    const ourStats = ourVelocityReport[i];

    console.log(`Testing sprint ${sprints[i].id} - ${sprints[i].name}`);

    if (jiraStats.estimated.value !== ourStats.planned) {
      console.error('\x1b[31mResults do not match!\x1b[0m');
      console.error('Jira sprint report:', jiraStats.estimated.value);
      console.error('Our sprint report:', ourStats.planned);
    }
    if (jiraStats.completed.value !== ourStats.completed) {
      console.error('\x1b[31mResults do not match!\x1b[0m');
      console.error('Jira sprint report:', jiraStats.completed.value);
      console.error('Our sprint report:', ourStats.completed);
    }
  }
}

async function testOnSavedSprint(board, sprint, removedIssues) {
  console.log(`Testing sprint ${sprint.id} - ${sprint.name}`);

  const sprintPathPrefix = `data/board-${board.id}/${sprint.id}-`;

  const issues = JSON.parse(fs.readFileSync(sprintPathPrefix + 'sprint-issues.json', 'utf8'));
  console.log(`Loaded ${issues.length} issues`);

  const sprintReport = JSON.parse(fs.readFileSync(sprintPathPrefix + 'sprintreport.json', 'utf8'));
  console.log(`Loaded GreenHopper sprint report`);

  // Testing issues

  const sprintReportIssueResults = [];

  const issueKeysAddedDuringSprint = new Set();
  for (const issue in sprintReport.contents.issueKeysAddedDuringSprint) {
    issueKeysAddedDuringSprint.add(issue);
  }
  console.log('Issues added during sprint', issueKeysAddedDuringSprint);

  function issueResult(issue, outcome) {
    const initialEstimate = issue.estimateStatistic.statFieldValue.value;
    const finalEstimate = issue.currentEstimateStatistic.statFieldValue.value;

    return {
      key: issue.key,
      outcome: outcome,
      initialEstimate: initialEstimate === undefined ? null : initialEstimate,
      finalEstimate: finalEstimate === undefined ? null : finalEstimate,
      addedDuringSprint: issueKeysAddedDuringSprint.has(issue.key),
    };
  }

  sprintReportIssueResults.push(
    ...sprintReport.contents.completedIssues.map((issue) => issueResult(issue, 'COMPLETED')),
  );

  sprintReportIssueResults.push(
    ...sprintReport.contents.issuesNotCompletedInCurrentSprint.map((issue) =>
      issueResult(issue, 'NOT_COMPLETED'),
    ),
  );

  sprintReportIssueResults.push(
    ...sprintReport.contents.puntedIssues.map((issue) => issueResult(issue, 'PUNTED')),
  );

  sprintReportIssueResults.push(
    ...sprintReport.contents.issuesCompletedInAnotherSprint.map((issue) =>
      issueResult(issue, 'COMPLETED_IN_ANOTHER_SPRINT'),
    ),
  );

  sprintReport.contents.issueKeysAddedDuringSprint;

  for (const { key, ...jiraResult } of sprintReportIssueResults) {
    console.log('Testing issue', key);

    const jiraResultJSON = JSON.stringify(jiraResult);

    let issue = issues.find((issue) => issue.key === key);
    if (!issue) {
      for (const removedIssue of removedIssues) {
        if (removedIssue.key === key) {
          issue = removedIssue;
          break;
        }
      }
    }

    const ourResult = issueSprintReport(issue, sprint);
    const ourResultJSON = JSON.stringify(ourResult);

    if (jiraResultJSON !== ourResultJSON) {
      console.error('\x1b[31mResults do not match!\x1b[0m');
      console.error('Jira sprint report:', jiraResult);
      console.error('Our sprint report:', ourResult);
    }
  }
}

await testOnSavedBoards();
