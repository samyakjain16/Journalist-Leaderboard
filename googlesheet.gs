// Constants
const SHEETS = {
  DAILY_ENTRIES: 'Daily Entries',
  JOURNALISTS: 'Journalists Master',
  CONFIG: 'Configuration',
  NEW_DATA: 'New Data'
};

const COLUMNS = {
  SHARED: {
    DATE: 0,
    ID: 1,
    NAME: 2,
    PUBLICATION: 3,
    FRONT_PAGE: 4,
    EXCLUSIVE: 5,
    STANDARD: 6,
    DAILY_POINTS: 7
  },
  JOURNALISTS: {
    ID: 0,
    NAME: 1,
    OVERALL_POINTS: 2
  }
};

// Point calculation system
class PointCalculator {
  constructor(configSheet) {
    this.pointValues = this.getPointValues(configSheet);
  }

  getPointValues(configSheet) {
    const configData = configSheet.getDataRange().getValues();
    const config = {};
    
    for (let i = 1; i < configData.length; i++) {
      const [pointType, value] = configData[i];
      if (pointType) {
        config[pointType.toLowerCase().replace(' ', '_')] = Number(value) || 0;
      }
    }
    
    return config;
  }

  calculatePoints(frontPage, exclusive, standard) {
    return (
      (frontPage * this.pointValues.front_page) +
      (exclusive * this.pointValues.exclusive) +
      (standard * this.pointValues.standard)
    );
  }
}

// Utility Functions
function generateJournalistId(name, publication) {
  if (!name || !publication) return '';
  return (name + '_' + publication)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '');
}

function formatDate(date) {
  return Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

// Calculate total points for a journalist
function calculateTotalPoints(journalistId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dailySheet = ss.getSheetByName(SHEETS.DAILY_ENTRIES);
  const dailyData = dailySheet.getDataRange().getValues();
  let totalPoints = 0;
  
  for (let i = 1; i < dailyData.length; i++) {
    if (dailyData[i][COLUMNS.SHARED.ID] === journalistId) {
      totalPoints += Number(dailyData[i][COLUMNS.SHARED.DAILY_POINTS]) || 0;
    }
  }
  
  return totalPoints;
}

// Master sheet management
function updateMasterSheetEntry(id, name, isNewEntry = false) {
  if (!id || !name) return;
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEETS.JOURNALISTS);
  const masterData = masterSheet.getDataRange().getValues();
  
  const totalPoints = calculateTotalPoints(id);
  
  // Try to find existing entry
  for (let i = 1; i < masterData.length; i++) {
    if (masterData[i][COLUMNS.JOURNALISTS.ID] === id) {
      // Update existing entry
      masterSheet.getRange(i + 1, COLUMNS.JOURNALISTS.NAME + 1).setValue(name);
      masterSheet.getRange(i + 1, COLUMNS.JOURNALISTS.OVERALL_POINTS + 1).setValue(totalPoints);
      return; // Exit after updating
    }
  }
  
  // Only add new row if it's a new entry
  if (isNewEntry) {
    masterSheet.appendRow([id, name, totalPoints]);
  }
}

// Handle row deletion in Daily Entries
function handleDailyEntriesDelete(deletedId) {
  if (!deletedId) return;
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEETS.JOURNALISTS);
  const masterData = masterSheet.getDataRange().getValues();
  
  // Check if ID still exists in Daily Entries
  const dailySheet = ss.getSheetByName(SHEETS.DAILY_ENTRIES);
  const dailyData = dailySheet.getDataRange().getValues();
  const idStillExists = dailyData.some(row => row[COLUMNS.SHARED.ID] === deletedId);
  
  // If ID no longer exists in Daily Entries, remove from Master sheet
  if (!idStillExists) {
    for (let i = 1; i < masterData.length; i++) {
      if (masterData[i][COLUMNS.JOURNALISTS.ID] === deletedId) {
        masterSheet.deleteRow(i + 1);
        break;
      }
    }
  }
}


// PDF Data Processor
class PdfDataProcessor {
  constructor(spreadsheet) {
    this.ss = spreadsheet;
    this.pointCalculator = new PointCalculator(
      this.ss.getSheetByName(SHEETS.CONFIG)
    );
  }

