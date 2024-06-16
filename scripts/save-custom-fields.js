'use strict';
import fs from 'fs';

import { jiraGetItems } from './utils.js';

async function saveCustomFields() {
  if (!fs.existsSync('data')) {
    fs.mkdirSync('data');
  }

  let customFields = {};

  const storyPointsFields = await jiraGetItems('rest/api/3/field/search?type=custom&query=Story');
  for (const field of storyPointsFields) {
    if (field.name === 'Story Points') {
      customFields.storyPoints = field.id;
    }
    if (field.name === 'Story point estimate') {
      customFields.storyPointEstimate = field.id;
    }
  }

  const sprintFields = await jiraGetItems('rest/api/3/field/search?type=custom&query=Sprint');
  for (const field of sprintFields) {
    if (field.name === 'Sprint') {
      customFields.sprint = field.id;
    }
  }

  fs.writeFileSync('data/custom-fields.json', JSON.stringify(customFields, null, 2));
  console.log('Saved custom fields');
}

await saveCustomFields();
