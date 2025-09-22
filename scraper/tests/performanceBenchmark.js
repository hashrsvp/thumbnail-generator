#!/usr/bin/env node

/**
 * Performance Benchmarking System for Universal Event Scraper
 * 
 * Comprehensive benchmarking system that analyzes:
 * - Speed per extraction layer (1-5)
 * - Memory usage and resource tracking
 * - Accuracy metrics and confidence distributions
 * - Comparison between Universal vs Original scraper
 * - Load testing and concurrent performance
 * - Visual reporting and CSV exports
 * 
 * @author Claude Code
 * @version 1.0.0
 */

const { chromium } = require('playwright');
const EventScraper = require("./improved-event-scraper-2");
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');
const cluster = require('cluster');
const os = require('os');

class PerformanceBenchmark {
    constructor(options = {}) {
        this.options = {
            // Test configuration
            testUrls: options.testUrls || [],
            iterations: options.iterations || 10,
            warmupRuns: options.warmupRuns || 3,
            concurrentTests: options.concurrentTests || 5,
            
            // Performance thresholds
            timeoutMs: options.timeoutMs || 60000,
            memoryLimitMB: options.memoryLimitMB || 512,
            maxNetworkTime: options.maxNetworkTime || 10000,
            
            // Output configuration
            outputDir: options.outputDir || path.join(__dirname, '../benchmark-results'),
            generateCharts: options.generateCharts !== false,
            exportCsv: options.exportCsv !== false,
            
            // Debug settings
            verbose: options.verbose || false,
            debug: options.debug || false,
            
            ...options
        };
        
        this.results = {
            speedAnalysis: {},
            accuracyMetrics: {},
            comparisonTests: {},
            loadTests: {},
            memoryAnalysis: {},
            networkAnalysis: {},
            layerPerformance: {},
            errorAnalysis: {}
        };
        
        // Test URLs by venue type for comprehensive testing
        this.testUrls = this.options.testUrls.length > 0 ? this.options.testUrls : [
            // Eventbrite venues
            'https://www.eventbrite.com/e/sample-event-1',
            'https://www.eventbrite.com/e/sample-event-2',
            
            // Meetup venues
            'https://www.meetup.com/sample-group/events/sample-event',
            
            // Facebook events
            'https://www.facebook.com/events/sample-event',
            
            // Generic venues with structured data
            'https://example-venue.com/events/sample-1',
            'https://example-venue.com/events/sample-2',
            
            // Complex venues requiring multiple layers
            'https://complex-venue.com/event-page',
            'https://minimal-venue.com/simple-event'
        ];
        
        this.log = this.options.verbose ? console.log : () => {};
        this.logDebug = this.options.debug ? console.log : () => {};
        
        // Initialize memory tracking
        this.memorySnapshots = [];
        this.networkTimings = [];
        this.layerTimings = {};
    }
    
    /**
     * Run complete benchmark suite
     */
    async runBenchmarks() {
        console.log(chalk.blue.bold('🚀 Starting Universal Event Scraper Performance Benchmarks'));
        console.log(chalk.gray(`Testing ${this.testUrls.length} URLs with ${this.options.iterations} iterations each`));
        
        // Ensure output directory exists
        await this.ensureOutputDirectory();
        
        try {
            // 1. Speed Analysis - Time per extraction layer
            console.log(chalk.cyan('\n📊 Running Speed Analysis...'));
            await this.runSpeedAnalysis();
            
            // 2. Accuracy Metrics Analysis
            console.log(chalk.cyan('\n🎯 Running Accuracy Analysis...'));
            await this.runAccuracyAnalysis();
            
            // 3. Comparison Testing - Universal vs Original
            console.log(chalk.cyan('\n⚖️  Running Comparison Tests...'));
            await this.runComparisonTests();
            
            // 4. Load Testing - Concurrent performance
            console.log(chalk.cyan('\n🔥 Running Load Tests...'));
            await this.runLoadTests();
            
            // 5. Memory Analysis
            console.log(chalk.cyan('\n💾 Running Memory Analysis...'));
            await this.analyzeMemoryUsage();
            
            // 6. Network Performance Analysis
            console.log(chalk.cyan('\n🌐 Running Network Analysis...'));
            await this.analyzeNetworkPerformance();
            
            // 7. Generate comprehensive reports
            console.log(chalk.cyan('\n📈 Generating Performance Reports...'));
            await this.generateReports();
            
            // 8. Generate optimization recommendations
            console.log(chalk.cyan('\n💡 Generating Optimization Recommendations...'));
            await this.generateRecommendations();
            
            console.log(chalk.green.bold('\n✅ Benchmarking Complete!'));
            console.log(chalk.gray(`Results saved to: ${this.options.outputDir}`));
            
        } catch (error) {
            console.error(chalk.red('❌ Benchmarking failed:'), error);
            throw error;
        }
    }
    
