# Universal Event Scraper Testing Framework

A comprehensive testing framework designed to validate the Universal Event Scraper against real venue websites from the Hash app. This framework tests all venue types, validates Hash app requirements, and provides detailed performance analytics.

## 🎯 Features

- **Real Venue Testing**: Tests against 25+ actual venue websites from Bay Area and Austin
- **Hash App Validation**: Ensures all extracted data meets Hash app requirements
- **Category Testing**: Validates automatic category mapping for all venue types
- **Performance Metrics**: Tracks scraping speed, layer efficiency, and confidence scores
- **Layer Analysis**: Deep analysis of which extraction layers work best for different venues
- **Comprehensive Reporting**: JSON and HTML reports with detailed analytics
- **Flexible Test Scenarios**: Quick tests, comprehensive suites, and category-specific testing

## 📋 Test Coverage

### Venue Categories Tested
- **Music Venues**: The Fillmore, Fox Theater, Great American Music Hall, Emo's, Mohawk
- **Nightclubs**: Audio SF, Temple SF, Kingdom Austin, Monarch SF
- **Comedy Venues**: Cobb's Comedy Club, Comedy Mothership, San Jose Improv
- **Sports Venues**: Oracle Park, Chase Center, Q2 Stadium Austin FC
- **Bars**: El Rio SF, The Saxon Pub, Cornerstone Berkeley
- **Art Venues**: California Academy of Sciences, Exploratorium
- **Food Events**: The ABGB Austin

### Hash App Requirements Validated
- ✅ Address must contain comma
- ✅ Categories from valid list: `['Music', 'Festivals', 'Food Events', 'Sports/Games', 'Comedy Shows', 'Art Shows', 'Bars', 'Nightclubs']`
- ✅ Dates in ISO format
- ✅ Times in HH:mm:ss format
- ✅ Required fields present (title, address, date)
- ✅ Category mapping accuracy

## 🚀 Quick Start

### Installation

```bash
cd /Users/user/Desktop/hash/scripts/scraper/tests
npm install
```

### Run Quick Test (Recommended First Run)

```bash
npm run test:quick
```

This tests 5 representative venues and takes ~2-3 minutes.

### Run Comprehensive Test Suite

```bash
npm run test:comprehensive
```

Tests all venues (~15-20 minutes).

## 📊 Test Scenarios

### 1. Quick Test
Tests representative venues from different categories for rapid feedback.
```bash
npm run test:quick
# OR
node runTests.js quick
```

### 2. Comprehensive Test
Tests all venues in the framework for complete coverage.
```bash
npm run test:comprehensive  
# OR
node runTests.js comprehensive
```

### 3. Category-Specific Testing
Focus on specific venue types:
```bash
npm run test:music
npm run test:nightclubs
npm run test:comedy
npm run test:sports
npm run test:bars
npm run test:art
npm run test:food
```

### 4. Performance Benchmark
Focus on speed and layer performance metrics:
```bash
npm run test:performance
# OR
node runTests.js performance
```

### 5. Single Venue Testing
Test individual venues by name:
```bash
npm run test:venue "The Fillmore"
# OR
node universalScraperTests.js venue "Fillmore"
```

## 🔧 Configuration Options

### Command Line Options

- `--verbose, -v`: Detailed output showing extracted data
- `--no-headless`: Show browser windows (useful for debugging)  
- `--timeout <ms>`: Set page timeout (default: 30000ms)
- `--retries <n>`: Number of retry attempts (default: 2)

### Examples

```bash
# Debug mode with visible browser
npm run test:debug

# Verbose comprehensive test
node runTests.js comprehensive --verbose

# Music venues with custom timeout
node runTests.js category-focus music --timeout 45000

# Single venue debug
node universalScraperTests.js venue "Audio SF" --no-headless --verbose
```

## 📊 Understanding Results

### Console Output

```
🧪 Universal Event Scraper Test Framework
==================================================

📂 Testing MUSIC venues (5 venues)

🏪 Testing: The Fillmore
   URL: https://www.livenation.com/venue/KovZpZAE6eeA/the-fillmore-events
   ✓ PASS
     Confidence: 87% | Validation: 100% | Category: 100%
     Duration: 3247ms | Layers: 4/5
```

### Success Indicators

- **✓ PASS**: All Hash requirements met, high confidence
- **✓ PARTIAL**: Some requirements met, usable data extracted  
- **❌ FAIL**: Unable to extract usable data

