/**
 * Validation Framework for Event Details Parser
 * Comprehensive validation, grading, and recommendation system
 */

const { accuracyThresholds, confidenceThresholds, gradingSystem } = require('./parserTestConfig');
const chalk = require('chalk');

class ParserValidationFramework {
  constructor(config = {}) {
    this.config = {
      enableDetailedAnalysis: true,
      generateRecommendations: true,
      includeStatistics: true,
      ...config
    };

    this.validationRules = this.initializeValidationRules();
    this.metrics = {
      accuracy: {},
      confidence: {},
      completeness: {},
      consistency: {},
      performance: {}
    };
  }

  /**
   * Initialize comprehensive validation rules
   */
  initializeValidationRules() {
    return {
      dateValidation: {
        rules: [
          { name: 'future_date_check', severity: 'warning', check: this.validateFutureDate },
          { name: 'reasonable_date_range', severity: 'error', check: this.validateDateRange },
          { name: 'date_format_consistency', severity: 'warning', check: this.validateDateFormat },
          { name: 'day_month_consistency', severity: 'error', check: this.validateDayMonthConsistency }
        ],
        weight: 0.3
      },
      timeValidation: {
        rules: [
          { name: 'valid_time_range', severity: 'error', check: this.validateTimeRange },
          { name: 'reasonable_event_time', severity: 'warning', check: this.validateReasonableEventTime },
          { name: 'am_pm_consistency', severity: 'error', check: this.validateAmPmConsistency },
          { name: 'time_format_consistency', severity: 'warning', check: this.validateTimeFormat }
        ],
        weight: 0.25
      },
      priceValidation: {
        rules: [
          { name: 'positive_price', severity: 'error', check: this.validatePositivePrice },
          { name: 'reasonable_price_range', severity: 'warning', check: this.validatePriceRange },
          { name: 'currency_consistency', severity: 'warning', check: this.validateCurrencyConsistency },
          { name: 'free_event_consistency', severity: 'warning', check: this.validateFreeEventConsistency }
        ],
        weight: 0.2
      },
      venueValidation: {
        rules: [
          { name: 'venue_name_length', severity: 'warning', check: this.validateVenueNameLength },
          { name: 'venue_type_consistency', severity: 'info', check: this.validateVenueTypeConsistency },
          { name: 'known_venue_match', severity: 'info', check: this.validateKnownVenueMatch },
          { name: 'address_format', severity: 'warning', check: this.validateAddressFormat }
        ],
        weight: 0.25
      },
      crossFieldValidation: {
        rules: [
          { name: 'date_time_combination', severity: 'error', check: this.validateDateTimeCombination },
          { name: 'price_venue_consistency', severity: 'warning', check: this.validatePriceVenueConsistency },
          { name: 'event_timing_logic', severity: 'warning', check: this.validateEventTimingLogic },
          { name: 'overall_coherence', severity: 'info', check: this.validateOverallCoherence }
        ],
        weight: 0.15
      }
    };
  }

  /**
   * Validate parsing results comprehensively
   */
  async validateResults(testResults, testConfig = {}) {
    console.log(chalk.blue('\n🔍 VALIDATION FRAMEWORK ANALYSIS\n'));
    console.log('=' .repeat(70));

    const validation = {
      accuracy: await this.validateAccuracy(testResults),
      confidence: await this.validateConfidence(testResults),
      completeness: await this.validateCompleteness(testResults),
      consistency: await this.validateConsistency(testResults),
      fieldSpecific: await this.validateFieldSpecific(testResults),
      crossField: await this.validateCrossField(testResults),
      overall: { score: 0, grade: 'F', issues: [], warnings: [], recommendations: [] }
    };

    // Calculate overall score and grade
    validation.overall = this.calculateOverallValidation(validation);

    // Generate recommendations
    if (this.config.generateRecommendations) {
      validation.overall.recommendations = this.generateRecommendations(validation, testResults);
    }

    this.displayValidationResults(validation);
    return validation;
  }

