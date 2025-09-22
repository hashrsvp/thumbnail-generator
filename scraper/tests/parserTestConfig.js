/**
 * Event Details Parser Test Configuration
 * Comprehensive test settings for text parsing algorithms
 */

const parserTestConfigurations = {
  // Development environment - Fast testing with verbose output
  development: {
    verbose: true,
    timeout: 10000,
    enableDebugLogs: true,
    testSampleLimit: 5,
    validateIntermediateResults: true,
    showParsingSteps: true
  },

  // CI environment - Reliable testing for automation
  ci: {
    verbose: false,
    timeout: 30000,
    retries: 3,
    testSampleLimit: 20,
    enableBenchmarking: true,
    generateReports: true
  },

  // Production environment - Thorough validation
  production: {
    verbose: true,
    timeout: 60000,
    testSampleLimit: 100,
    requireHighAccuracy: true,
    enableStressTests: true,
    generateDetailedReports: true,
    validateAllEdgeCases: true
  }
};

// Parsing accuracy thresholds by field type
const accuracyThresholds = {
  date: {
    excellent: 95, // Perfect date extraction
    good: 85,      // Minor format variations acceptable
    acceptable: 75, // Basic date recognition
    minThreshold: 60 // Minimum for passing
  },
  time: {
    excellent: 92,
    good: 82,
    acceptable: 70,
    minThreshold: 55
  },
  price: {
    excellent: 90,
    good: 80,
    acceptable: 65,
    minThreshold: 50
  },
  venue: {
    excellent: 85,
    good: 75,
    acceptable: 60,
    minThreshold: 45
  }
};

// Test sample categories with expected patterns
const testSamples = {
  perfectQuality: {
    description: 'High-quality text with clear formatting',
    samples: [
      {
        text: 'Jazz Concert Friday January 15th 8:00 PM at Blue Note Club Tickets $35',
        expected: {
          date: { day: 15, month: 'January', dayOfWeek: 'Friday' },
          time: { hour: 20, minute: 0, period: 'PM' },
          price: { min: 35, currency: '$', type: 'fixed' },
          venue: { name: 'Blue Note Club', type: 'music_venue' }
        },
        expectedAccuracy: 95
      },
      {
        text: 'Comedy Show Saturday Dec 22 7:30PM Madison Square Theater $25-45',
        expected: {
          date: { day: 22, month: 'Dec' },
          time: { hour: 19, minute: 30, period: 'PM' },
          price: { min: 25, max: 45, currency: '$', type: 'range' },
          venue: { name: 'Madison Square Theater', type: 'theater' }
        },
        expectedAccuracy: 92
      }
    ]
  },

  ocrArtifacts: {
    description: 'Text with common OCR character substitution errors',
    samples: [
      {
        text: 'C0ncert Januar7 Il5th 8:3O PII at The 0bservat0r7 Ticket5 $25.OO',
        expected: {
          date: { day: 15, month: 'January' },
          time: { hour: 20, minute: 30, period: 'PM' },
          price: { min: 25, currency: '$', type: 'fixed' },
          venue: { name: 'The Observatory', type: 'music_venue' }
        },
        expectedAccuracy: 75,
        correctionRequired: true
      },
      {
        text: 'Sh0w t0m0rr0w 8PII C0ver $Il0 at CIub Luna',
        expected: {
          date: { relative: 'tomorrow' },
          time: { hour: 20, minute: 0, period: 'PM' },
          price: { min: 10, currency: '$', type: 'cover' },
          venue: { name: 'Club Luna', type: 'nightclub' }
        },
        expectedAccuracy: 65,
        correctionRequired: true
      }
    ]
  },

  complexFormats: {
    description: 'Complex pricing and timing formats',
    samples: [
      {
        text: 'Theater Performance Saturday 2PM & 8PM $15 Students $25 General $35 VIP',
        expected: {
          date: { dayOfWeek: 'Saturday' },
          time: [{ hour: 14, minute: 0 }, { hour: 20, minute: 0 }],
          price: { tier: [{ type: 'Students', price: 15 }, { type: 'General', price: 25 }, { type: 'VIP', price: 35 }] },
          venue: null
        },
        expectedAccuracy: 80
      },
      {
        text: 'Workshop Series March 10-12 Daily 9:00 AM - 5:00 PM Community Center $150',
        expected: {
          date: { startDay: 10, endDay: 12, month: 'March', isRange: true },
          time: { startTime: '9:00 AM', endTime: '5:00 PM', type: 'range' },
          price: { min: 150, currency: '$', type: 'total' },
          venue: { name: 'Community Center', type: 'community' }
        },
        expectedAccuracy: 85
      }
    ]
  },

  edgeCases: {
    description: 'Challenging edge cases and unusual formats',
    samples: [
      {
        text: 'FREE EVENT Tonight 6PM Art Gallery Opening Reception 456 Art Street',
        expected: {
          date: { relative: 'tonight' },
          time: { hour: 18, minute: 0, period: 'PM' },
          price: { isFree: true, min: 0 },
          venue: { name: 'Art Gallery', address: '456 Art Street', type: 'gallery' }
        },
        expectedAccuracy: 70
      },
      {
        text: 'Concert Tickets $20-40 depending on seating February 28 8:30PM',
        expected: {
          date: { day: 28, month: 'February' },
          time: { hour: 20, minute: 30, period: 'PM' },
          price: { min: 20, max: 40, currency: '$', type: 'variable', context: 'seating' },
          venue: null
        },
        expectedAccuracy: 65
      }
    ]
  },

  doorVsShowTimes: {
    description: 'Events with both door and show times',
    samples: [
      {
        text: 'LIVE MUSIC TONIGHT Doors open 7PM Show starts 8PM Cover $10',
        expected: {
          date: { relative: 'tonight' },
          time: { doors: { hour: 19, minute: 0 }, show: { hour: 20, minute: 0 } },
          price: { min: 10, currency: '$', type: 'cover' },
          venue: null
        },
        expectedAccuracy: 80
      }
    ]
  },

  multilingualMixed: {
    description: 'Events with mixed languages or special characters',
    samples: [
      {
        text: 'Fiesta Latina Sábado 9 PM Club Salsa $15 entrada',
        expected: {
          date: { dayOfWeek: 'Saturday' },
          time: { hour: 21, minute: 0, period: 'PM' },
          price: { min: 15, currency: '$', type: 'entrance' },
          venue: { name: 'Club Salsa', type: 'nightclub' }
        },
        expectedAccuracy: 60,
        requiresLanguageDetection: true
      }
    ]
  }
};

