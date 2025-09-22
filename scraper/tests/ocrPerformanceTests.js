#!/usr/bin/env node

/**
 * OCR Performance Benchmarking Tests
 * 
 * Comprehensive performance testing for OCR operations including:
 * - Processing time benchmarks
 * - Memory usage monitoring
 * - Accuracy vs speed trade-offs
 * - Scalability testing
 * - Resource utilization analysis
 * 
 * @version 1.0.0
 * @author Claude Code - Performance Testing Specialist
 */

const chalk = require('chalk');
const { performance } = require('perf_hooks');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');

class OCRPerformanceTests {
    constructor(ocrFramework) {
        this.ocrFramework = ocrFramework;
        this.config = ocrFramework.config;
        
        this.performanceResults = {
            timing: {
                tests: [],
                averages: {},
                percentiles: {},
                trends: []
            },
            memory: {
                peak: 0,
                average: 0,
                leaks: [],
                snapshots: []
            },
            accuracy: {
                bySpeed: {},
                tradeOffs: {},
                optimization: {}
            },
            scalability: {
                concurrent: {},
                sequential: {},
                resourceLimits: {}
            },
            regression: {
                baseline: null,
                changes: [],
                improvements: [],
                degradations: []
            }
        };
        
        this.memoryMonitorInterval = null;
        this.log = this.config.verbose ? console.log : () => {};
    }
    
    /**
     * Run comprehensive performance test suite
     */
    async runPerformanceTests() {
        console.log(chalk.blue('⚡ Starting OCR Performance Benchmarks...'));
        
        try {
            // Start memory monitoring
            this.startMemoryMonitoring();
            
            // Individual processing time tests
            console.log(chalk.cyan('   Testing individual image processing times...'));
            await this.testIndividualProcessingTimes();
            
            // Batch processing performance
            console.log(chalk.cyan('   Testing batch processing performance...'));
            await this.testBatchProcessingPerformance();
            
            // Memory usage and leak detection
            console.log(chalk.cyan('   Testing memory usage patterns...'));
            await this.testMemoryUsagePatterns();
            
            // Concurrent processing capabilities
            console.log(chalk.cyan('   Testing concurrent processing capabilities...'));
            await this.testConcurrentProcessing();
            
            // Accuracy vs speed trade-offs
            console.log(chalk.cyan('   Testing accuracy vs speed trade-offs...'));
            await this.testAccuracySpeedTradeOffs();
            
            // Resource utilization
            console.log(chalk.cyan('   Testing resource utilization...'));
            await this.testResourceUtilization();
            
            // Performance regression detection
            console.log(chalk.cyan('   Checking for performance regressions...'));
            await this.testPerformanceRegression();
            
            // Stop memory monitoring
            this.stopMemoryMonitoring();
            
            // Calculate final performance metrics
            this.calculatePerformanceMetrics();
            
            return this.performanceResults;
            
        } catch (error) {
            console.error(chalk.red(`❌ Performance tests failed: ${error.message}`));
            throw error;
        }
    }
    
    /**
     * Test individual image processing times
     */
    async testIndividualProcessingTimes() {
        const testImages = await this.loadPerformanceTestImages();
        const timingResults = [];
        
        for (const testImage of testImages) {
            try {
                this.log(chalk.gray(`     Processing: ${testImage.name} (${testImage.size})`));
                
                const metrics = await this.measureProcessingTime(testImage);
                timingResults.push({
                    image: testImage.name,
                    size: testImage.size,
                    dimensions: testImage.dimensions,
                    ...metrics
                });
                
                this.log(chalk.green(`     ✅ ${metrics.totalTime.toFixed(0)}ms (${metrics.accuracy.toFixed(1)}% accuracy)`));
                
            } catch (error) {
                timingResults.push({
                    image: testImage.name,
                    error: error.message,
                    totalTime: -1
                });
            }
        }
        
        this.performanceResults.timing.tests = timingResults;
        this.analyzeTimingResults(timingResults);
    }
    