  processPdfData(pdfData) {
    const newDataSheet = this.getOrCreateNewDataSheet();
    const uploadedDate = formatDate(pdfData.uploadedAt);
    
    const newRows = this.prepareNewRows(pdfData, uploadedDate);
    if (newRows.length > 0) {
      this.addRowsToSheet(newRows, newDataSheet);

      // Add only these new rows to Daily Entries
      // this.addToDailyEntries(newRows);
    }
    
    return newRows.length;
  }

  addToDailyEntries(newRows) {
    try {
      console.log("Starting to add rows to Daily Entries");
      const dailyEntriesSheet = this.ss.getSheetByName(SHEETS.DAILY_ENTRIES);
      const lastRow = dailyEntriesSheet.getLastRow();
      console.log("Last row in Daily Entries:", lastRow);

      // Prepare rows for Daily Entries (without Daily Points)
      const rowsForDaily = newRows.map(row => [
        row[0],  // Date
        row[1],  // ID
        row[2],  // Name
        row[3],  // Publication
        row[4],  // Front Page
        row[5],  // Exclusive
        row[6]   // Standard
      ]);

      console.log("Rows prepared for Daily Entries:", rowsForDaily);

      // Get range and set values
      const range = dailyEntriesSheet.getRange(lastRow + 1, 1, rowsForDaily.length, 7);
      range.setValues(rowsForDaily);

      // Optional: Highlight new rows
      range.setBackground('#e6ffe6');

      console.log(`Successfully added ${rowsForDaily.length} rows to Daily Entries`);
      SpreadsheetApp.getActive().toast(`Added ${rowsForDaily.length} rows to Daily Entries`);

    } catch (error) {
      console.error("Error in addToDailyEntries:", error);
      SpreadsheetApp.getActive().toast('Error: ' + error.message);
    }
  }

  getOrCreateNewDataSheet() {
    let sheet = this.ss.getSheetByName(SHEETS.NEW_DATA);
    
    if (!sheet) {
      sheet = this.ss.insertSheet(SHEETS.NEW_DATA);
      const dailyEntriesSheet = this.ss.getSheetByName(SHEETS.DAILY_ENTRIES);
      const headers = dailyEntriesSheet.getRange(1, 1, 1, 8).getValues();
      sheet.getRange(1, 1, 1, 8).setValues(headers);
      sheet.setFrozenRows(1);
    }
    
    return sheet;
  }

  prepareNewRows(pdfData, uploadedDate) {
    const newRows = [];
    const journalistNames = new Set();
    
    Object.entries(pdfData.results.journalist_stats).forEach(([name, stats]) => {
      if (journalistNames.has(name)) {
        console.error(`Duplicate journalist found: ${name}`);
        return;
      }
      journalistNames.add(name);
      
      const exclusive = stats.exclusive || 0;
      const standard = stats.standard || 0;
      const id = generateJournalistId(name, 'AFR');
      
      const row = [
        uploadedDate,
        id,
        name,
        'AFR',
        0, // Front Page
        exclusive,
        standard,
        this.pointCalculator.calculatePoints(0, exclusive, standard)
      ];
      
      newRows.push(row);
      
      // Update master sheet for new entries
      updateMasterSheetEntry(id, name, true);
    });
    
    return newRows;
  }

  addRowsToSheet(newRows, sheet) {
    const lastRow = sheet.getLastRow();
    const range = sheet.getRange(lastRow + 1, 1, newRows.length, 8);
    range.setValues(newRows);
    range.setBackground('#e6ffe6');
    this.validateNewEntries(range);
  }

  validateNewEntries(range) {
    const values = range.getValues();
    
    values.forEach((row, rowIndex) => {
      const hasIssue = !row[COLUMNS.SHARED.NAME] || 
                      !row[COLUMNS.SHARED.ID] || 
                      isNaN(row[COLUMNS.SHARED.EXCLUSIVE]) ||
                      isNaN(row[COLUMNS.SHARED.STANDARD]) ||
                      isNaN(row[COLUMNS.SHARED.DAILY_POINTS]);
      
      if (hasIssue) {
        range.offset(rowIndex, 0, 1, 8).setBackground('#ffe6e6');
      }
    });
  }
}

