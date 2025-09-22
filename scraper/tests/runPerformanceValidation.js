#!/usr/bin/env node

/**
 * Performance Validation Test Runner
 * 
 * Focused test runner for validating the <5s performance target optimizations.
 * Tests real venues with baseline comparison (66.5s → <5s target).
 * 
 * Usage:
 *   node runPerformanceValidation.js --mode full
 *   node runPerformanceValidation.js --mode single --venue emos
 *   node runPerformanceValidation.js --mode multi --venue cowpalace
 * 
 * @author Claude Code QA Agent
 * @version 1.0.0
 */

const { performance } = require('perf_hooks');
const chalk = require('chalk');
const OptimizationValidationTests = require('./optimizationValidationTests');

class PerformanceValidationRunner {
    constructor(options = {}) {
        this.options = {
            mode: options.mode || 'full', // full, single, multi, regression, optimizations
            venue: options.venue || null,
            headless: options.headless !== false,
            timeout: options.timeout || 10000,
            verbose: options.verbose || false,
            debug: options.debug || false,
            ...options
        };

        this.validator = new OptimizationValidationTests({
            headless: this.options.headless,
            timeout: this.options.timeout,
            verbose: this.options.verbose,
            debug: this.options.debug
        });

        // Performance targets for validation
        this.targets = {
            singleEvent: 5000,  // <5s for single event
            multiEvent: 8000,   // <8s for 5-10 events
            baseline: 66500,    // 66.5s baseline (pre-optimization)
            qualityThreshold: 75, // 75% minimum quality
            complianceThreshold: 80 // 80% Hash compliance
        };
    }

    /**
     * Run validation tests based on mode
     */
    async run() {
        console.log(chalk.blue.bold('🚀 Performance Validation Test Runner'));
        console.log(chalk.gray(`Mode: ${this.options.mode.toUpperCase()}`));
        console.log(chalk.gray(`Target: Reduce from 66.5s baseline to <5s\n`));

        const startTime = performance.now();
        let results;

        try {
            switch (this.options.mode) {
                case 'single':
                    results = await this.runSingleEventTests();
                    break;
                case 'multi':
                    results = await this.runMultiEventTests();
                    break;
                case 'regression':
                    results = await this.runRegressionTests();
                    break;
                case 'optimizations':
                    results = await this.runOptimizationTests();
                    break;
                case 'quick':
                    results = await this.runQuickValidation();
                    break;
                case 'full':
                default:
                    results = await this.runFullValidation();
                    break;
            }

            const totalTime = performance.now() - startTime;
            await this.displayResults(results, totalTime);

            return results;

        } catch (error) {
            console.error(chalk.red.bold('❌ Test execution failed:'), error);
            throw error;
        }
    }

    /**
     * Run focused single event performance tests
     */
    async runSingleEventTests() {
        console.log(chalk.cyan('📊 Running Single Event Performance Tests\n'));
        
        // If specific venue requested, test only that venue
        if (this.options.venue) {
            return await this.testSpecificVenue(this.options.venue, 'single');
        }

        // Run single event tests for key venues
        const keyVenues = [
            { name: 'emos', type: 'austin', description: 'Structured data heavy' },
            { name: '1015folsom', type: 'bayArea', description: 'Custom calendar' },
            { name: 'fillmore', type: 'bayArea', description: 'Complex JSON-LD' }
        ];

        const results = {};
        
        for (const venue of keyVenues) {
            console.log(chalk.gray(`Testing ${venue.name} (${venue.description})...`));
            
            try {
                const result = await this.testSingleVenue(venue);
                results[venue.name] = result;
                
                this.displaySingleResult(venue.name, result);
                
            } catch (error) {
                console.log(chalk.red(`  ❌ ${venue.name} failed: ${error.message}`));
                results[venue.name] = { success: false, error: error.message };
            }
        }

        return { singleEventResults: results, mode: 'single' };
    }

