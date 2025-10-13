/**
 * Notes Parser Service
 * 
 * Parses EventAttendee.notes JSON and maps to structured fields
 */

export const parseNotesToStructuredFields = (notes) => {
  if (!notes || typeof notes !== 'object') {
    return {
      spouseOrOther: null,
      howManyInParty: null,
      likelihoodToAttendId: null
    };
  }

  const mapped = {
    spouseOrOther: null,
    howManyInParty: null,
    likelihoodToAttendId: null
  };

  // Map "Will you bring your M or anyone else?" → spouseOrOther
  const bringingMResponse = notes.bringing_m 
    || notes.will_bring_spouse 
    || notes.bringing_spouse;
  
  if (bringingMResponse) {
    mapped.spouseOrOther = bringingMResponse.toLowerCase().includes('yes') ? 'spouse' : 'solo';
  }

  // Map "If going, how many in your party?" → howManyInParty
  const howManyInParty = notes.how_many_in_party 
    || notes.party_size
    || notes.partySize;
  
  if (howManyInParty) {
    mapped.howManyInParty = parseInt(howManyInParty);
  }

  // Map "How likely are you to attend?" → likelihoodToAttendId
  const likelihoodString = notes.how_likely_to_attend 
    || notes.likelihood_to_attend
    || notes.likelihood;
  
  if (likelihoodString) {
    // Map response text to values (same logic as orgMemberFormRoute)
    const likelihoodMap = {
      "i'm in": 1,
      "planning to be there": 1,
      "im in": 1,
      "most likely": 2,
      "confirming logistics": 2,
      "probably yes": 2,
      "chaos intervenes": 2,
      "probably": 2,
      "morale support": 4,
      "just here for": 4,
      "support from afar": 4
    };
    
    const lowerResponse = likelihoodString.toLowerCase();
    let likelihoodValue = 2; // Default: medium
    
    for (const [key, value] of Object.entries(likelihoodMap)) {
      if (lowerResponse.includes(key)) {
        likelihoodValue = value;
        break;
      }
    }
    
    mapped.likelihoodToAttendId = likelihoodValue;
  }

  return mapped;
};

export const getNotesFieldMapping = (notes) => {
  if (!notes || typeof notes !== 'object') {
    return {
      spouseOrOther: { value: 'Not specified', source: 'No bringing data' },
      howManyInParty: { value: 'Not specified', source: 'No party size data' },
      likelihoodToAttendId: { value: 'Not specified', source: 'No likelihood data' }
    };
  }

  return {
    spouseOrOther: {
      value: (() => {
        const bringingMResponse = notes.bringing_m 
          || notes.will_bring_spouse 
          || notes.bringing_spouse;
        return bringingMResponse 
          ? (bringingMResponse.toLowerCase().includes('yes') ? 'spouse' : 'solo')
          : 'solo';
      })(),
      source: (() => {
        const bringingMResponse = notes.bringing_m 
          || notes.will_bring_spouse 
          || notes.bringing_spouse;
        return bringingMResponse || 'Not specified';
      })()
    },
    howManyInParty: {
      value: notes.how_many_in_party 
        || notes.party_size
        || notes.partySize
        || 'Not specified',
      source: Object.keys(notes).filter(k => 
        ['how_many_in_party', 'party_size', 'partySize'].includes(k)
      ).join(', ') || 'No party size field'
    },
    likelihoodToAttendId: {
      value: notes.how_likely_to_attend 
        || notes.likelihood_to_attend
        || notes.likelihood
        || 'Not specified',
      source: Object.keys(notes).filter(k => 
        ['how_likely_to_attend', 'likelihood_to_attend', 'likelihood'].includes(k)
      ).join(', ') || 'No likelihood field'
    }
  };
};