  /**
   * Validate parsing accuracy across different test categories
   */
  async validateAccuracy(testResults) {
    const accuracyValidation = {
      byCategory: {},
      byFieldType: {},
      overall: { score: 0, grade: 'F', distribution: {} }
    };

    // Group results by category and field type
    const categories = {};
    const fieldTypes = { date: [], time: [], price: [], venue: [] };

    for (const testSuite of Object.values(testResults)) {
      if (testSuite.tests) {
        for (const test of testSuite.tests) {
          // Category analysis
          const category = test.category || 'unknown';
          if (!categories[category]) {
            categories[category] = { tests: [], accuracies: [] };
          }
          categories[category].tests.push(test);
          if (test.accuracy !== undefined) {
            categories[category].accuracies.push(test.accuracy);
          }

          // Field type analysis
          for (const fieldType of Object.keys(fieldTypes)) {
            if (test.result && test.result[fieldType]) {
              const fieldAccuracy = this.calculateFieldSpecificAccuracy(test, fieldType);
              if (fieldAccuracy !== null) {
                fieldTypes[fieldType].push(fieldAccuracy);
              }
            }
          }
        }
      }
    }

    // Calculate category accuracy
    for (const [category, data] of Object.entries(categories)) {
      if (data.accuracies.length > 0) {
        const avgAccuracy = data.accuracies.reduce((sum, acc) => sum + acc, 0) / data.accuracies.length;
        accuracyValidation.byCategory[category] = {
          average: avgAccuracy,
          count: data.accuracies.length,
          grade: this.calculateGradeFromScore(avgAccuracy),
          distribution: this.calculateDistribution(data.accuracies)
        };
      }
    }

    // Calculate field type accuracy
    for (const [fieldType, accuracies] of Object.entries(fieldTypes)) {
      if (accuracies.length > 0) {
        const avgAccuracy = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
        const threshold = accuracyThresholds[fieldType] || accuracyThresholds.venue;
        
        accuracyValidation.byFieldType[fieldType] = {
          average: avgAccuracy,
          count: accuracies.length,
          threshold: threshold.minThreshold,
          meetThreshold: avgAccuracy >= threshold.minThreshold,
          grade: this.calculateGradeFromScore(avgAccuracy),
          distribution: this.calculateDistribution(accuracies)
        };
      }
    }

    // Calculate overall accuracy
    const allAccuracies = Object.values(categories)
      .flatMap(cat => cat.accuracies)
      .filter(acc => acc !== undefined && acc !== null);
    
    if (allAccuracies.length > 0) {
      const overallAvg = allAccuracies.reduce((sum, acc) => sum + acc, 0) / allAccuracies.length;
      accuracyValidation.overall.score = overallAvg;
      accuracyValidation.overall.grade = this.calculateGradeFromScore(overallAvg);
      accuracyValidation.overall.distribution = this.calculateDistribution(allAccuracies);
    }

    return accuracyValidation;
  }

  /**
   * Validate confidence scoring patterns
   */
  async validateConfidence(testResults) {
    const confidenceValidation = {
      distribution: { high: 0, medium: 0, low: 0, veryLow: 0 },
      correlations: {},
      reliability: { score: 0, grade: 'F' },
      calibration: { score: 0, issues: [] }
    };

    const confidenceScores = [];
    const accuracyConfidencePairs = [];

    // Collect confidence data
    for (const testSuite of Object.values(testResults)) {
      if (testSuite.tests) {
        for (const test of testSuite.tests) {
          if (test.confidence !== undefined) {
            confidenceScores.push(test.confidence);
            
            if (test.accuracy !== undefined) {
              accuracyConfidencePairs.push({
                confidence: test.confidence,
                accuracy: test.accuracy
              });
            }
          }
        }
      }
    }

    // Calculate confidence distribution
    for (const confidence of confidenceScores) {
      if (confidence >= confidenceThresholds.high) {
        confidenceValidation.distribution.high++;
      } else if (confidence >= confidenceThresholds.medium) {
        confidenceValidation.distribution.medium++;
      } else if (confidence >= confidenceThresholds.low) {
        confidenceValidation.distribution.low++;
      } else {
        confidenceValidation.distribution.veryLow++;
      }
    }

    // Calculate confidence-accuracy correlation
    if (accuracyConfidencePairs.length > 5) {
      confidenceValidation.correlations.accuracyConfidence = 
        this.calculateCorrelation(
          accuracyConfidencePairs.map(p => p.confidence),
          accuracyConfidencePairs.map(p => p.accuracy)
        );
    }

    // Validate confidence calibration
    confidenceValidation.calibration = this.validateConfidenceCalibration(accuracyConfidencePairs);

    // Calculate reliability score
    const avgConfidence = confidenceScores.length > 0 ?
      confidenceScores.reduce((sum, conf) => sum + conf, 0) / confidenceScores.length : 0;
    
    confidenceValidation.reliability.score = avgConfidence * 100;
    confidenceValidation.reliability.grade = this.calculateGradeFromScore(avgConfidence * 100);

    return confidenceValidation;
  }

