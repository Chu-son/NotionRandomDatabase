const NOTION_API_KEY =
  PropertiesService.getScriptProperties().getProperty("NOTION_API_KEY");
const API_LIMIT_PER_SEC = 3;
const BUFFER_TIME = 200;

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${NOTION_API_KEY}`,
  "Notion-Version": "2022-06-28",
};

function callNotionAPI(endpoint, method, payload) {
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

function getDatabaseData(database_id) {
  return callNotionAPI(`databases/${database_id}/query`, "post", {});
}

function updateCheckboxStatus(pageId, status, col_name) {
  const payload = {
    properties: {
      [col_name]: {
        checkbox: status,
      },
    },
  };
  callNotionAPI(`pages/${pageId}`, "patch", payload);
}

function getRandomIndexes(dataLength, count) {
  var randomIndexes = new Set();
  while (randomIndexes.size < count) {
    randomIndexes.add(Math.floor(Math.random() * dataLength));
  }
  return randomIndexes;
}

function selectRandomData(results, indexes) {
  var selectedData = [];
  for (let index of indexes) {
    selectedData.push(results[index]);
  }
  return selectedData;
}

function randomCheckToDatabase(database_id, col_name, num) {
  const responseContent = getDatabaseData(database_id);
  for (let data of responseContent.results) {
    if (data.properties[col_name].checkbox) {
      updateCheckboxStatus(data.id, false, col_name);
    }
  }
  let dataLength = responseContent.results.length;
  const pickupDataCount = Math.min(num, dataLength);
  const randomIndexes = getRandomIndexes(dataLength, pickupDataCount);
  const selectedData = selectRandomData(responseContent.results, randomIndexes);
  for (let data of selectedData) {
    updateCheckboxStatus(data.id, true, col_name);
  }
}

function readSpreadsheetData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("List");
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
  for (let row of data) {
    const [no, enable, database_name, database_id, col_name, num] = row;
    if (enable) {
      randomCheckToDatabase(database_id, col_name, num);
    }
  }
}

function onTimeTrigger() {
  readSpreadsheetData();
}
