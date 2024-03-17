const NOTION_API_KEY =
  PropertiesService.getScriptProperties().getProperty("NOTION_API_KEY");
const API_LIMIT_PER_SEC = 3;
const BUFFER_TIME = 200;

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${NOTION_API_KEY}`,
  "Notion-Version": "2022-06-28",
};

function callNotionApi(endpoint, method, payload) {
  const requestUrl = `https://api.notion.com/v1/${endpoint}`;
  const options = {
    method: method,
    headers: headers,
    payload: JSON.stringify(payload),
  };
  Utilities.sleep(1000 / API_LIMIT_PER_SEC + BUFFER_TIME);
  const response = UrlFetchApp.fetch(requestUrl, options);
  if (response.getResponseCode() !== 200) {
    throw new Error(`Error: ${response.getContentText()}`);
  }
  return JSON.parse(response.getContentText());
}

function fetchDatabaseData(database_id, payload = {}) {
  return callNotionApi(`databases/${database_id}/query`, "post", payload);
}

function updatePageCheckboxStatus(pageId, status, col_name) {
  const payload = {
    properties: {
      [col_name]: {
        checkbox: status,
      },
    },
  };
  callNotionApi(`pages/${pageId}`, "patch", payload);
}

function generateRandomIndexes(dataLength, count) {
  var randomIndexes = new Set();
  while (randomIndexes.size < count) {
    randomIndexes.add(Math.floor(Math.random() * dataLength));
  }
  return randomIndexes;
}

function selectRandomPages(results, indexes) {
  var selectedData = [];
  for (let index of indexes) {
    selectedData.push(results[index]);
  }
  return selectedData;
}

function updateRandomPageCheckboxesInDatabase(database_id, col_name, num) {
  const responseContent = fetchDatabaseData(database_id);
  for (let data of responseContent.results) {
    if (data.properties[col_name].checkbox) {
      updatePageCheckboxStatus(data.id, false, col_name);
    }
  }
  let dataLength = responseContent.results.length;
  const pickupDataCount = Math.min(num, dataLength);
  const randomIndexes = generateRandomIndexes(dataLength, pickupDataCount);
  const selectedData = selectRandomPages(responseContent.results, randomIndexes);
  for (let data of selectedData) {
    updatePageCheckboxStatus(data.id, true, col_name);
  }
}

function fetchSpreadsheetData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("List");
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();

  return data;
}

function updateRandomPageCheckboxesInAllDatabases() {
  const data = fetchSpreadsheetData();
  for (let row of data) {
    const [no, enable, database_name, database_id, col_name, num] = row;
    if (enable) {
      updateRandomPageCheckboxesInDatabase(database_id, col_name, num);
    }
  }
}

function timedTrigger() {
  updateRandomPageCheckboxesInAllDatabases();
}

function timedTriggerForAllDatabases() {
  updateRandomPageCheckboxesInAllDatabases();
}

function findPropertyNameForTitle(responseContent) {
  for (let page of responseContent.results) {
    for (let propertyName in page.properties) {
      if (page.properties[propertyName].id === "title") {
        return propertyName;
      }
    }
  }
  return null;
}

function writeDatabasePagesToSpreadsheet(database_id, database_name) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(`${database_name}_data`);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(`${database_name}_data`);
  }
  // clear sheet
  sheet.clear();
  let data = [["Title", "PageId"]]; // Add header row

  let next_cursor = undefined;
  let titlePropertyName = undefined;
  while (true) {
    console.log(next_cursor);
    const payload = {
      start_cursor: next_cursor,
    };
    const responseContent = fetchDatabaseData(database_id, payload);
    if (!titlePropertyName) {
      titlePropertyName = findPropertyNameForTitle(responseContent);

      if (!titlePropertyName) {
        throw new Error("Title property not found");
      }
    }

    for (let page of responseContent.results) {
      let title = "No Title";
      if (page.properties[titlePropertyName].title.length > 0) {
        title = page.properties[titlePropertyName].title[0].plain_text;
      }
      const pageId = page.id;
      data.push([title, pageId]);
    }

    if (responseContent.has_more) {
      next_cursor = responseContent.next_cursor;
    } else {
      break;
    }
  }
  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
}

function writeAllDatabasePagesToSpreadsheet() {
  const data = fetchSpreadsheetData();
  for (let row of data) {
    const [no, enable, database_name, database_id, col_name, num] = row;
    if (enable) {
      writeDatabasePagesToSpreadsheet(database_id, database_name);
    }
  }
}