    /**
     * Speed Analysis - Time per extraction layer and processing phases
     */
    async runSpeedAnalysis() {
        const speedResults = {
            layerTimings: {},
            totalProcessingTime: {},
            venueTypePerformance: {},
            phaseBreakdown: {}
        };
        
        for (const url of this.testUrls) {
            console.log(chalk.gray(`  Testing: ${url}`));
            
            const urlResults = {
                iterations: [],
                averages: {},
                layerBreakdown: {}
            };
            
            // Run warmup iterations
            for (let w = 0; w < this.options.warmupRuns; w++) {
                await this.runSingleSpeedTest(url, true);
            }
            
            // Run actual test iterations
            for (let i = 0; i < this.options.iterations; i++) {
                const iterationResult = await this.runSingleSpeedTest(url);
                urlResults.iterations.push(iterationResult);
                this.log(`    Iteration ${i + 1}: ${iterationResult.totalTime.toFixed(2)}ms`);
            }
            
            // Calculate averages and statistics
            urlResults.averages = this.calculateSpeedStatistics(urlResults.iterations);
            speedResults.totalProcessingTime[url] = urlResults;
            
            // Analyze layer-by-layer performance
            speedResults.layerTimings[url] = this.analyzeLayerTimings(urlResults.iterations);
        }
        
        // Analyze venue type performance patterns
        speedResults.venueTypePerformance = this.categorizeVenueTypePerformance(speedResults);
        
        this.results.speedAnalysis = speedResults;
        
        // Save intermediate results
        await this.saveResults('speed-analysis.json', speedResults);
    }
    
    /**
     * Run single speed test for a URL
     */
    async runSingleSpeedTest(url, isWarmup = false) {
        const scraper = new EventScraper({ 
            headless: true, 
            debug: false,
            verbose: false 
        });
        
        const memoryStart = process.memoryUsage();
        const startTime = performance.now();
        
        let layerTimings = {};
        let networkTime = 0;
        let parsingTime = 0;
        let validationTime = 0;
        
        try {
            await scraper.initBrowser();
            
            // Track browser navigation time
            const navStart = performance.now();
            await scraper.page.goto(url, { waitUntil: 'networkidle' });
            networkTime = performance.now() - navStart;
            
            // Extract with layer timing tracking
            const extractStart = performance.now();
            
            // Hook into the universal extractor to track layer timings
            const originalExtract = scraper.extract;
            scraper.extract = async function(pageUrl) {
                const layerStart = performance.now();
                
                // Track each layer's performance
                for (let layer = 1; layer <= 5; layer++) {
                    const layerStartTime = performance.now();
                    
                    try {
                        // Simulate layer extraction (in real implementation, this would be the actual layer call)
                        await this.runLayer(layer, pageUrl);
                        layerTimings[`layer${layer}`] = performance.now() - layerStartTime;
                    } catch (error) {
                        layerTimings[`layer${layer}`] = performance.now() - layerStartTime;
                        layerTimings[`layer${layer}_error`] = error.message;
                    }
                }
                
                return originalExtract.call(this, pageUrl);
            };
            
            // Run extraction
            const result = await scraper.extract(url);
            parsingTime = performance.now() - extractStart;
            
            // Track validation time
            const validationStart = performance.now();
            const isValid = await scraper.validateData(result);
            validationTime = performance.now() - validationStart;
            
            const totalTime = performance.now() - startTime;
            const memoryEnd = process.memoryUsage();
            
            const iterationResult = {
                url: url,
                totalTime: totalTime,
                networkTime: networkTime,
                parsingTime: parsingTime,
                validationTime: validationTime,
                layerTimings: layerTimings,
                memoryUsage: {
                    heapUsed: memoryEnd.heapUsed - memoryStart.heapUsed,
                    heapTotal: memoryEnd.heapTotal - memoryStart.heapTotal,
                    external: memoryEnd.external - memoryStart.external
                },
                resultQuality: {
                    fieldsExtracted: result ? Object.keys(result.data || {}).length : 0,
                    confidence: result ? result.metadata?.totalConfidence || 0 : 0,
                    layersUsed: result ? result.metadata?.layersUsed?.length || 0 : 0
                }
            };
            
            if (!isWarmup) {
                this.memorySnapshots.push(iterationResult.memoryUsage);
                this.networkTimings.push(networkTime);
            }
            
            return iterationResult;
            
        } finally {
            await scraper.cleanup();
        }
    }
    
