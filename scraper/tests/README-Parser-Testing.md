# Event Details Parser Testing Framework

Comprehensive testing suite for the Event Details Parser that validates text parsing algorithms for extracting event information from OCR text and various input sources.

## 🎯 Overview

This testing framework validates parser functionality across multiple dimensions:
- **Unit Testing**: Individual parser component validation (date, time, price, venue)
- **Integration Testing**: Complete parsing workflow validation with cross-field consistency
- **Edge Case Testing**: OCR artifacts, text corruption, and challenging scenarios
- **Performance Testing**: Speed, memory usage, and scalability benchmarking
- **Validation Framework**: Comprehensive accuracy measurement and grading

## 📁 Test Suite Structure

```
tests/
├── runParserTests.js              # Main test runner with orchestration
├── parserTestConfig.js            # Configuration, thresholds, and test samples
├── parserUnitTests.js             # Unit tests for individual parser components
├── parserIntegrationTests.js      # Integration tests for complete workflows
├── parserEdgeCaseTests.js         # Edge cases, OCR artifacts, corruption
├── parserPerformanceTests.js      # Performance benchmarking and optimization
├── parserValidationFramework.js   # Validation, grading, and recommendations
└── results/                       # Test results and generated reports
    ├── reports/                   # HTML, text reports
    └── data/                      # JSON test data
```

## 🚀 Quick Start

### Prerequisites

```bash
# Install dependencies (if not already installed)
npm install chalk

# Ensure Event Details Parser is available
# The parser should be located at ../src/parsing/index.js
```

### Running Tests

```bash
# Run complete test suite
node runParserTests.js

# Run with specific environment
node runParserTests.js --env development --verbose
node runParserTests.js --env ci
node runParserTests.js --env production

# Run specific test suites
node runParserTests.js --suites unit --verbose
node runParserTests.js --suites unit,integration
node runParserTests.js --suites performance
node runParserTests.js --suites edge

# Generate reports in custom directory
node runParserTests.js --output-dir ./custom-reports

# Skip validation analysis (for faster execution)
node runParserTests.js --no-validation
```

### Command Line Options

```bash
--env <environment>          # Test environment: development, ci, production
--suites <suite1,suite2>     # Specific suites: unit, integration, edge, performance, all
--verbose, -v                # Enable detailed output
--no-reports                 # Skip report generation
--no-validation              # Skip validation framework analysis
--output-dir <directory>     # Custom output directory for reports
--help, -h                   # Display help information
```

## 📊 Test Categories

### 1. Unit Tests (`parserUnitTests.js`)

**Purpose**: Validate individual parser components in isolation

**Components Tested**:
- **Date Parser**: Date formats, relative dates, ranges, OCR corrections
- **Time Parser**: 12h/24h formats, ranges, door vs show times, AM/PM handling
- **Price Parser**: Fixed prices, ranges, free events, tiered pricing, currencies
- **Venue Parser**: Venue names, addresses, types, known venue matching
- **Text Processor**: Normalization, OCR correction, case handling
- **Confidence Scorer**: Scoring algorithms and calibration

**Test Examples**:
```javascript
// Date parsing test
{ input: 'January 15th 2024', expected: { day: 15, month: 'January', year: 2024 } }

// Time parsing with OCR artifacts
{ input: '8:3O PII', expected: { hour: 20, minute: 30, period: 'PM' }, requiresCorrection: true }

// Complex pricing
{ input: '$15 Students $25 General', expected: { tier: [{ type: 'Students', price: 15 }] } }
```

### 2. Integration Tests (`parserIntegrationTests.js`)

**Purpose**: Test complete parsing workflows and field interactions

**Test Scenarios**:
- **Complete Workflows**: End-to-end parsing from text to structured data
- **Cross-Field Validation**: Date-time consistency, price-venue relationships
- **Hash Compliance**: Validation against Hash app requirements
- **Context Effects**: Impact of known venues and event type context
- **Error Recovery**: Graceful handling of partial failures