    /**
     * Measure processing time for a single image
     */
    async measureProcessingTime(testImage) {
        const startTime = performance.now();
        const startMemory = process.memoryUsage();
        
        // Time individual phases
        const phases = {};
        
        // Image loading and preprocessing phase
        let phaseStart = performance.now();
        const preprocessedPath = await this.ocrFramework.preprocessImage(testImage.path, testImage.options);
        phases.preprocessing = performance.now() - phaseStart;
        
        // OCR extraction phase
        phaseStart = performance.now();
        const ocrResult = await this.ocrFramework.tesseractWorker.recognize(preprocessedPath);
        phases.ocrExtraction = performance.now() - phaseStart;
        
        // Text analysis phase
        phaseStart = performance.now();
        const structuredResult = this.ocrFramework.parseOcrResult(ocrResult);
        phases.textAnalysis = performance.now() - phaseStart;
        
        const totalTime = performance.now() - startTime;
        const endMemory = process.memoryUsage();
        
        // Calculate accuracy if ground truth available
        let accuracy = 0;
        if (testImage.expectedText) {
            accuracy = this.ocrFramework.calculateTextAccuracy(
                ocrResult.data.text,
                testImage.expectedText
            );
        }
        
        // Clean up preprocessed image
        if (preprocessedPath !== testImage.path) {
            await fs.unlink(preprocessedPath).catch(() => {}); // Silent fail
        }
        
        return {
            totalTime,
            phases,
            accuracy,
            confidence: ocrResult.data.confidence,
            memoryDelta: {
                rss: endMemory.rss - startMemory.rss,
                heapUsed: endMemory.heapUsed - startMemory.heapUsed,
                external: endMemory.external - startMemory.external
            },
            wordsProcessed: ocrResult.data.words?.length || 0,
            linesProcessed: ocrResult.data.lines?.length || 0
        };
    }
    
    /**
     * Test batch processing performance
     */
    async testBatchProcessingPerformance() {
        const testImages = await this.loadPerformanceTestImages();
        const batchSizes = [1, 3, 5, 10];
        
        for (const batchSize of batchSizes) {
            if (batchSize > testImages.length) continue;
            
            try {
                this.log(chalk.gray(`     Testing batch size: ${batchSize}`));
                
                const batch = testImages.slice(0, batchSize);
                const startTime = performance.now();
                const startMemory = process.memoryUsage();
                
                // Process batch sequentially (Tesseract doesn't handle concurrency well)
                const results = [];
                for (const testImage of batch) {
                    const result = await this.measureProcessingTime(testImage);
                    results.push(result);
                }
                
                const totalTime = performance.now() - startTime;
                const endMemory = process.memoryUsage();
                
                const batchMetrics = {
                    batchSize,
                    totalTime,
                    averageTime: totalTime / batchSize,
                    throughput: (batchSize / totalTime) * 1000, // Images per second
                    memoryUsage: endMemory.heapUsed - startMemory.heapUsed,
                    averageAccuracy: results.reduce((sum, r) => sum + (r.accuracy || 0), 0) / results.length
                };
                
                this.performanceResults.timing.batch = this.performanceResults.timing.batch || [];
                this.performanceResults.timing.batch.push(batchMetrics);
                
                this.log(chalk.green(`     ✅ ${batchMetrics.throughput.toFixed(2)} images/sec`));
                
            } catch (error) {
                console.error(chalk.red(`     ❌ Batch size ${batchSize} failed: ${error.message}`));
            }
        }
    }
    
    /**
     * Test memory usage patterns and detect leaks
     */
    async testMemoryUsagePatterns() {
        const testImages = await this.loadPerformanceTestImages();
        const memorySnapshots = [];
        
        // Baseline memory
        const baselineMemory = process.memoryUsage();
        memorySnapshots.push({ stage: 'baseline', ...baselineMemory, timestamp: Date.now() });
        
        // Process images multiple times to detect memory leaks
        const iterations = 3;
        for (let iteration = 0; iteration < iterations; iteration++) {
            this.log(chalk.gray(`     Memory test iteration ${iteration + 1}/${iterations}`));
            
            for (let i = 0; i < Math.min(5, testImages.length); i++) {
                const testImage = testImages[i];
                
                try {
                    await this.measureProcessingTime(testImage);
                    
                    // Snapshot memory after each image
                    const memory = process.memoryUsage();
                    memorySnapshots.push({
                        stage: `iteration_${iteration}_image_${i}`,
                        ...memory,
                        timestamp: Date.now()
                    });
                    
                } catch (error) {
                    // Continue with memory testing even if individual images fail
                }
            }
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
                const postGcMemory = process.memoryUsage();
                memorySnapshots.push({
                    stage: `post_gc_${iteration}`,
                    ...postGcMemory,
                    timestamp: Date.now()
                });
            }
        }
        