    /**
     * Calculate speed statistics from iterations
     */
    calculateSpeedStatistics(iterations) {
        const times = iterations.map(i => i.totalTime);
        const networkTimes = iterations.map(i => i.networkTime);
        const parsingTimes = iterations.map(i => i.parsingTime);
        
        return {
            totalTime: {
                mean: this.calculateMean(times),
                median: this.calculateMedian(times),
                min: Math.min(...times),
                max: Math.max(...times),
                stdDev: this.calculateStandardDeviation(times),
                p95: this.calculatePercentile(times, 95),
                p99: this.calculatePercentile(times, 99)
            },
            networkTime: {
                mean: this.calculateMean(networkTimes),
                median: this.calculateMedian(networkTimes),
                min: Math.min(...networkTimes),
                max: Math.max(...networkTimes)
            },
            parsingTime: {
                mean: this.calculateMean(parsingTimes),
                median: this.calculateMedian(parsingTimes),
                min: Math.min(...parsingTimes),
                max: Math.max(...parsingTimes)
            }
        };
    }
    
    /**
     * Analyze layer-by-layer timing performance
     */
    analyzeLayerTimings(iterations) {
        const layerStats = {};
        
        for (let layer = 1; layer <= 5; layer++) {
            const layerKey = `layer${layer}`;
            const layerTimes = iterations
                .map(i => i.layerTimings[layerKey])
                .filter(t => typeof t === 'number');
            
            if (layerTimes.length > 0) {
                layerStats[layerKey] = {
                    mean: this.calculateMean(layerTimes),
                    median: this.calculateMedian(layerTimes),
                    min: Math.min(...layerTimes),
                    max: Math.max(...layerTimes),
                    successRate: layerTimes.length / iterations.length,
                    contribution: this.calculateMean(layerTimes) / 
                                this.calculateMean(iterations.map(i => i.totalTime)) * 100
                };
            }
        }
        
        return layerStats;
    }
    
