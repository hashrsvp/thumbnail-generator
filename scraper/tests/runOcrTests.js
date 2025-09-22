#!/usr/bin/env node

/**
 * OCR Test Runner - Main Entry Point
 * 
 * Comprehensive OCR testing system that runs all test suites:
 * - Text extraction accuracy tests
 * - Flyer type specific tests
 * - Performance benchmarking
 * - Integration tests with Universal Extractor
 * - Error handling and edge case tests
 * - Validation and reporting
 * 
 * @version 1.0.0
 * @author Claude Code - QA Testing Framework
 */

const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');

// Import test modules
const { getOcrConfig } = require('./ocrTestConfig');
const OCRTestFramework = require('./ocrTestFramework');
const OCRFlyerTypeTests = require('./ocrFlyerTypeTests');
const OCRPerformanceTests = require('./ocrPerformanceTests');
const OCRIntegrationTests = require('./ocrIntegrationTests');
const OCRErrorHandlingTests = require('./ocrErrorHandlingTests');
const OCRValidationFramework = require('./ocrValidationFramework');
const OCRTestFixtureGenerator = require('./fixtures/createTestFixtures');

class OCRTestRunner {
    constructor(options = {}) {
        this.options = {
            environment: options.environment || 'development',
            generateFixtures: options.generateFixtures !== false,
            runAllTests: options.runAllTests !== false,
            generateReports: options.generateReports !== false,
            verbose: options.verbose || false,
            suites: options.suites || ['all'], // Which test suites to run
            ...options
        };
        
        this.config = getOcrConfig(this.options.environment);
        this.testResults = {
            summary: {
                startTime: null,
                endTime: null,
                totalDuration: 0,
                totalTests: 0,
                passedTests: 0,
                failedTests: 0,
                skippedTests: 0,
                overallSuccess: false
            },
            suiteResults: {},
            validationResults: null,
            recommendations: [],
            artifacts: {
                reports: [],
                fixtures: [],
                logs: []
            }
        };
        
        this.ocrFramework = null;
        this.log = this.options.verbose ? console.log : () => {};
    }
    
    /**
     * Run the complete OCR test suite
     */
    async runTests() {
        console.log(chalk.blue('\n🧪 OCR Test Suite Runner'));
        console.log(chalk.blue('=' .repeat(50)));
        console.log(chalk.cyan(`Environment: ${this.options.environment}`));
        console.log(chalk.cyan(`Test Suites: ${this.options.suites.join(', ')}`));
        console.log(chalk.blue('=' .repeat(50)));
        
        const startTime = performance.now();
        this.testResults.summary.startTime = new Date().toISOString();
        
        try {
            // Step 1: Generate test fixtures if requested
            if (this.options.generateFixtures) {
                console.log(chalk.yellow('\n📝 Step 1: Generating Test Fixtures...'));
                await this.generateTestFixtures();
            }
            
            // Step 2: Initialize OCR framework
            console.log(chalk.yellow('\n🔧 Step 2: Initializing OCR Framework...'));
            await this.initializeOCRFramework();
            
            // Step 3: Run test suites
            console.log(chalk.yellow('\n🧪 Step 3: Running Test Suites...'));
            await this.runTestSuites();
            
            // Step 4: Validate results
            console.log(chalk.yellow('\n⚙️  Step 4: Validating Results...'));
            await this.validateResults();
            
            // Step 5: Generate reports
            if (this.options.generateReports) {
                console.log(chalk.yellow('\n📈 Step 5: Generating Reports...'));
                await this.generateReports();
            }
            
            // Step 6: Display summary
            const endTime = performance.now();
            this.testResults.summary.endTime = new Date().toISOString();
            this.testResults.summary.totalDuration = endTime - startTime;
            
            this.displaySummary();
            
            return this.testResults;
            
        } catch (error) {
            console.error(chalk.red(`\n❌ Test execution failed: ${error.message}`));
            console.error(chalk.gray(error.stack));
            
            this.testResults.summary.overallSuccess = false;
            return this.testResults;
            
        } finally {
            // Cleanup
            await this.cleanup();
        }
    }
    