**Validation Checks**:
```javascript
// Date-time consistency
{ field: 'date-time', check: 'combined_datetime_valid' }

// Price-venue appropriateness
{ field: 'price-venue', check: 'price_appropriate_for_venue' }

// Conflict resolution
{ text: 'FREE EVENT $10 cover charge', check: 'conflict_resolution' }
```

### 3. Edge Case Tests (`parserEdgeCaseTests.js`)

**Purpose**: Validate robustness with challenging and corrupted inputs

**Edge Case Categories**:
- **OCR Artifacts**: Character substitution (0/O, I/l/1, etc.)
- **Text Corruption**: Missing characters, noise, fragmentation
- **Extreme Cases**: Very short/long text, punctuation-only, repeated patterns
- **Multilingual Content**: Mixed languages, special characters, Unicode
- **Ambiguous Content**: Date format ambiguity, conflicting information

**Recovery Testing**:
```javascript
// OCR character substitution
{ 
  corrupted: 'C0ncert at The 0bservat0ry Januar7 Il5th',
  expected: 'Concert at The Observatory January 15th',
  expectedFields: { venue: 'Observatory', date: 15 }
}

// Severe corruption with partial recovery
{ 
  text: 'C0nc3r7 J4nu4ry 15 8PM $35',
  expectPartialRecovery: true,
  allowLowerRecovery: true
}
```

### 4. Performance Tests (`parserPerformanceTests.js`)

**Purpose**: Benchmark parsing performance and identify bottlenecks

**Performance Metrics**:
- **Single Text Timing**: Average, median, 95th percentile processing times
- **Batch Processing**: Throughput, efficiency scaling
- **Memory Usage**: Peak usage, leak detection, growth patterns
- **Scalability**: Performance degradation with complexity
- **Stress Testing**: High volume, concurrent processing, memory pressure

**Benchmarks**:
```javascript
const performanceBenchmarks = {
  parsing: {
    maxTimePerText: 500,    // 500ms maximum per text
    maxMemoryUsage: 50,     // 50MB peak memory
    minThroughput: 100      // 100 texts per second
  }
};
```

**Performance Grades**:
- **A**: Excellent performance (fast processing, low memory)
- **B**: Good performance (meets requirements well)
- **C**: Acceptable performance (meets minimum requirements)
- **D**: Poor performance (below expectations)
- **F**: Failing performance (exceeds thresholds)

### 5. Validation Framework (`parserValidationFramework.js`)

**Purpose**: Comprehensive validation, analysis, and recommendation generation

**Validation Dimensions**:
- **Accuracy**: Field-specific and overall accuracy measurement
- **Confidence**: Confidence score distribution and calibration
- **Completeness**: Field presence across different test scenarios
- **Consistency**: Result consistency for similar inputs
- **Field-Specific Rules**: Validation rules for each parser component
- **Cross-Field Rules**: Relationship validation between fields

**Grading System**:
```javascript
const gradingSystem = {
  A: { min: 90, description: 'Excellent - Exceeds expectations' },
  B: { min: 80, description: 'Good - Meets requirements well' },
  C: { min: 70, description: 'Acceptable - Meets minimum requirements' },
  D: { min: 60, description: 'Poor - Below expectations' },
  F: { min: 0,  description: 'Failing - Does not meet requirements' }
};
```

## ⚙️ Configuration

### Test Environments

```javascript
// Development: Fast testing with detailed output
const development = {
  verbose: true,
  timeout: 10000,
  enableDebugLogs: true,
  testSampleLimit: 5
};

// CI: Reliable testing for automation
const ci = {
  verbose: false,
  timeout: 30000,
  retries: 3,
  testSampleLimit: 20,
  enableBenchmarking: true
};

// Production: Thorough validation
const production = {
  verbose: true,
  timeout: 60000,
  testSampleLimit: 100,
  requireHighAccuracy: true,
  generateDetailedReports: true
};
```

### Accuracy Thresholds