// Firebase sync class
class FirebaseSync {
  constructor() {
    this.firebaseConfig = {
      databaseURL: "https://journalist-leaderboard-default-rtdb.asia-southeast1.firebasedatabase.app"
    };
    this.firebase = FirebaseApp.getDatabaseByUrl(this.firebaseConfig.databaseURL);
  }

  syncData() {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const data = {
        configuration: {
          points: this.getConfigData(ss.getSheetByName(SHEETS.CONFIG))
        },
        daily_scores: this.getDailyEntriesData(ss.getSheetByName(SHEETS.DAILY_ENTRIES)),
        journalists: this.getJournalistsData(ss.getSheetByName(SHEETS.JOURNALISTS))
      };

      if (!this.validateData(data)) {
        throw new Error('Invalid data structure');
      }

      this.firebase.setData('/', data);
      SpreadsheetApp.getActive().toast('Successfully synced to Firebase!');
      
    } catch (error) {
      console.error('Sync error:', error);
      SpreadsheetApp.getActive().toast(`Error syncing: ${error.message}`, 'Error', 30);
    }
  }

  getConfigData(sheet) {
    return new PointCalculator(sheet).pointValues;
  }

  getDailyEntriesData(sheet) {
    const data = sheet.getDataRange().getValues();
    const dailyScores = {};
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[COLUMNS.SHARED.DATE]) continue;
      
      const date = formatDate(row[COLUMNS.SHARED.DATE]);
      
      if (!dailyScores[date]) {
        dailyScores[date] = {
          journalist_info: []
        };
      }

      dailyScores[date].journalist_info.push({
        id: row[COLUMNS.SHARED.ID],
        name: row[COLUMNS.SHARED.NAME],
        publication: row[COLUMNS.SHARED.PUBLICATION],
        metrics: {
          front_page: Number(row[COLUMNS.SHARED.FRONT_PAGE]) || 0,
          exclusive: Number(row[COLUMNS.SHARED.EXCLUSIVE]) || 0,
          standard: Number(row[COLUMNS.SHARED.STANDARD]) || 0
        },
        daily_points: Number(row[COLUMNS.SHARED.DAILY_POINTS]) || 0
      });
    }
    
    return dailyScores;
  }

  getJournalistsData(sheet) {
    const data = sheet.getDataRange().getValues();
    const journalists = {};
    
    for (let i = 1; i < data.length; i++) {
      const [id, name, overallPoints] = data[i];
      if (id) {
        journalists[id] = {
          name: name,
          overall_points: Number(overallPoints) || 0
        };
      }
    }
    
    return journalists;
  }

  validateData(data) {
    return data.configuration?.points && 
           typeof data.daily_scores === 'object' && 
           typeof data.journalists === 'object' && 
           Object.keys(data.journalists).length > 0;
  }
}

// New function to handle ID erasure
function handleIdErasure(sheet, row, erasedId) {
  if (!erasedId) return;
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEETS.JOURNALISTS);
  
  try {
    // Get the daily points value before deleting the row
    const rowRange = sheet.getRange(row, 1, 1, 8);
    const rowValues = rowRange.getValues()[0];
    const dailyPointsToDeduct = Number(rowValues[COLUMNS.SHARED.DAILY_POINTS]) || 0;
    
    // Delete the row from Daily Entries
    sheet.deleteRow(row);
    
    // Update Master sheet
    const masterData = masterSheet.getDataRange().getValues();
    
    // Check if this ID exists in other rows of Daily Entries
    const dailySheet = ss.getSheetByName(SHEETS.DAILY_ENTRIES);
    const dailyData = dailySheet.getDataRange().getValues();
    const remainingEntries = dailyData.filter(row => row[COLUMNS.SHARED.ID] === erasedId);
    
    if (remainingEntries.length > 0) {
      // ID still exists in other rows, just update the overall points
      for (let i = 1; i < masterData.length; i++) {
        if (masterData[i][COLUMNS.JOURNALISTS.ID] === erasedId) {
          const currentOverallPoints = Number(masterData[i][COLUMNS.JOURNALISTS.OVERALL_POINTS]) || 0;
          const newOverallPoints = Math.max(0, currentOverallPoints - dailyPointsToDeduct);
          masterSheet.getRange(i + 1, COLUMNS.JOURNALISTS.OVERALL_POINTS + 1).setValue(newOverallPoints);
          break;
        }
      }
    } else {
      // No more entries with this ID, remove from Master sheet
      for (let i = 1; i < masterData.length; i++) {
        if (masterData[i][COLUMNS.JOURNALISTS.ID] === erasedId) {
          masterSheet.deleteRow(i + 1);
          break;
        }
      }
    }
    
    SpreadsheetApp.getActive().toast('Row removed and points updated successfully');
  } catch (error) {
    logError('handleIdErasure', error, { erasedId, row });
    SpreadsheetApp.getActive().toast('Error handling ID erasure: ' + error.message, 'Error', 30);
  }
}