    /**
     * Generate test fixtures
     */
    async generateTestFixtures() {
        try {
            const fixturesDir = path.join(this.config.outputDir, 'fixtures', 'images');
            const generator = new OCRTestFixtureGenerator(fixturesDir);
            
            const fixtures = await generator.generateAllFixtures();
            this.testResults.artifacts.fixtures = fixtures;
            
            console.log(chalk.green(`✅ Generated ${fixtures.length} test fixtures`));
            
        } catch (error) {
            console.warn(chalk.yellow(`⚠️  Fixture generation failed: ${error.message}`));
            // Continue without fixtures if generation fails
        }
    }
    
    /**
     * Initialize OCR framework
     */
    async initializeOCRFramework() {
        this.ocrFramework = new OCRTestFramework(this.options);
        const initialized = await this.ocrFramework.initialize();
        
        if (!initialized) {
            throw new Error('Failed to initialize OCR test framework');
        }
        
        console.log(chalk.green('✅ OCR framework initialized successfully'));
    }
    
    /**
     * Run all requested test suites
     */
    async runTestSuites() {
        const availableSuites = {
            accuracy: this.runAccuracyTests.bind(this),
            flyerTypes: this.runFlyerTypeTests.bind(this),
            performance: this.runPerformanceTests.bind(this),
            integration: this.runIntegrationTests.bind(this),
            errorHandling: this.runErrorHandlingTests.bind(this)
        };
        
        const suitesToRun = this.options.suites.includes('all') ? 
            Object.keys(availableSuites) : 
            this.options.suites.filter(suite => availableSuites[suite]);
        
        for (const suiteName of suitesToRun) {
            try {
                console.log(chalk.cyan(`\n   Running ${suiteName} test suite...`));
                const suiteStartTime = performance.now();
                
                const suiteResults = await availableSuites[suiteName]();
                
                const suiteDuration = performance.now() - suiteStartTime;
                this.testResults.suiteResults[suiteName] = {
                    ...suiteResults,
                    duration: suiteDuration,
                    success: this.evaluateSuiteSuccess(suiteResults)
                };
                
                // Update overall counters
                this.updateOverallCounters(suiteResults);
                
                const suiteSuccess = this.testResults.suiteResults[suiteName].success;
                const statusIcon = suiteSuccess ? '✅' : '❌';
                const statusColor = suiteSuccess ? chalk.green : chalk.red;
                
                console.log(statusColor(`${statusIcon} ${suiteName} suite completed (${(suiteDuration/1000).toFixed(1)}s)`));
                
            } catch (error) {
                console.error(chalk.red(`❌ ${suiteName} suite failed: ${error.message}`));
                this.testResults.suiteResults[suiteName] = {
                    success: false,
                    error: error.message,
                    duration: 0
                };
            }
        }
    }
    
    /**
     * Run accuracy tests
     */
    async runAccuracyTests() {
        const results = await this.ocrFramework.runTextExtractionTests();
        return {
            type: 'accuracy',
            results: this.ocrFramework.results.testResults.textExtraction || {},
            metrics: {
                averageAccuracy: this.calculateAverageAccuracy(results),
                passRate: this.calculatePassRate(results)
            }
        };
    }
    
    /**
     * Run flyer type specific tests
     */
    async runFlyerTypeTests() {
        const flyerTypeTests = new OCRFlyerTypeTests(this.ocrFramework);
        const results = await flyerTypeTests.runAllFlyerTypeTests();
        
        return {
            type: 'flyerTypes',
            results: results.byFlyerType,
            metrics: {
                flyerTypestested: Object.keys(results.byFlyerType).length,
                overallQuality: this.calculateOverallQuality(results)
            }
        };
    }
    
    /**
     * Run performance tests
     */
    async runPerformanceTests() {
        const performanceTests = new OCRPerformanceTests(this.ocrFramework);
        const results = await performanceTests.runPerformanceTests();
        
        return {
            type: 'performance',
            results: results,
            metrics: {
                averageTime: results.timing?.averages?.totalTime || 0,
                peakMemory: results.memory?.peak || 0,
                throughput: results.efficiency?.timePerWord || 0
            }
        };
    }
    