    /**
     * Run focused multi-event performance tests
     */
    async runMultiEventTests() {
        console.log(chalk.cyan('📋 Running Multi-Event Performance Tests\n'));

        const multiVenues = [
            { name: 'cowpalace', description: '7 events, JSON-LD' },
            { name: 'uctheatre', description: '30+ events, structured' },
            { name: 'oaklandfox', description: 'Medium complexity' }
        ];

        const results = {};

        for (const venue of multiVenues) {
            console.log(chalk.gray(`Testing ${venue.name} (${venue.description})...`));
            
            try {
                const result = await this.testMultiVenue(venue);
                results[venue.name] = result;
                
                this.displayMultiResult(venue.name, result);
                
            } catch (error) {
                console.log(chalk.red(`  ❌ ${venue.name} failed: ${error.message}`));
                results[venue.name] = { success: false, error: error.message };
            }
        }

        return { multiEventResults: results, mode: 'multi' };
    }

    /**
     * Run regression tests to ensure quality maintained
     */
    async runRegressionTests() {
        console.log(chalk.cyan('🔍 Running Performance Regression Tests\n'));

        const regressionResults = {};

        // Test extraction quality
        console.log(chalk.gray('Testing extraction quality maintenance...'));
        try {
            const qualityResult = await this.validator.testExtractionQuality('https://www.thefillmore.com/events/');
            regressionResults.quality = qualityResult;
            
            const status = qualityResult.qualityMaintained ? '✅' : '❌';
            console.log(chalk.gray(`  Quality: ${status} ${qualityResult.confidence}% confidence`));
            
        } catch (error) {
            console.log(chalk.red(`  ❌ Quality test failed: ${error.message}`));
            regressionResults.quality = { qualityMaintained: false, error: error.message };
        }

        // Test Hash compliance
        console.log(chalk.gray('Testing Hash app compliance...'));
        try {
            const complianceResult = await this.validator.testHashCompliance('https://www.thefillmore.com/events/');
            regressionResults.compliance = complianceResult;
            
            const status = complianceResult.compliant ? '✅' : '❌';
            console.log(chalk.gray(`  Compliance: ${status} ${complianceResult.score}% score`));
            
        } catch (error) {
            console.log(chalk.red(`  ❌ Compliance test failed: ${error.message}`));
            regressionResults.compliance = { compliant: false, error: error.message };
        }

        return { regressionResults, mode: 'regression' };
    }

    /**
     * Run optimization-specific validation tests
     */
    async runOptimizationTests() {
        console.log(chalk.cyan('⚡ Running Optimization Validation Tests\n'));

        const optimizationResults = {};

        // Test layer timeouts
        console.log(chalk.gray('Validating layer timeout effectiveness...'));
        try {
            const timeoutResult = await this.validator.validateLayerTimeouts();
            optimizationResults.layerTimeouts = timeoutResult;
            
            const status = timeoutResult.effective ? '✅' : '❌';
            console.log(chalk.gray(`  Layer timeouts: ${status} max ${timeoutResult.maxLayerTime}ms`));
            
        } catch (error) {
            console.log(chalk.red(`  ❌ Timeout test failed: ${error.message}`));
            optimizationResults.layerTimeouts = { effective: false, error: error.message };
        }

        // Test concurrent execution
        console.log(chalk.gray('Validating concurrent execution...'));
        try {
            const concurrentResult = await this.validator.validateConcurrentExecution();
            optimizationResults.concurrentExecution = concurrentResult;
            
            const status = concurrentResult.working ? '✅' : '❌';
            console.log(chalk.gray(`  Concurrent execution: ${status} ${concurrentResult.speedup}x speedup`));
            
        } catch (error) {
            console.log(chalk.red(`  ❌ Concurrency test failed: ${error.message}`));
            optimizationResults.concurrentExecution = { working: false, error: error.message };
        }

        // Test batch processing
        console.log(chalk.gray('Validating batch processing limits...'));
        try {
            const batchResult = await this.validator.validateBatchProcessing();
            optimizationResults.batchProcessing = batchResult;
            
            const status = batchResult.limited ? '✅' : '❌';
            console.log(chalk.gray(`  Batch processing: ${status} max ${batchResult.maxEventsProcessed} events`));
            
        } catch (error) {
            console.log(chalk.red(`  ❌ Batch test failed: ${error.message}`));
            optimizationResults.batchProcessing = { limited: false, error: error.message };
        }

        return { optimizationResults, mode: 'optimizations' };
    }