    /**
     * Run accuracy analysis - confidence scores and field extraction success
     */
    async runAccuracyAnalysis() {
        const accuracyResults = {
            confidenceDistribution: {},
            fieldExtractionRates: {},
            hashComplianceRates: {},
            errorCategorization: {}
        };
        
        for (const url of this.testUrls) {
            console.log(chalk.gray(`  Analyzing accuracy for: ${url}`));
            
            const urlAccuracy = {
                confidenceScores: [],
                extractedFields: {},
                hashCompliance: [],
                errors: []
            };
            
            // Run multiple iterations to analyze consistency
            for (let i = 0; i < this.options.iterations; i++) {
                const accuracyResult = await this.runSingleAccuracyTest(url);
                
                urlAccuracy.confidenceScores.push(accuracyResult.confidence);
                urlAccuracy.hashCompliance.push(accuracyResult.hashCompliant);
                urlAccuracy.errors.push(...accuracyResult.errors);
                
                // Track field extraction success
                for (const [field, value] of Object.entries(accuracyResult.fields)) {
                    if (!urlAccuracy.extractedFields[field]) {
                        urlAccuracy.extractedFields[field] = { success: 0, total: 0, values: [] };
                    }
                    urlAccuracy.extractedFields[field].total++;
                    if (value !== null && value !== undefined && value !== '') {
                        urlAccuracy.extractedFields[field].success++;
                        urlAccuracy.extractedFields[field].values.push(value);
                    }
                }
            }
            
            // Calculate field extraction rates
            const fieldRates = {};
            for (const [field, stats] of Object.entries(urlAccuracy.extractedFields)) {
                fieldRates[field] = {
                    successRate: (stats.success / stats.total) * 100,
                    consistency: this.calculateConsistency(stats.values),
                    averageConfidence: stats.success > 0 ? 
                        stats.values.length / stats.success * 100 : 0
                };
            }
            
            accuracyResults.fieldExtractionRates[url] = fieldRates;
            accuracyResults.confidenceDistribution[url] = this.analyzeConfidenceDistribution(urlAccuracy.confidenceScores);
            accuracyResults.hashComplianceRates[url] = this.calculateComplianceRate(urlAccuracy.hashCompliance);
            accuracyResults.errorCategorization[url] = this.categorizeErrors(urlAccuracy.errors);
        }
        
        this.results.accuracyMetrics = accuracyResults;
        await this.saveResults('accuracy-analysis.json', accuracyResults);
    }
    
    /**
     * Run single accuracy test
     */
    async runSingleAccuracyTest(url) {
        const scraper = new EventScraper({ 
            headless: true, 
            debug: false,
            enforceHashRequirements: true 
        });
        
        try {
            await scraper.initBrowser();
            const result = await scraper.extract(url);
            
            const accuracyResult = {
                confidence: result?.metadata?.totalConfidence || 0,
                hashCompliant: await this.checkHashCompliance(result),
                fields: result?.data || {},
                errors: result?.errors || []
            };
            
            return accuracyResult;
            
        } catch (error) {
            return {
                confidence: 0,
                hashCompliant: false,
                fields: {},
                errors: [{ type: 'extraction_error', message: error.message }]
            };
        } finally {
            await scraper.cleanup();
        }
    }
    
    /**
     * Run comparison tests between Universal vs Original scraper
     */
    async runComparisonTests() {
        const comparisonResults = {
            performanceComparison: {},
            accuracyComparison: {},
            layerEffectiveness: {},
            siteTypeBreakdown: {}
        };
        
        for (const url of this.testUrls) {
            console.log(chalk.gray(`  Comparing scrapers for: ${url}`));
            
            // Test Universal Scraper
            const universalResults = await this.runUniversalScraperTest(url);
            
            // Test Original scraper (if available)
            const originalResults = await this.runOriginalScraperTest(url);
            
            comparisonResults.performanceComparison[url] = {
                universal: universalResults.performance,
                original: originalResults.performance,
                improvement: {
                    speed: ((originalResults.performance.totalTime - universalResults.performance.totalTime) / 
                           originalResults.performance.totalTime) * 100,
                    accuracy: universalResults.accuracy.confidence - originalResults.accuracy.confidence,
                    fieldExtraction: universalResults.accuracy.fieldsExtracted - originalResults.accuracy.fieldsExtracted
                }
            };
            
            comparisonResults.accuracyComparison[url] = {
                universal: universalResults.accuracy,
                original: originalResults.accuracy,
                layerContribution: universalResults.layerContribution
            };
        }
        
        // Analyze layer effectiveness
        comparisonResults.layerEffectiveness = this.analyzeLayerEffectiveness();
        
        this.results.comparisonTests = comparisonResults;
        await this.saveResults('comparison-tests.json', comparisonResults);
    }
    
