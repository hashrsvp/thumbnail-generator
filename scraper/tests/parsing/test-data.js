/**
 * Test Data for Event Details Parser
 * Contains various OCR text samples for testing parsing algorithms
 */

const testCases = {
  // Date parsing test cases
  dates: [
    {
      name: 'Full month date with year',
      input: 'Concert on January 15, 2025 at the venue',
      expected: { day: 15, month: 1, year: 2025 },
      confidence: 0.85
    },
    {
      name: 'Abbreviated month date',
      input: 'Show starts Jan 20 at 8PM',
      expected: { day: 20, month: 1 },
      confidence: 0.8
    },
    {
      name: 'Numeric date format',
      input: 'Event date: 1/15/25',
      expected: { day: 15, month: 1, year: 2025 },
      confidence: 0.7
    },
    {
      name: 'Day of week with date',
      input: 'Friday January 15th performance',
      expected: { day: 15, month: 1, dayOfWeek: 'friday' },
      confidence: 0.85
    },
    {
      name: 'Relative date - tonight',
      input: 'Special show tonight only',
      expected: { relative: true },
      confidence: 0.95
    },
    {
      name: 'OCR artifacts in date',
      input: 'January Il5, 2O25',
      expected: { day: 15, month: 1, year: 2025 },
      confidence: 0.6
    }
  ],

  // Time parsing test cases
  times: [
    {
      name: 'Standard 12-hour format',
      input: 'Show at 8:30 PM',
      expected: { hour: 20, minute: 30, period: 'PM' },
      confidence: 0.9
    },
    {
      name: 'Simple hour format',
      input: 'Concert 8PM doors 7PM',
      expected: [
        { hour: 20, minute: 0, period: 'PM', type: 'show' },
        { hour: 19, minute: 0, period: 'PM', type: 'doors' }
      ],
      confidence: 0.85
    },
    {
      name: '24-hour military time',
      input: 'Event starts 20:30',
      expected: { hour: 20, minute: 30, format: '24-hour' },
      confidence: 0.95
    },
    {
      name: 'Time range',
      input: 'Performance 7:30-10:00 PM',
      expected: {
        type: 'range',
        start: { hour: 19, minute: 30 },
        end: { hour: 22, minute: 0 }
      },
      confidence: 0.8
    },
    {
      name: 'Door time with context',
      input: 'Doors open 7PM show 8PM',
      expected: [
        { hour: 19, minute: 0, type: 'doors' },
        { hour: 20, minute: 0, type: 'show' }
      ],
      confidence: 0.85
    },
    {
      name: 'OCR artifacts in time',
      input: 'Show at 8:3O PM',
      expected: { hour: 20, minute: 30, period: 'PM' },
      confidence: 0.7
    }
  ],

  // Price parsing test cases
  prices: [
    {
      name: 'Simple price',
      input: 'Tickets $25',
      expected: { min: 25, max: 25, currency: 'USD', type: 'single' },
      confidence: 0.9
    },
    {
      name: 'Free event',
      input: 'Admission FREE',
      expected: { min: 0, max: 0, isFree: true, type: 'free' },
      confidence: 0.95
    },
    {
      name: 'Price range',
      input: 'Tickets $20-40',
      expected: { min: 20, max: 40, currency: 'USD', type: 'range' },
      confidence: 0.85
    },
    {
      name: 'Starting price',
      input: 'Starting at $15',
      expected: { min: 15, max: null, modifier: 'starting_at', type: 'starting' },
      confidence: 0.8
    },
    {
      name: 'Tiered pricing',
      input: '$25 General $20 Students',
      expected: [
        { min: 25, max: 25, tier: 'general', type: 'tiered' },
        { min: 20, max: 20, tier: 'student', type: 'tiered' }
      ],
      confidence: 0.8
    },
    {
      name: 'Advance vs door pricing',
      input: '$15 advance $20 door',
      expected: [
        { min: 15, max: 15, timing: 'advance', type: 'timing' },
        { min: 20, max: 20, timing: 'door', type: 'timing' }
      ],
      confidence: 0.8
    },
    {
      name: 'OCR artifacts in price',
      input: 'Tickets $2O.OO',
      expected: { min: 20, max: 20, currency: 'USD' },
      confidence: 0.6
    }
  ],

  // Venue parsing test cases
  venues: [
    {
      name: 'Simple venue with "at"',
      input: 'Concert at The Observatory',
      expected: { name: 'The Observatory', type: 'venue' },
      confidence: 0.9
    },
    {
      name: 'Venue with type',
      input: 'Performance at Madison Square Garden',
      expected: { name: 'Madison Square Garden', type: 'venue' },
      confidence: 0.95
    },
    {
      name: 'Venue type pattern',
      input: 'Live at Blue Note Club',
      expected: { name: 'Blue Note Club', venueType: 'club', type: 'venue' },
      confidence: 0.9
    },
    {
      name: 'Address format',
      input: 'Located at 123 Main Street',
      expected: { name: '123 Main Street', type: 'address' },
      confidence: 0.8
    },
    {
      name: 'City and state',
      input: 'Event in Los Angeles, CA',
      expected: { name: 'Los Angeles, CA', city: 'Los Angeles', state: 'CA', type: 'location' },
      confidence: 0.6
    },
    {
      name: 'OCR artifacts in venue',
      input: 'Show at The 0bservatory',
      expected: { name: 'The Observatory', type: 'venue' },
      confidence: 0.7
    }
  ],

  // Complex multi-field test cases
  complex: [
    {
      name: 'Complete event info',
      input: 'Jazz Concert Friday January 15th 8:00 PM at Blue Note Club Tickets $35 Doors 7:30 PM',
      expected: {
        date: { day: 15, month: 1, dayOfWeek: 'friday' },
        time: { hour: 20, minute: 0, type: 'show' },
        venue: { name: 'Blue Note Club', venueType: 'club' },
        price: { min: 35, max: 35, type: 'single' }
      },
      confidence: 0.85
    },
    {
      name: 'Event with multiple times',
      input: 'Concert January 20 Doors 7PM Show 8PM at The Theater $25-45',
      expected: {
        date: { day: 20, month: 1 },
        times: [
          { hour: 19, minute: 0, type: 'doors' },
          { hour: 20, minute: 0, type: 'show' }
        ],
        venue: { name: 'The Theater', venueType: 'theater' },
        price: { min: 25, max: 45, type: 'range' }
      },
      confidence: 0.8
    },
    {
      name: 'Free event with venue',
      input: 'Art Gallery Opening Tonight 6PM 456 Art Street FREE ADMISSION',
      expected: {
        date: { relative: true },
        time: { hour: 18, minute: 0 },
        venue: { name: '456 Art Street', type: 'address' },
        price: { min: 0, max: 0, isFree: true, type: 'free' }
      },
      confidence: 0.8
    },
    {
      name: 'OCR heavy corruption',
      input: 'C0NCERT Frida7 Januar7 Il5 8:3O PII at The 0bservat0r7 Ticket5 $25.OO',
      expected: {
        date: { day: 15, month: 1, dayOfWeek: 'friday' },
        time: { hour: 20, minute: 30 },
        venue: { name: 'The Observatory' },
        price: { min: 25, max: 25 }
      },
      confidence: 0.6
    }
  ],

  // Edge cases and error scenarios
  edgeCases: [
    {
      name: 'Empty text',
      input: '',
      expected: null,
      confidence: 0
    },
    {
      name: 'Only whitespace',
      input: '   \t\n   ',
      expected: null,
      confidence: 0
    },
    {
      name: 'No parseable content',
      input: 'Random text with no event information whatsoever',
      expected: null,
      confidence: 0.1
    },
    {
      name: 'Mixed languages',
      input: 'Concierto el viernes January 15 8PM',
      expected: {
        date: { day: 15, month: 1 },
        time: { hour: 20, minute: 0 }
      },
      confidence: 0.6
    },
    {
      name: 'Extremely poor OCR',
      input: 'C|||c3rt J4nu4ry Il5 8:3O P||| 4t Th3 0b53rv4t0ry',
      expected: null,
      confidence: 0.3
    },
    {
      name: 'Conflicting information',
      input: 'Event January 15 March 20 8PM 10PM $25 FREE',
      expected: {
        dates: [
          { day: 15, month: 1 },
          { day: 20, month: 3 }
        ],
        times: [
          { hour: 20, minute: 0 },
          { hour: 22, minute: 0 }
        ],
        prices: [
          { min: 25, max: 25 },
          { min: 0, max: 0, isFree: true }
        ]
      },
      confidence: 0.4
    },
    {
      name: 'Very long text',
      input: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' +
             'Concert on January 15th at 8:30 PM at The Observatory. ' +
             'Tickets are $25 for general admission. ' +
             'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' +
             'Ut enim ad minim veniam, quis nostrud exercitation ullamco. ' +
             'Doors open at 7:30 PM. ' +
             'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      expected: {
        date: { day: 15, month: 1 },
        times: [
          { hour: 20, minute: 30, type: 'show' },
          { hour: 19, minute: 30, type: 'doors' }
        ],
        venue: { name: 'The Observatory' },
        price: { min: 25, max: 25 }
      },
      confidence: 0.75
    }
  ],

  // Known venue matching test cases
  knownVenues: [
    {
      name: 'Exact venue match',
      input: 'Concert at Madison Square Garden',
      knownVenues: [
        { name: 'Madison Square Garden', city: 'New York', capacity: 20000 }
      ],
      expected: {
        name: 'Madison Square Garden',
        knownVenue: true,
        city: 'New York',
        capacity: 20000
      },
      confidence: 0.95
    },
    {
      name: 'Fuzzy venue match',
      input: 'Show at Mad Square Garden',
      knownVenues: [
        { name: 'Madison Square Garden', city: 'New York', capacity: 20000 }
      ],
      expected: {
        name: 'Madison Square Garden',
        knownVenue: true,
        similarity: 0.8
      },
      confidence: 0.8
    },
    {
      name: 'Partial venue match',
      input: 'Performance at The Garden',
      knownVenues: [
        { name: 'Madison Square Garden', city: 'New York', capacity: 20000 }
      ],
      expected: {
        name: 'Madison Square Garden',
        knownVenue: true,
        partialMatch: true
      },
      confidence: 0.7
    }
  ]
};