    /**
     * Run integration tests
     */
    async runIntegrationTests() {
        const integrationTests = new OCRIntegrationTests(this.ocrFramework);
        const results = await integrationTests.runIntegrationTests();
        
        return {
            type: 'integration',
            results: results,
            metrics: {
                universalExtractorTests: results.universalExtractorTests?.length || 0,
                integrationSuccessRate: this.calculateIntegrationSuccessRate(results)
            }
        };
    }
    
    /**
     * Run error handling tests
     */
    async runErrorHandlingTests() {
        const errorTests = new OCRErrorHandlingTests(this.ocrFramework);
        const results = await errorTests.runErrorHandlingTests();
        
        return {
            type: 'errorHandling',
            results: results,
            metrics: {
                errorScenariosTests: this.countErrorScenarios(results),
                robustnessScore: this.calculateRobustnessScore(results)
            }
        };
    }
    
    /**
     * Validate all test results
     */
    async validateResults() {
        try {
            const validator = new OCRValidationFramework({
                accuracyThresholds: this.config.quality.accuracy,
                performanceThresholds: this.config.performance.timing
            });
            
            // Combine all test results for validation
            const combinedResults = this.combineTestResults();
            
            const validationResults = await validator.validateTestResults(combinedResults);
            this.testResults.validationResults = validationResults;
            this.testResults.recommendations = validationResults.recommendations;
            
            const overallPassed = validationResults.summary.passed;
            const overallGrade = validationResults.summary.overallGrade;
            
            console.log(overallPassed ? 
                chalk.green(`✅ Validation passed - Overall grade: ${overallGrade}`) :
                chalk.red(`❌ Validation failed - Overall grade: ${overallGrade}`)
            );
            
            this.testResults.summary.overallSuccess = overallPassed;
            
        } catch (error) {
            console.warn(chalk.yellow(`⚠️  Validation failed: ${error.message}`));
            this.testResults.summary.overallSuccess = false;
        }
    }
    
    /**
     * Generate comprehensive reports
     */
    async generateReports() {
        try {
            const reportsDir = path.join(this.config.outputDir, 'reports');
            await fs.mkdir(reportsDir, { recursive: true });
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            
            // Generate JSON report
            const jsonReportPath = path.join(reportsDir, `ocr_test_results_${timestamp}.json`);
            await this.generateJSONReport(jsonReportPath);
            
            // Generate HTML report
            const htmlReportPath = path.join(reportsDir, `ocr_test_report_${timestamp}.html`);
            await this.generateHTMLReport(htmlReportPath);
            
            // Generate summary report
            const summaryReportPath = path.join(reportsDir, `ocr_test_summary_${timestamp}.txt`);
            await this.generateSummaryReport(summaryReportPath);
            
            this.testResults.artifacts.reports = [
                jsonReportPath,
                htmlReportPath,
                summaryReportPath
            ];
            
            console.log(chalk.green(`✅ Reports generated: ${this.testResults.artifacts.reports.length} files`));
            
        } catch (error) {
            console.warn(chalk.yellow(`⚠️  Report generation failed: ${error.message}`));
        }
    }
    
    /**
     * Generate JSON report
     */
    async generateJSONReport(filePath) {
        const report = {
            metadata: {
                timestamp: new Date().toISOString(),
                environment: this.options.environment,
                version: '1.0.0',
                duration: this.testResults.summary.totalDuration
            },
            summary: this.testResults.summary,
            suiteResults: this.testResults.suiteResults,
            validation: this.testResults.validationResults,
            recommendations: this.testResults.recommendations,
            artifacts: this.testResults.artifacts
        };
        
        await fs.writeFile(filePath, JSON.stringify(report, null, 2));
    }
    
    /**
     * Generate HTML report
     */
    async generateHTMLReport(filePath) {
        const htmlContent = this.generateHTMLContent();
        await fs.writeFile(filePath, htmlContent);
    }
    