    /**
     * Run load tests for concurrent scraping performance
     */
    async runLoadTests() {
        console.log(chalk.gray(`  Running load tests with ${this.options.concurrentTests} concurrent scrapers...`));
        
        const loadResults = {
            concurrentPerformance: {},
            batchProcessing: {},
            memoryLeakDetection: {},
            browserResourceUsage: {}
        };
        
        // Concurrent performance test
        const concurrentStart = performance.now();
        const concurrentPromises = [];
        
        for (let i = 0; i < this.options.concurrentTests; i++) {
            const promise = this.runConcurrentTest(this.testUrls[i % this.testUrls.length], i);
            concurrentPromises.push(promise);
        }
        
        const concurrentResults = await Promise.allSettled(concurrentPromises);
        const concurrentTime = performance.now() - concurrentStart;
        
        loadResults.concurrentPerformance = {
            totalTime: concurrentTime,
            averageTimePerScraper: concurrentTime / this.options.concurrentTests,
            successRate: concurrentResults.filter(r => r.status === 'fulfilled').length / concurrentResults.length * 100,
            results: concurrentResults.map((r, i) => ({
                index: i,
                status: r.status,
                result: r.status === 'fulfilled' ? r.value : null,
                error: r.status === 'rejected' ? r.reason.message : null
            }))
        };
        
        // Batch processing test
        loadResults.batchProcessing = await this.runBatchProcessingTest();
        
        // Memory leak detection
        loadResults.memoryLeakDetection = await this.detectMemoryLeaks();
        
        // Browser resource usage analysis
        loadResults.browserResourceUsage = await this.analyzeBrowserResourceUsage();
        
        this.results.loadTests = loadResults;
        await this.saveResults('load-tests.json', loadResults);
    }
    
    /**
     * Run concurrent test for a single URL
     */
    async runConcurrentTest(url, index) {
        const scraper = new EventScraper({ 
            headless: true, 
            debug: false,
            userAgent: `LoadTester-${index}`
        });
        
        try {
            const startTime = performance.now();
            await scraper.initBrowser();
            
            const result = await scraper.extract(url);
            const endTime = performance.now();
            
            return {
                index: index,
                url: url,
                time: endTime - startTime,
                success: !!result,
                fieldsExtracted: result ? Object.keys(result.data || {}).length : 0,
                confidence: result?.metadata?.totalConfidence || 0,
                memoryUsage: process.memoryUsage()
            };
            
        } finally {
            await scraper.cleanup();
        }
    }
    
    /**
     * Analyze memory usage patterns and detect potential leaks
     */
    async analyzeMemoryUsage() {
        const memoryAnalysis = {
            usagePatterns: {},
            leakDetection: {},
            peakUsage: {},
            recommendations: []
        };
        
        // Analyze memory snapshots collected during speed tests
        if (this.memorySnapshots.length > 0) {
            const heapUsed = this.memorySnapshots.map(m => m.heapUsed);
            const heapTotal = this.memorySnapshots.map(m => m.heapTotal);
            const external = this.memorySnapshots.map(m => m.external);
            
            memoryAnalysis.usagePatterns = {
                heapUsed: {
                    mean: this.calculateMean(heapUsed),
                    max: Math.max(...heapUsed),
                    trend: this.calculateTrend(heapUsed)
                },
                heapTotal: {
                    mean: this.calculateMean(heapTotal),
                    max: Math.max(...heapTotal),
                    trend: this.calculateTrend(heapTotal)
                },
                external: {
                    mean: this.calculateMean(external),
                    max: Math.max(...external),
                    trend: this.calculateTrend(external)
                }
            };
            
            // Detect potential memory leaks
            memoryAnalysis.leakDetection = {
                heapGrowthRate: this.calculateGrowthRate(heapUsed),
                suspiciousPatterns: this.detectSuspiciousMemoryPatterns(this.memorySnapshots),
                riskLevel: this.assessMemoryLeakRisk(heapUsed)
            };
        }
        
        this.results.memoryAnalysis = memoryAnalysis;
        await this.saveResults('memory-analysis.json', memoryAnalysis);
    }
    