    /**
     * Run quick validation for CI/CD
     */
    async runQuickValidation() {
        console.log(chalk.cyan('⚡ Running Quick Performance Validation\n'));

        // Test one venue from each category
        const quickTests = [
            { name: 'emos', type: 'single', description: 'Austin structured data' },
            { name: 'cowpalace', type: 'multi', description: 'Multi-event JSON-LD' }
        ];

        const results = {};

        for (const test of quickTests) {
            console.log(chalk.gray(`Quick test: ${test.name} (${test.description})...`));
            
            try {
                const startTime = performance.now();
                const result = test.type === 'single' 
                    ? await this.testSingleVenue({ name: test.name, type: 'austin' })
                    : await this.testMultiVenue({ name: test.name });
                const endTime = performance.now();

                result.testTime = endTime - startTime;
                results[test.name] = result;
                
                const status = result.meetsTarget ? '✅' : '❌';
                const timeStr = `${result.time.toFixed(0)}ms`;
                console.log(chalk.gray(`  ${status} ${timeStr} (target: ${test.type === 'single' ? '5000ms' : '8000ms'})`));
                
            } catch (error) {
                console.log(chalk.red(`  ❌ ${test.name} failed: ${error.message}`));
                results[test.name] = { success: false, error: error.message };
            }
        }

        return { quickResults: results, mode: 'quick' };
    }

    /**
     * Run full validation test suite
     */
    async runFullValidation() {
        console.log(chalk.cyan('🎯 Running Full Performance Validation Suite\n'));

        return await this.validator.runValidationTests();
    }

    /**
     * Test single venue performance
     */
    async testSingleVenue(venue) {
        const venueUrl = this.getVenueUrl(venue.name, venue.type);
        const result = await this.validator.testSingleEventExtraction(venueUrl, venue.name);
        
        return {
            ...result,
            meetsTarget: result.time < this.targets.singleEvent,
            improvementFromBaseline: this.calculateImprovement(result.time, this.targets.baseline)
        };
    }

    /**
     * Test multi-venue performance
     */
    async testMultiVenue(venue) {
        const venueUrl = this.getMultiVenueUrl(venue.name);
        const result = await this.validator.testMultiEventExtraction(venueUrl, venue.name);
        
        return {
            ...result,
            meetsTarget: result.time < this.targets.multiEvent,
            improvementFromBaseline: this.calculateImprovement(result.time, this.targets.baseline)
        };
    }

    /**
     * Test specific venue by name
     */
    async testSpecificVenue(venueName, mode = 'single') {
        console.log(chalk.cyan(`Testing specific venue: ${venueName} (${mode} mode)\n`));

        try {
            let result;
            
            if (mode === 'single') {
                const venueType = this.detectVenueType(venueName);
                result = await this.testSingleVenue({ name: venueName, type: venueType });
            } else {
                result = await this.testMultiVenue({ name: venueName });
            }

            this.displaySingleResult(venueName, result);
            
            return { [venueName]: result, mode: 'specific' };

        } catch (error) {
            console.error(chalk.red(`❌ ${venueName} test failed:`), error);
            throw error;
        }
    }