    /**
     * Generate summary text report
     */
    async generateSummaryReport(filePath) {
        const summary = this.generateTextSummary();
        await fs.writeFile(filePath, summary);
    }
    
    /**
     * Display test results summary
     */
    displaySummary() {
        const summary = this.testResults.summary;
        const validation = this.testResults.validationResults;
        
        console.log(chalk.blue('\n\n📈 OCR Test Results Summary'));
        console.log(chalk.blue('=' .repeat(50)));
        
        // Overall results
        const overallStatus = summary.overallSuccess ? 
            chalk.green('✅ PASSED') : chalk.red('❌ FAILED');
        console.log(chalk.cyan(`Overall Status: ${overallStatus}`));
        
        if (validation) {
            console.log(chalk.cyan(`Overall Grade: ${this.getGradeColor(validation.summary.overallGrade)}${validation.summary.overallGrade}${chalk.reset()} (${validation.summary.overallScore}/100)`));
        }
        
        // Test statistics
        console.log(chalk.cyan(`Total Tests: ${summary.totalTests}`));
        console.log(chalk.green(`Passed: ${summary.passedTests}`));
        console.log(chalk.red(`Failed: ${summary.failedTests}`));
        if (summary.skippedTests > 0) {
            console.log(chalk.yellow(`Skipped: ${summary.skippedTests}`));
        }
        
        const passRate = summary.totalTests > 0 ? 
            ((summary.passedTests / summary.totalTests) * 100).toFixed(1) : '0';
        console.log(chalk.cyan(`Pass Rate: ${passRate}%`));
        
        // Duration
        console.log(chalk.cyan(`Total Duration: ${(summary.totalDuration / 1000).toFixed(1)} seconds`));
        
        // Suite breakdown
        console.log(chalk.blue('\nSuite Results:'));
        for (const [suiteName, suiteResult] of Object.entries(this.testResults.suiteResults)) {
            const status = suiteResult.success ? chalk.green('✅') : chalk.red('❌');
            const duration = (suiteResult.duration / 1000).toFixed(1);
            console.log(`  ${status} ${suiteName}: ${duration}s`);
        }
        
        // Key metrics
        if (validation) {
            console.log(chalk.blue('\nKey Metrics:'));
            if (validation.accuracy?.overall) {
                console.log(`  Accuracy: ${validation.accuracy.overall.score.toFixed(1)}% (${validation.accuracy.overall.grade})`);
            }
            if (validation.performance?.timing) {
                console.log(`  Avg Processing Time: ${validation.performance.timing.average.toFixed(0)}ms (${validation.performance.timing.grade})`);
            }
            if (validation.quality?.overall) {
                console.log(`  Quality Score: ${validation.quality.overall.score.toFixed(1)}% (${validation.quality.overall.grade})`);
            }
        }
        
        // Critical issues
        if (validation?.summary.criticalIssues?.length > 0) {
            console.log(chalk.red('\n⚠️  Critical Issues:'));
            for (const issue of validation.summary.criticalIssues) {
                console.log(chalk.red(`  • ${issue}`));
            }
        }
        
        // Recommendations
        if (this.testResults.recommendations?.length > 0) {
            console.log(chalk.yellow('\n💡 Top Recommendations:'));
            const topRecommendations = this.testResults.recommendations
                .filter(r => r.priority === 'high')
                .slice(0, 3);
            
            for (const rec of topRecommendations) {
                console.log(chalk.yellow(`  • ${rec.title}: ${rec.description}`));
            }
        }
        
        // Artifacts
        if (this.testResults.artifacts.reports?.length > 0) {
            console.log(chalk.blue('\n📁 Generated Reports:'));
            for (const reportPath of this.testResults.artifacts.reports) {
                console.log(chalk.gray(`  ${reportPath}`));
            }
        }
        
        console.log(chalk.blue('=' .repeat(50)));
    }
    
    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            if (this.ocrFramework) {
                await this.ocrFramework.cleanup();
            }
            
            // Clean up temporary files
            const tempDirs = [
                path.join(this.config.outputDir, 'processed'),
                path.join(this.config.outputDir, 'error_test_images'),
                path.join(this.config.outputDir, 'edge_case_images')
            ];
            
