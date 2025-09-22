/**
 * Comprehensive Test Suite for Event Details Parser
 * Tests all parsing functionality with various scenarios and edge cases
 */

const { EventDetailsParser } = require('../../src/parsing/index');
const { DateParser } = require('../../src/parsing/date-parser');
const { TimeParser } = require('../../src/parsing/time-parser');
const { PriceParser } = require('../../src/parsing/price-parser');
const { VenueParser } = require('../../src/parsing/venue-parser');
const { TextProcessor } = require('../../src/parsing/text-processor');
const { ConfidenceScorer } = require('../../src/parsing/confidence-scorer');
const { testCases, testUtilities } = require('./test-data');

describe('Event Details Parser', () => {
  let parser;
  
  beforeEach(() => {
    parser = new EventDetailsParser({
      minConfidence: 0.5,
      enableFuzzyMatching: true,
      enableSpellCorrection: true
    });
  });

  describe('Main Parser Integration', () => {
    test('should parse complete event information', () => {
      const text = 'Jazz Concert Friday January 15th 8:00 PM at Blue Note Club Tickets $35 Doors 7:30 PM';
      const result = parser.parse(text);
      
      expect(result.success).toBe(true);
      expect(result.data.date).toBeTruthy();
      expect(result.data.time).toBeTruthy();
      expect(result.data.venue).toBeTruthy();
      expect(result.data.price).toBeTruthy();
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test('should handle empty or invalid input', () => {
      const result = parser.parse('');
      
      expect(result.success).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.data.date).toBeNull();
    });

    test('should handle OCR artifacts', () => {
      const text = 'C0NCERT Januar7 Il5 8:3O PII at The 0bservat0r7 Ticket5 $25.OO';
      const result = parser.parse(text);
      
      expect(result.success).toBe(true);
      expect(result.data.date).toBeTruthy();
      expect(result.data.time).toBeTruthy();
      expect(result.data.venue).toBeTruthy();
      expect(result.data.price).toBeTruthy();
    });

    test('should provide validation results', () => {
      const text = 'Concert January 15th 8PM at The Observatory $25';
      const result = parser.parse(text);
      const validation = parser.validate(result);
      
      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
      expect(validation.confidence).toBe(result.confidence);
    });

    test('should handle conflicting information', () => {
      const text = 'Event January 15 March 20 8PM 10PM $25 FREE';
      const result = parser.parse(text);
      
      expect(result.success).toBe(true);
      expect(result.metadata.alternativeMatches).toBeDefined();
      expect(Object.keys(result.metadata.alternativeMatches).length).toBeGreaterThan(0);
    });
  });

  describe('Date Parser', () => {
    let dateParser;
    
    beforeEach(() => {
      dateParser = new DateParser();
    });

    testCases.dates.forEach((testCase) => {
      test(`should parse ${testCase.name}`, () => {
        const processedText = { cleaned: testCase.input };
        const results = dateParser.extract(processedText);
        
        expect(results).toHaveLength(1);
        const result = results[0];
        
        if (testCase.expected.day) {
          expect(result.day).toBe(testCase.expected.day);
        }
        if (testCase.expected.month) {
          expect(result.month).toBe(testCase.expected.month);
        }
        if (testCase.expected.year) {
          expect(result.year).toBe(testCase.expected.year);
        }
        if (testCase.expected.relative) {
          expect(result.relative).toBe(true);
        }
        
        expect(result.confidence).toBeGreaterThan(0.3);
      });
    });

    test('should handle multiple date formats in same text', () => {
      const text = 'Event on January 15, 2025 or 1/15/25';
      const processedText = { cleaned: text };
      const results = dateParser.extract(processedText);
      
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].confidence).toBeGreaterThan(0.5);
    });

    test('should reject invalid dates', () => {
      const text = 'Event on February 30, 2025';
      const processedText = { cleaned: text };
      const results = dateParser.extract(processedText);
      
      expect(results).toHaveLength(0);
    });

    test('should handle relative dates correctly', () => {
      const text = 'Concert tonight at 8PM';
      const processedText = { cleaned: text };
      const results = dateParser.extract(processedText);
      
      expect(results).toHaveLength(1);
      expect(results[0].relative).toBe(true);
      expect(results[0].confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Time Parser', () => {
    let timeParser;
    
    beforeEach(() => {
      timeParser = new TimeParser();
    });

    testCases.times.forEach((testCase) => {
      test(`should parse ${testCase.name}`, () => {
        const processedText = { cleaned: testCase.input };
        const results = timeParser.extract(processedText);
        
        expect(results.length).toBeGreaterThanOrEqual(1);
        
        if (Array.isArray(testCase.expected)) {
          expect(results.length).toBe(testCase.expected.length);
          testCase.expected.forEach((expected, index) => {
            if (expected.hour !== undefined) {
              expect(results[index].hour).toBe(expected.hour);
            }
            if (expected.minute !== undefined) {
              expect(results[index].minute).toBe(expected.minute);
            }
            if (expected.type) {
              expect(results[index].type).toBe(expected.type);
            }
          });
        } else {
          const result = results[0];
          if (testCase.expected.hour !== undefined) {
            expect(result.hour || result.start?.hour).toBe(testCase.expected.hour);
          }
          if (testCase.expected.minute !== undefined) {
            expect(result.minute || result.start?.minute).toBe(testCase.expected.minute);
          }
          if (testCase.expected.type) {
            expect(result.type).toBe(testCase.expected.type);
          }
        }
        
        expect(results[0].confidence).toBeGreaterThan(0.3);
      });
    });

    test('should handle 24-hour format', () => {
      const text = 'Event starts 20:30';
      const processedText = { cleaned: text };
      const results = timeParser.extract(processedText);
      
      expect(results).toHaveLength(1);
      expect(results[0].hour).toBe(20);
      expect(results[0].minute).toBe(30);
      expect(results[0].format).toBe('24-hour');
    });

    test('should distinguish door and show times', () => {
      const text = 'Doors 7PM Show 8PM';
      const processedText = { cleaned: text };
      const results = timeParser.extract(processedText);
      
      expect(results).toHaveLength(2);
      const doorTime = results.find(r => r.type === 'doors');
      const showTime = results.find(r => r.type === 'show');
      
      expect(doorTime).toBeTruthy();
      expect(showTime).toBeTruthy();
      expect(doorTime.hour).toBe(19);
      expect(showTime.hour).toBe(20);
    });

    test('should handle time ranges', () => {
      const text = 'Performance 7:30-10:00 PM';
      const processedText = { cleaned: text };
      const results = timeParser.extract(processedText);
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('range');
      expect(results[0].start.hour).toBe(19);
      expect(results[0].end.hour).toBe(22);
    });
  });

  describe('Price Parser', () => {
    let priceParser;
    
    beforeEach(() => {
      priceParser = new PriceParser();
    });

    testCases.prices.forEach((testCase) => {
      test(`should parse ${testCase.name}`, () => {
        const processedText = { cleaned: testCase.input };
        const results = priceParser.extract(processedText);
        
        if (Array.isArray(testCase.expected)) {
          expect(results.length).toBe(testCase.expected.length);
          testCase.expected.forEach((expected, index) => {
            expect(results[index].min).toBe(expected.min);
            expect(results[index].max).toBe(expected.max);
            if (expected.type) {
              expect(results[index].type).toBe(expected.type);
            }
          });
        } else {
          expect(results).toHaveLength(1);
          const result = results[0];
          
          expect(result.min).toBe(testCase.expected.min);
          expect(result.max).toBe(testCase.expected.max);
          if (testCase.expected.isFree) {
            expect(result.isFree).toBe(true);
          }
          if (testCase.expected.type) {
            expect(result.type).toBe(testCase.expected.type);
          }
        }
        
        expect(results[0].confidence).toBeGreaterThan(0.3);
      });
    });

    test('should handle free events', () => {
      const text = 'Admission FREE no charge';
      const processedText = { cleaned: text };
      const results = priceParser.extract(processedText);
      
      expect(results.length).toBeGreaterThanOrEqual(1);
      const freeResult = results.find(r => r.isFree);
      expect(freeResult).toBeTruthy();
      expect(freeResult.min).toBe(0);
      expect(freeResult.max).toBe(0);
      expect(freeResult.confidence).toBeGreaterThan(0.8);
    });

    test('should handle price ranges', () => {
      const text = 'Tickets $20-40';
      const processedText = { cleaned: text };
      const results = priceParser.extract(processedText);
      
      expect(results).toHaveLength(1);
      expect(results[0].min).toBe(20);
      expect(results[0].max).toBe(40);
      expect(results[0].type).toBe('range');
    });

    test('should handle tiered pricing', () => {
      const text = '$25 General $20 Students $50 VIP';
      const processedText = { cleaned: text };
      const results = priceParser.extract(processedText);
      
      expect(results.length).toBeGreaterThanOrEqual(2);
      const generalPrice = results.find(r => r.tier === 'general');
      const studentPrice = results.find(r => r.tier === 'student');
      
      expect(generalPrice).toBeTruthy();
      expect(studentPrice).toBeTruthy();
    });
  });

  describe('Venue Parser', () => {
    let venueParser;
    
    beforeEach(() => {
      venueParser = new VenueParser();
    });

    testCases.venues.forEach((testCase) => {
      test(`should parse ${testCase.name}`, () => {
        const processedText = { cleaned: testCase.input };
        const results = venueParser.extract(processedText);
        
        expect(results.length).toBeGreaterThanOrEqual(1);
        const result = results[0];
        
        expect(result.name).toContain(testCase.expected.name.replace('The ', ''));
        expect(result.type).toBe(testCase.expected.type);
        
        if (testCase.expected.venueType) {
          expect(result.venueType).toBe(testCase.expected.venueType);
        }
        
        expect(result.confidence).toBeGreaterThan(0.3);
      });
    });

    test('should handle known venues with fuzzy matching', () => {
      const text = 'Concert at Mad Square Garden';
      const processedText = { cleaned: text };
      const knownVenues = [
        { name: 'Madison Square Garden', city: 'New York', capacity: 20000 }
      ];
      const results = venueParser.extract(processedText, { knownVenues });
      
      expect(results.length).toBeGreaterThanOrEqual(1);
      const fuzzyMatch = results.find(r => r.knownVenue);
      expect(fuzzyMatch).toBeTruthy();
      expect(fuzzyMatch.name).toBe('Madison Square Garden');
    });

    test('should extract addresses', () => {
      const text = 'Located at 123 Main Street';
      const processedText = { cleaned: text };
      const results = venueParser.extract(processedText);
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('address');
      expect(results[0].name).toContain('123 Main Street');
    });

    test('should identify venue types', () => {
      const text = 'Live at Blue Note Club';
      const processedText = { cleaned: text };
      const results = venueParser.extract(processedText);
      
      expect(results).toHaveLength(1);
      expect(results[0].venueType).toBe('club');
      expect(results[0].name).toContain('Blue Note Club');
    });
  });

  describe('Text Processor', () => {
    let processor;
    
    beforeEach(() => {
      processor = new TextProcessor({
        enableOCRArtifactCorrection: true,
        enableSpellCorrection: true
      });
    });

    test('should clean and normalize text', () => {
      const dirtyText = '  Concert    at   The   Observatory   ';
      const result = processor.preprocess(dirtyText);
      
      expect(result.cleaned).toBe('Concert at The Observatory');
      expect(result.qualityScore).toBeGreaterThan(0.5);
    });

    test('should correct OCR artifacts', () => {
      const corruptedText = 'C0NCERT at The 0bservat0ry Ticket5 $25.OO';
      const result = processor.preprocess(corruptedText);
      
      expect(result.corrections.length).toBeGreaterThan(0);
      expect(result.cleaned).toContain('CONCERT');
      expect(result.cleaned).toContain('Observatory');
      expect(result.cleaned).toContain('TICKETS');
    });

    test('should assess text quality', () => {
      const goodText = 'Concert January 15th 8:00 PM at The Observatory $25';
      const poorText = 'C|||c3rt J4nu4ry Il5 8:3O P||| 4t Th3 0b53rv4t0ry';
      
      const goodResult = processor.preprocess(goodText);
      const poorResult = processor.preprocess(poorText);
      
      expect(goodResult.qualityScore).toBeGreaterThan(poorResult.qualityScore);
      expect(goodResult.qualityScore).toBeGreaterThan(0.8);
      expect(poorResult.qualityScore).toBeLessThan(0.6);
    });

    test('should extract key phrases', () => {
      const text = 'Concert January 15th 8:00 PM at The Observatory $25';
      const phrases = processor.extractKeyPhrases(text);
      
      expect(phrases.length).toBeGreaterThan(0);
      expect(phrases.some(p => p.type === 'date')).toBe(true);
      expect(phrases.some(p => p.type === 'time')).toBe(true);
      expect(phrases.some(p => p.type === 'price')).toBe(true);
    });
  });

  describe('Confidence Scorer', () => {
    let scorer;
    
    beforeEach(() => {
      scorer = new ConfidenceScorer();
    });

    test('should score individual fields correctly', () => {
      const results = {
        dates: [{ parsed: new Date(), confidence: 0.8, patternType: 'fullMonth' }],
        times: [{ hour: 20, minute: 0, confidence: 0.9, patternType: 'standard12' }],
        prices: [{ min: 25, max: 25, confidence: 0.85, patternType: 'single' }],
        venues: [{ name: 'The Observatory', confidence: 0.9, patternType: 'atVenue' }]
      };
      
      const processedText = { cleaned: 'Concert January 15th 8PM at The Observatory $25' };
      const scoredResults = scorer.scoreResults(results, processedText);
      
      expect(scoredResults.dates[0].confidence).toBeGreaterThan(0.5);
      expect(scoredResults.times[0].confidence).toBeGreaterThan(0.5);
      expect(scoredResults.prices[0].confidence).toBeGreaterThan(0.5);
      expect(scoredResults.venues[0].confidence).toBeGreaterThan(0.5);
    });

    test('should apply cross-field validation', () => {
      const results = {
        dates: [{ parsed: new Date(), confidence: 0.8 }],
        times: [
          { hour: 19, minute: 0, confidence: 0.8, type: 'doors' },
          { hour: 20, minute: 0, confidence: 0.8, type: 'show' }
        ]
      };
      
      const processedText = { cleaned: 'Doors 7PM Show 8PM' };
      const scoredResults = scorer.scoreResults(results, processedText);
      
      // Door time before show time should increase confidence
      expect(scoredResults.times[0].confidence).toBeGreaterThan(0.8);
      expect(scoredResults.times[1].confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Complex Integration Tests', () => {
    testCases.complex.forEach((testCase) => {
      test(`should handle ${testCase.name}`, () => {
        const result = parser.parse(testCase.input);
        
        expect(result.success).toBe(true);
        expect(result.confidence).toBeCloseTo(testCase.confidence, 1);
        
        if (testCase.expected.date) {
          expect(result.data.date).toBeTruthy();
        }
        if (testCase.expected.time || testCase.expected.times) {
          expect(result.data.time).toBeTruthy();
        }
        if (testCase.expected.venue) {
          expect(result.data.venue).toBeTruthy();
        }
        if (testCase.expected.price) {
          expect(result.data.price).toBeTruthy();
        }
      });
    });

    test('should handle parser with known venues context', () => {
      const text = 'Concert at Madison Square Garden January 15th 8PM $50';
      const context = testUtilities.createTestContext('withKnownVenues');
      const result = parser.parse(text, context);
      
      expect(result.success).toBe(true);
      expect(result.data.venue.knownVenue).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test('should provide detailed metadata', () => {
      const text = 'Event January 15 March 20 8PM 10PM $25 FREE';
      const result = parser.parse(text);
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata.alternativeMatches).toBeDefined();
      expect(result.metadata.issues).toBeDefined();
      expect(result.metadata.processingTime).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    testCases.edgeCases.forEach((testCase) => {
      test(`should handle ${testCase.name}`, () => {
        const result = parser.parse(testCase.input);
        
        if (testCase.expected === null) {
          expect(result.success).toBe(false);
          expect(result.confidence).toBeLessThan(0.5);
        } else {
          expect(result.confidence).toBeCloseTo(testCase.confidence, 1);
        }
      });
    });

    test('should handle parser exceptions gracefully', () => {
      // Test with malformed input that might cause exceptions
      const malformedInputs = [
        null,
        undefined,
        123,
        {},
        [],
        '\x00\x01\x02'
      ];
      
      malformedInputs.forEach(input => {
        expect(() => {
          const result = parser.parse(input);
          expect(result).toBeDefined();
        }).not.toThrow();
      });
    });

    test('should handle very large input', () => {
      const largeText = 'Concert '.repeat(10000) + 'January 15th 8PM at The Observatory $25';
      const result = parser.parse(largeText);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    test('should parse text within reasonable time', () => {
      const text = 'Jazz Concert Friday January 15th 8:00 PM at Blue Note Club Tickets $35 Doors 7:30 PM';
      
      const startTime = Date.now();
      const result = parser.parse(text);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result.success).toBe(true);
    });

    test('should handle batch processing efficiently', () => {
      const testTexts = testUtilities.generateRealisticSamples();
      
      const startTime = Date.now();
      const results = testTexts.map(text => parser.parse(text));
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // Should complete batch within 5 seconds
      expect(results.every(result => result !== undefined)).toBe(true);
    });
  });

  describe('Field-Specific Parsing', () => {
    test('should parse specific fields when requested', () => {
      const text = 'Concert January 15th 8PM at The Observatory $25';
      
      const dateResult = parser.parseField(text, 'date');
      const timeResult = parser.parseField(text, 'time');
      const priceResult = parser.parseField(text, 'price');
      const venueResult = parser.parseField(text, 'venue');
      
      expect(dateResult.length).toBeGreaterThan(0);
      expect(timeResult.length).toBeGreaterThan(0);
      expect(priceResult.length).toBeGreaterThan(0);
      expect(venueResult.length).toBeGreaterThan(0);
    });

    test('should throw error for unknown field type', () => {
      expect(() => {
        parser.parseField('test', 'unknown');
      }).toThrow('Unknown field type: unknown');
    });
  });
});

// Test utilities for manual testing and debugging
if (require.main === module) {
  // Run some sample tests
  const parser = new EventDetailsParser();
  
  console.log('Running sample parsing tests...\n');
  
  const sampleTexts = [
    'Jazz Concert Friday January 15th 8:00 PM at Blue Note Club Tickets $35 Doors 7:30 PM',
    'C0NCERT Januar7 Il5 8:3O PII at The 0bservat0r7 Ticket5 $25.OO',
    'FREE Art Gallery Opening Tonight 6PM 456 Art Street',
    'Theater Performance Saturday 2PM & 8PM Tickets $15-45'
  ];
  
  sampleTexts.forEach((text, index) => {
    console.log(`Test ${index + 1}: "${text}"`);
    const result = parser.parse(text);
    
    console.log('Result:', {
      success: result.success,
      confidence: result.confidence.toFixed(3),
      date: result.data.date ? {
        day: result.data.date.day,
        month: result.data.date.month,
        year: result.data.date.year
      } : null,
      time: result.data.time ? {
        hour: result.data.time.hour,
        minute: result.data.time.minute,
        type: result.data.time.type
      } : null,
      price: result.data.price ? {
        min: result.data.price.min,
        max: result.data.price.max,
        isFree: result.data.price.isFree
      } : null,
      venue: result.data.venue ? {
        name: result.data.venue.name,
        type: result.data.venue.type
      } : null
    });
    console.log('---\n');
  });
}