// Additional test utilities
const testUtilities = {
  /**
   * Generate random OCR artifacts
   */
  addOCRArtifacts: (text) => {
    const artifacts = {
      '0': 'O',
      '1': 'I',
      'I': '1',
      'O': '0',
      'l': '1',
      'S': '5'
    };
    
    let corrupted = text;
    for (const [original, artifact] of Object.entries(artifacts)) {
      if (Math.random() < 0.3) { // 30% chance of corruption
        corrupted = corrupted.replace(new RegExp(original, 'g'), artifact);
      }
    }
    
    return corrupted;
  },

  /**
   * Generate test cases with varying OCR quality
   */
  generateQualityVariations: (baseCase) => {
    return [
      { ...baseCase, name: `${baseCase.name} - High Quality`, ocrQuality: 0.95 },
      { 
        ...baseCase, 
        name: `${baseCase.name} - Medium Quality`, 
        input: testUtilities.addOCRArtifacts(baseCase.input),
        ocrQuality: 0.7,
        confidence: baseCase.confidence * 0.8
      },
      { 
        ...baseCase, 
        name: `${baseCase.name} - Low Quality`, 
        input: testUtilities.addOCRArtifacts(testUtilities.addOCRArtifacts(baseCase.input)),
        ocrQuality: 0.4,
        confidence: baseCase.confidence * 0.6
      }
    ];
  },

  /**
   * Generate realistic OCR text samples
   */
  generateRealisticSamples: () => {
    return [
      'C0NCERT TONIGHT 8PII AT THE 0BSERVAT0RY T1CKETS $25',
      'JAZZ SH0W Januar7 Il5 D00RS 7PII SH0W 8PII FREE',
      'THE BLUE N0TE PRESENTS LIVE IIUSIC FEB 2O 9PII $3O',
      'ART GALLERY 0PENING RECEPT10N FRIDA7 6PII FREE ADIISS10N',
      'THEATER PERFORIIANCE SAT 2PII & 8PII T1X $Il5-45',
      'CLUB LUNA DJ SET T0II0RR0W Il0PII C0VER $Il0'
    ];
  },

  /**
   * Create test context with various scenarios
   */
  createTestContext: (scenario) => {
    const contexts = {
      basic: {},
      withKnownVenues: {
        knownVenues: [
          { name: 'The Observatory', city: 'Los Angeles', capacity: 500 },
          { name: 'Blue Note', city: 'New York', capacity: 200 },
          { name: 'Madison Square Garden', city: 'New York', capacity: 20000 }
        ]
      },
      withLocation: {
        expectedLocation: 'Los Angeles'
      },
      withEventType: {
        eventType: 'concert'
      },
      withHistoricalData: {
        historicalAccuracy: 0.85,
        isRecurringEvent: true
      },
      comprehensive: {
        knownVenues: [
          { name: 'The Observatory', city: 'Los Angeles', capacity: 500 },
          { name: 'Blue Note', city: 'New York', capacity: 200 }
        ],
        expectedLocation: 'Los Angeles',
        eventType: 'concert',
        historicalAccuracy: 0.9,
        isRecurringEvent: false
      }
    };
    
    return contexts[scenario] || contexts.basic;
  }
};

module.exports = {
  testCases,
  testUtilities
};