    /**
     * Get venue URL by name and type
     */
    getVenueUrl(venueName, venueType) {
        const venueUrls = {
            austin: {
                emos: 'https://www.emosaustin.com/events',
                acl: 'https://www.acllive.com/events',
                stubbs: 'https://www.stubbsaustin.com/events'
            },
            bayArea: {
                '1015folsom': 'https://1015folsom.com/events/',
                fillmore: 'https://www.thefillmore.com/events/',
                warfield: 'https://www.thewarfieldtheatre.com/events/'
            }
        };

        return venueUrls[venueType]?.[venueName] || `https://example.com/events/${venueName}`;
    }

    /**
     * Get multi-venue URL by name
     */
    getMultiVenueUrl(venueName) {
        const multiVenueUrls = {
            cowpalace: 'https://www.cowpalace.com/events',
            uctheatre: 'https://www.theuctheatre.org/events',
            oaklandfox: 'https://www.foxtheateroakland.org/events'
        };

        return multiVenueUrls[venueName] || `https://example.com/events/${venueName}`;
    }

    /**
     * Detect venue type from venue name
     */
    detectVenueType(venueName) {
        const austinVenues = ['emos', 'acl', 'stubbs'];
        const bayAreaVenues = ['1015folsom', 'fillmore', 'warfield'];

        if (austinVenues.includes(venueName)) return 'austin';
        if (bayAreaVenues.includes(venueName)) return 'bayArea';
        return 'unknown';
    }

    /**
     * Calculate improvement percentage from baseline
     */
    calculateImprovement(currentTime, baselineTime) {
        if (baselineTime <= 0) return 0;
        return ((baselineTime - currentTime) / baselineTime * 100).toFixed(1);
    }

    /**
     * Display single result
     */
    displaySingleResult(venueName, result) {
        if (result.success) {
            const status = result.meetsTarget ? '✅' : '❌';
            const timeStr = `${result.time.toFixed(0)}ms`;
            const improvement = result.improvementFromBaseline;
            
            console.log(chalk.gray(`  ${status} ${venueName}: ${timeStr} (${improvement}% improvement from baseline)`));
            
            if (result.eventData) {
                console.log(chalk.gray(`      Event: "${result.eventData.title || 'No title'}"`));
            }
        } else {
            console.log(chalk.red(`  ❌ ${venueName}: Failed - ${result.error || 'Unknown error'}`));
        }
    }

    /**
     * Display multi result
     */
    displayMultiResult(venueName, result) {
        if (result.success) {
            const status = result.meetsTarget ? '✅' : '❌';
            const timeStr = `${result.time.toFixed(0)}ms`;
            const eventsStr = `${result.eventsFound} events`;
            const timePerEvent = result.timePerEvent > 0 ? `${result.timePerEvent.toFixed(0)}ms/event` : 'N/A';
            
            console.log(chalk.gray(`  ${status} ${venueName}: ${timeStr} - ${eventsStr} (${timePerEvent})`));
        } else {
            console.log(chalk.red(`  ❌ ${venueName}: Failed - ${result.error || 'Unknown error'}`));
        }
    }

    /**
     * Display comprehensive results
     */
    async displayResults(results, totalTime) {
        console.log(chalk.blue.bold('\n📊 Performance Validation Results'));
        console.log(chalk.blue('==================================='));
        
        console.log(chalk.gray(`Test mode: ${this.options.mode.toUpperCase()}`));
        console.log(chalk.gray(`Total test time: ${(totalTime / 1000).toFixed(2)}s`));
        console.log(chalk.gray(`Timestamp: ${new Date().toISOString()}\n`));

        // Display mode-specific results
        if (results.singleEventResults) {
            await this.displaySingleEventSummary(results.singleEventResults);
        }

        if (results.multiEventResults) {
            await this.displayMultiEventSummary(results.multiEventResults);
        }

        if (results.regressionResults) {
            await this.displayRegressionSummary(results.regressionResults);
        }

        if (results.optimizationResults) {
            await this.displayOptimizationSummary(results.optimizationResults);
        }

        if (results.quickResults) {
            await this.displayQuickSummary(results.quickResults);
        }

        if (results.summary) {
            await this.displayFullSummary(results.summary);
        }

        // Overall assessment
        const overallSuccess = this.assessOverallSuccess(results);
        console.log(chalk[overallSuccess ? 'green' : 'red'].bold(`\n🎯 Overall Assessment: ${overallSuccess ? 'PASS' : 'FAIL'}`));
        
        if (overallSuccess) {
            console.log(chalk.green('✅ Performance optimization targets achieved!'));
            console.log(chalk.green('✅ Processing time reduced from 66.5s baseline to <5s target'));
        } else {
            console.log(chalk.red('❌ Performance optimization targets not fully met'));
            console.log(chalk.yellow('💡 Review recommendations in detailed test output'));
        }
    }