// Helper function to calculate remaining total points for an ID
function calculateRemainingPoints(journalistId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dailySheet = ss.getSheetByName(SHEETS.DAILY_ENTRIES);
  const dailyData = dailySheet.getDataRange().getValues();
  
  return dailyData.reduce((total, row) => {
    if (row[COLUMNS.SHARED.ID] === journalistId) {
      return total + (Number(row[COLUMNS.SHARED.DAILY_POINTS]) || 0);
    }
    return total;
  }, 0);
}

function onEdit(e) {
  const range = e.range;
  const sheet = range.getSheet();
  /*
  if (sheet.getName() === SHEETS.NEW_DATA) {
    const lastRow = sheet.getLastRow();
    const newRows = sheet.getRange(lastRow, 1, 1, 7).getValues(); // Get the newly added row
    
    console.log("New row detected in New Data sheet:", newRows);
    
    try {
      const dailyEntriesSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.DAILY_ENTRIES);
      const lastDailyRow = dailyEntriesSheet.getLastRow();
      
      // Copy to Daily Entries (without Daily Points column)
      const targetRange = dailyEntriesSheet.getRange(lastDailyRow + 1, 1, 1, 7);
      targetRange.setValues(newRows);
      
      // Optional: Highlight the new row
      targetRange.setBackground('#e6ffe6');
      
      console.log("Successfully copied new row to Daily Entries");
      
    } catch (error) {
      console.error("Error copying to Daily Entries:", error);
    }
  }
  */
  
  // Only proceed if edit is in Daily Entries sheet
  if (sheet.getName() !== SHEETS.DAILY_ENTRIES) return;
  
  const row = range.getRow();
  if (row === 1) return; // Skip header row

  const column = range.getColumn();
  const numRows = range.getNumRows();
  const numCols = range.getNumColumns();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Get the point calculator instance
  const pointCalculator = new PointCalculator(
    ss.getSheetByName(SHEETS.CONFIG)
  );

  // Process each affected row (handles both single edit and paste operations)
  for (let i = 0; i < numRows; i++) {
    const currentRow = row + i;
    
    // Case 1: ID is erased
    if (column === COLUMNS.SHARED.ID + 1) {
      const newValue = range.getValue();
      const oldValue = e.oldValue;
      
      // If ID was erased (new value is empty/null and had an old value)
      if ((!newValue || newValue === '') && oldValue) {
        handleIdErasure(sheet, currentRow, oldValue);
        continue; // Skip to next row
      }
    }

    // Case 2: Name or Publication changes (or paste operation)
    if (numCols > 1 || column === COLUMNS.SHARED.NAME + 1 || column === COLUMNS.SHARED.PUBLICATION + 1) {
      const name = sheet.getRange(currentRow, COLUMNS.SHARED.NAME + 1).getValue();
      const publication = sheet.getRange(currentRow, COLUMNS.SHARED.PUBLICATION + 1).getValue();
      
      if (name && publication) {
        const existingId = sheet.getRange(currentRow, COLUMNS.SHARED.ID + 1).getValue();
        const newId = generateJournalistId(name, publication);
        
        // Update ID in Daily Entries
        sheet.getRange(currentRow, COLUMNS.SHARED.ID + 1).setValue(newId);
        
        // Update master sheet - only add new row if ID is new
        const isNewEntry = !existingId || existingId !== newId;
        updateMasterSheetEntry(newId, name, isNewEntry);
        
        // If ID changed, clean up old entry
        if (existingId && existingId !== newId) {
          handleDailyEntriesDelete(existingId);
        }
        
        // Also calculate points if metrics exist
        const frontPage = Number(sheet.getRange(currentRow, COLUMNS.SHARED.FRONT_PAGE + 1).getValue()) || 0;
        const exclusive = Number(sheet.getRange(currentRow, COLUMNS.SHARED.EXCLUSIVE + 1).getValue()) || 0;
        const standard = Number(sheet.getRange(currentRow, COLUMNS.SHARED.STANDARD + 1).getValue()) || 0;
        
        const dailyPoints = pointCalculator.calculatePoints(frontPage, exclusive, standard);
        sheet.getRange(currentRow, COLUMNS.SHARED.DAILY_POINTS + 1).setValue(dailyPoints);
      }
    }
    
    // Case 3: Metrics changes (Front Page, Exclusive, Standard)
    if (column === COLUMNS.SHARED.FRONT_PAGE + 1 || 
        column === COLUMNS.SHARED.EXCLUSIVE + 1 || 
        column === COLUMNS.SHARED.STANDARD + 1) {
      
      const frontPage = Number(sheet.getRange(currentRow, COLUMNS.SHARED.FRONT_PAGE + 1).getValue()) || 0;
      const exclusive = Number(sheet.getRange(currentRow, COLUMNS.SHARED.EXCLUSIVE + 1).getValue()) || 0;
      const standard = Number(sheet.getRange(currentRow, COLUMNS.SHARED.STANDARD + 1).getValue()) || 0;
      
      // Calculate and update daily points
      const dailyPoints = pointCalculator.calculatePoints(frontPage, exclusive, standard);
      sheet.getRange(currentRow, COLUMNS.SHARED.DAILY_POINTS + 1).setValue(dailyPoints);
      
      // Update master sheet points
      const journalistId = sheet.getRange(currentRow, COLUMNS.SHARED.ID + 1).getValue();
      if (journalistId) {
        updateMasterSheetEntry(journalistId, sheet.getRange(currentRow, COLUMNS.SHARED.NAME + 1).getValue());
      }
    }
  }
}