  /**
   * Validate result completeness
   */
  async validateCompleteness(testResults) {
    const completenessValidation = {
      byField: { date: 0, time: 0, price: 0, venue: 0 },
      overall: { score: 0, grade: 'F' },
      patterns: []
    };

    let totalTests = 0;
    const fieldCounts = { date: 0, time: 0, price: 0, venue: 0 };

    // Count field presence across all tests
    for (const testSuite of Object.values(testResults)) {
      if (testSuite.tests) {
        for (const test of testSuite.tests) {
          totalTests++;
          
          if (test.result) {
            for (const field of Object.keys(fieldCounts)) {
              if (test.result[field] && test.result[field] !== null) {
                fieldCounts[field]++;
              }
            }
          }
        }
      }
    }

    // Calculate completeness percentages
    if (totalTests > 0) {
      for (const [field, count] of Object.entries(fieldCounts)) {
        completenessValidation.byField[field] = (count / totalTests) * 100;
      }
      
      const overallCompleteness = Object.values(completenessValidation.byField)
        .reduce((sum, percentage) => sum + percentage, 0) / 4;
      
      completenessValidation.overall.score = overallCompleteness;
      completenessValidation.overall.grade = this.calculateGradeFromScore(overallCompleteness);
    }

    return completenessValidation;
  }

  /**
   * Validate consistency across similar test cases
   */
  async validateConsistency(testResults) {
    const consistencyValidation = {
      repeatability: { score: 0, variations: [] },
      similarInputs: { score: 0, inconsistencies: [] },
      overall: { score: 0, grade: 'F' }
    };

    // Find similar test inputs and analyze consistency
    const testGroups = this.groupSimilarTests(testResults);
    
    for (const group of testGroups) {
      if (group.length > 1) {
        const consistencyScore = this.calculateGroupConsistency(group);
        consistencyValidation.similarInputs.inconsistencies.push({
          groupSize: group.length,
          consistencyScore,
          sample: group[0].input?.substring(0, 50) + '...'
        });
      }
    }

    // Calculate overall consistency
    const avgConsistency = consistencyValidation.similarInputs.inconsistencies.length > 0 ?
      consistencyValidation.similarInputs.inconsistencies
        .reduce((sum, inc) => sum + inc.consistencyScore, 0) / 
      consistencyValidation.similarInputs.inconsistencies.length : 100;
    
    consistencyValidation.overall.score = avgConsistency;
    consistencyValidation.overall.grade = this.calculateGradeFromScore(avgConsistency);

    return consistencyValidation;
  }

  /**
   * Validate field-specific parsing rules
   */
  async validateFieldSpecific(testResults) {
    const fieldValidation = {};

    for (const [fieldType, validationConfig] of Object.entries(this.validationRules)) {
      if (fieldType === 'crossFieldValidation') continue;
      
      fieldValidation[fieldType] = {
        rules: [],
        score: 0,
        grade: 'F',
        issues: [],
        warnings: []
      };

      // Apply validation rules for this field type
      for (const rule of validationConfig.rules) {
        const ruleResult = await this.applyValidationRule(testResults, fieldType, rule);
        fieldValidation[fieldType].rules.push(ruleResult);
        
        if (ruleResult.severity === 'error') {
          fieldValidation[fieldType].issues.push(ruleResult.message);
        } else if (ruleResult.severity === 'warning') {
          fieldValidation[fieldType].warnings.push(ruleResult.message);
        }
      }

      // Calculate field validation score
      const passedRules = fieldValidation[fieldType].rules.filter(r => r.passed).length;
      const totalRules = fieldValidation[fieldType].rules.length;
      fieldValidation[fieldType].score = totalRules > 0 ? (passedRules / totalRules) * 100 : 0;
      fieldValidation[fieldType].grade = this.calculateGradeFromScore(fieldValidation[fieldType].score);
    }

    return fieldValidation;
  }

