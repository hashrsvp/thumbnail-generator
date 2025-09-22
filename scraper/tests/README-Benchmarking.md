# Universal Event Scraper Performance Benchmarking System

A comprehensive benchmarking system for analyzing the performance, accuracy, and efficiency of the Universal Event Scraper across different venue types and extraction layers.

## 🚀 Quick Start

```bash
# Run default benchmark
node runBenchmark.js

# Quick performance check
node runBenchmark.js quick

# Comprehensive analysis
node runBenchmark.js comprehensive

# Load testing
node runBenchmark.js loadTest

# Accuracy-focused analysis
node runBenchmark.js accuracyFocus
```

## 📊 Benchmark Categories

### 1. Speed Analysis
- **Layer-by-layer timing** (Layers 1-5)
- **Total processing time** per venue type
- **Network request timing**
- **Parsing and validation phases**

### 2. Accuracy Metrics
- **Confidence score distributions**
- **Field extraction success rates**
- **Hash app compliance rates**
- **Error categorization** (network, parsing, validation)

### 3. Comparison Testing
- **Universal Scraper vs Original** performance
- **Layer effectiveness analysis**
- **Site-type performance breakdown**

### 4. Load Testing
- **Concurrent scraping performance**
- **Batch processing efficiency**
- **Memory leak detection**
- **Browser resource usage**

### 5. Memory Analysis
- **Usage pattern tracking**
- **Leak detection algorithms**
- **Peak usage analysis**
- **Resource optimization recommendations**

## 🎯 Available Scenarios

| Scenario | Description | Iterations | Concurrent | Best For |
|----------|-------------|------------|------------|----------|
| `quick` | Quick performance check | 3 | 2 | Development testing |
| `comprehensive` | Full performance analysis | 20 | 10 | Release validation |
| `loadTest` | High-load concurrent testing | 5 | 25 | Scalability testing |
| `accuracyFocus` | Detailed accuracy analysis | 15 | 3 | Quality assurance |
| `custom` | Custom configuration | Configurable | Configurable | Specific testing needs |

## 🔧 Configuration Options

### Basic Options
```bash
--iterations <n>         # Number of test iterations (default: 10)
--concurrentTests <n>    # Concurrent scrapers (default: 5)
--warmupRuns <n>        # Warmup iterations (default: 3)
--verbose true          # Enable detailed logging
--debug true            # Enable debug output
```

### Output Options
```bash
--exportCsv true        # Export results to CSV files
--generateCharts true   # Generate visual charts
--outputDir <path>      # Custom output directory
```

### Performance Options
```bash
--timeoutMs <n>         # Request timeout (default: 60000)
--memoryLimitMB <n>     # Memory limit (default: 512)
--maxNetworkTime <n>    # Max network time (default: 10000)
```

## 📈 Generated Reports

### 1. Speed Analysis (`speed-analysis.json`)
```json
{
  "layerTimings": {
    "layer1": { "mean": 150, "median": 140, "p95": 200 },
    "layer2": { "mean": 280, "median": 270, "p95": 350 }
  },
  "totalProcessingTime": {
    "average": 2500,
    "distribution": { "p50": 2300, "p95": 4200, "p99": 5800 }
  }
}
```

### 2. Accuracy Metrics (`accuracy-analysis.json`)
```json
{
  "confidenceDistribution": {
    "high": 65,    // % of extractions with >80% confidence
    "medium": 25,  // % with 60-80% confidence
    "low": 10      // % with <60% confidence
  },
  "fieldExtractionRates": {
    "title": { "successRate": 95.2, "consistency": 98.1 },
    "date": { "successRate": 87.3, "consistency": 92.4 }
  }
}
```

### 3. Layer Performance (`layer-performance.csv`)
| Layer | Success Rate | Avg Time | Confidence | Fields Extracted |
|-------|-------------|----------|------------|------------------|
| Layer 1 | 42.3% | 145ms | 89.2 | title, date, location |
| Layer 2 | 68.1% | 267ms | 82.5 | title, description, image |
| Layer 3 | 81.4% | 423ms | 74.8 | venue, date, price |

### 4. Memory Usage (`memory-usage.csv`)
| Iteration | Heap Used (MB) | Heap Total (MB) | External (MB) | Growth Rate |
|-----------|----------------|-----------------|---------------|-------------|
| 1 | 45.2 | 67.8 | 12.3 | - |
| 2 | 47.1 | 67.8 | 12.8 | 4.2% |

## 🎨 Visual Charts (Generated)

1. **Layer Performance Radar Chart**
   - Success rates across all 5 layers
   - Confidence scores by layer
   - Processing time comparison

2. **Speed vs Accuracy Scatter Plot**
   - Processing time vs confidence correlation
   - Venue type clustering
   - Performance zones (fast/accurate, slow/accurate, etc.)

3. **Confidence Distribution Histogram**
   - Distribution of confidence scores
   - Layer contribution analysis
   - Quality trends over time

4. **Memory Usage Timeline**
   - Memory consumption over test duration
   - Leak detection visualization
   - Peak usage identification

5. **Venue Type Comparison Bar Chart**
   - Performance breakdown by venue type
   - Layer effectiveness by site type
   - Recommendation priorities

## 🔍 Understanding Results

### Performance Thresholds

