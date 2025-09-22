#!/usr/bin/env node

/**
 * Universal Scraper Test Runner
 * 
 * Easy-to-use test runner for the Universal Event Scraper
 * Provides different test scenarios and reporting options
 */

const chalk = require('chalk');
const UniversalScraperTestFramework = require('./universalScraperTests');

class TestRunner {
    constructor() {
        this.scenarios = {
            'quick': {
                name: 'Quick Test',
                description: 'Test 5 representative venues from different categories',
                venues: ['music', 'nightclubs', 'comedy'],
                limit: 2
            },
            'comprehensive': {
                name: 'Comprehensive Test',
                description: 'Test all venues in the test suite',
                venues: 'all',
                limit: null
            },
            'category-focus': {
                name: 'Category Focus',
                description: 'Deep test of specific venue category',
                venues: null, // Will be specified by user
                limit: null
            },
            'performance': {
                name: 'Performance Benchmark',
                description: 'Focus on speed and layer performance metrics',
                venues: ['music', 'bars', 'nightclubs'],
                limit: 3,
                benchmark: true
            }
        };
    }
    
    /**
     * Display available test scenarios
     */
    displayScenarios() {
        console.log(chalk.blue.bold('🧪 Universal Scraper Test Scenarios\n'));
        
        for (const [key, scenario] of Object.entries(this.scenarios)) {
            console.log(chalk.cyan(`${key.padEnd(15)} - ${scenario.name}`));
            console.log(chalk.gray(`${' '.repeat(17)} ${scenario.description}\n`));
        }
        
        console.log(chalk.gray('Usage Examples:'));
        console.log(chalk.gray('  node runTests.js quick'));
        console.log(chalk.gray('  node runTests.js comprehensive --verbose'));
        console.log(chalk.gray('  node runTests.js category-focus music'));
        console.log(chalk.gray('  node runTests.js performance --no-headless'));
    }
    
    /**
     * Run specific test scenario
     */
    async runScenario(scenarioName, options = {}) {
        const scenario = this.scenarios[scenarioName];
        if (!scenario) {
            console.error(chalk.red(`Unknown scenario: ${scenarioName}`));
            this.displayScenarios();
            return;
        }
        
        console.log(chalk.blue.bold(`🚀 Running: ${scenario.name}`));
        console.log(chalk.gray(scenario.description));
        console.log(chalk.blue('=' .repeat(50)));
        
        const framework = new UniversalScraperTestFramework({
            headless: options.headless !== false,
            verbose: options.verbose || false,
            timeout: options.timeout || 30000,
            retries: options.retries || 2
        });
        
        let results;
        
        switch (scenarioName) {
            case 'quick':
                results = await this.runQuickTest(framework);
                break;
                
            case 'comprehensive':
                results = await framework.runTestSuite();
                break;
                
            case 'category-focus':
                const category = options.category;
                if (!category) {
                    console.error(chalk.red('Category required for category-focus scenario'));
                    console.error(chalk.gray('Available: music, nightclubs, comedy, sports, bars, art, food'));
                    return;
                }
                results = await framework.runCategoryTests(category);
                break;
                
            case 'performance':
                results = await this.runPerformanceBenchmark(framework);
                break;
        }
        
        // Display final summary
        this.displayFinalSummary(results, scenario);
        
        return results;
    }
    
    /**
     * Run quick test scenario
     */
    async runQuickTest(framework) {
        console.log(chalk.cyan('\n📋 Quick Test: Testing representative venues from each category\n'));
        
        // Temporarily modify the test venues to include only a subset
        const originalVenues = framework.testVenues;
        framework.testVenues = {
            music: originalVenues.music.slice(0, 2),
            nightclubs: originalVenues.nightclubs.slice(0, 1),
            comedy: originalVenues.comedy.slice(0, 1),
            bars: originalVenues.bars.slice(0, 1)
        };
        
        return await framework.runTestSuite();
    }
    
    /**
     * Run performance benchmark
     */
    async runPerformanceBenchmark(framework) {
        console.log(chalk.cyan('\n⚡ Performance Benchmark: Testing speed and layer efficiency\n'));
        
        const results = await this.runQuickTest(framework);
        
        // Additional performance analysis
        this.analyzePerformance(results);
        
        return results;
    }
    
