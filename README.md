# jira-sprint-report

jira-sprint-report is a library for calculating GreenHopper-like sprint report based on the public Jira Cloud API.

## Usage

1. Clone the repo.

   ```shell
   git clone https://github.com/SYTrofimov/jira-sprint-report.git
   ```

1. Import the functions explcitly. TODO: Create an npm package.

   ```JavaScript
   import {
     initSprintReport,
     velocityReport,
   } from '../../../jira-sprint-report/src/jira-sprint-report.js';
   ```

1. Configure the library.

   ```JavaScript
     initSprintReport(customFields, doneStatuses);
   ```

   `initSprintReport` is a function that initializes the sprint report with the provided custom fields and done statuses.

1. Fetch the `updatedIssues` and `sprints` from Jira API. `sprints` are the sprints for which the report is being generated, and `updatedIssues` are the issues that have been updated since the start of the first sprint.

1. Call `velocityReport`.

   ```JavaScript
   const velocities = velocityReport(updatedIssues, sprints);
   ```

   `velocityReport` is a function that calculates the planned and completed story points for the provided `sprints`.

Look at the unit tests in `src/jira-sprint-report.test.js` and in the `scripts/` folder for more usage examples.

## Running the unit tests

The unit tests are set up with Jest. Use the npm test script to run them.

```shell
npm test
```

You can also use the [Jest VS Code extension](https://marketplace.visualstudio.com/items?itemName=Orta.vscode-jest), which provides a visual interface for running your Jest tests in VS Code.

## Mass-validation on a live Jira instance

The `scripts/` folder contains scripts for performing mass-validation, which is a process of validating the sprint report against a live Jira instance. Here is how to do this.

### Initial setup

1. Copy `.env.example` into `.env` and fill in the Jira credentials. The `.env` file is used to store environment variables, such as your Jira API credentials.
1. Run `save-board-list.js` to save a list of all boards in the Jira instance to `data/boards.json`. Edit this file and remove any boards you don't want to use from it.
1. Run `save-custom-fields.js` to save the custom fields configuration to `data/custom-fields.json`.
1. Run `save-listed-boards.js` to dump the relevant sprint and issue data of all listed boards to the `data/` folder. This will take some time.

### Validation

Run `test-on-saved-boards.js` to validate `jira-sprint-report` against the original GreenHopper API on the saved board data.