function onDelete(e) {
  if (!e || !e.range) return;
  
  const sheet = e.range.getSheet();
  if (sheet.getName() !== SHEETS.DAILY_ENTRIES) return;
  
  const deletedValues = e.oldValue;
  if (!deletedValues) return;
  
  if (typeof deletedValues === 'string' && e.range.getColumn() === COLUMNS.SHARED.ID + 1) {
    handleDailyEntriesDelete(deletedValues);
  }
  
  if (Array.isArray(deletedValues)) {
    const deletedId = deletedValues[COLUMNS.SHARED.ID];
    if (deletedId) {
      handleDailyEntriesDelete(deletedId);
    }
  }
}

// Menu and initialization
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Firebase Sync')
    .addItem('Sync to Firebase', 'syncToFirebase')
    .addSeparator()
    .addItem('Setup Triggers', 'createSpreadsheetTriggers')
    .addToUi();
}

// Setup triggers
function createSpreadsheetTriggers() {
  const ss = SpreadsheetApp.getActive();
  
  // Remove existing triggers to avoid duplicates
  const triggers = ScriptApp.getUserTriggers(ss);
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  // Create new triggers
  ScriptApp.newTrigger('onEdit')
    .forSpreadsheet(ss)
    .onEdit()
    .create();
    
  ScriptApp.newTrigger('onDelete')
    .forSpreadsheet(ss)
    .onEdit()
    .create();
    
  SpreadsheetApp.getActive().toast('Triggers successfully set up!');
}

// Global function handlers
function syncToFirebase() {
  new FirebaseSync().syncData();
}

// Handler for PDF data sync
function syncPdfDataToSheets(pdfData) {
  try {
    const processor = new PdfDataProcessor(SpreadsheetApp.getActiveSpreadsheet());
    const rowsAdded = processor.processPdfData(pdfData);
    
    return {
      success: true,
      rowsAdded: rowsAdded,
      message: `Successfully added ${rowsAdded} rows to New Data sheet`
    };
  } catch (error) {
    console.error('Error syncing PDF data:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Error logging utility
function logError(functionName, error, additionalInfo = {}) {
  console.error(`Error in ${functionName}:`, {
    message: error.message,
    stack: error.stack,
    ...additionalInfo
  });
}

// Debug logging utility
function logDebug(message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = data ? 
    `[${timestamp}] ${message}: ${JSON.stringify(data)}` : 
    `[${timestamp}] ${message}`;
  console.log(logMessage);
}