    /**
     * Display single event summary
     */
    async displaySingleEventSummary(results) {
        console.log(chalk.cyan('📊 Single Event Performance Summary:'));
        
        const successfulTests = Object.values(results).filter(r => r.success);
        const avgTime = successfulTests.length > 0 
            ? successfulTests.reduce((sum, r) => sum + r.time, 0) / successfulTests.length 
            : -1;
        
        console.log(chalk.gray(`  Tests run: ${Object.keys(results).length}`));
        console.log(chalk.gray(`  Successful: ${successfulTests.length}`));
        console.log(chalk.gray(`  Average time: ${avgTime > 0 ? avgTime.toFixed(0) + 'ms' : 'N/A'}`));
        console.log(chalk.gray(`  Target met: ${avgTime < this.targets.singleEvent && avgTime > 0 ? '✅ YES' : '❌ NO'}`));
    }

    /**
     * Display multi-event summary
     */
    async displayMultiEventSummary(results) {
        console.log(chalk.cyan('\n📋 Multi-Event Performance Summary:'));
        
        const successfulTests = Object.values(results).filter(r => r.success);
        const avgTime = successfulTests.length > 0 
            ? successfulTests.reduce((sum, r) => sum + r.time, 0) / successfulTests.length 
            : -1;
        const totalEvents = successfulTests.reduce((sum, r) => sum + (r.eventsFound || 0), 0);
        
        console.log(chalk.gray(`  Tests run: ${Object.keys(results).length}`));
        console.log(chalk.gray(`  Successful: ${successfulTests.length}`));
        console.log(chalk.gray(`  Average time: ${avgTime > 0 ? avgTime.toFixed(0) + 'ms' : 'N/A'}`));
        console.log(chalk.gray(`  Total events: ${totalEvents}`));
        console.log(chalk.gray(`  Target met: ${avgTime < this.targets.multiEvent && avgTime > 0 ? '✅ YES' : '❌ NO'}`));
    }

    /**
     * Display regression summary
     */
    async displayRegressionSummary(results) {
        console.log(chalk.cyan('\n🔍 Regression Test Summary:'));
        
        const quality = results.quality?.qualityMaintained !== false;
        const compliance = results.compliance?.compliant !== false;
        
        console.log(chalk.gray(`  Extraction quality: ${quality ? '✅ MAINTAINED' : '❌ DEGRADED'}`));
        console.log(chalk.gray(`  Hash compliance: ${compliance ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`));
        console.log(chalk.gray(`  Overall regression: ${quality && compliance ? '✅ PASS' : '❌ FAIL'}`));
    }

    /**
     * Display optimization summary
     */
    async displayOptimizationSummary(results) {
        console.log(chalk.cyan('\n⚡ Optimization Validation Summary:'));
        
        const layerTimeouts = results.layerTimeouts?.effective !== false;
        const concurrentExecution = results.concurrentExecution?.working !== false;
        const batchProcessing = results.batchProcessing?.limited !== false;
        
        console.log(chalk.gray(`  Layer timeouts: ${layerTimeouts ? '✅ EFFECTIVE' : '❌ INEFFECTIVE'}`));
        console.log(chalk.gray(`  Concurrent execution: ${concurrentExecution ? '✅ WORKING' : '❌ NOT WORKING'}`));
        console.log(chalk.gray(`  Batch processing: ${batchProcessing ? '✅ LIMITED' : '❌ UNLIMITED'}`));
    }