    /**
     * Analyze performance metrics
     */
    analyzePerformance(results) {
        console.log(chalk.blue.bold('\n⚡ Performance Analysis'));
        console.log(chalk.blue('=' .repeat(30)));
        
        const metrics = results.performanceMetrics;
        
        console.log(chalk.cyan('📊 Timing Metrics:'));
        console.log(chalk.gray(`   Average Time: ${Math.round(metrics.averageTime)}ms`));
        console.log(chalk.gray(`   Fastest: ${metrics.fastestTime}ms`));
        console.log(chalk.gray(`   Slowest: ${metrics.slowestTime}ms`));
        
        const timeRange = metrics.slowestTime - metrics.fastestTime;
        const consistency = 100 - ((timeRange / metrics.averageTime) * 100);
        
        console.log(chalk.cyan('\n🎯 Performance Rating:'));
        if (metrics.averageTime < 5000) {
            console.log(chalk.green('   Speed: Excellent (< 5s average)'));
        } else if (metrics.averageTime < 10000) {
            console.log(chalk.yellow('   Speed: Good (< 10s average)'));
        } else {
            console.log(chalk.red('   Speed: Needs improvement (> 10s average)'));
        }
        
        if (consistency > 80) {
            console.log(chalk.green('   Consistency: Excellent (low variance)'));
        } else if (consistency > 60) {
            console.log(chalk.yellow('   Consistency: Good (moderate variance)'));
        } else {
            console.log(chalk.red('   Consistency: Inconsistent (high variance)'));
        }
        
        // Analyze layer performance
        console.log(chalk.cyan('\n🔧 Layer Performance:'));
        const layerSuccess = this.analyzeLayers(results);
        
        for (const [layer, success] of Object.entries(layerSuccess)) {
            const percentage = Math.round((success.successful / success.total) * 100);
            const status = percentage >= 80 ? '🟢' : percentage >= 60 ? '🟡' : '🔴';
            console.log(chalk.gray(`   ${status} Layer ${layer}: ${percentage}% success rate (${success.successful}/${success.total})`));
        }
    }
    
    /**
     * Analyze layer success rates
     */
    analyzeLayers(results) {
        const layerStats = {};
        
        for (const venueResult of Object.values(results.venueResults)) {
            for (const result of venueResult.results) {
                if (result.layerAnalysis && result.layerAnalysis.layerContributions) {
                    for (const [layer, contribution] of Object.entries(result.layerAnalysis.layerContributions)) {
                        if (!layerStats[layer]) {
                            layerStats[layer] = { total: 0, successful: 0 };
                        }
                        
                        layerStats[layer].total++;
                        if (contribution.fieldsCount > 0 && !contribution.hasError) {
                            layerStats[layer].successful++;
                        }
                    }
                }
            }
        }
        
        return layerStats;
    }
    
    /**
     * Display final summary
     */
    displayFinalSummary(results, scenario) {
        console.log(chalk.blue.bold('\n🎯 Test Summary'));
        console.log(chalk.blue('=' .repeat(30)));
        
        const successRate = results.total > 0 ? (results.passed / results.total) * 100 : 0;
        const timeInSeconds = Math.round(results.performanceMetrics.totalTime / 1000);
        
        console.log(chalk.cyan(`Scenario: ${scenario.name}`));
        console.log(chalk.gray(`Total Tests: ${results.total}`));
        console.log(chalk.green(`✓ Passed: ${results.passed} (${Math.round(successRate)}%)`));
        console.log(chalk.red(`✗ Failed: ${results.failed}`));
        console.log(chalk.gray(`⏱️  Total Time: ${timeInSeconds}s`));
        
        // Quality assessment
        if (successRate >= 90) {
            console.log(chalk.green.bold('\n🏆 Excellent! Scraper is performing very well.'));
        } else if (successRate >= 75) {
            console.log(chalk.yellow.bold('\n✨ Good performance, minor improvements needed.'));
        } else if (successRate >= 50) {
            console.log(chalk.yellow.bold('\n⚠️  Moderate performance, several issues to address.'));
        } else {
            console.log(chalk.red.bold('\n🚨 Poor performance, significant improvements needed.'));
        }
        
        // Top failing categories
        const categoryFailures = Object.entries(results.categoryResults)
            .map(([category, stats]) => ({
                category,
                failureRate: stats.total > 0 ? (stats.failed / stats.total) * 100 : 0
            }))
            .filter(item => item.failureRate > 0)
            .sort((a, b) => b.failureRate - a.failureRate);
        
        if (categoryFailures.length > 0) {
            console.log(chalk.red('\n🔍 Categories needing attention:'));
            categoryFailures.slice(0, 3).forEach(item => {
                console.log(chalk.gray(`   • ${item.category}: ${Math.round(item.failureRate)}% failure rate`));
            });
        }
        
        console.log(chalk.blue('\n📊 Detailed reports generated in ./tests/results/'));
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const scenario = args[0];
    
    const options = {
        headless: !args.includes('--no-headless'),
        verbose: args.includes('--verbose') || args.includes('-v'),
        timeout: args.includes('--timeout') ? 
            parseInt(args[args.indexOf('--timeout') + 1]) : 30000,
        retries: args.includes('--retries') ? 
            parseInt(args[args.indexOf('--retries') + 1]) : 2,
        category: args[1] // For category-focus scenario
    };
    
    const runner = new TestRunner();
    
    if (!scenario) {
        runner.displayScenarios();
        process.exit(0);
    }
    
    async function main() {
        try {
            await runner.runScenario(scenario, options);
        } catch (error) {
            console.error(chalk.red(`\n❌ Test runner error: ${error.message}`));
            process.exit(1);
        }
    }
    
    main();
}

module.exports = TestRunner;