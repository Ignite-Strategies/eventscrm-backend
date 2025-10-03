import { parse } from 'csv-parse/sync';

/**
 * Pure CSV Reader - Just reads and parses CSV files
 * No validation, no normalization, just raw data
 */
export function readCSV(csvBuffer) {
  try {
    const records = parse(csvBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    return {
      success: true,
      records,
      headers: records.length > 0 ? Object.keys(records[0]) : []
    };
  } catch (error) {
    return {
      success: false,
      error: `CSV parsing failed: ${error.message}`,
      records: [],
      headers: []
    };
  }
}

/**
 * Get CSV headers from buffer without parsing all data
 */
export function getCSVHeaders(csvBuffer) {
  try {
    const text = csvBuffer.toString('utf8');
    const firstLine = text.split('\n')[0];
    const headers = firstLine.split(',').map(h => h.trim().replace(/"/g, ''));
    
    return {
      success: true,
      headers
    };
  } catch (error) {
    return {
      success: false,
      error: `Header extraction failed: ${error.message}`,
      headers: []
    };
  }
}