        // Analyze memory patterns
        this.analyzeMemoryPatterns(memorySnapshots, baselineMemory);
    }
    
    /**
     * Test concurrent processing capabilities
     */
    async testConcurrentProcessing() {
        // Note: Tesseract.js doesn't handle true concurrency well, but we can test
        // resource contention and queue management
        
        const testImages = await this.loadPerformanceTestImages();
        const concurrencyLevels = [1, 2, 3];
        
        for (const concurrency of concurrencyLevels) {
            try {
                this.log(chalk.gray(`     Testing concurrency level: ${concurrency}`));
                
                const imageBatch = testImages.slice(0, Math.min(concurrency * 2, testImages.length));
                const startTime = performance.now();
                
                // Split into concurrent batches
                const batches = [];
                for (let i = 0; i < concurrency; i++) {
                    const batchStart = Math.floor(i * imageBatch.length / concurrency);
                    const batchEnd = Math.floor((i + 1) * imageBatch.length / concurrency);
                    batches.push(imageBatch.slice(batchStart, batchEnd));
                }
                
                // Process batches (pseudo-concurrently)
                const batchPromises = batches.map(async (batch, index) => {
                    const batchResults = [];
                    for (const image of batch) {
                        const result = await this.measureProcessingTime(image);
                        batchResults.push(result);
                    }
                    return batchResults;
                });
                
                const results = await Promise.all(batchPromises);
                const totalTime = performance.now() - startTime;
                
                const concurrencyMetrics = {
                    concurrency,
                    totalImages: imageBatch.length,
                    totalTime,
                    throughput: (imageBatch.length / totalTime) * 1000,
                    averageTime: totalTime / imageBatch.length,
                    efficiency: (1 / concurrency) / (totalTime / imageBatch.length) // Concurrency efficiency
                };
                
                this.performanceResults.scalability.concurrent[concurrency] = concurrencyMetrics;
                
                this.log(chalk.green(`     ✅ ${concurrencyMetrics.throughput.toFixed(2)} images/sec (efficiency: ${(concurrencyMetrics.efficiency * 100).toFixed(1)}%)`));
                
            } catch (error) {
                console.error(chalk.red(`     ❌ Concurrency ${concurrency} failed: ${error.message}`));
            }
        }
    }
    
    /**
     * Test accuracy vs speed trade-offs
     */
    async testAccuracySpeedTradeOffs() {
        const testImages = await this.loadPerformanceTestImages().then(images => 
            images.filter(img => img.expectedText) // Only test images with ground truth
        );
        
        if (testImages.length === 0) {
            this.log(chalk.yellow('     ⚠️  No ground truth images available for accuracy testing'));
            return;
        }
        
        // Test different preprocessing options that affect speed vs accuracy
        const processingOptions = [
            { name: 'fast', maxDimension: 1024, enhanceContrast: false, sharpen: false },
            { name: 'balanced', maxDimension: 1536, enhanceContrast: true, sharpen: false },
            { name: 'accurate', maxDimension: 2048, enhanceContrast: true, sharpen: true }
        ];
        
        for (const options of processingOptions) {
            try {
                this.log(chalk.gray(`     Testing ${options.name} processing mode...`));
                
                const results = [];
                for (const testImage of testImages.slice(0, 3)) { // Limit to first 3 for speed
                    const testImageWithOptions = { ...testImage, options };
                    const result = await this.measureProcessingTime(testImageWithOptions);
                    results.push(result);
                }
                
                const tradeOffMetrics = {
                    mode: options.name,
                    averageTime: results.reduce((sum, r) => sum + r.totalTime, 0) / results.length,
                    averageAccuracy: results.reduce((sum, r) => sum + (r.accuracy || 0), 0) / results.length,
                    averageConfidence: results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length,
                    efficiencyScore: 0 // Will be calculated below
                };
                
                // Calculate efficiency score (accuracy / time ratio)
                tradeOffMetrics.efficiencyScore = tradeOffMetrics.averageAccuracy / tradeOffMetrics.averageTime * 1000;
                
                this.performanceResults.accuracy.bySpeed[options.name] = tradeOffMetrics;
                
                this.log(chalk.green(`     ✅ ${tradeOffMetrics.averageAccuracy.toFixed(1)}% accuracy, ${tradeOffMetrics.averageTime.toFixed(0)}ms avg`));
                
            } catch (error) {
                console.error(chalk.red(`     ❌ ${options.name} mode failed: ${error.message}`));
            }
        }
    }
    
    /**
     * Test resource utilization (CPU, memory, I/O)
     */
    async testResourceUtilization() {
        const testImage = (await this.loadPerformanceTestImages())[0];
        if (!testImage) return;
        
        this.log(chalk.gray('     Monitoring resource utilization...'));
        
        const utilization = {
            cpu: [],
            memory: [],
            io: []
        };
        
        // Start monitoring
        const monitoringInterval = setInterval(() => {
            const memory = process.memoryUsage();
            const cpuUsage = process.cpuUsage();
            
            utilization.memory.push({
                timestamp: Date.now(),
                heapUsed: memory.heapUsed,
                heapTotal: memory.heapTotal,
                rss: memory.rss
            });
            
            utilization.cpu.push({
                timestamp: Date.now(),
                user: cpuUsage.user,
                system: cpuUsage.system
            });
        }, 100); // Monitor every 100ms
        
        try {
            // Process image while monitoring
            await this.measureProcessingTime(testImage);
            
            clearInterval(monitoringInterval);
            
            // Calculate resource usage statistics
            const resourceStats = {
                memory: {
                    peak: Math.max(...utilization.memory.map(m => m.heapUsed)),
                    average: utilization.memory.reduce((sum, m) => sum + m.heapUsed, 0) / utilization.memory.length
                },
                cpu: {
                    totalUser: utilization.cpu[utilization.cpu.length - 1]?.user || 0,
                    totalSystem: utilization.cpu[utilization.cpu.length - 1]?.system || 0
                }
            };
            
            this.performanceResults.scalability.resourceLimits = resourceStats;
            
            this.log(chalk.green(`     ✅ Peak memory: ${(resourceStats.memory.peak / 1024 / 1024).toFixed(1)}MB`));
            
        } catch (error) {
            clearInterval(monitoringInterval);
            throw error;
        }
    }
    
    /**
     * Test for performance regressions
     */
    async testPerformanceRegression() {
        const baselinePath = path.join(this.config.outputDir, 'performance_baseline.json');
        
        try {
            // Try to load existing baseline
            const baselineData = await fs.readFile(baselinePath, 'utf-8');
            const baseline = JSON.parse(baselineData);
            
            this.performanceResults.regression.baseline = baseline;
            
            // Compare current results to baseline
            const currentAvgTime = this.performanceResults.timing.averages?.totalTime || 0;
            const baselineAvgTime = baseline.timing?.averages?.totalTime || 0;
            
            if (baselineAvgTime > 0) {
                const timeChange = ((currentAvgTime - baselineAvgTime) / baselineAvgTime) * 100;
                
                if (timeChange > 10) {
                    this.performanceResults.regression.degradations.push({
                        metric: 'averageTime',
                        change: timeChange,
                        current: currentAvgTime,
                        baseline: baselineAvgTime
                    });
                } else if (timeChange < -10) {
                    this.performanceResults.regression.improvements.push({
                        metric: 'averageTime',
                        change: Math.abs(timeChange),
                        current: currentAvgTime,
                        baseline: baselineAvgTime
                    });
                }
            }
            
            this.log(chalk.green('     ✅ Performance regression analysis complete'));
            
        } catch (error) {
            this.log(chalk.yellow('     ⚠️  No baseline found, current results will be saved as baseline'));
            
            // Save current results as new baseline
            await this.savePerformanceBaseline(baselinePath);
        }
    }
    
    /**
     * Start memory monitoring
     */
    startMemoryMonitoring() {
        let maxMemory = 0;
        let memoryReadings = [];
        
        this.memoryMonitorInterval = setInterval(() => {
            const memory = process.memoryUsage();
            maxMemory = Math.max(maxMemory, memory.heapUsed);
            memoryReadings.push(memory.heapUsed);
            
            // Keep only last 100 readings
            if (memoryReadings.length > 100) {
                memoryReadings = memoryReadings.slice(-100);
            }
            
            this.performanceResults.memory.peak = maxMemory;
            this.performanceResults.memory.average = 
                memoryReadings.reduce((sum, m) => sum + m, 0) / memoryReadings.length;
        }, 1000);
    }
    
    /**
     * Stop memory monitoring
     */
    stopMemoryMonitoring() {
        if (this.memoryMonitorInterval) {
            clearInterval(this.memoryMonitorInterval);
            this.memoryMonitorInterval = null;
        }
    }
    
    /**
     * Analyze timing results and calculate statistics
     */
    analyzeTimingResults(timingResults) {
        const validResults = timingResults.filter(r => r.totalTime > 0);
        if (validResults.length === 0) return;
        
        const times = validResults.map(r => r.totalTime).sort((a, b) => a - b);
        const accuracies = validResults.map(r => r.accuracy || 0).filter(a => a > 0);
        
        this.performanceResults.timing.averages = {
            totalTime: times.reduce((sum, t) => sum + t, 0) / times.length,
            accuracy: accuracies.length > 0 ? accuracies.reduce((sum, a) => sum + a, 0) / accuracies.length : 0,
            confidence: validResults.reduce((sum, r) => sum + (r.confidence || 0), 0) / validResults.length
        };
        
        this.performanceResults.timing.percentiles = {
            p50: times[Math.floor(times.length * 0.5)],
            p90: times[Math.floor(times.length * 0.9)],
            p99: times[Math.floor(times.length * 0.99)],
            min: times[0],
            max: times[times.length - 1]
        };
    }
    
    /**
     * Analyze memory usage patterns
     */
    analyzeMemoryPatterns(snapshots, baseline) {
        const memoryGrowth = snapshots.map((snapshot, index) => ({
            stage: snapshot.stage,
            growth: snapshot.heapUsed - baseline.heapUsed,
            timestamp: snapshot.timestamp
        }));
        
        // Detect potential memory leaks (consistent growth pattern)
        const growthTrend = memoryGrowth.slice(-5); // Last 5 snapshots
        const isIncreasingTrend = growthTrend.every((snapshot, index) => 
            index === 0 || snapshot.growth >= growthTrend[index - 1].growth
        );
        
        if (isIncreasingTrend && growthTrend.length >= 3) {
            const totalGrowth = growthTrend[growthTrend.length - 1].growth - growthTrend[0].growth;
            if (totalGrowth > 50 * 1024 * 1024) { // 50MB growth
                this.performanceResults.memory.leaks.push({
                    detected: true,
                    growth: totalGrowth,
                    pattern: 'consistent_growth',
                    severity: totalGrowth > 100 * 1024 * 1024 ? 'high' : 'medium'
                });
            }
        }
        
        this.performanceResults.memory.snapshots = memoryGrowth;
    }
    
    /**
     * Calculate final performance metrics
     */
    calculatePerformanceMetrics() {
        // Calculate performance grades
        const targets = this.config.performance?.timing || {};
        
        const averageTime = this.performanceResults.timing.averages?.totalTime || 0;
        const averageAccuracy = this.performanceResults.timing.averages?.accuracy || 0;
        const peakMemory = this.performanceResults.memory.peak || 0;
        
        // Performance grades (A-F scale)
        const grades = {
            speed: this.calculateSpeedGrade(averageTime, targets.maxOcrExtraction || 15000),
            accuracy: this.calculateAccuracyGrade(averageAccuracy),
            memory: this.calculateMemoryGrade(peakMemory, targets.maxOcrMemory || 100 * 1024 * 1024),
            overall: 'B' // Will be calculated
        };
        
        // Calculate overall grade (weighted average)
        const gradeValues = { 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'F': 0 };
        const overallScore = (
            gradeValues[grades.speed] * 0.4 +
            gradeValues[grades.accuracy] * 0.4 +
            gradeValues[grades.memory] * 0.2
        );
        
        grades.overall = Object.keys(gradeValues).find(grade => gradeValues[grade] <= overallScore + 0.5) || 'F';
        
        this.performanceResults.grades = grades;
        
        // Calculate efficiency metrics
        this.performanceResults.efficiency = {
            timePerWord: averageTime / (this.getAverageWordsProcessed() || 1),
            accuracyPerMs: averageAccuracy / (averageTime || 1),
            memoryEfficiency: (this.getAverageWordsProcessed() || 1) / (peakMemory / 1024 / 1024) // Words per MB
        };
    }
    
    /**
     * Calculate speed grade based on processing time
     */
    calculateSpeedGrade(averageTime, target) {
        if (averageTime <= target * 0.5) return 'A';
        if (averageTime <= target * 0.75) return 'B';
        if (averageTime <= target) return 'C';
        if (averageTime <= target * 1.5) return 'D';
        return 'F';
    }
    
    /**
     * Calculate accuracy grade
     */
    calculateAccuracyGrade(accuracy) {
        if (accuracy >= 95) return 'A';
        if (accuracy >= 85) return 'B';
        if (accuracy >= 75) return 'C';
        if (accuracy >= 65) return 'D';
        return 'F';
    }
    
    /**
     * Calculate memory grade based on peak usage
     */
    calculateMemoryGrade(peakMemory, target) {
        if (peakMemory <= target * 0.5) return 'A';
        if (peakMemory <= target * 0.75) return 'B';
        if (peakMemory <= target) return 'C';
        if (peakMemory <= target * 1.5) return 'D';
        return 'F';
    }
    
    /**
     * Get average words processed per image
     */
    getAverageWordsProcessed() {
        const validResults = this.performanceResults.timing.tests?.filter(r => r.wordsProcessed > 0) || [];
        if (validResults.length === 0) return 0;
        
        return validResults.reduce((sum, r) => sum + r.wordsProcessed, 0) / validResults.length;
    }
    
    /**
     * Save performance baseline for regression testing
     */
    async savePerformanceBaseline(baselinePath) {
        const baseline = {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            timing: this.performanceResults.timing,
            memory: this.performanceResults.memory,
            system: {
                platform: os.platform(),
                arch: os.arch(),
                nodeVersion: process.version,
                totalMemory: os.totalmem()
            }
        };
        
        await fs.writeFile(baselinePath, JSON.stringify(baseline, null, 2));
    }
    
    /**
     * Load performance test images
     */
    async loadPerformanceTestImages() {
        // This would typically load from a standardized set of test images
        // For now, return synthetic test data
        return [
            {
                name: 'small_flyer',
                path: path.join(__dirname, 'fixtures', 'images', 'small_test.jpg'),
                size: '500KB',
                dimensions: { width: 800, height: 600 },
                expectedText: 'SAMPLE TEXT FOR TESTING',
                options: { maxDimension: 1024, enhanceContrast: true }
            },
            {
                name: 'medium_flyer', 
                path: path.join(__dirname, 'fixtures', 'images', 'medium_test.jpg'),
                size: '1.2MB',
                dimensions: { width: 1200, height: 900 },
                expectedText: 'MEDIUM QUALITY FLYER TEXT',
                options: { maxDimension: 1536, enhanceContrast: true }
            },
            {
                name: 'large_flyer',
                path: path.join(__dirname, 'fixtures', 'images', 'large_test.jpg'), 
                size: '2.5MB',
                dimensions: { width: 2000, height: 1500 },
                expectedText: 'LARGE HIGH RESOLUTION FLYER',
                options: { maxDimension: 2048, enhanceContrast: true }
            }
        ];
    }
}

module.exports = OCRPerformanceTests;
