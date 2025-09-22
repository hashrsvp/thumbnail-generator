/**
 * Performance Tests for Event Details Parser
 * Comprehensive performance benchmarking and optimization analysis
 */

const { EventDetailsParser } = require('../src/parsing/index');
const { testSamples, performanceBenchmarks } = require('./parserTestConfig');
const chalk = require('chalk');

class ParserPerformanceTests {
  constructor(config = {}) {
    this.config = {
      verbose: false,
      warmupRounds: 5,
      benchmarkRounds: 10,
      memoryMeasurements: true,
      stressTestEnabled: true,
      ...config
    };

    this.parser = new EventDetailsParser({
      minConfidence: 0.5,
      enableFuzzyMatching: true,
      enableSpellCorrection: true
    });

    this.results = {
      singleTextTiming: { tests: [], average: 0, median: 0, p95: 0 },
      batchProcessing: { tests: [], throughput: 0, efficiency: 0 },
      memoryUsage: { tests: [], peakUsage: 0, averageUsage: 0, leakDetection: false },
      scalability: { tests: [], degradationRate: 0 },
      stressTesting: { tests: [], failurePoint: 0, gracefulDegradation: false },
      overall: { grade: 'F', recommendations: [] }
    };

    this.memoryBaseline = 0;
  }

  /**
   * Run all performance tests
   */
  async runAllTests() {
    console.log(chalk.blue('\n⚡ PARSER PERFORMANCE TESTS STARTING\n'));
    console.log('=' .repeat(80));

    // Establish memory baseline
    await this.establishMemoryBaseline();

    try {
      await this.runSingleTextTimingTests();
      await this.runBatchProcessingTests();
      await this.runMemoryUsageTests();
      await this.runScalabilityTests();
      
      if (this.config.stressTestEnabled) {
        await this.runStressTests();
      }

      this.generatePerformanceReport();
      return this.results;
    } catch (error) {
      console.error(chalk.red(`❌ Performance test execution failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * Establish memory usage baseline
   */
  async establishMemoryBaseline() {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    await new Promise(resolve => setTimeout(resolve, 100)); // Let GC settle
    this.memoryBaseline = process.memoryUsage().heapUsed;
    
    if (this.config.verbose) {
      console.log(chalk.gray(`Memory baseline: ${(this.memoryBaseline / 1024 / 1024).toFixed(2)} MB`));
    }
  }

  /**
   * Test single text parsing performance
   */
  async runSingleTextTimingTests() {
    console.log(chalk.yellow('\n⏱ Testing Single Text Parsing Performance'));
    console.log('-'.repeat(50));

    // Collect all test samples
    const allSamples = [];
    for (const [category, sampleGroup] of Object.entries(testSamples)) {
      if (sampleGroup.samples) {
        allSamples.push(...sampleGroup.samples.map(s => ({ ...s, category })));
      }
    }

    // Warmup rounds
    if (this.config.verbose) {
      console.log(chalk.gray('Running warmup rounds...'));
    }
    
    for (let i = 0; i < this.config.warmupRounds; i++) {
      const randomSample = allSamples[Math.floor(Math.random() * allSamples.length)];
      await this.parser.parse(randomSample.text);
    }

    // Benchmark rounds
    const timingResults = [];
    
    for (const sample of allSamples) {
      const sampleTimings = [];
      
      for (let round = 0; round < this.config.benchmarkRounds; round++) {
        const startTime = process.hrtime.bigint();
        await this.parser.parse(sample.text);
        const endTime = process.hrtime.bigint();
        
        const durationMs = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        sampleTimings.push(durationMs);
      }
      
      const avgTiming = sampleTimings.reduce((a, b) => a + b) / sampleTimings.length;
      const medianTiming = this.calculateMedian(sampleTimings);
      
      timingResults.push({
        category: sample.category,
        text: sample.text.substring(0, 50) + '...',
        timings: sampleTimings,
        average: avgTiming,
        median: medianTiming,
        min: Math.min(...sampleTimings),
        max: Math.max(...sampleTimings)
      });

      if (this.config.verbose) {
        const status = avgTiming <= performanceBenchmarks.parsing.maxTimePerText ?
          chalk.green('✅') : chalk.red('❌');
        console.log(`${status} [${sample.category}] ${avgTiming.toFixed(2)}ms avg`);
      }
    }

    // Calculate overall statistics
    const allTimings = timingResults.flatMap(r => r.timings);
    this.results.singleTextTiming = {
      tests: timingResults,
      average: allTimings.reduce((a, b) => a + b) / allTimings.length,
      median: this.calculateMedian(allTimings),
      p95: this.calculatePercentile(allTimings, 95),
      min: Math.min(...allTimings),
      max: Math.max(...allTimings)
    };
  }

  /**
   * Test batch processing performance
   */
  async runBatchProcessingTests() {
    console.log(chalk.yellow('\n📦 Testing Batch Processing Performance'));
    console.log('-'.repeat(50));

    const batchSizes = [10, 25, 50, 100];
    const allSamples = [];
    
    // Collect samples
    for (const [category, sampleGroup] of Object.entries(testSamples)) {
      if (sampleGroup.samples) {
        allSamples.push(...sampleGroup.samples.map(s => s.text));
      }
    }

    const batchResults = [];

    for (const batchSize of batchSizes) {
      if (allSamples.length < batchSize) continue;
      
      const batch = allSamples.slice(0, batchSize);
      const memoryBefore = process.memoryUsage().heapUsed;
      
      const startTime = process.hrtime.bigint();
      
      // Process batch
      const results = [];
      for (const text of batch) {
        results.push(await this.parser.parse(text));
      }
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000;
      
      const memoryAfter = process.memoryUsage().heapUsed;
      const memoryGrowth = memoryAfter - memoryBefore;
      
      const throughput = batch.length / (durationMs / 1000); // texts per second
      const avgTimePerText = durationMs / batch.length;
      const successRate = results.filter(r => r.success).length / results.length;
      
      batchResults.push({
        batchSize,
        totalTime: durationMs,
        avgTimePerText,
        throughput,
        successRate,
        memoryGrowth,
        memoryGrowthPerText: memoryGrowth / batch.length
      });

      if (this.config.verbose) {
        const throughputStatus = throughput >= performanceBenchmarks.parsing.minThroughput ?
          chalk.green('✅') : chalk.red('❌');
        console.log(`${throughputStatus} Batch ${batchSize}: ${throughput.toFixed(1)} texts/sec, ${avgTimePerText.toFixed(2)}ms avg`);
      }
    }

    this.results.batchProcessing = {
      tests: batchResults,
      throughput: batchResults.length > 0 ? 
        batchResults.reduce((sum, r) => sum + r.throughput, 0) / batchResults.length : 0,
      efficiency: this.calculateBatchEfficiency(batchResults)
    };
  }

  /**
   * Test memory usage patterns
   */
  async runMemoryUsageTests() {
    console.log(chalk.yellow('\n💾 Testing Memory Usage'));
    console.log('-'.repeat(50));

    const memoryTests = [
      { name: 'Short text processing', textLength: 50, iterations: 100 },
      { name: 'Medium text processing', textLength: 200, iterations: 50 },
      { name: 'Long text processing', textLength: 1000, iterations: 25 },
      { name: 'Repeated processing', textLength: 100, iterations: 200 }
    ];

    const memoryResults = [];

    for (const test of memoryTests) {
      // Force garbage collection before test
      if (global.gc) {
        global.gc();
      }
      
      const memoryBefore = process.memoryUsage().heapUsed;
      const memoryMeasurements = [];
      
      const testText = 'Concert January 15th 8PM Blue Note Club $35 '.repeat(
        Math.ceil(test.textLength / 45)
      ).substring(0, test.textLength);

      for (let i = 0; i < test.iterations; i++) {
        await this.parser.parse(testText);
        
        // Measure memory every 10 iterations
        if (i % 10 === 0) {
          memoryMeasurements.push(process.memoryUsage().heapUsed);
        }
      }

      const memoryAfter = process.memoryUsage().heapUsed;
      const memoryGrowth = memoryAfter - memoryBefore;
      const peakMemory = Math.max(...memoryMeasurements);
      const avgMemory = memoryMeasurements.reduce((a, b) => a + b) / memoryMeasurements.length;
      
      memoryResults.push({
        name: test.name,
        iterations: test.iterations,
        textLength: test.textLength,
        memoryBefore,
        memoryAfter,
        memoryGrowth,
        peakMemory,
        avgMemory,
        memoryPerIteration: memoryGrowth / test.iterations
      });

      if (this.config.verbose) {
        const memoryStatus = memoryGrowth <= performanceBenchmarks.parsing.maxMemoryUsage ?
          chalk.green('✅') : chalk.red('❌');
        console.log(`${memoryStatus} ${test.name}: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB growth`);
      }
    }

    // Memory leak detection
    const memoryLeakDetected = this.detectMemoryLeak(memoryResults);

    this.results.memoryUsage = {
      tests: memoryResults,
      peakUsage: Math.max(...memoryResults.map(r => r.peakMemory)),
      averageUsage: memoryResults.reduce((sum, r) => sum + r.avgMemory, 0) / memoryResults.length,
      leakDetection: memoryLeakDetected
    };
  }

  /**
   * Test scalability characteristics
   */
  async runScalabilityTests() {
    console.log(chalk.yellow('\n📈 Testing Scalability'));
    console.log('-'.repeat(50));

    const textComplexities = [
      { name: 'Simple', sample: 'Concert 8PM $25', complexity: 1 },
      { name: 'Medium', sample: 'Jazz Concert Friday January 15th 8:00 PM at Blue Note Club Tickets $35', complexity: 2 },
      { name: 'Complex', sample: 'Theater Performance Saturday 2PM & 8PM $15 Students $25 General $35 VIP Madison Square Theater', complexity: 3 },
      { name: 'Very Complex', sample: 'Workshop Series March 10-12 Daily 9:00 AM - 5:00 PM Community Center $150 with OCR errors C0ncert Januar7', complexity: 4 }
    ];

    const scalabilityResults = [];

    for (const complexity of textComplexities) {
      const iterations = 50;
      const timings = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = process.hrtime.bigint();
        await this.parser.parse(complexity.sample);
        const endTime = process.hrtime.bigint();
        
        timings.push(Number(endTime - startTime) / 1000000);
      }
      
      const avgTime = timings.reduce((a, b) => a + b) / timings.length;
      const variance = this.calculateVariance(timings);
      
      scalabilityResults.push({
        name: complexity.name,
        complexity: complexity.complexity,
        avgTime,
        variance,
        consistency: 1 / (1 + variance) // Higher is more consistent
      });

      if (this.config.verbose) {
        console.log(`${complexity.name} complexity: ${avgTime.toFixed(2)}ms avg, variance: ${variance.toFixed(2)}`);
      }
    }

    // Calculate degradation rate
    const degradationRate = this.calculateDegradationRate(scalabilityResults);

    this.results.scalability = {
      tests: scalabilityResults,
      degradationRate,
      consistencyScore: scalabilityResults.reduce((sum, r) => sum + r.consistency, 0) / scalabilityResults.length
    };
  }

  /**
   * Test stress conditions and failure points
   */
  async runStressTests() {
    console.log(chalk.yellow('\n🔥 Testing Stress Conditions'));
    console.log('-'.repeat(50));

    const stressTests = [
      {
        name: 'High volume processing',
        test: async () => {
          const results = [];
          for (let i = 0; i < 1000; i++) {
            results.push(await this.parser.parse('Concert January 15 8PM $25'));
          }
          return { success: results.every(r => r), count: results.length };
        }
      },
      {
        name: 'Concurrent processing simulation',
        test: async () => {
          const promises = [];
          for (let i = 0; i < 50; i++) {
            promises.push(this.parser.parse(`Concert ${i} January 15 8PM $25`));
          }
          const results = await Promise.all(promises);
          return { success: results.every(r => r.success), count: results.length };
        }
      },
      {
        name: 'Memory pressure test',
        test: async () => {
          const largeText = 'Concert information '.repeat(10000) + 'January 15 8PM $25';
          const results = [];
          for (let i = 0; i < 10; i++) {
            results.push(await this.parser.parse(largeText));
          }
          return { success: results.every(r => r), count: results.length };
        }
      }
    ];

    const stressResults = [];
    let overallGracefulDegradation = true;

    for (const stressTest of stressTests) {
      try {
        const startTime = process.hrtime.bigint();
        const result = await stressTest.test();
        const endTime = process.hrtime.bigint();
        
        const duration = Number(endTime - startTime) / 1000000;
        
        stressResults.push({
          name: stressTest.name,
          success: result.success,
          duration,
          count: result.count,
          throughput: result.count / (duration / 1000)
        });

        if (this.config.verbose) {
          const status = result.success ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
          console.log(`${status} ${stressTest.name}: ${result.count} items in ${duration.toFixed(0)}ms`);
        }
      } catch (error) {
        overallGracefulDegradation = false;
        stressResults.push({
          name: stressTest.name,
          success: false,
          error: error.message
        });
        
        if (this.config.verbose) {
          console.log(chalk.red(`❌ FAIL ${stressTest.name}: ${error.message}`));
        }
      }
    }

    this.results.stressTesting = {
      tests: stressResults,
      gracefulDegradation: overallGracefulDegradation,
      failurePoint: this.identifyFailurePoint(stressResults)
    };
  }

  // Helper methods for calculations
  calculateMedian(numbers) {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ?
      (sorted[mid - 1] + sorted[mid]) / 2 :
      sorted[mid];
  }

  calculatePercentile(numbers, percentile) {
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  calculateVariance(numbers) {
    const mean = numbers.reduce((a, b) => a + b) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b) / numbers.length;
  }

  calculateBatchEfficiency(batchResults) {
    if (batchResults.length < 2) return 1;
    
    // Compare throughput scaling
    const smallBatch = batchResults[0];
    const largeBatch = batchResults[batchResults.length - 1];
    
    const expectedThroughput = smallBatch.throughput; // Should maintain similar throughput
    const actualThroughput = largeBatch.throughput;
    
    return Math.min(1, actualThroughput / expectedThroughput);
  }

  detectMemoryLeak(memoryResults) {
    // Simple memory leak detection: consistent growth over iterations
    for (const result of memoryResults) {
      if (result.memoryPerIteration > 1000) { // 1KB per iteration is suspicious
        return true;
      }
    }
    return false;
  }

  calculateDegradationRate(scalabilityResults) {
    if (scalabilityResults.length < 2) return 0;
    
    const complexities = scalabilityResults.map(r => r.complexity);
    const times = scalabilityResults.map(r => r.avgTime);
    
    // Simple linear regression to find degradation rate
    const n = complexities.length;
    const sumX = complexities.reduce((a, b) => a + b);
    const sumY = times.reduce((a, b) => a + b);
    const sumXY = complexities.reduce((sum, x, i) => sum + x * times[i], 0);
    const sumXX = complexities.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope; // Time increase per complexity unit
  }

  identifyFailurePoint(stressResults) {
    const failures = stressResults.filter(r => !r.success);
    return failures.length > 0 ? failures[0].name : null;
  }

  calculatePerformanceGrade() {
    let score = 0;
    let maxScore = 0;
    
    // Timing grade (30 points)
    maxScore += 30;
    if (this.results.singleTextTiming.average <= performanceBenchmarks.parsing.maxTimePerText * 0.5) {
      score += 30;
    } else if (this.results.singleTextTiming.average <= performanceBenchmarks.parsing.maxTimePerText) {
      score += 20;
    } else if (this.results.singleTextTiming.average <= performanceBenchmarks.parsing.maxTimePerText * 1.5) {
      score += 10;
    }
    
    // Throughput grade (25 points)
    maxScore += 25;
    if (this.results.batchProcessing.throughput >= performanceBenchmarks.parsing.minThroughput * 1.5) {
      score += 25;
    } else if (this.results.batchProcessing.throughput >= performanceBenchmarks.parsing.minThroughput) {
      score += 20;
    } else if (this.results.batchProcessing.throughput >= performanceBenchmarks.parsing.minThroughput * 0.7) {
      score += 10;
    }
    
    // Memory grade (25 points)
    maxScore += 25;
    if (this.results.memoryUsage.peakUsage <= performanceBenchmarks.parsing.maxMemoryUsage * 0.5) {
      score += 25;
    } else if (this.results.memoryUsage.peakUsage <= performanceBenchmarks.parsing.maxMemoryUsage) {
      score += 20;
    } else if (this.results.memoryUsage.peakUsage <= performanceBenchmarks.parsing.maxMemoryUsage * 1.5) {
      score += 10;
    }
    
    // Scalability grade (20 points)
    maxScore += 20;
    if (this.results.scalability.degradationRate <= 50) { // 50ms per complexity level
      score += 20;
    } else if (this.results.scalability.degradationRate <= 100) {
      score += 15;
    } else if (this.results.scalability.degradationRate <= 200) {
      score += 10;
    }
    
    const percentage = (score / maxScore) * 100;
    
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.singleTextTiming.average > performanceBenchmarks.parsing.maxTimePerText) {
      recommendations.push({
        category: 'Performance',
        priority: 'High',
        issue: 'Slow single text processing',
        suggestion: 'Optimize parsing algorithms, consider caching common patterns'
      });
    }
    
    if (this.results.batchProcessing.throughput < performanceBenchmarks.parsing.minThroughput) {
      recommendations.push({
        category: 'Throughput',
        priority: 'High',
        issue: 'Low batch processing throughput',
        suggestion: 'Implement parallel processing, optimize batch handling'
      });
    }
    
    if (this.results.memoryUsage.leakDetection) {
      recommendations.push({
        category: 'Memory',
        priority: 'Critical',
        issue: 'Potential memory leak detected',
        suggestion: 'Review object lifecycle, implement proper cleanup'
      });
    }
    
    if (this.results.scalability.degradationRate > 100) {
      recommendations.push({
        category: 'Scalability',
        priority: 'Medium',
        issue: 'High performance degradation with complexity',
        suggestion: 'Optimize complex text handling, consider preprocessing'
      });
    }
    
    return recommendations;
  }

  generatePerformanceReport() {
    console.log(chalk.blue('\n📊 PERFORMANCE TEST REPORT\n'));
    console.log('=' .repeat(80));

    // Overall performance grade
    const grade = this.calculatePerformanceGrade();
    const gradeColor = grade === 'A' ? chalk.green : 
                     grade === 'B' ? chalk.blue :
                     grade === 'C' ? chalk.yellow :
                     chalk.red;
    
    console.log(`${gradeColor(`Overall Performance Grade: ${grade}`)}\n`);

    // Detailed metrics
    console.log(chalk.yellow('Timing Metrics:'));
    console.log(`  Average: ${this.results.singleTextTiming.average.toFixed(2)}ms`);
    console.log(`  Median: ${this.results.singleTextTiming.median.toFixed(2)}ms`);
    console.log(`  95th Percentile: ${this.results.singleTextTiming.p95.toFixed(2)}ms`);
    console.log(`  Range: ${this.results.singleTextTiming.min.toFixed(2)}ms - ${this.results.singleTextTiming.max.toFixed(2)}ms`);
    
    console.log(chalk.yellow('\nThroughput Metrics:'));
    console.log(`  Batch Throughput: ${this.results.batchProcessing.throughput.toFixed(1)} texts/sec`);
    console.log(`  Batch Efficiency: ${(this.results.batchProcessing.efficiency * 100).toFixed(1)}%`);
    
    console.log(chalk.yellow('\nMemory Metrics:'));
    console.log(`  Peak Usage: ${(this.results.memoryUsage.peakUsage / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Average Usage: ${(this.results.memoryUsage.averageUsage / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Memory Leak: ${this.results.memoryUsage.leakDetection ? chalk.red('Detected') : chalk.green('None')}`);
    
    console.log(chalk.yellow('\nScalability Metrics:'));
    console.log(`  Degradation Rate: ${this.results.scalability.degradationRate.toFixed(2)}ms per complexity level`);
    console.log(`  Consistency Score: ${(this.results.scalability.consistencyScore * 100).toFixed(1)}%`);
    
    if (this.results.stressTesting.tests.length > 0) {
      console.log(chalk.yellow('\nStress Testing:'));
      console.log(`  Graceful Degradation: ${this.results.stressTesting.gracefulDegradation ? chalk.green('Yes') : chalk.red('No')}`);
      if (this.results.stressTesting.failurePoint) {
        console.log(`  Failure Point: ${this.results.stressTesting.failurePoint}`);
      }
    }

    // Recommendations
    const recommendations = this.generateRecommendations();
    if (recommendations.length > 0) {
      console.log(chalk.yellow('\n💡 RECOMMENDATIONS:\n'));
      recommendations.forEach((rec, index) => {
        const priorityColor = rec.priority === 'Critical' ? chalk.red :
                             rec.priority === 'High' ? chalk.yellow :
                             chalk.blue;
        console.log(`${index + 1}. ${priorityColor(`[${rec.priority}]`)} ${rec.category}: ${rec.issue}`);
        console.log(`   ${chalk.gray(rec.suggestion)}\n`);
      });
    }

    this.results.overall = {
      grade,
      recommendations
    };
  }
}

module.exports = { ParserPerformanceTests };