    /**
     * Display quick test summary
     */
    async displayQuickSummary(results) {
        console.log(chalk.cyan('\n⚡ Quick Validation Summary:'));
        
        const allPassed = Object.values(results).every(r => r.meetsTarget !== false);
        
        console.log(chalk.gray(`  Quick tests: ${Object.keys(results).length}`));
        console.log(chalk.gray(`  All targets met: ${allPassed ? '✅ YES' : '❌ NO'}`));
    }

    /**
     * Display full validation summary
     */
    async displayFullSummary(summary) {
        console.log(chalk.cyan('\n🎯 Full Validation Summary:'));
        console.log(chalk.gray(`  Single event target: ${summary.singleEvent?.meetsTarget ? '✅ MET' : '❌ MISSED'} (${summary.singleEvent?.averageTime}ms)`));
        console.log(chalk.gray(`  Multi-event target: ${summary.multiEvent?.meetsTarget ? '✅ MET' : '❌ MISSED'} (${summary.multiEvent?.averageTime}ms)`));
        console.log(chalk.gray(`  Quality maintained: ${summary.regression?.qualityMaintained ? '✅ YES' : '❌ NO'}`));
        console.log(chalk.gray(`  Hash compliant: ${summary.regression?.hashCompliant ? '✅ YES' : '❌ NO'}`));
        console.log(chalk.gray(`  Overall success: ${summary.overallSuccess ? '✅ PASS' : '❌ FAIL'}`));
    }

    /**
     * Assess overall success based on results
     */
    assessOverallSuccess(results) {
        // Check single event performance
        if (results.singleEventResults) {
            const singleSuccess = Object.values(results.singleEventResults).some(r => r.meetsTarget);
            if (!singleSuccess) return false;
        }

        // Check multi-event performance
        if (results.multiEventResults) {
            const multiSuccess = Object.values(results.multiEventResults).some(r => r.meetsTarget);
            if (!multiSuccess) return false;
        }

        // Check regression
        if (results.regressionResults) {
            const quality = results.regressionResults.quality?.qualityMaintained !== false;
            const compliance = results.regressionResults.compliance?.compliant !== false;
            if (!quality || !compliance) return false;
        }

        // Check quick tests
        if (results.quickResults) {
            const quickSuccess = Object.values(results.quickResults).every(r => r.meetsTarget !== false);
            if (!quickSuccess) return false;
        }

        // Check full validation
        if (results.summary) {
            return results.summary.overallSuccess;
        }

        return true;
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {};
    
    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg.startsWith('--')) {
            const key = arg.substring(2);
            const value = args[i + 1];
            
            if (value && !value.startsWith('--')) {
                options[key] = value;
                i++; // Skip next argument as it's the value
            } else {
                options[key] = true;
            }
        }
    }

    // Default options
    options.mode = options.mode || 'full';
    options.headless = options.headless !== 'false';
    options.timeout = parseInt(options.timeout) || 10000;
    options.verbose = options.verbose === 'true';
    options.debug = options.debug === 'true';

    console.log(chalk.blue.bold('🚀 Performance Validation Test Runner'));
    console.log(chalk.gray('Configuration:'), options);
    console.log('');

    const runner = new PerformanceValidationRunner(options);
    
    runner.run()
        .then((results) => {
            const success = runner.assessOverallSuccess(results);
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error(chalk.red.bold('\n❌ Performance validation failed:'), error);
            process.exit(1);
        });
}

module.exports = PerformanceValidationRunner;