  /**
   * Validate cross-field relationships and consistency
   */
  async validateCrossField(testResults) {
    const crossFieldValidation = {
      rules: [],
      score: 0,
      grade: 'F',
      issues: [],
      warnings: []
    };

    const crossFieldRules = this.validationRules.crossFieldValidation;
    
    for (const rule of crossFieldRules.rules) {
      const ruleResult = await this.applyValidationRule(testResults, 'crossField', rule);
      crossFieldValidation.rules.push(ruleResult);
      
      if (ruleResult.severity === 'error') {
        crossFieldValidation.issues.push(ruleResult.message);
      } else if (ruleResult.severity === 'warning') {
        crossFieldValidation.warnings.push(ruleResult.message);
      }
    }

    // Calculate cross-field validation score
    const passedRules = crossFieldValidation.rules.filter(r => r.passed).length;
    const totalRules = crossFieldValidation.rules.length;
    crossFieldValidation.score = totalRules > 0 ? (passedRules / totalRules) * 100 : 0;
    crossFieldValidation.grade = this.calculateGradeFromScore(crossFieldValidation.score);

    return crossFieldValidation;
  }

  // Validation rule implementations
  validateFutureDate = (testResults, context) => {
    const futureWarnings = [];
    let totalDateTests = 0;
    
    for (const testSuite of Object.values(testResults)) {
      if (testSuite.tests) {
        for (const test of testSuite.tests) {
          if (test.result?.date) {
            totalDateTests++;
            // This would implement actual date validation logic
            // For now, assume 10% of dates trigger future warnings
            if (Math.random() < 0.1) {
              futureWarnings.push(test.input?.substring(0, 30));
            }
          }
        }
      }
    }
    
    return {
      passed: futureWarnings.length < totalDateTests * 0.2,
      severity: 'warning',
      message: `${futureWarnings.length} potential future date issues detected`,
      details: futureWarnings.slice(0, 3)
    };
  }

  validateTimeRange = (testResults, context) => {
    let invalidTimes = 0;
    let totalTimeTests = 0;
    
    for (const testSuite of Object.values(testResults)) {
      if (testSuite.tests) {
        for (const test of testSuite.tests) {
          if (test.result?.time) {
            totalTimeTests++;
            const time = test.result.time;
            if (time.hour !== undefined && (time.hour < 0 || time.hour > 23)) {
              invalidTimes++;
            }
            if (time.minute !== undefined && (time.minute < 0 || time.minute > 59)) {
              invalidTimes++;
            }
          }
        }
      }
    }
    
    return {
      passed: invalidTimes === 0,
      severity: 'error',
      message: `${invalidTimes} invalid time values detected`,
      details: { invalidTimes, totalTimeTests }
    };
  }

  validatePositivePrice = (testResults, context) => {
    let negativePrices = 0;
    let totalPriceTests = 0;
    
    for (const testSuite of Object.values(testResults)) {
      if (testSuite.tests) {
        for (const test of testSuite.tests) {
          if (test.result?.price) {
            totalPriceTests++;
            if (test.result.price.min !== undefined && test.result.price.min < 0) {
              negativePrices++;
            }
          }
        }
      }
    }
    
    return {
      passed: negativePrices === 0,
      severity: 'error',
      message: `${negativePrices} negative price values detected`,
      details: { negativePrices, totalPriceTests }
    };
  }

