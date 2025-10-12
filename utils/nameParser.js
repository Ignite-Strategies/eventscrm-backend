/**
 * Smart Full Name Parser
 * Handles various name formats and extracts first/last names
 */

export function parseFullName(fullName) {
  if (!fullName || typeof fullName !== 'string') {
    return { firstName: '', lastName: '' };
  }

  // Clean up the name
  const cleanName = fullName.trim().replace(/\s+/g, ' '); // Remove extra spaces
  
  // Split by spaces
  const nameParts = cleanName.split(' ');
  
  if (nameParts.length === 0) {
    return { firstName: '', lastName: '' };
  }
  
  if (nameParts.length === 1) {
    // Single name - treat as first name
    return { firstName: nameParts[0], lastName: '' };
  }
  
  if (nameParts.length === 2) {
    // "John Doe" - simple case
    return { firstName: nameParts[0], lastName: nameParts[1] };
  }
  
  if (nameParts.length === 3) {
    // Could be "John Michael Doe" or "Mary Jane Smith" or "Dr. John Doe"
    const first = nameParts[0];
    const last = nameParts[2];
    
    // Check if first part is a title
    const titles = ['dr', 'mr', 'mrs', 'ms', 'prof', 'professor', 'rev', 'pastor', 'father'];
    if (titles.includes(first.toLowerCase())) {
      return { firstName: nameParts[1], lastName: nameParts[2] };
    }
    
    // Otherwise treat middle name as part of first name
    return { firstName: `${nameParts[0]} ${nameParts[1]}`, lastName: nameParts[2] };
  }
  
  // 4+ parts - handle complex cases
  if (nameParts.length >= 4) {
    // "Dr. John Michael Doe" or "Mary Jane Elizabeth Smith"
    const first = nameParts[0];
    const titles = ['dr', 'mr', 'mrs', 'ms', 'prof', 'professor', 'rev', 'pastor', 'father'];
    
    if (titles.includes(first.toLowerCase())) {
      // Has title - everything except title and last name goes to first name
      const firstName = nameParts.slice(1, -1).join(' ');
      const lastName = nameParts[nameParts.length - 1];
      return { firstName, lastName };
    } else {
      // No title - everything except last name goes to first name
      const firstName = nameParts.slice(0, -1).join(' ');
      const lastName = nameParts[nameParts.length - 1];
      return { firstName, lastName };
    }
  }
  
  // Fallback
  return { firstName: nameParts[0], lastName: nameParts.slice(1).join(' ') };
}

/**
 * Parse multiple name formats and return the best result
 */
export function smartNameParse(fullName) {
  const result = parseFullName(fullName);
  
  // Capitalize properly
  result.firstName = capitalizeName(result.firstName);
  result.lastName = capitalizeName(result.lastName);
  
  return result;
}

/**
 * Capitalize name properly (handle hyphenated names, etc.)
 */
function capitalizeName(name) {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .split(/[\s-]+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Test the parser with various formats
 */
export function testNameParser() {
  const testCases = [
    'John Doe',
    'Mary Jane Smith',
    'Dr. John Doe',
    'Professor Mary Jane Smith',
    'Jean-Claude Van Damme',
    'Mary Jane Elizabeth Watson',
    'Dr. Mary Jane Smith',
    'O\'Connor',
    'Smith-Jones',
    'John',
    'Madonna',
    'Cher'
  ];
  
  console.log('🧪 Name Parser Test Results:');
  testCases.forEach(name => {
    const result = smartNameParse(name);
    console.log(`"${name}" → First: "${result.firstName}", Last: "${result.lastName}"`);
  });
}