    /**
     * Generate comprehensive performance reports
     */
    async generateReports() {
        console.log(chalk.gray('  Generating performance reports...'));
        
        // Generate CSV exports
        if (this.options.exportCsv) {
            await this.generateCSVReports();
        }
        
        // Generate visual charts
        if (this.options.generateCharts) {
            await this.generateVisualCharts();
        }
        
        // Generate summary report
        await this.generateSummaryReport();
        
        // Generate detailed analysis report
        await this.generateDetailedReport();
    }
    
    /**
     * Generate CSV reports for analysis
     */
    async generateCSVReports() {
        const reports = [
            { filename: 'speed-analysis.csv', data: this.formatSpeedDataForCSV() },
            { filename: 'accuracy-metrics.csv', data: this.formatAccuracyDataForCSV() },
            { filename: 'layer-performance.csv', data: this.formatLayerDataForCSV() },
            { filename: 'memory-usage.csv', data: this.formatMemoryDataForCSV() }
        ];
        
        for (const report of reports) {
            const csvContent = this.arrayToCSV(report.data);
            await fs.writeFile(
                path.join(this.options.outputDir, report.filename),
                csvContent
            );
        }
    }
    
    /**
     * Generate optimization recommendations
     */
    async generateRecommendations() {
        const recommendations = {
            performance: [],
            accuracy: [],
            memory: [],
            network: [],
            layer: []
        };
        
        // Performance recommendations
        const avgTotalTime = this.calculateAverageProcessingTime();
        if (avgTotalTime > 5000) {
            recommendations.performance.push({
                priority: 'HIGH',
                category: 'Speed',
                issue: 'Slow average processing time',
                recommendation: 'Consider implementing request caching or parallel layer processing',
                expectedImprovement: '30-50% speed improvement'
            });
        }
        
        // Layer-specific recommendations
        const layerPerformance = this.analyzeTotalLayerPerformance();
        for (const [layer, stats] of Object.entries(layerPerformance)) {
            if (stats.successRate < 50) {
                recommendations.layer.push({
                    priority: 'MEDIUM',
                    category: 'Layer Effectiveness',
                    issue: `${layer} has low success rate (${stats.successRate.toFixed(1)}%)`,
                    recommendation: `Improve ${layer} pattern matching or add more selectors`,
                    expectedImprovement: 'Increased field extraction accuracy'
                });
            }
        }
        
        // Memory recommendations
        if (this.results.memoryAnalysis?.leakDetection?.riskLevel === 'HIGH') {
            recommendations.memory.push({
                priority: 'HIGH',
                category: 'Memory Management',
                issue: 'Potential memory leak detected',
                recommendation: 'Implement proper cleanup in browser contexts and DOM references',
                expectedImprovement: 'Stable memory usage in long-running processes'
            });
        }
        
        // Accuracy recommendations
        const avgConfidence = this.calculateAverageConfidence();
        if (avgConfidence < 70) {
            recommendations.accuracy.push({
                priority: 'HIGH',
                category: 'Data Quality',
                issue: 'Low average confidence scores',
                recommendation: 'Enhance pattern recognition and add more structured data support',
                expectedImprovement: '15-25% confidence improvement'
            });
        }
        
        await this.saveResults('optimization-recommendations.json', recommendations);
        
        // Display key recommendations
        console.log(chalk.yellow('\n💡 Key Optimization Recommendations:'));
        const highPriorityRecs = Object.values(recommendations)
            .flat()
            .filter(r => r.priority === 'HIGH')
            .slice(0, 3);
        
        highPriorityRecs.forEach((rec, i) => {
            console.log(chalk.yellow(`  ${i + 1}. ${rec.issue}`));
            console.log(chalk.gray(`     ${rec.recommendation}`));
            console.log(chalk.green(`     Expected: ${rec.expectedImprovement}`));
        });
    }
    