### Metrics Explained

- **Confidence**: Overall extraction confidence (0-100%)
- **Validation**: Percentage of Hash requirements passed
- **Category**: Category mapping accuracy vs expected
- **Duration**: Time taken to scrape venue
- **Layers**: Number of successful extraction layers

### Report Files

Reports are saved to `./tests/results/`:

- `test-report-[timestamp].json`: Detailed JSON results
- `test-report-[timestamp].html`: Interactive HTML dashboard

## 🏆 Performance Benchmarks

### Target Performance Goals

| Metric | Target | Good | Needs Improvement |
|--------|--------|------|-------------------|
| Success Rate | >90% | >75% | <75% |
| Average Time | <5s | <10s | >10s |
| Category Accuracy | >95% | >85% | <85% |
| Address Compliance | 100% | >90% | <90% |

### Layer Performance

The framework tests all 5 extraction layers:

1. **Structured Data** (JSON-LD, Microdata): Highest accuracy
2. **Meta Tags** (Open Graph, Twitter): High reliability  
3. **Semantic HTML**: Good for standard sites
4. **Text Patterns**: Regex-based fallback
5. **Content Analysis**: AI-like intelligent defaults

## 🔍 Debugging Failed Tests

### Common Issues

1. **Timeout Errors**: Increase timeout with `--timeout 45000`
2. **Category Mismatches**: Check venue keywords in CategoryMapper
3. **Address Format**: Ensure addresses have commas
4. **Date Parsing**: Verify date extraction patterns

### Debug Steps

```bash
# 1. Run single venue with debug flags
node universalScraperTests.js venue "Venue Name" --no-headless --verbose

# 2. Check extraction layers
# Look for "Layer X extracted:" messages

# 3. Examine category mapping
# Check "Category mapping for:" output

# 4. Review validation details
# See "Validation Issues:" section
```

### Manual Verification

Visit the venue URL manually to verify:
- Events are actually listed
- Site structure matches expectations
- Data extraction is reasonable

## 🧪 Adding New Test Venues

To add new venues to the test suite:

1. Edit `universalScraperTests.js`
2. Find the `loadTestVenues()` method
3. Add venue objects with this structure:

```javascript
{
    name: 'Venue Name',
    url: 'https://venue-website.com/events',
    address: 'Street Address, City, State ZIP', 
    expectedCategory: ['Category1', 'Category2'],
    city: 'City Name'
}
```

### Venue Selection Criteria

- Must have an events/calendar page
- Should regularly host events
- Represents different website technologies
- Covers various venue types and sizes

## 📈 Continuous Testing

### Scheduled Testing

Set up regular testing to catch:
- Website changes breaking extraction
- Performance regressions  
- New venue types needing support

### Integration with CI/CD

```bash
# Quick validation in CI pipeline
npm run test:quick

# Full regression testing
npm run test:comprehensive
```

## 🛠️ Development & Maintenance

### File Structure

```
tests/
├── universalScraperTests.js    # Main test framework
├── runTests.js                 # Test runner with scenarios
├── package.json               # Dependencies and scripts  
├── README.md                  # This documentation
└── results/                   # Generated test reports
```

### Key Classes

- **UniversalScraperTestFramework**: Core testing engine
- **TestRunner**: Scenario management and CLI interface  
- **Hash Validation**: Requirements checking
- **Performance Analytics**: Metrics collection

### Adding New Test Scenarios

1. Edit `runTests.js`
2. Add scenario to `this.scenarios` object
3. Implement scenario method
4. Add npm script if desired

## 🤝 Contributing

When contributing to the test framework:

1. **Maintain Real Venues**: Only test actual, active venue websites
2. **Hash Compliance**: Ensure tests validate actual app requirements
3. **Performance Focus**: Include timing and efficiency metrics
4. **Clear Reporting**: Make results easy to understand and actionable
5. **Error Handling**: Gracefully handle site changes and failures

## 📝 Changelog

### Version 1.0.0
- Initial comprehensive testing framework
- 25+ venue test coverage across all categories
- Hash app requirement validation
- Performance benchmarking
- HTML/JSON reporting
- Multiple test scenarios
- CLI interface with flexible options

---

**Built by Claude Code - iOS Testing Specialist**  
*Focused on comprehensive, reliable test suites for social calendar and event discovery applications*