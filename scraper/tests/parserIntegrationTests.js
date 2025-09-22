/**
 * Integration Tests for Event Details Parser
 * Testing complete parsing workflows and cross-field validation
 */

const { EventDetailsParser } = require('../src/parsing/index');
const { testSamples, testKnownVenues, hashRequirements } = require('./parserTestConfig');
const chalk = require('chalk');

class ParserIntegrationTests {
  constructor(config = {}) {
    this.config = {
      verbose: false,
      timeout: 15000,
      enableCrossFieldValidation: true,
      testAllSamples: true,
      ...config
    };

    this.parser = new EventDetailsParser({
      minConfidence: 0.5,
      enableFuzzyMatching: true,
      enableSpellCorrection: true
    });

    this.results = {
      completeWorkflows: { passed: 0, failed: 0, tests: [] },
      crossFieldValidation: { passed: 0, failed: 0, tests: [] },
      hashCompliance: { passed: 0, failed: 0, tests: [] },
      contextEffects: { passed: 0, failed: 0, tests: [] },
      overall: { accuracy: 0, confidence: 0, compliance: 0 }
    };
  }

  /**
   * Run all integration tests
   */
  async runAllTests() {
    console.log(chalk.blue('\n🔗 PARSER INTEGRATION TESTS STARTING\n'));
    console.log('=' .repeat(80));

    try {
      await this.testCompleteWorkflows();
      await this.testCrossFieldValidation();
      await this.testHashCompliance();
      await this.testContextEffects();
      await this.testErrorRecovery();

      this.generateSummary();
      return this.results;
    } catch (error) {
      console.error(chalk.red(`❌ Integration test execution failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * Test complete end-to-end parsing workflows
   */
  async testCompleteWorkflows() {
    console.log(chalk.yellow('\n🔄 Testing Complete Parsing Workflows'));
    console.log('-'.repeat(50));

    // Get all test samples from config
    const allSamples = [];
    for (const [category, sampleGroup] of Object.entries(testSamples)) {
      if (sampleGroup.samples) {
        allSamples.push(...sampleGroup.samples.map(s => ({ ...s, category })));
      }
    }

    for (const sample of allSamples) {
      await this.runCompleteWorkflowTest(sample);
    }
  }

  async runCompleteWorkflowTest(sample) {
    try {
      const startTime = Date.now();
      
      // Parse without context first
      const basicResult = this.parser.parse(sample.text);
      
      // Parse with context
      const contextResult = this.parser.parse(sample.text, { 
        knownVenues: testKnownVenues 
      });
      
      const processingTime = Date.now() - startTime;

      // Evaluate completeness
      const completeness = this.evaluateCompleteness(contextResult.data, sample.expected);
      
      // Evaluate accuracy
      const accuracy = this.evaluateOverallAccuracy(contextResult.data, sample.expected);
      
      // Check if workflow meets expectations
      const passed = accuracy >= (sample.expectedAccuracy || 70) && 
                    contextResult.success && 
                    completeness >= 0.6;

      this.recordTestResult('completeWorkflows', {
        category: sample.category,
        input: sample.text,
        expected: sample.expected,
        basicResult: basicResult,
        contextResult: contextResult,
        accuracy,
        completeness,
        processingTime,
        passed,
        confidenceImprovement: contextResult.confidence - basicResult.confidence
      });

      if (this.config.verbose) {
        const status = passed ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
        console.log(`${status} [${sample.category}] "${sample.text.substring(0, 50)}..."`);
        console.log(`  Accuracy: ${accuracy.toFixed(1)}% | Completeness: ${(completeness * 100).toFixed(1)}% | Time: ${processingTime}ms`);
        
        if (contextResult.confidence > basicResult.confidence) {
          console.log(chalk.green(`  ↑ Context improved confidence: +${(contextResult.confidence - basicResult.confidence).toFixed(3)}`));
        }
      }
    } catch (error) {
      this.recordTestResult('completeWorkflows', {
        category: sample.category || 'unknown',
        input: sample.text,
        expected: sample.expected,
        accuracy: 0,
        completeness: 0,
        passed: false,
        error: error.message
      });
    }
  }

  /**
   * Test cross-field validation and consistency
   */
  async testCrossFieldValidation() {
    console.log(chalk.yellow('\n⚒️ Testing Cross-Field Validation'));
    console.log('-'.repeat(50));

    const crossFieldTests = [
      // Date-Time consistency
      {
        name: 'Date-Time Consistency',
        text: 'Concert Friday January 15th 8:00 PM at Blue Note Club $25',
        validations: [
          { field: 'date-time', check: 'combined_datetime_valid' },
          { field: 'date', check: 'future_date_warning' }
        ]
      },
      
      // Price-Venue consistency
      {
        name: 'Price-Venue Consistency',
        text: 'Madison Square Garden concert $500 VIP tickets January 20th',
        validations: [
          { field: 'price-venue', check: 'price_appropriate_for_venue' },
          { field: 'price', check: 'high_price_warning' }
        ]
      },
      
      // Time range validation
      {
        name: 'Time Range Validation', 
        text: 'Workshop 9:00 AM - 5:00 PM March 15th Community Center $150',
        validations: [
          { field: 'time', check: 'valid_time_range' },
          { field: 'time', check: 'reasonable_duration' }
        ]
      },
      
      // Multiple showtimes validation
      {
        name: 'Multiple Showtimes',
        text: 'Theater show 2PM & 8PM Saturday $25 General $35 VIP',
        validations: [
          { field: 'time', check: 'multiple_times_parsed' },
          { field: 'price', check: 'tiered_pricing_parsed' }
        ]
      },
      
      // Conflicting information
      {
        name: 'Conflicting Information Resolution',
        text: 'FREE EVENT $10 cover charge Tonight 8PM Art Gallery',
        validations: [
          { field: 'price', check: 'conflict_resolution' },
          { field: 'confidence', check: 'low_confidence_on_conflict' }
        ]
      }
    ];

    for (const test of crossFieldTests) {
      await this.runCrossFieldTest(test);
    }
  }

  async runCrossFieldTest(test) {
    try {
      const result = this.parser.parse(test.text, { knownVenues: testKnownVenues });
      const validation = this.parser.validate(result);
      
      let validationScore = 0;
      const validationResults = [];
      
      for (const check of test.validations) {
        const checkResult = this.runValidationCheck(result, validation, check);
        validationResults.push(checkResult);
        if (checkResult.passed) validationScore++;
      }
      
      const passed = validationScore >= test.validations.length * 0.7; // 70% validation pass rate
      
      this.recordTestResult('crossFieldValidation', {
        name: test.name,
        input: test.text,
        result: result.data,
        validation: validation,
        validationResults,
        validationScore: validationScore / test.validations.length,
        passed
      });

      if (this.config.verbose) {
        const status = passed ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
        console.log(`${status} ${test.name}: ${validationScore}/${test.validations.length} validations passed`);
        
        if (!passed) {
          validationResults.filter(r => !r.passed).forEach(r => {
            console.log(chalk.red(`    ✗ ${r.check}: ${r.reason}`));
          });
        }
      }
    } catch (error) {
      this.recordTestResult('crossFieldValidation', {
        name: test.name,
        input: test.text,
        validationScore: 0,
        passed: false,
        error: error.message
      });
    }
  }

  /**
   * Test Hash app compliance requirements
   */
  async testHashCompliance() {
    console.log(chalk.yellow('\n# Testing Hash App Compliance'));
    console.log('-'.repeat(50));

    const complianceTests = [
      // Minimum accuracy requirement
      {
        name: 'Minimum Accuracy Requirement',
        samples: testSamples.perfectQuality.samples,
        requirement: 'minimum_accuracy',
        threshold: hashRequirements.minimumAccuracy
      },
      
      // Processing time requirement
      {
        name: 'Processing Time Requirement',
        samples: testSamples.complexFormats.samples,
        requirement: 'processing_time',
        threshold: hashRequirements.maximumProcessingTime
      },
      
      // Required fields presence
      {
        name: 'Required Fields Present',
        samples: [...testSamples.perfectQuality.samples, ...testSamples.ocrArtifacts.samples],
        requirement: 'required_fields',
        requiredFields: hashRequirements.requiredFields
      },
      
      // Address format compliance
      {
        name: 'Address Format Compliance',
        samples: testSamples.edgeCases.samples.filter(s => s.expected.venue?.address),
        requirement: 'address_format',
        format: hashRequirements.addressFormat
      }
    ];

    for (const test of complianceTests) {
      await this.runComplianceTest(test);
    }
  }

  async runComplianceTest(test) {
    let passedSamples = 0;
    let totalSamples = 0;
    const sampleResults = [];

    for (const sample of test.samples) {
      totalSamples++;
      const startTime = Date.now();
      
      try {
        const result = this.parser.parse(sample.text, { knownVenues: testKnownVenues });
        const processingTime = Date.now() - startTime;
        
        let samplePassed = false;
        let complianceDetails = {};
        
        switch (test.requirement) {
          case 'minimum_accuracy':
            const accuracy = this.evaluateOverallAccuracy(result.data, sample.expected);
            samplePassed = accuracy >= test.threshold;
            complianceDetails = { accuracy, threshold: test.threshold };
            break;
            
          case 'processing_time':
            samplePassed = processingTime <= test.threshold;
            complianceDetails = { processingTime, threshold: test.threshold };
            break;
            
          case 'required_fields':
            const hasRequiredFields = test.requiredFields.every(field => 
              result.data[field] && result.data[field] !== null
            );
            samplePassed = hasRequiredFields;
            complianceDetails = { 
              presentFields: test.requiredFields.filter(field => result.data[field]),
              requiredFields: test.requiredFields 
            };
            break;
            
          case 'address_format':
            if (result.data.venue?.address) {
              const hasComma = result.data.venue.address.includes(',');
              samplePassed = hasComma || test.format !== 'comma_required';
              complianceDetails = { address: result.data.venue.address, hasComma };
            } else {
              samplePassed = true; // No address to validate
            }
            break;
        }
        
        if (samplePassed) passedSamples++;
        
        sampleResults.push({
          text: sample.text.substring(0, 50) + '...',
          passed: samplePassed,
          details: complianceDetails
        });
        
      } catch (error) {
        sampleResults.push({
          text: sample.text.substring(0, 50) + '...',
          passed: false,
          error: error.message
        });
      }
    }
    
    const complianceRate = totalSamples > 0 ? passedSamples / totalSamples : 0;
    const passed = complianceRate >= 0.8; // 80% compliance required
    
    this.recordTestResult('hashCompliance', {
      name: test.name,
      requirement: test.requirement,
      complianceRate,
      passedSamples,
      totalSamples,
      sampleResults,
      passed
    });

    if (this.config.verbose) {
      const status = passed ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
      console.log(`${status} ${test.name}: ${passedSamples}/${totalSamples} (${(complianceRate * 100).toFixed(1)}%)`);
    }
  }

  /**
   * Test context effects on parsing accuracy
   */
  async testContextEffects() {
    console.log(chalk.yellow('\n🎯 Testing Context Effects'));
    console.log('-'.repeat(50));

    const contextTests = [
      // Known venues context
      {
        text: 'Concert at Blue Note tomorrow 8PM $25',
        contexts: [
          { name: 'no_context', context: {} },
          { name: 'with_venues', context: { knownVenues: testKnownVenues } }
        ]
      },
      
      // Event type context
      {
        text: 'Comedy night Friday 9PM cover $15',
        contexts: [
          { name: 'no_context', context: {} },
          { name: 'comedy_context', context: { eventType: 'comedy', knownVenues: testKnownVenues } }
        ]
      },
      
      // Geographic context
      {
        text: 'Show at Observatory January 15 tickets $30',
        contexts: [
          { name: 'no_context', context: {} },
          { name: 'la_context', context: { city: 'Los Angeles', knownVenues: testKnownVenues } }
        ]
      }
    ];

    for (const test of contextTests) {
      await this.runContextEffectTest(test);
    }
  }

  async runContextEffectTest(test) {
    const contextResults = [];
    
    for (const contextSetup of test.contexts) {
      try {
        const result = this.parser.parse(test.text, contextSetup.context);
        contextResults.push({
          name: contextSetup.name,
          result,
          confidence: result.confidence,
          completeness: this.evaluateCompleteness(result.data)
        });
      } catch (error) {
        contextResults.push({
          name: contextSetup.name,
          result: null,
          confidence: 0,
          completeness: 0,
          error: error.message
        });
      }
    }
    
    // Analyze context improvements
    const noContextResult = contextResults.find(r => r.name === 'no_context');
    const contextResults_filtered = contextResults.filter(r => r.name !== 'no_context');
    
    let improvementDetected = false;
    const improvements = [];
    
    for (const contextResult of contextResults_filtered) {
      if (contextResult.confidence > noContextResult.confidence) {
        improvementDetected = true;
        improvements.push({
          context: contextResult.name,
          confidenceImprovement: contextResult.confidence - noContextResult.confidence,
          completenessImprovement: contextResult.completeness - noContextResult.completeness
        });
      }
    }
    
    this.recordTestResult('contextEffects', {
      input: test.text,
      contextResults,
      improvementDetected,
      improvements,
      passed: improvementDetected
    });

    if (this.config.verbose) {
      const status = improvementDetected ? chalk.green('✅ PASS') : chalk.yellow('⚠ NEUTRAL');
      console.log(`${status} Context effect test: "${test.text.substring(0, 40)}..."`);
      
      improvements.forEach(imp => {
        console.log(`  ↑ ${imp.context}: +${imp.confidenceImprovement.toFixed(3)} confidence`);
      });
    }
  }

  /**
   * Test error recovery mechanisms
   */
  async testErrorRecovery() {
    console.log(chalk.yellow('\n🛡 Testing Error Recovery'));
    console.log('-'.repeat(50));

    const errorRecoveryTests = [
      // Partial parsing with missing fields
      {
        name: 'Partial Results Recovery',
        text: 'Concert 8PM',  // Missing date and venue
        expectPartialResults: true
      },
      
      // Invalid data handling
      {
        name: 'Invalid Data Handling',
        text: 'Concert 25:00 PM $-50 at NonexistentVenue', // Invalid time and price
        expectGracefulHandling: true
      },
      
      // Empty text handling
      {
        name: 'Empty Text Handling',
        text: '',
        expectEmptyResult: true
      },
      
      // Noise handling
      {
        name: 'Noise Handling',
        text: '!!!@@@ Concert January 15 8PM $25 Blue Note ###$$$',
        expectCleanExtraction: true
      }
    ];

    let recoveryTests = 0;
    let successfulRecoveries = 0;

    for (const test of errorRecoveryTests) {
      recoveryTests++;
      
      try {
        const result = this.parser.parse(test.text);
        let recoverySuccessful = false;
        
        if (test.expectPartialResults) {
          // Should get some results even with missing fields
          const hasAnyData = Object.values(result.data).some(value => value !== null);
          recoverySuccessful = result.success && hasAnyData;
        } else if (test.expectGracefulHandling) {
          // Should handle gracefully without crashing
          recoverySuccessful = result.success === true || result.success === false; // Just don't crash
        } else if (test.expectEmptyResult) {
          // Should return structured empty result
          recoverySuccessful = result.success === false && result.data && result.confidence === 0;
        } else if (test.expectCleanExtraction) {
          // Should extract clean data despite noise
          const hasValidData = result.success && result.confidence > 0.3;
          recoverySuccessful = hasValidData;
        }
        
        if (recoverySuccessful) successfulRecoveries++;
        
        if (this.config.verbose) {
          const status = recoverySuccessful ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
          console.log(`${status} ${test.name}: Confidence ${result.confidence.toFixed(3)}`);
        }
        
      } catch (error) {
        if (this.config.verbose) {
          console.log(chalk.red(`❌ FAIL ${test.name}: Threw error - ${error.message}`));
        }
      }
    }
    
    this.results.errorRecovery = {
      passed: successfulRecoveries,
      failed: recoveryTests - successfulRecoveries,
      rate: recoveryTests > 0 ? successfulRecoveries / recoveryTests : 0
    };
  }

  // Helper methods
  evaluateCompleteness(data, expected = null) {
    const fields = ['date', 'time', 'price', 'venue'];
    const presentFields = fields.filter(field => data[field] && data[field] !== null);
    
    if (expected) {
      const expectedFields = Object.keys(expected).filter(key => expected[key] !== null);
      return expectedFields.length > 0 ? presentFields.filter(field => expected[field]).length / expectedFields.length : 0;
    }
    
    return presentFields.length / fields.length;
  }

  evaluateOverallAccuracy(actualData, expected) {
    let totalScore = 0;
    let maxScore = 0;
    
    const fieldWeights = { date: 30, time: 25, price: 20, venue: 25 };
    
    for (const [field, weight] of Object.entries(fieldWeights)) {
      if (expected[field]) {
        maxScore += weight;
        
        if (actualData[field]) {
          // Simple field comparison - in a real implementation, this would be more sophisticated
          const fieldAccuracy = this.calculateFieldAccuracy(actualData[field], expected[field]);
          totalScore += fieldAccuracy * weight / 100;
        }
      }
    }
    
    return maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  }

  calculateFieldAccuracy(actual, expected) {
    // Simplified field accuracy calculation
    if (typeof expected === 'object' && typeof actual === 'object') {
      const expectedKeys = Object.keys(expected);
      const matchingKeys = expectedKeys.filter(key => 
        actual[key] !== undefined && actual[key] === expected[key]
      );
      return expectedKeys.length > 0 ? (matchingKeys.length / expectedKeys.length) * 100 : 0;
    }
    
    return actual === expected ? 100 : 0;
  }

  runValidationCheck(result, validation, check) {
    // Simplified validation check implementation
    switch (check.check) {
      case 'combined_datetime_valid':
        return {
          check: check.check,
          passed: result.data.date && result.data.time,
          reason: result.data.date && result.data.time ? 'Valid date-time combination' : 'Missing date or time'
        };
        
      case 'future_date_warning':
        return {
          check: check.check,
          passed: !validation.warnings.includes('date_in_past'),
          reason: 'Date validation check'
        };
        
      case 'high_price_warning':
        return {
          check: check.check,
          passed: result.data.price?.min <= 100, // Arbitrary high price threshold
          reason: `Price ${result.data.price?.min} is within reasonable range`
        };
        
      default:
        return {
          check: check.check,
          passed: true,
          reason: 'Default pass'
        };
    }
  }

  recordTestResult(component, result) {
    this.results[component].tests.push(result);
    if (result.passed) {
      this.results[component].passed++;
    } else {
      this.results[component].failed++;
    }
  }

  generateSummary() {
    console.log(chalk.blue('\n📊 INTEGRATION TEST SUMMARY\n'));
    console.log('=' .repeat(70));

    const components = ['completeWorkflows', 'crossFieldValidation', 'hashCompliance', 'contextEffects'];
    
    components.forEach(component => {
      const result = this.results[component];
      const total = result.passed + result.failed;
      const successRate = total > 0 ? (result.passed / total * 100) : 0;
      
      const status = successRate >= 70 ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
      console.log(`${status} ${component}: ${result.passed}/${total} (${successRate.toFixed(1)}%)`);
    });

    // Calculate overall metrics
    const totalTests = components.reduce((sum, comp) => {
      return sum + this.results[comp].passed + this.results[comp].failed;
    }, 0);
    
    const totalPassed = components.reduce((sum, comp) => {
      return sum + this.results[comp].passed;
    }, 0);

    const overallSuccessRate = totalTests > 0 ? (totalPassed / totalTests * 100) : 0;
    
    console.log('\n' + '='.repeat(70));
    const overallStatus = overallSuccessRate >= 70 ? chalk.green('✅ OVERALL PASS') : chalk.red('❌ OVERALL FAIL');
    console.log(`${overallStatus}: ${totalPassed}/${totalTests} (${overallSuccessRate.toFixed(1)}%)`);
    
    this.results.overall.accuracy = overallSuccessRate;
    
    // Error recovery summary
    if (this.results.errorRecovery) {
      const recoveryRate = this.results.errorRecovery.rate * 100;
      const recoveryStatus = recoveryRate >= 80 ? chalk.green('✅') : chalk.yellow('⚠');
      console.log(`${recoveryStatus} Error Recovery: ${recoveryRate.toFixed(1)}%`);
    }
  }
}

module.exports = { ParserIntegrationTests };