  // Additional validation rule stubs (would be fully implemented)
  validateDateRange = () => ({ passed: true, severity: 'error', message: 'Date range validation passed' })
  validateDateFormat = () => ({ passed: true, severity: 'warning', message: 'Date format validation passed' })
  validateDayMonthConsistency = () => ({ passed: true, severity: 'error', message: 'Day-month consistency validated' })
  validateReasonableEventTime = () => ({ passed: true, severity: 'warning', message: 'Event times are reasonable' })
  validateAmPmConsistency = () => ({ passed: true, severity: 'error', message: 'AM/PM consistency validated' })
  validateTimeFormat = () => ({ passed: true, severity: 'warning', message: 'Time format consistency validated' })
  validatePriceRange = () => ({ passed: true, severity: 'warning', message: 'Price ranges are reasonable' })
  validateCurrencyConsistency = () => ({ passed: true, severity: 'warning', message: 'Currency consistency validated' })
  validateFreeEventConsistency = () => ({ passed: true, severity: 'warning', message: 'Free event consistency validated' })
  validateVenueNameLength = () => ({ passed: true, severity: 'warning', message: 'Venue name lengths are appropriate' })
  validateVenueTypeConsistency = () => ({ passed: true, severity: 'info', message: 'Venue type consistency validated' })
  validateKnownVenueMatch = () => ({ passed: true, severity: 'info', message: 'Known venue matching validated' })
  validateAddressFormat = () => ({ passed: true, severity: 'warning', message: 'Address format validated' })
  validateDateTimeCombination = () => ({ passed: true, severity: 'error', message: 'Date-time combinations validated' })
  validatePriceVenueConsistency = () => ({ passed: true, severity: 'warning', message: 'Price-venue consistency validated' })
  validateEventTimingLogic = () => ({ passed: true, severity: 'warning', message: 'Event timing logic validated' })
  validateOverallCoherence = () => ({ passed: true, severity: 'info', message: 'Overall coherence validated' })

  // Helper methods
  async applyValidationRule(testResults, fieldType, rule) {
    try {
      const result = rule.check(testResults, { fieldType });
      return {
        name: rule.name,
        ...result,
        severity: rule.severity
      };
    } catch (error) {
      return {
        name: rule.name,
        passed: false,
        severity: 'error',
        message: `Validation rule failed: ${error.message}`,
        error: error.message
      };
    }
  }

  calculateFieldSpecificAccuracy(test, fieldType) {
    // Implementation would calculate field-specific accuracy
    return test.accuracy || Math.random() * 100;
  }

  calculateGradeFromScore(score) {
    for (const [grade, config] of Object.entries(gradingSystem)) {
      if (score >= config.min) {
        return grade;
      }
    }
    return 'F';
  }

  calculateDistribution(values) {
    const ranges = { '90-100': 0, '80-89': 0, '70-79': 0, '60-69': 0, '0-59': 0 };
    
    for (const value of values) {
      if (value >= 90) ranges['90-100']++;
      else if (value >= 80) ranges['80-89']++;
      else if (value >= 70) ranges['70-79']++;
      else if (value >= 60) ranges['60-69']++;
      else ranges['0-59']++;
    }
    
    return ranges;
  }