            for (const tempDir of tempDirs) {
                try {
                    const files = await fs.readdir(tempDir);
                    for (const file of files) {
                        if (file.startsWith('temp_') || file.startsWith('processed_') || 
                            file.startsWith('corrupted_') || file.startsWith('edge_case_')) {
                            await fs.unlink(path.join(tempDir, file));
                        }
                    }
                } catch (error) {
                    // Silent cleanup failures
                }
            }
            
        } catch (error) {
            console.warn(chalk.yellow(`⚠️  Cleanup warning: ${error.message}`));
        }
    }
    
    // Helper methods
    
    evaluateSuiteSuccess(suiteResults) {
        if (suiteResults.error) return false;
        
        // Check if the suite has meaningful results
        if (suiteResults.results && typeof suiteResults.results === 'object') {
            const resultEntries = Object.values(suiteResults.results);
            if (resultEntries.length === 0) return false;
            
            // Calculate pass rate
            let passed = 0;
            let total = 0;
            
            for (const result of resultEntries) {
                if (typeof result === 'object' && result.passed !== undefined) {
                    total++;
                    if (result.passed) passed++;
                } else if (Array.isArray(result)) {
                    for (const subResult of result) {
                        if (typeof subResult === 'object' && subResult.passed !== undefined) {
                            total++;
                            if (subResult.passed) passed++;
                        }
                    }
                }
            }
            
            return total > 0 && (passed / total) >= 0.7; // 70% pass rate
        }
        
        return true; // Default to success if no clear failure indicators
    }
    
    updateOverallCounters(suiteResults) {
        if (!suiteResults.results) return;
        
        const countResults = (results) => {
            for (const result of Object.values(results)) {
                if (typeof result === 'object' && result.passed !== undefined) {
                    this.testResults.summary.totalTests++;
                    if (result.passed) {
                        this.testResults.summary.passedTests++;
                    } else {
                        this.testResults.summary.failedTests++;
                    }
                } else if (Array.isArray(result)) {
                    for (const subResult of result) {
                        if (typeof subResult === 'object' && subResult.passed !== undefined) {
                            this.testResults.summary.totalTests++;
                            if (subResult.passed) {
                                this.testResults.summary.passedTests++;
                            } else {
                                this.testResults.summary.failedTests++;
                            }
                        }
                    }
                }
            }
        };
        
        if (typeof suiteResults.results === 'object') {
            countResults(suiteResults.results);
        }
    }
    
    combineTestResults() {
        const combined = {};
        
        for (const [suiteName, suiteResult] of Object.entries(this.testResults.suiteResults)) {
            if (suiteResult.results) {
                combined[suiteName] = suiteResult.results;
            }
        }
        
        return combined;
    }
    
    // Metric calculation methods
    calculateAverageAccuracy(results) {
        const accuracies = [];
        for (const result of Object.values(results || {})) {
            if (result.accuracy !== undefined) {
                accuracies.push(result.accuracy);
            }
        }
        return accuracies.length > 0 ? 
            accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length : 0;
    }
    
    calculatePassRate(results) {
        let total = 0;
        let passed = 0;
        for (const result of Object.values(results || {})) {
            if (result.passed !== undefined) {
                total++;
                if (result.passed) passed++;
            }
        }
        return total > 0 ? (passed / total) * 100 : 0;
    }
    
    calculateOverallQuality(results) {
        const qualityScores = [];
        for (const typeResult of Object.values(results.byFlyerType || {})) {
            if (typeResult.qualityScore !== undefined) {
                qualityScores.push(typeResult.qualityScore);
            }
        }
        return qualityScores.length > 0 ?
            qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length : 0;
    }
    
    calculateIntegrationSuccessRate(results) {
        let total = 0;
        let successful = 0;
        
        for (const category of Object.values(results)) {
            if (Array.isArray(category)) {
                for (const test of category) {
                    total++;
                    if (test.passed) successful++;
                }
            }
        }
        
        return total > 0 ? (successful / total) * 100 : 0;
    }
    
    countErrorScenarios(results) {
        let count = 0;
        for (const category of Object.values(results)) {
            if (Array.isArray(category)) {
                count += category.length;
            }
        }
        return count;
    }
    
    calculateRobustnessScore(results) {
        let total = 0;
        let handled = 0;
        
        for (const category of Object.values(results)) {
            if (Array.isArray(category)) {
                for (const test of category) {
                    total++;
                    if (test.passed || test.handledGracefully || test.gracefulFailure) {
                        handled++;
                    }
                }
            }
        }
        
        return total > 0 ? (handled / total) * 100 : 0;
    }
    
    getGradeColor(grade) {
        const colors = {
            'A': chalk.green,
            'B': chalk.cyan,
            'C': chalk.yellow,
            'D': chalk.magenta,
            'F': chalk.red
        };
        return colors[grade] || chalk.white;
    }
    
    generateHTMLContent() {
        // Simplified HTML report generation
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>OCR Test Results Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; }
                .pass { color: green; }
                .fail { color: red; }
                .grade-A { color: green; font-weight: bold; }
                .grade-B { color: blue; font-weight: bold; }
                .grade-C { color: orange; font-weight: bold; }
                .grade-D { color: purple; font-weight: bold; }
                .grade-F { color: red; font-weight: bold; }
            </style>
        </head>
        <body>
            <h1>OCR Test Results Report</h1>
            <div class="summary">
                <h2>Summary</h2>
                <p>Overall Status: <span class="${this.testResults.summary.overallSuccess ? 'pass' : 'fail'}">${this.testResults.summary.overallSuccess ? 'PASSED' : 'FAILED'}</span></p>
                <p>Total Tests: ${this.testResults.summary.totalTests}</p>
                <p>Passed: ${this.testResults.summary.passedTests}</p>
                <p>Failed: ${this.testResults.summary.failedTests}</p>
                <p>Duration: ${(this.testResults.summary.totalDuration / 1000).toFixed(1)} seconds</p>
            </div>
            <!-- Additional report content would be added here -->
        </body>
        </html>
        `;
    }
    
    generateTextSummary() {
        const lines = [
            'OCR Test Results Summary',
            '=' .repeat(50),
            `Timestamp: ${this.testResults.summary.startTime}`,
            `Environment: ${this.options.environment}`,
            `Overall Status: ${this.testResults.summary.overallSuccess ? 'PASSED' : 'FAILED'}`,
            '',
            'Test Statistics:',
            `  Total Tests: ${this.testResults.summary.totalTests}`,
            `  Passed: ${this.testResults.summary.passedTests}`,
            `  Failed: ${this.testResults.summary.failedTests}`,
            `  Duration: ${(this.testResults.summary.totalDuration / 1000).toFixed(1)}s`,
            '',
            'Suite Results:'
        ];
        
        for (const [suiteName, suiteResult] of Object.entries(this.testResults.suiteResults)) {
            const status = suiteResult.success ? 'PASSED' : 'FAILED';
            const duration = (suiteResult.duration / 1000).toFixed(1);
            lines.push(`  ${suiteName}: ${status} (${duration}s)`);
        }
        
        if (this.testResults.recommendations?.length > 0) {
            lines.push('');
            lines.push('Recommendations:');
            for (const rec of this.testResults.recommendations.slice(0, 5)) {
                lines.push(`  - ${rec.title}: ${rec.description}`);
            }
        }
        
        return lines.join('\n');
    }
}

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {
        environment: args.includes('--env') ? args[args.indexOf('--env') + 1] : 'development',
        generateFixtures: !args.includes('--no-fixtures'),
        generateReports: !args.includes('--no-reports'),
        verbose: args.includes('--verbose'),
        suites: args.includes('--suites') ? args[args.indexOf('--suites') + 1].split(',') : ['all']
    };
    
    const runner = new OCRTestRunner(options);
    
    runner.runTests()
        .then(results => {
            const success = results.summary.overallSuccess;
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error(chalk.red(`Fatal error: ${error.message}`));
            process.exit(1);
        });
}

module.exports = OCRTestRunner;