```javascript
const accuracyThresholds = {
  date: {
    excellent: 95,    // Perfect date extraction
    good: 85,         // Minor format variations acceptable
    acceptable: 75,   // Basic date recognition
    minThreshold: 60  // Minimum for passing
  },
  time: { excellent: 92, good: 82, acceptable: 70, minThreshold: 55 },
  price: { excellent: 90, good: 80, acceptable: 65, minThreshold: 50 },
  venue: { excellent: 85, good: 75, acceptable: 60, minThreshold: 45 }
};
```

## 📈 Test Results and Reporting

### Generated Reports

1. **JSON Report** (`parser-test-results.json`): Complete test data and metadata
2. **HTML Report** (`parser-test-report.html`): Visual dashboard with charts and metrics
3. **Text Summary** (`parser-test-summary.txt`): Concise text summary for quick review

### Report Contents

```javascript
const reportStructure = {
  metadata: {
    testEnvironment: 'development',
    timestamp: '2024-01-15T20:00:00.000Z',
    duration: 45000,
    suites: ['unit', 'integration', 'edge', 'performance']
  },
  results: {
    unitTests: { /* detailed unit test results */ },
    integrationTests: { /* integration test results */ },
    edgeCaseTests: { /* edge case test results */ },
    performanceTests: { /* performance benchmarks */ },
    validation: { /* validation analysis */ }
  },
  summary: {
    totalTests: 250,
    passedTests: 210,
    failedTests: 40,
    overallGrade: 'B',
    passRate: 84.0,
    duration: 45000
  }
};
```

### Sample HTML Report Features

- **Overall Grade Badge**: Color-coded grade (A-F) with score percentage
- **Test Suite Breakdown**: Individual suite statistics and pass rates
- **Performance Metrics**: Timing, memory, and throughput visualizations
- **Validation Analysis**: Accuracy by category and field type
- **Recommendations**: Prioritized improvement suggestions
- **Configuration Display**: Test environment and threshold settings

## 🎯 Hash App Integration

### Compliance Validation

The framework validates Hash app specific requirements:

```javascript
const hashRequirements = {
  minimumAccuracy: 75,           // 75% minimum parsing accuracy
  maximumProcessingTime: 1000,   // 1 second timeout per text
  requiredFields: ['date'],      // Date is mandatory
  preferredFields: ['date', 'time', 'venue'], // Complete set preferred
  addressFormat: 'comma_required', // Venues should include commas
  priceFormat: 'currency_symbol'   // Prices should include currency
};
```

### Event Category Mapping

Automatic testing across Hash app event categories:
- Music events → Date, time, venue, price validation
- Nightlife events → Time ranges, age restrictions, cover charges
- Comedy shows → Venue types, show times, ticket pricing
- Sports events → Team names, game times, venue capacity
- Food events → Cuisine types, reservation info, pricing

## 🔧 Extending the Test Suite

### Adding New Test Cases

1. **Add to Test Samples**:
```javascript
// In parserTestConfig.js
const newTestCategory = {
  description: 'New test scenario description',
  samples: [
    {
      text: 'Test input text here',
      expected: {
        date: { day: 15, month: 'January' },
        time: { hour: 20, minute: 0 },
        // ... expected results
      },
      expectedAccuracy: 85
    }
  ]
};
```

2. **Add Custom Validation Rules**:
```javascript
// In parserValidationFramework.js
const customRule = {
  name: 'custom_validation',
  severity: 'warning',
  check: (testResults, context) => {
    // Custom validation logic
    return {
      passed: true,
      message: 'Custom validation passed',
      details: {}
    };
  }
};
```

3. **Extend Performance Tests**:
```javascript
// In parserPerformanceTests.js
const newBenchmark = {
  name: 'Custom Performance Test',
  test: async () => {
    // Custom performance test logic
  },
  expectedThreshold: 100 // ms
};
```

### Custom Test Runners

```javascript
// Create custom test runner
const { ParserTestRunner } = require('./runParserTests');

class CustomParserTestRunner extends ParserTestRunner {
  async runCustomTests() {
    // Add custom test logic
  }
}
```

## 📊 Performance Optimization

### Benchmark Results Interpretation