// Performance benchmarks
const performanceBenchmarks = {
  parsing: {
    maxTimePerText: 500,    // 500ms maximum per text parsing
    maxMemoryUsage: 50,     // 50MB peak memory usage
    minThroughput: 100      // 100 texts per second minimum
  },
  validation: {
    maxValidationTime: 100, // 100ms for result validation
    maxCrossFieldTime: 200  // 200ms for cross-field validation
  },
  batch: {
    maxBatchTime: 10000,    // 10 seconds for 100 text batch
    maxMemoryGrowth: 0.1    // 10% memory growth during batch
  }
};

// Known venues for testing venue matching
const testKnownVenues = [
  { name: 'Blue Note Club', city: 'New York', type: 'jazz_club', capacity: 200 },
  { name: 'The Observatory', city: 'Los Angeles', type: 'music_venue', capacity: 500 },
  { name: 'Madison Square Theater', city: 'New York', type: 'theater', capacity: 1000 },
  { name: 'Club Luna', city: 'San Francisco', type: 'nightclub', capacity: 150 },
  { name: 'Community Center', city: 'Various', type: 'community', capacity: 300 },
  { name: 'Art Gallery', city: 'Downtown', type: 'gallery', capacity: 100 }
];

// Confidence scoring thresholds
const confidenceThresholds = {
  high: 0.85,     // High confidence - can be used directly
  medium: 0.65,   // Medium confidence - may need review
  low: 0.45,      // Low confidence - requires manual verification
  veryLow: 0.25   // Very low confidence - likely parsing error
};

// Test grading system
const gradingSystem = {
  A: { min: 90, description: 'Excellent - Exceeds expectations' },
  B: { min: 80, description: 'Good - Meets requirements well' },
  C: { min: 70, description: 'Acceptable - Meets minimum requirements' },
  D: { min: 60, description: 'Poor - Below expectations' },
  F: { min: 0,  description: 'Failing - Does not meet requirements' }
};

// Hash app compliance requirements
const hashRequirements = {
  minimumAccuracy: 75,           // 75% minimum parsing accuracy
  maximumProcessingTime: 1000,   // 1 second timeout per text
  requiredFields: ['date'],      // Date is mandatory
  preferredFields: ['date', 'time', 'venue'], // Preferred complete set
  addressFormat: 'comma_required', // Venues should have address with comma
  priceFormat: 'currency_symbol'   // Prices should include currency symbol
};

module.exports = {
  parserTestConfigurations,
  accuracyThresholds,
  testSamples,
  performanceBenchmarks,
  testKnownVenues,
  confidenceThresholds,
  gradingSystem,
  hashRequirements
};