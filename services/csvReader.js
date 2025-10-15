import { parse } from 'csv-parse/sync';
import { smartNameParse } from '../utils/nameParser.js';

/**
 * Pure CSV Reader - Just reads and parses CSV files
 * No validation, no normalization, just raw data
 */
export function readCSV(csvBuffer) {
  try {
    console.log('📖 READER: Starting CSV parse, buffer size:', csvBuffer.length);
    
    const records = parse(csvBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log('📖 READER: Parsed', records.length, 'records');
    console.log('📖 READER: Headers:', records.length > 0 ? Object.keys(records[0]) : []);
    console.log('📖 READER: First record sample:', records[0]);
    
    // Parse fullName columns immediately - they're not real database fields!
    const parsedRecords = records.map(record => {
      const parsedRecord = { ...record };
      
      // Check for fullName variations
      const fullNameFields = ['Full Name', 'full name', 'fullname', 'name', 'complete name'];
      for (const field of fullNameFields) {
        if (record[field] && !record['firstName'] && !record['lastName']) {
          console.log('🔍 READER: Found fullName field:', field, '=', record[field]);
          const nameParts = smartNameParse(record[field]);
          console.log('🔍 READER: Parsed to:', nameParts);
          
          parsedRecord.firstName = nameParts.firstName;
          parsedRecord.lastName = nameParts.lastName;
          
          // Remove the fullName field - it's not a real database field!
          delete parsedRecord[field];
          break;
        }
      }
      
      return parsedRecord;
    });
    
    return {
      success: true,
      records: parsedRecords,
      headers: records.length > 0 ? Object.keys(records[0]) : []
    };
  } catch (error) {
    console.error('📖 READER ERROR:', error);
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
