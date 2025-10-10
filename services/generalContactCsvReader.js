import { parse } from 'csv-parse/sync';

/**
 * General Contact CSV Reader - Just reads and parses CSV files for contacts
 * No validation, no normalization, just raw data
 */
export function readGeneralContactCSV(csvBuffer) {
  try {
    console.log('📖 GENERAL CONTACT READER: Starting CSV parse, buffer size:', csvBuffer.length);
    
    const records = parse(csvBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log('📖 GENERAL CONTACT READER: Parsed', records.length, 'records');
    console.log('📖 GENERAL CONTACT READER: Headers:', records.length > 0 ? Object.keys(records[0]) : []);
    console.log('📖 GENERAL CONTACT READER: First record sample:', records[0]);
    
    return {
      success: true,
      records,
      headers: records.length > 0 ? Object.keys(records[0]) : []
    };
  } catch (error) {
    console.error('📖 GENERAL CONTACT READER ERROR:', error);
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
export function getGeneralContactCSVHeaders(csvBuffer) {
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