```javascript
// Example benchmark interpretation
const performanceResults = {
  singleTextTiming: {
    average: 125,  // 125ms average - Good performance
    p95: 250,      // 250ms 95th percentile - Acceptable
    max: 500       // 500ms maximum - At threshold
  },
  batchProcessing: {
    throughput: 85,     // 85 texts/sec - Needs improvement
    efficiency: 0.92    // 92% efficiency - Excellent
  },
  memoryUsage: {
    peakUsage: 45000000,  // 45MB peak - Good
    leakDetection: false  // No leaks detected - Excellent
  }
};
```

### Optimization Recommendations

The framework automatically generates specific recommendations:

```javascript
const optimizationSuggestions = [
  {
    category: 'Performance',
    priority: 'High',
    issue: 'Slow batch processing throughput',
    suggestions: [
      'Implement text preprocessing optimization',
      'Add result caching for repeated patterns',
      'Consider parallel processing for batch operations'
    ]
  },
  {
    category: 'Accuracy',
    priority: 'Medium',
    issue: 'Low venue parsing accuracy',
    suggestions: [
      'Enhance venue name extraction patterns',
      'Improve known venue matching algorithm',
      'Add more comprehensive venue training data'
    ]
  }
];
```

## 🚨 Error Handling and Recovery

### Graceful Degradation Testing

The framework tests various failure scenarios:

```javascript
const recoveryScenarios = [
  {
    name: 'Partial parsing with missing fields',
    expectation: 'Should return available data with confidence score'
  },
  {
    name: 'Invalid data handling',
    expectation: 'Should validate and flag invalid data appropriately'
  },
  {
    name: 'Memory pressure conditions',
    expectation: 'Should handle large inputs without crashing'
  },
  {
    name: 'Timeout scenarios',
    expectation: 'Should terminate gracefully within time limits'
  }
];
```

### Recovery Metrics

- **Recovery Rate**: Percentage of error scenarios handled gracefully
- **Partial Success**: Ability to extract some data even with errors
- **Error Classification**: Proper categorization of different error types
- **Confidence Degradation**: Appropriate confidence reduction for problematic inputs

## 📝 Best Practices

### Writing Effective Parser Tests

1. **Use Realistic Data**: Test with actual OCR output and real-world text variations
2. **Cover Edge Cases**: Include boundary conditions and unusual formatting
3. **Test Error Conditions**: Validate graceful handling of invalid inputs
4. **Measure Confidence**: Always validate confidence scores alongside accuracy
5. **Context Testing**: Test both with and without contextual information

### Maintaining Test Quality

1. **Regular Updates**: Update test samples as parsing improves
2. **Threshold Tuning**: Adjust accuracy thresholds based on performance data
3. **Benchmark Tracking**: Monitor performance trends over time
4. **Coverage Analysis**: Ensure all parser components are thoroughly tested

## 🔄 Continuous Integration

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
name: Parser Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: node tests/runParserTests.js --env ci
      - name: Upload test reports
        uses: actions/upload-artifact@v2
        with:
          name: parser-test-reports
          path: tests/results/reports/
```

### Regression Detection

Automatic detection of performance and accuracy regressions:
- **Accuracy Degradation**: >5% drop in parsing accuracy
- **Performance Degradation**: >25% increase in processing time
- **Memory Usage Increase**: >30% increase in memory consumption
- **Confidence Calibration**: Significant changes in confidence distribution

## 📞 Support and Troubleshooting

### Common Issues

1. **Test Failures**: Check parser implementation and test expectations
2. **Performance Issues**: Review benchmark thresholds and system resources
3. **Report Generation**: Ensure output directory permissions and disk space
4. **Configuration Problems**: Validate test environment settings

### Debug Mode

```bash
# Enable maximum verbosity for debugging
node runParserTests.js --verbose --suites unit --no-validation

# Test specific components in isolation
node parserUnitTests.js --verbose
```

### Getting Help

1. Review test configuration in `parserTestConfig.js`
2. Check generated reports in the `results/` directory
3. Use verbose mode for detailed test execution information
4. Examine validation output for specific recommendations

---

**Built with ❤️ by Claude Code - QA Testing Specialist**

*Ensuring reliable event details parsing for the Hash event discovery system*