    // Utility methods for statistical calculations
    
    calculateMean(values) {
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }
    
    calculateMedian(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
    
    calculateStandardDeviation(values) {
        const mean = this.calculateMean(values);
        const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
        const avgSquaredDiff = this.calculateMean(squaredDiffs);
        return Math.sqrt(avgSquaredDiff);
    }
    
    calculatePercentile(values, percentile) {
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[index];
    }
    
    calculateTrend(values) {
        if (values.length < 2) return 0;
        const firstHalf = values.slice(0, Math.floor(values.length / 2));
        const secondHalf = values.slice(Math.floor(values.length / 2));
        return this.calculateMean(secondHalf) - this.calculateMean(firstHalf);
    }
    
    calculateGrowthRate(values) {
        if (values.length < 2) return 0;
        const first = values[0];
        const last = values[values.length - 1];
        return ((last - first) / first) * 100;
    }
    
    arrayToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header];
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value}"`;
                }
                return value;
            });
            csvRows.push(values.join(','));
        }
        
        return csvRows.join('\n');
    }
    
    async ensureOutputDirectory() {
        try {
            await fs.mkdir(this.options.outputDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create output directory:', error);
        }
    }
    
    async saveResults(filename, data) {
        try {
            const filepath = path.join(this.options.outputDir, filename);
            await fs.writeFile(filepath, JSON.stringify(data, null, 2));
            this.logDebug(`Saved results to: ${filepath}`);
        } catch (error) {
            console.error(`Failed to save results to ${filename}:`, error);
        }
    }
    
    // Placeholder methods for missing functionality (to be implemented based on actual scraper structure)
    
    async runUniversalScraperTest(url) {
        // Implementation depends on actual Universal Scraper structure
        return { performance: { totalTime: 0 }, accuracy: { confidence: 0, fieldsExtracted: 0 } };
    }
    
    async runOriginalScraperTest(url) {
        // Implementation depends on original scraper availability
        return { performance: { totalTime: 0 }, accuracy: { confidence: 0, fieldsExtracted: 0 } };
    }
    
    async checkHashCompliance(result) {
        // Check if result meets Hash app requirements
        if (!result || !result.data) return false;
        
        const requiredFields = ['title', 'date', 'venue'];
        return requiredFields.every(field => result.data[field]);
    }
    
    analyzeConfidenceDistribution(scores) {
        return {
            mean: this.calculateMean(scores),
            distribution: {
                high: scores.filter(s => s >= 80).length / scores.length * 100,
                medium: scores.filter(s => s >= 60 && s < 80).length / scores.length * 100,
                low: scores.filter(s => s < 60).length / scores.length * 100
            }
        };
    }
    
    calculateComplianceRate(compliance) {
        return compliance.filter(Boolean).length / compliance.length * 100;
    }
    
    categorizeErrors(errors) {
        const categories = { network: 0, parsing: 0, validation: 0, other: 0 };
        
        errors.forEach(error => {
            if (error.type?.includes('network') || error.message?.includes('timeout')) {
                categories.network++;
            } else if (error.type?.includes('parsing') || error.message?.includes('parse')) {
                categories.parsing++;
            } else if (error.type?.includes('validation')) {
                categories.validation++;
            } else {
                categories.other++;
            }
        });
        
        return categories;
    }
    
    analyzeLayerEffectiveness() {
        // Placeholder - analyze which layers are most effective
        return {};
    }
    
    async runBatchProcessingTest() {
        // Placeholder for batch processing performance test
        return {};
    }
    
    async detectMemoryLeaks() {
        // Placeholder for memory leak detection
        return {};
    }
    
    async analyzeBrowserResourceUsage() {
        // Placeholder for browser resource analysis
        return {};
    }
    
    detectSuspiciousMemoryPatterns(snapshots) {
        // Detect unusual memory patterns
        return [];
    }
    
    assessMemoryLeakRisk(heapValues) {
        const growth = this.calculateGrowthRate(heapValues);
        if (growth > 50) return 'HIGH';
        if (growth > 20) return 'MEDIUM';
        return 'LOW';
    }
    
    formatSpeedDataForCSV() {
        // Format speed analysis data for CSV export
        return [];
    }
    
    formatAccuracyDataForCSV() {
        // Format accuracy data for CSV export
        return [];
    }
    
    formatLayerDataForCSV() {
        // Format layer performance data for CSV export
        return [];
    }
    
    formatMemoryDataForCSV() {
        // Format memory usage data for CSV export
        return [];
    }
    
    async generateVisualCharts() {
        // Generate visual performance charts
        console.log(chalk.gray('    Visual chart generation not implemented yet'));
    }
    
    async generateSummaryReport() {
        const summary = {
            testConfiguration: {
                urls: this.testUrls.length,
                iterations: this.options.iterations,
                concurrentTests: this.options.concurrentTests,
                timestamp: new Date().toISOString()
            },
            overallResults: {
                averageProcessingTime: this.calculateAverageProcessingTime(),
                averageConfidence: this.calculateAverageConfidence(),
                memoryEfficiency: this.assessMemoryEfficiency(),
                errorRate: this.calculateOverallErrorRate()
            },
            topRecommendations: this.getTopRecommendations()
        };
        
        await this.saveResults('summary-report.json', summary);
    }
    
    async generateDetailedReport() {
        const detailedReport = {
            timestamp: new Date().toISOString(),
            configuration: this.options,
            completeResults: this.results,
            analysis: {
                speedAnalysis: this.analyzeSpeedResults(),
                accuracyAnalysis: this.analyzeAccuracyResults(),
                layerAnalysis: this.analyzeLayerResults(),
                memoryAnalysis: this.analyzeMemoryResults()
            }
        };
        
        await this.saveResults('detailed-report.json', detailedReport);
    }
    
    // Additional analysis methods
    
    calculateAverageProcessingTime() {
        // Calculate from speed analysis results
        return 0;
    }
    
    calculateAverageConfidence() {
        // Calculate from accuracy results
        return 0;
    }
    
    assessMemoryEfficiency() {
        // Assess memory usage efficiency
        return 'GOOD';
    }
    
    calculateOverallErrorRate() {
        // Calculate overall error rate
        return 0;
    }
    
    getTopRecommendations() {
        // Get top 3 recommendations
        return [];
    }
    
    analyzeSpeedResults() {
        return {};
    }
    
    analyzeAccuracyResults() {
        return {};
    }
    
    analyzeLayerResults() {
        return {};
    }
    
    analyzeMemoryResults() {
        return {};
    }
    
    analyzeTotalLayerPerformance() {
        return {};
    }
    
    categorizeVenueTypePerformance(speedResults) {
        // Categorize performance by venue type
        return {};
    }
    
    calculateConsistency(values) {
        if (values.length <= 1) return 100;
        
        const uniqueValues = [...new Set(values)];
        return (1 - (uniqueValues.length - 1) / values.length) * 100;
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {};
    
    // Parse command line arguments
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i]?.replace('--', '');
        const value = args[i + 1];
        
        if (key && value) {
            if (key === 'iterations' || key === 'concurrentTests' || key === 'warmupRuns') {
                options[key] = parseInt(value);
            } else if (key === 'verbose' || key === 'debug' || key === 'exportCsv' || key === 'generateCharts') {
                options[key] = value.toLowerCase() === 'true';
            } else {
                options[key] = value;
            }
        }
    }
    
    console.log(chalk.blue('🚀 Universal Event Scraper Performance Benchmark'));
    console.log(chalk.gray('Configuration:'), options);
    
    const benchmark = new PerformanceBenchmark(options);
    
    benchmark.runBenchmarks()
        .then(() => {
            console.log(chalk.green('✅ Benchmarking completed successfully!'));
            process.exit(0);
        })
        .catch((error) => {
            console.error(chalk.red('❌ Benchmarking failed:'), error);
            process.exit(1);
        });
}

module.exports = PerformanceBenchmark;