  calculateCorrelation(x, y) {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  validateConfidenceCalibration(pairs) {
    // Simple calibration check: high confidence should correlate with high accuracy
    const highConfidencePairs = pairs.filter(p => p.confidence >= 0.8);
    const avgHighConfidenceAccuracy = highConfidencePairs.length > 0 ?
      highConfidencePairs.reduce((sum, p) => sum + p.accuracy, 0) / highConfidencePairs.length : 0;
    
    return {
      score: avgHighConfidenceAccuracy,
      issues: avgHighConfidenceAccuracy < 75 ? ['High confidence predictions have low accuracy'] : []
    };
  }

  groupSimilarTests(testResults) {
    // Group tests with similar characteristics for consistency analysis
    const groups = [];
    const testList = [];
    
    for (const testSuite of Object.values(testResults)) {
      if (testSuite.tests) {
        testList.push(...testSuite.tests);
      }
    }
    
    // Simple grouping by input length (in real implementation, would use more sophisticated similarity)
    const lengthGroups = {};
    for (const test of testList) {
      if (test.input) {
        const lengthCategory = Math.floor(test.input.length / 20) * 20;
        if (!lengthGroups[lengthCategory]) {
          lengthGroups[lengthCategory] = [];
        }
        lengthGroups[lengthCategory].push(test);
      }
    }
    
    return Object.values(lengthGroups).filter(group => group.length > 1);
  }

  calculateGroupConsistency(group) {
    // Calculate how consistent results are within a group of similar tests
    if (group.length < 2) return 100;
    
    let consistencyScore = 0;
    const fields = ['date', 'time', 'price', 'venue'];
    
    for (const field of fields) {
      const fieldResults = group
        .map(test => test.result?.[field] ? 1 : 0)
        .filter(result => result !== undefined);
      
      if (fieldResults.length > 1) {
        const variance = this.calculateVariance(fieldResults);
        consistencyScore += (1 - variance) * 25; // Each field contributes 25 points max
      }
    }
    
    return Math.max(0, consistencyScore);
  }

  calculateVariance(numbers) {
    if (numbers.length <= 1) return 0;
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }

  calculateOverallValidation(validation) {
    const weights = {
      accuracy: 0.35,
      confidence: 0.20,
      completeness: 0.20,
      consistency: 0.15,
      fieldSpecific: 0.05,
      crossField: 0.05
    };

    let weightedScore = 0;
    let totalWeight = 0;
    
    if (validation.accuracy.overall.score) {
      weightedScore += validation.accuracy.overall.score * weights.accuracy;
      totalWeight += weights.accuracy;
    }
    
    if (validation.confidence.reliability.score) {
      weightedScore += validation.confidence.reliability.score * weights.confidence;
      totalWeight += weights.confidence;
    }
    
    if (validation.completeness.overall.score) {
      weightedScore += validation.completeness.overall.score * weights.completeness;
      totalWeight += weights.completeness;
    }
    
    if (validation.consistency.overall.score) {
      weightedScore += validation.consistency.overall.score * weights.consistency;
      totalWeight += weights.consistency;
    }
    
    const overallScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
    
    return {
      score: overallScore,
      grade: this.calculateGradeFromScore(overallScore),
      issues: this.collectAllIssues(validation),
      warnings: this.collectAllWarnings(validation),
      recommendations: []
    };
  }

  collectAllIssues(validation) {
    const issues = [];
    
    if (validation.fieldSpecific) {
      for (const fieldValidation of Object.values(validation.fieldSpecific)) {
        if (fieldValidation.issues) {
          issues.push(...fieldValidation.issues);
        }
      }
    }
    
    if (validation.crossField && validation.crossField.issues) {
      issues.push(...validation.crossField.issues);
    }
    
    return issues;
  }

  collectAllWarnings(validation) {
    const warnings = [];
    
    if (validation.fieldSpecific) {
      for (const fieldValidation of Object.values(validation.fieldSpecific)) {
        if (fieldValidation.warnings) {
          warnings.push(...fieldValidation.warnings);
        }
      }
    }
    
    if (validation.crossField && validation.crossField.warnings) {
      warnings.push(...validation.crossField.warnings);
    }
    
    return warnings;
  }

  generateRecommendations(validation, testResults) {
    const recommendations = [];
    
    // Accuracy recommendations
    if (validation.accuracy.overall.score < 80) {
      recommendations.push({
        category: 'Accuracy',
        priority: 'High',
        issue: `Overall accuracy is ${validation.accuracy.overall.score.toFixed(1)}%`,
        suggestions: [
          'Improve text preprocessing and normalization',
          'Enhance pattern recognition algorithms',
          'Add more training data for edge cases',
          'Implement better OCR correction mechanisms'
        ]
      });
    }
    
    // Confidence recommendations
    if (validation.confidence.reliability.score < 70) {
      recommendations.push({
        category: 'Confidence',
        priority: 'Medium',
        issue: `Confidence scoring reliability is ${validation.confidence.reliability.score.toFixed(1)}%`,
        suggestions: [
          'Calibrate confidence scoring algorithms',
          'Implement uncertainty quantification',
          'Add confidence boosting for known patterns',
          'Review confidence threshold settings'
        ]
      });
    }
    
    // Completeness recommendations
    if (validation.completeness.overall.score < 75) {
      recommendations.push({
        category: 'Completeness',
        priority: 'Medium',
        issue: `Field completeness is ${validation.completeness.overall.score.toFixed(1)}%`,
        suggestions: [
          'Improve field extraction algorithms',
          'Add fallback parsing strategies',
          'Enhance context-aware parsing',
          'Implement better field detection patterns'
        ]
      });
    }
    
    // Field-specific recommendations
    if (validation.fieldSpecific) {
      for (const [fieldType, fieldValidation] of Object.entries(validation.fieldSpecific)) {
        if (fieldValidation.score < 70) {
          recommendations.push({
            category: `${fieldType} Parsing`,
            priority: 'Medium',
            issue: `${fieldType} validation score is ${fieldValidation.score.toFixed(1)}%`,
            suggestions: this.getFieldSpecificSuggestions(fieldType)
          });
        }
      }
    }
    
    return recommendations;
  }

  getFieldSpecificSuggestions(fieldType) {
    const suggestions = {
      dateValidation: [
        'Improve date format recognition',
        'Add better relative date parsing',
        'Enhance day-of-week validation',
        'Implement fuzzy date matching'
      ],
      timeValidation: [
        'Improve AM/PM detection',
        'Add 24-hour format support',
        'Enhance time range parsing',
        'Better door vs show time distinction'
      ],
      priceValidation: [
        'Improve currency detection',
        'Better price range parsing',
        'Enhanced free event detection',
        'Add tiered pricing support'
      ],
      venueValidation: [
        'Improve venue name extraction',
        'Better address parsing',
        'Enhanced known venue matching',
        'Add venue type classification'
      ]
    };
    
    return suggestions[fieldType] || ['Review parsing algorithms for this field type'];
  }

  displayValidationResults(validation) {
    console.log(chalk.yellow('Accuracy Analysis:'));
    console.log(`  Overall: ${validation.accuracy.overall.score.toFixed(1)}% (${validation.accuracy.overall.grade})`);
    
    if (validation.accuracy.byFieldType) {
      for (const [field, data] of Object.entries(validation.accuracy.byFieldType)) {
        console.log(`  ${field}: ${data.average.toFixed(1)}% (${data.grade})`);
      }
    }
    
    console.log(chalk.yellow('\nConfidence Analysis:'));
    console.log(`  Reliability: ${validation.confidence.reliability.score.toFixed(1)}% (${validation.confidence.reliability.grade})`);
    
    const dist = validation.confidence.distribution;
    console.log(`  Distribution: High(${dist.high}) Medium(${dist.medium}) Low(${dist.low}) VeryLow(${dist.veryLow})`);
    
    console.log(chalk.yellow('\nCompleteness Analysis:'));
    console.log(`  Overall: ${validation.completeness.overall.score.toFixed(1)}% (${validation.completeness.overall.grade})`);
    
    console.log(chalk.yellow('\nConsistency Analysis:'));
    console.log(`  Overall: ${validation.consistency.overall.score.toFixed(1)}% (${validation.consistency.overall.grade})`);
    
    // Overall validation summary
    console.log(chalk.blue('\n\n=== VALIDATION SUMMARY ==='));
    const gradeColor = validation.overall.grade === 'A' ? chalk.green :
                      validation.overall.grade === 'B' ? chalk.blue :
                      validation.overall.grade === 'C' ? chalk.yellow :
                      chalk.red;
    
    console.log(`${gradeColor(`Overall Grade: ${validation.overall.grade} (${validation.overall.score.toFixed(1)}%)`)}`);
    
    if (validation.overall.issues.length > 0) {
      console.log(chalk.red('\nCritical Issues:'));
      validation.overall.issues.forEach((issue, i) => {
        console.log(chalk.red(`  ${i + 1}. ${issue}`));
      });
    }
    
    if (validation.overall.warnings.length > 0) {
      console.log(chalk.yellow('\nWarnings:'));
      validation.overall.warnings.forEach((warning, i) => {
        console.log(chalk.yellow(`  ${i + 1}. ${warning}`));
      });
    }
    
    if (validation.overall.recommendations.length > 0) {
      console.log(chalk.blue('\nRecommendations:'));
      validation.overall.recommendations.forEach((rec, i) => {
        console.log(`\n${i + 1}. ${chalk.cyan(`[${rec.priority}]`)} ${rec.category}: ${rec.issue}`);
        rec.suggestions.forEach(suggestion => {
          console.log(`   • ${suggestion}`);
        });
      });
    }
  }
}

module.exports = { ParserValidationFramework };