#### Speed (Processing Time)
- **Excellent**: < 2s total, < 1s network, < 0.5s parsing
- **Good**: < 5s total, < 3s network, < 1.5s parsing
- **Acceptable**: < 10s total, < 6s network, < 3s parsing

#### Accuracy (Confidence & Fields)
- **Excellent**: >85% confidence, >90% field extraction, >95% Hash compliance
- **Good**: >70% confidence, >80% field extraction, >85% Hash compliance
- **Acceptable**: >60% confidence, >70% field extraction, >75% Hash compliance

#### Memory Efficiency
- **Excellent**: <50MB heap, <5% growth rate
- **Good**: <100MB heap, <15% growth rate
- **Acceptable**: <200MB heap, <30% growth rate

### Layer Expectations

| Layer | Purpose | Expected Success | Typical Fields |
|-------|---------|------------------|----------------|
| **Layer 1** | Structured Data | 40% | title, date, location, description |
| **Layer 2** | Meta Tags | 60% | title, description, image |
| **Layer 3** | Semantic HTML | 75% | title, date, venue, description |
| **Layer 4** | Text Patterns | 85% | date, time, location, price |
| **Layer 5** | Content Analysis | 95% | title, venue, basic_info |

## 🛠 Optimization Recommendations

The system automatically generates optimization recommendations based on results:

### Speed Optimizations
- **Slow Layer Detection**: Identifies layers taking >500ms
- **Network Bottlenecks**: Flags requests taking >3s
- **Parser Optimization**: Suggests DOM parsing improvements

### Accuracy Improvements
- **Low Confidence Layers**: Recommends pattern improvements
- **Field Extraction Issues**: Identifies missing selector patterns
- **Hash Compliance**: Suggests data formatting fixes

### Memory Management
- **Leak Detection**: Identifies potential memory leaks
- **Resource Cleanup**: Recommends cleanup improvements
- **Browser Context**: Suggests browser resource optimization

## 📊 Example Usage Scenarios

### Development Testing
```bash
# Quick check during development
node runBenchmark.js quick --verbose true

# Focus on specific performance aspect
node runBenchmark.js custom --iterations 5 --debug true
```

### Release Validation
```bash
# Comprehensive pre-release testing
node runBenchmark.js comprehensive --exportCsv true --generateCharts true

# Compare against previous version
node runBenchmark.js comprehensive --outputDir ./release-1.2.0-benchmark
```

### Performance Investigation
```bash
# Deep dive into slow performance
node runBenchmark.js accuracyFocus --iterations 25 --verbose true --debug true

# Load testing for production readiness
node runBenchmark.js loadTest --concurrentTests 50 --memoryLimitMB 1024
```

### CI/CD Integration
```bash
# Automated performance regression testing
node runBenchmark.js quick --exportCsv true --outputDir ./ci-benchmark-results

# Performance gate checks
node runBenchmark.js custom --iterations 10 --timeoutMs 30000
```

## 📁 Output Directory Structure

```
benchmark-results/
├── summary-report.json          # Executive summary
├── detailed-report.json         # Complete analysis
├── speed-analysis.json          # Layer timing details
├── accuracy-analysis.json       # Confidence & field metrics
├── comparison-tests.json        # Universal vs Original
├── load-tests.json             # Concurrent performance
├── memory-analysis.json        # Memory usage patterns
├── optimization-recommendations.json  # Actionable insights
├── speed-analysis.csv          # Speed data for analysis
├── accuracy-metrics.csv        # Accuracy data for analysis
├── layer-performance.csv       # Layer-by-layer metrics
├── memory-usage.csv           # Memory consumption data
└── charts/                    # Visual performance charts
    ├── layer-performance-radar.png
    ├── speed-vs-accuracy-scatter.png
    ├── confidence-distribution.png
    └── memory-timeline.png
```

## 🚀 Advanced Configuration

### Custom Test URLs
Create a custom configuration file:

```json
{
  "testUrls": [
    "https://your-venue-1.com/events",
    "https://your-venue-2.com/events"
  ],
  "iterations": 15,
  "concurrentTests": 8,
  "enforceHashRequirements": true
}
```

### Venue Type Analysis
Configure specific venue types for targeted testing:

```json
{
  "venueTypes": {
    "custom-platform": {
      "expectedLayers": [1, 2, 3],
      "expectedConfidence": 85,
      "testUrls": ["https://custom-platform.com/event"]
    }
  }
}
```

## 🔧 Troubleshooting

### Common Issues

1. **Playwright Browser Issues**
   ```bash
   npx playwright install
   ```

2. **Memory Errors**
   ```bash
   node --max-old-space-size=4096 runBenchmark.js
   ```

3. **Network Timeouts**
   ```bash
   node runBenchmark.js --timeoutMs 120000
   ```

4. **Permission Issues**
   ```bash
   chmod +x runBenchmark.js
   ```

### Performance Tips

- Use `quick` scenario for development
- Run `comprehensive` tests in CI/CD only
- Monitor system resources during load tests
- Use `--verbose` for debugging slow performance
- Check network connectivity before running

## 📧 Support

For issues or questions about the benchmarking system:

1. Check the generated logs in the output directory
2. Run with `--debug true` for detailed information
3. Review the optimization recommendations
4. Compare results across different scenarios

The benchmarking system provides comprehensive insights into the Universal Event Scraper's performance characteristics, helping identify optimization opportunities and ensure consistent quality across different venue types and extraction scenarios.