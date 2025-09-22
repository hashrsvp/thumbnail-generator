/**
 * Unit Tests for Event Details Parser Components
 * Comprehensive testing of individual parser modules
 */

const { EventDetailsParser } = require('../src/parsing/index');
const { testSamples, accuracyThresholds, testKnownVenues } = require('./parserTestConfig');
const chalk = require('chalk');

class ParserUnitTests {
  constructor(config = {}) {
    this.config = {
      verbose: false,
      timeout: 10000,
      showFailureDetails: true,
      ...config
    };

    this.parser = new EventDetailsParser({
      minConfidence: 0.4,
      enableFuzzyMatching: true,
      enableSpellCorrection: true
    });

    this.results = {
      dateParser: { passed: 0, failed: 0, tests: [] },
      timeParser: { passed: 0, failed: 0, tests: [] },
      priceParser: { passed: 0, failed: 0, tests: [] },
      venueParser: { passed: 0, failed: 0, tests: [] },
      overall: { passed: 0, failed: 0, accuracy: 0 }
    };
  }

  /**
   * Run all unit tests for parser components
   */
  async runAllTests() {
    console.log(chalk.blue('\n🧪 PARSER UNIT TESTS STARTING\n'));
    console.log('=' .repeat(80));

    try {
      await this.testDateParser();
      await this.testTimeParser();
      await this.testPriceParser();
      await this.testVenueParser();
      await this.testTextProcessor();
      await this.testConfidenceScorer();

      this.generateSummary();
      return this.results;
    } catch (error) {
      console.error(chalk.red(`❌ Unit test execution failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * Test Date Parser Component
   */
  async testDateParser() {
    console.log(chalk.yellow('\n📅 Testing Date Parser'));
    console.log('-'.repeat(40));

    const dateTests = [
      // Basic date formats
      { input: 'January 15th 2024', expected: { day: 15, month: 'January', year: 2024 } },
      { input: 'Dec 22', expected: { day: 22, month: 'Dec' } },
      { input: '03/15/2024', expected: { day: 15, month: 3, year: 2024 } },
      { input: '2024-01-15', expected: { day: 15, month: 1, year: 2024 } },
      
      // Relative dates
      { input: 'Tonight', expected: { relative: 'tonight' } },
      { input: 'Tomorrow', expected: { relative: 'tomorrow' } },
      { input: 'This Friday', expected: { relative: 'this', dayOfWeek: 'Friday' } },
      { input: 'Next Saturday', expected: { relative: 'next', dayOfWeek: 'Saturday' } },
      
      // Day of week with dates
      { input: 'Friday January 15th', expected: { day: 15, month: 'January', dayOfWeek: 'Friday' } },
      { input: 'Saturday Dec 22nd', expected: { day: 22, month: 'Dec', dayOfWeek: 'Saturday' } },
      
      // Date ranges
      { input: 'March 10-12', expected: { startDay: 10, endDay: 12, month: 'March', isRange: true } },
      { input: 'Jan 5th - 7th', expected: { startDay: 5, endDay: 7, month: 'Jan', isRange: true } },
      
      // OCR artifacts
      { input: 'Januar7 Il5th', expected: { day: 15, month: 'January' }, requiresCorrection: true },
      { input: 'Deceml3er 22', expected: { day: 22, month: 'December' }, requiresCorrection: true }
    ];

    for (const test of dateTests) {
      await this.runDateTest(test);
    }
  }

  async runDateTest(test) {
    try {
      const result = this.parser.parseField(test.input, 'date');
      const accuracy = this.calculateDateAccuracy(result, test.expected);
      
      const passed = accuracy >= accuracyThresholds.date.minThreshold;
      this.recordTestResult('dateParser', {
        input: test.input,
        expected: test.expected,
        actual: result,
        accuracy,
        passed,
        requiresCorrection: test.requiresCorrection || false
      });

      if (this.config.verbose) {
        const status = passed ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
        console.log(`${status} "${test.input}" - Accuracy: ${accuracy.toFixed(1)}%`);
        if (!passed && this.config.showFailureDetails) {
          console.log(`  Expected: ${JSON.stringify(test.expected)}`);
          console.log(`  Actual: ${JSON.stringify(result)}`);
        }
      }
    } catch (error) {
      this.recordTestResult('dateParser', {
        input: test.input,
        expected: test.expected,
        actual: null,
        accuracy: 0,
        passed: false,
        error: error.message
      });
    }
  }

  /**
   * Test Time Parser Component
   */
  async testTimeParser() {
    console.log(chalk.yellow('\n⏰ Testing Time Parser'));
    console.log('-'.repeat(40));

    const timeTests = [
      // Basic time formats
      { input: '8:00 PM', expected: { hour: 20, minute: 0, period: 'PM' } },
      { input: '7:30AM', expected: { hour: 7, minute: 30, period: 'AM' } },
      { input: '21:30', expected: { hour: 21, minute: 30, format: '24h' } },
      { input: '9PM', expected: { hour: 21, minute: 0, period: 'PM' } },
      
      // Time ranges
      { input: '9:00 AM - 5:00 PM', expected: { startHour: 9, startMinute: 0, endHour: 17, endMinute: 0, type: 'range' } },
      { input: '7-11PM', expected: { startHour: 19, startMinute: 0, endHour: 23, endMinute: 0, type: 'range' } },
      
      // Door vs show times
      { input: 'Doors 7PM Show 8PM', expected: { doors: { hour: 19, minute: 0 }, show: { hour: 20, minute: 0 } } },
      { input: 'Doors open 7:30 Show starts 8:30', expected: { doors: { hour: 19, minute: 30 }, show: { hour: 20, minute: 30 } } },
      
      // Multiple showtimes
      { input: '2PM & 8PM', expected: [{ hour: 14, minute: 0 }, { hour: 20, minute: 0 }] },
      { input: '7PM, 9PM, 11PM', expected: [{ hour: 19, minute: 0 }, { hour: 21, minute: 0 }, { hour: 23, minute: 0 }] },
      
      // OCR artifacts
      { input: '8:3O PII', expected: { hour: 20, minute: 30, period: 'PM' }, requiresCorrection: true },
      { input: 'Il:OO AM', expected: { hour: 11, minute: 0, period: 'AM' }, requiresCorrection: true }
    ];

    for (const test of timeTests) {
      await this.runTimeTest(test);
    }
  }

  async runTimeTest(test) {
    try {
      const result = this.parser.parseField(test.input, 'time');
      const accuracy = this.calculateTimeAccuracy(result, test.expected);
      
      const passed = accuracy >= accuracyThresholds.time.minThreshold;
      this.recordTestResult('timeParser', {
        input: test.input,
        expected: test.expected,
        actual: result,
        accuracy,
        passed,
        requiresCorrection: test.requiresCorrection || false
      });

      if (this.config.verbose) {
        const status = passed ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
        console.log(`${status} "${test.input}" - Accuracy: ${accuracy.toFixed(1)}%`);
      }
    } catch (error) {
      this.recordTestResult('timeParser', {
        input: test.input,
        expected: test.expected,
        actual: null,
        accuracy: 0,
        passed: false,
        error: error.message
      });
    }
  }

  /**
   * Test Price Parser Component
   */
  async testPriceParser() {
    console.log(chalk.yellow('\n💰 Testing Price Parser'));
    console.log('-'.repeat(40));

    const priceTests = [
      // Basic prices
      { input: '$25', expected: { min: 25, currency: '$', type: 'fixed' } },
      { input: '$35.50', expected: { min: 35.50, currency: '$', type: 'fixed' } },
      { input: '€20', expected: { min: 20, currency: '€', type: 'fixed' } },
      
      // Price ranges
      { input: '$20-40', expected: { min: 20, max: 40, currency: '$', type: 'range' } },
      { input: '$25 - $35', expected: { min: 25, max: 35, currency: '$', type: 'range' } },
      
      // Free events
      { input: 'FREE', expected: { isFree: true, min: 0 } },
      { input: 'Free Admission', expected: { isFree: true, min: 0 } },
      { input: 'No Cover', expected: { isFree: true, min: 0, type: 'no_cover' } },
      
      // Tiered pricing
      { input: '$15 Students $25 General', expected: { tier: [{ type: 'Students', price: 15 }, { type: 'General', price: 25 }] } },
      { input: '$20 Advance $25 Door', expected: { advance: 20, door: 25, currency: '$' } },
      
      // Cover charges
      { input: 'Cover $10', expected: { min: 10, currency: '$', type: 'cover' } },
      { input: '$5 Cover Charge', expected: { min: 5, currency: '$', type: 'cover' } },
      
      // OCR artifacts
      { input: '$25.OO', expected: { min: 25, currency: '$', type: 'fixed' }, requiresCorrection: true },
      { input: '$Il0', expected: { min: 10, currency: '$', type: 'fixed' }, requiresCorrection: true }
    ];

    for (const test of priceTests) {
      await this.runPriceTest(test);
    }
  }

  async runPriceTest(test) {
    try {
      const result = this.parser.parseField(test.input, 'price');
      const accuracy = this.calculatePriceAccuracy(result, test.expected);
      
      const passed = accuracy >= accuracyThresholds.price.minThreshold;
      this.recordTestResult('priceParser', {
        input: test.input,
        expected: test.expected,
        actual: result,
        accuracy,
        passed,
        requiresCorrection: test.requiresCorrection || false
      });

      if (this.config.verbose) {
        const status = passed ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
        console.log(`${status} "${test.input}" - Accuracy: ${accuracy.toFixed(1)}%`);
      }
    } catch (error) {
      this.recordTestResult('priceParser', {
        input: test.input,
        expected: test.expected,
        actual: null,
        accuracy: 0,
        passed: false,
        error: error.message
      });
    }
  }

  /**
   * Test Venue Parser Component
   */
  async testVenueParser() {
    console.log(chalk.yellow('\n🏢 Testing Venue Parser'));
    console.log('-'.repeat(40));

    const venueTests = [
      // Basic venue names
      { input: 'Blue Note Club', expected: { name: 'Blue Note Club', type: 'nightclub' } },
      { input: 'Madison Square Theater', expected: { name: 'Madison Square Theater', type: 'theater' } },
      { input: 'The Observatory', expected: { name: 'The Observatory', type: 'music_venue' } },
      
      // Venues with addresses
      { input: '456 Art Street', expected: { address: '456 Art Street', type: 'address' } },
      { input: 'Community Center Downtown', expected: { name: 'Community Center', location: 'Downtown' } },
      { input: 'Club Luna San Francisco', expected: { name: 'Club Luna', city: 'San Francisco' } },
      
      // Venue types
      { input: 'Jazz Club', expected: { type: 'jazz_club' } },
      { input: 'Art Gallery', expected: { type: 'gallery' } },
      { input: 'Concert Hall', expected: { type: 'concert_hall' } },
      
      // Known venues (with context)
      { input: 'Blue Note', expected: { name: 'Blue Note Club', knownVenue: true }, useContext: true },
      { input: 'Observatory', expected: { name: 'The Observatory', knownVenue: true }, useContext: true },
      
      // OCR artifacts
      { input: 'CIub Luna', expected: { name: 'Club Luna', type: 'nightclub' }, requiresCorrection: true },
      { input: '0bservat0r7', expected: { name: 'Observatory', type: 'music_venue' }, requiresCorrection: true }
    ];

    for (const test of venueTests) {
      await this.runVenueTest(test);
    }
  }

  async runVenueTest(test) {
    try {
      const context = test.useContext ? { knownVenues: testKnownVenues } : {};
      const result = this.parser.parseField(test.input, 'venue', context);
      const accuracy = this.calculateVenueAccuracy(result, test.expected);
      
      const passed = accuracy >= accuracyThresholds.venue.minThreshold;
      this.recordTestResult('venueParser', {
        input: test.input,
        expected: test.expected,
        actual: result,
        accuracy,
        passed,
        requiresCorrection: test.requiresCorrection || false,
        usedContext: test.useContext || false
      });

      if (this.config.verbose) {
        const status = passed ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
        const contextNote = test.useContext ? ' (with context)' : '';
        console.log(`${status} "${test.input}"${contextNote} - Accuracy: ${accuracy.toFixed(1)}%`);
      }
    } catch (error) {
      this.recordTestResult('venueParser', {
        input: test.input,
        expected: test.expected,
        actual: null,
        accuracy: 0,
        passed: false,
        error: error.message
      });
    }
  }

  /**
   * Test Text Processor Component
   */
  async testTextProcessor() {
    console.log(chalk.yellow('\n📝 Testing Text Processor'));
    console.log('-'.repeat(40));

    const textProcessorTests = [
      {
        input: '  Extra   spaces   everywhere  ',
        expectedCleaning: 'Extra spaces everywhere',
        operation: 'normalize_whitespace'
      },
      {
        input: 'C0ncert Januar7 Il5th',
        expectedCleaning: 'Concert January 15th',
        operation: 'ocr_correction'
      },
      {
        input: 'MiXeD cAsE eVeNt',
        expectedCleaning: 'mixed case event',
        operation: 'normalize_case'
      }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of textProcessorTests) {
      try {
        // Test text preprocessing
        const processed = this.parser.textProcessor.preprocess(test.input);
        const similarity = this.calculateStringSimilarity(processed.cleaned, test.expectedCleaning);
        
        if (similarity >= 0.8) {
          passed++;
          if (this.config.verbose) {
            console.log(chalk.green(`✅ PASS ${test.operation}: "${test.input}" → "${processed.cleaned}"`));
          }
        } else {
          failed++;
          if (this.config.verbose) {
            console.log(chalk.red(`❌ FAIL ${test.operation}: "${test.input}" → "${processed.cleaned}"`));
            console.log(`  Expected: "${test.expectedCleaning}"`);
          }
        }
      } catch (error) {
        failed++;
        console.log(chalk.red(`❌ ERROR ${test.operation}: ${error.message}`));
      }
    }

    this.results.textProcessor = { passed, failed, tests: textProcessorTests };
  }

  /**
   * Test Confidence Scorer Component
   */
  async testConfidenceScorer() {
    console.log(chalk.yellow('\n🎯 Testing Confidence Scorer'));
    console.log('-'.repeat(40));

    const confidenceTests = [
      {
        results: {
          dates: [{ value: 'January 15', confidence: 0.9 }],
          times: [{ value: '8:00 PM', confidence: 0.85 }],
          prices: [{ value: '$25', confidence: 0.8 }],
          venues: [{ value: 'Blue Note Club', confidence: 0.9 }]
        },
        expectedRange: { min: 0.8, max: 0.95 }
      },
      {
        results: {
          dates: [{ value: 'Januar7 Il5', confidence: 0.6 }],
          times: [{ value: '8:3O PII', confidence: 0.5 }],
          prices: [],
          venues: [{ value: 'CIub Luna', confidence: 0.4 }]
        },
        expectedRange: { min: 0.3, max: 0.7 }
      }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of confidenceTests) {
      try {
        const scoredResults = this.parser.confidenceScorer.scoreResults(
          test.results,
          'sample text',
          {}
        );

        // Calculate overall confidence
        const overallConfidence = this.calculateOverallTestConfidence(scoredResults);
        
        if (overallConfidence >= test.expectedRange.min && overallConfidence <= test.expectedRange.max) {
          passed++;
          if (this.config.verbose) {
            console.log(chalk.green(`✅ PASS Confidence scoring: ${overallConfidence.toFixed(3)}`));
          }
        } else {
          failed++;
          if (this.config.verbose) {
            console.log(chalk.red(`❌ FAIL Confidence scoring: ${overallConfidence.toFixed(3)}`));
            console.log(`  Expected range: ${test.expectedRange.min} - ${test.expectedRange.max}`);
          }
        }
      } catch (error) {
        failed++;
        console.log(chalk.red(`❌ ERROR Confidence scoring: ${error.message}`));
      }
    }

    this.results.confidenceScorer = { passed, failed, tests: confidenceTests };
  }

  // Accuracy calculation methods
  calculateDateAccuracy(actual, expected) {
    if (!actual || actual.length === 0) return 0;
    
    let score = 0;
    const actualDate = actual[0] || actual;
    
    if (expected.day && actualDate.day === expected.day) score += 30;
    if (expected.month && actualDate.month === expected.month) score += 30;
    if (expected.year && actualDate.year === expected.year) score += 20;
    if (expected.dayOfWeek && actualDate.dayOfWeek === expected.dayOfWeek) score += 10;
    if (expected.relative && actualDate.relative === expected.relative) score += 10;
    
    return Math.min(score, 100);
  }

  calculateTimeAccuracy(actual, expected) {
    if (!actual || actual.length === 0) return 0;
    
    let score = 0;
    const actualTime = actual[0] || actual;
    
    if (expected.hour !== undefined && actualTime.hour === expected.hour) score += 50;
    if (expected.minute !== undefined && actualTime.minute === expected.minute) score += 30;
    if (expected.period && actualTime.period === expected.period) score += 20;
    
    return Math.min(score, 100);
  }

  calculatePriceAccuracy(actual, expected) {
    if (!actual || actual.length === 0) return 0;
    
    let score = 0;
    const actualPrice = actual[0] || actual;
    
    if (expected.min !== undefined && actualPrice.min === expected.min) score += 40;
    if (expected.max !== undefined && actualPrice.max === expected.max) score += 30;
    if (expected.currency && actualPrice.currency === expected.currency) score += 20;
    if (expected.isFree !== undefined && actualPrice.isFree === expected.isFree) score += 10;
    
    return Math.min(score, 100);
  }

  calculateVenueAccuracy(actual, expected) {
    if (!actual || actual.length === 0) return 0;
    
    let score = 0;
    const actualVenue = actual[0] || actual;
    
    if (expected.name && actualVenue.name === expected.name) score += 50;
    if (expected.type && actualVenue.type === expected.type) score += 30;
    if (expected.knownVenue && actualVenue.knownVenue) score += 20;
    
    return Math.min(score, 100);
  }

  calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;
    
    const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    return 1 - (distance / maxLength);
  }

  levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  calculateOverallTestConfidence(scoredResults) {
    const confidences = [];
    
    for (const [fieldType, matches] of Object.entries(scoredResults)) {
      if (matches && matches.length > 0) {
        confidences.push(matches[0].confidence);
      }
    }
    
    return confidences.length > 0 ? confidences.reduce((a, b) => a + b) / confidences.length : 0;
  }

  recordTestResult(component, result) {
    this.results[component].tests.push(result);
    if (result.passed) {
      this.results[component].passed++;
      this.results.overall.passed++;
    } else {
      this.results[component].failed++;
      this.results.overall.failed++;
    }
  }

  generateSummary() {
    console.log(chalk.blue('\n📊 UNIT TEST SUMMARY\n'));
    console.log('=' .repeat(60));

    const components = ['dateParser', 'timeParser', 'priceParser', 'venueParser'];
    
    components.forEach(component => {
      const result = this.results[component];
      const total = result.passed + result.failed;
      const accuracy = total > 0 ? (result.passed / total * 100) : 0;
      
      const status = accuracy >= 80 ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
      console.log(`${status} ${component}: ${result.passed}/${total} (${accuracy.toFixed(1)}%)`);
    });

    const totalTests = this.results.overall.passed + this.results.overall.failed;
    const overallAccuracy = totalTests > 0 ? (this.results.overall.passed / totalTests * 100) : 0;
    
    console.log('\n' + '='.repeat(60));
    const overallStatus = overallAccuracy >= 80 ? chalk.green('✅ OVERALL PASS') : chalk.red('❌ OVERALL FAIL');
    console.log(`${overallStatus}: ${this.results.overall.passed}/${totalTests} (${overallAccuracy.toFixed(1)}%)`);
    
    this.results.overall.accuracy = overallAccuracy;
  }
}

module.exports = { ParserUnitTests };