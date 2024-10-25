'use strict';
import fs from 'fs';

import { jiraGet, DATA_SUFFIX } from './utils.js';

async function saveCustomFields() {
  if (!fs.existsSync(`data${DATA_SUFFIX}`)) {
    fs.mkdirSync(`data${DATA_SUFFIX}`);
  }

  let customFields = {};

  const fields = await jiraGet('rest/api/3/field');
  for (const field of fields) {
    if (field.name === 'Story Points') {
      customFields.storyPoints = field.id;
    }
    if (field.name === 'Story point estimate') {
      customFields.storyPointEstimate = field.id;
    }
    if (field.name === 'Sprint') {
      customFields.sprint = field.id;
    }
  }

  fs.writeFileSync(`data${DATA_SUFFIX}/custom-fields.json`, JSON.stringify(customFields, null, 2));
  console.log('Saved custom fields');
}

await saveCustomFields();
