#!/usr/bin/env node

/**
 * Benchmark Runner for Universal Event Scraper
 * 
 * Easy-to-use interface for running different benchmark scenarios
 * with predefined configurations and real-time monitoring.
 * 
 * Usage:
 *   node runBenchmark.js                    # Run default benchmark
 *   node runBenchmark.js quick             # Quick performance check
 *   node runBenchmark.js comprehensive     # Full analysis
 *   node runBenchmark.js loadTest          # Load testing
 *   node runBenchmark.js accuracyFocus     # Accuracy analysis
 *   node runBenchmark.js custom --iterations 15 --verbose true
 * 
 * @author Claude Code
 * @version 1.0.0
 */

const PerformanceBenchmark = require('./performanceBenchmark');
const benchmarkConfig = require('./benchmarkConfig.json');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');

class BenchmarkRunner {
    constructor() {
        this.config = benchmarkConfig;
        this.availableScenarios = Object.keys(this.config.testScenarios);
    }
    
    /**
     * Display usage information
     */
    showHelp() {
        console.log(chalk.blue.bold('📊 Universal Event Scraper Benchmark Runner\n'));
        
        console.log(chalk.white('Usage:'));
        console.log(chalk.gray('  node runBenchmark.js [scenario] [options]\n'));
        
        console.log(chalk.white('Available Scenarios:'));
        for (const [scenario, config] of Object.entries(this.config.testScenarios)) {
            console.log(chalk.cyan(`  ${scenario.padEnd(15)} `), chalk.gray(config.description));
            console.log(chalk.gray(`    Iterations: ${config.iterations}, Concurrent: ${config.concurrentTests}, URLs: ${config.testUrls?.length || 'default'}`));
        }
        
        console.log(chalk.white('\nOptions:'));
        console.log(chalk.gray('  --iterations <n>      Number of test iterations (default: 10)'));
        console.log(chalk.gray('  --concurrentTests <n> Number of concurrent scrapers (default: 5)'));
        console.log(chalk.gray('  --verbose true        Enable verbose logging'));
        console.log(chalk.gray('  --debug true          Enable debug output'));
        console.log(chalk.gray('  --exportCsv true      Export results to CSV'));
        console.log(chalk.gray('  --generateCharts true Generate visual charts'));
        console.log(chalk.gray('  --outputDir <path>    Custom output directory'));
        
        console.log(chalk.white('\nExamples:'));
        console.log(chalk.gray('  node runBenchmark.js quick'));
        console.log(chalk.gray('  node runBenchmark.js comprehensive --verbose true'));
        console.log(chalk.gray('  node runBenchmark.js loadTest --concurrentTests 20'));
        console.log(chalk.gray('  node runBenchmark.js custom --iterations 15 --debug true'));
    }
    
    /**
     * Parse command line arguments
     */
    parseArguments(args) {
        const scenario = args[0] || 'default';
        const options = { scenario };
        
        // Parse --key value pairs
        for (let i = 1; i < args.length; i += 2) {
            const key = args[i];
            const value = args[i + 1];
            
            if (key && key.startsWith('--') && value) {
                const optionKey = key.replace('--', '');
                
                // Convert specific options to appropriate types
                if (['iterations', 'concurrentTests', 'warmupRuns', 'timeoutMs', 'memoryLimitMB', 'maxNetworkTime'].includes(optionKey)) {
                    options[optionKey] = parseInt(value);
                } else if (['verbose', 'debug', 'exportCsv', 'generateCharts', 'enforceHashRequirements'].includes(optionKey)) {
                    options[optionKey] = value.toLowerCase() === 'true';
                } else {
                    options[optionKey] = value;
                }
            }
        }
        
        return options;
    }
    
    /**
     * Get configuration for a specific scenario
     */
    getScenarioConfig(scenario) {
        if (scenario === 'default') {
            return this.config.defaultConfig;
        }
        
        if (this.config.testScenarios[scenario]) {
            return {
                ...this.config.defaultConfig,
                ...this.config.testScenarios[scenario]
            };
        }
        
        if (scenario === 'custom') {
            return this.config.defaultConfig;
        }
        
        throw new Error(`Unknown scenario: ${scenario}. Available: ${this.availableScenarios.join(', ')}`);
    }
    
    /**
     * Run benchmark with the specified configuration
     */
    async runBenchmark(options) {
        const { scenario, ...customOptions } = options;
        
        // Get base configuration for the scenario
        const baseConfig = this.getScenarioConfig(scenario);
        
        // Merge with custom options
        const finalConfig = {
            ...baseConfig,
            ...customOptions
        };
        
        console.log(chalk.blue.bold(`🚀 Running ${scenario} benchmark scenario\n`));
        
        // Display configuration
        console.log(chalk.white('Configuration:'));
        console.log(chalk.gray(`  Scenario: ${scenario}`));
        console.log(chalk.gray(`  Iterations: ${finalConfig.iterations}`));
        console.log(chalk.gray(`  Warmup Runs: ${finalConfig.warmupRuns}`));
        console.log(chalk.gray(`  Concurrent Tests: ${finalConfig.concurrentTests}`));
        console.log(chalk.gray(`  Test URLs: ${finalConfig.testUrls?.length || 'default set'}`));
        console.log(chalk.gray(`  Output Directory: ${finalConfig.outputDir || 'default'}`));
        
        if (finalConfig.testUrls && finalConfig.testUrls.length > 0) {
            console.log(chalk.white('\nTest URLs:'));
            finalConfig.testUrls.forEach((url, i) => {
                console.log(chalk.gray(`  ${i + 1}. ${url}`));
            });
        }
        
        console.log(''); // Empty line for spacing
        
        // Create and run benchmark
        const benchmark = new PerformanceBenchmark(finalConfig);
        
        const startTime = Date.now();
        
        try {
            await benchmark.runBenchmarks();
            
            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(1);
            
            console.log(chalk.green.bold(`\n✅ Benchmark completed successfully in ${duration}s!`));
            
            // Display quick summary
            await this.displayQuickSummary(finalConfig.outputDir || path.join(__dirname, '../benchmark-results'));
            
        } catch (error) {
            console.error(chalk.red.bold('\n❌ Benchmark failed:'), error.message);
            if (finalConfig.debug) {
                console.error(chalk.gray(error.stack));
            }
            process.exit(1);
        }
    }
    
    /**
     * Display quick summary of benchmark results
     */
    async displayQuickSummary(outputDir) {
        try {
            const summaryPath = path.join(outputDir, 'summary-report.json');
            const summaryExists = await fs.access(summaryPath).then(() => true).catch(() => false);
            
            if (summaryExists) {
                const summary = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
                
                console.log(chalk.white.bold('\n📊 Quick Summary:'));
                
                if (summary.overallResults) {
                    const results = summary.overallResults;
                    
                    console.log(chalk.gray(`  Average Processing Time: ${results.averageProcessingTime?.toFixed(2) || 'N/A'}ms`));
                    console.log(chalk.gray(`  Average Confidence: ${results.averageConfidence?.toFixed(1) || 'N/A'}%`));
                    console.log(chalk.gray(`  Memory Efficiency: ${results.memoryEfficiency || 'N/A'}`));
                    console.log(chalk.gray(`  Error Rate: ${results.errorRate?.toFixed(1) || 'N/A'}%`));
                }
                
                if (summary.topRecommendations && summary.topRecommendations.length > 0) {
                    console.log(chalk.white.bold('\n💡 Top Recommendations:'));
                    summary.topRecommendations.slice(0, 3).forEach((rec, i) => {
                        console.log(chalk.yellow(`  ${i + 1}. ${rec.issue || rec.recommendation}`));
                    });
                }
            }
            
            console.log(chalk.white.bold('\n📁 Generated Files:'));
            
            const files = await fs.readdir(outputDir);
            const reportFiles = files.filter(f => f.endsWith('.json') || f.endsWith('.csv'));
            
            reportFiles.forEach(file => {
                const filePath = path.join(outputDir, file);
                console.log(chalk.gray(`  ${file}`));
            });
            
            console.log(chalk.blue(`\nView detailed results in: ${outputDir}`));
            
        } catch (error) {
            console.log(chalk.yellow('\n⚠️  Could not display summary (results may still be available)'));
        }
    }
    
    /**
     * Validate scenario and configuration
     */
    validateScenario(scenario) {
        if (scenario === 'default' || scenario === 'custom') {
            return true;
        }
        
        if (!this.availableScenarios.includes(scenario)) {
            console.error(chalk.red(`❌ Unknown scenario: ${scenario}`));
            console.error(chalk.gray(`Available scenarios: ${this.availableScenarios.join(', ')}`));
            return false;
        }
        
        return true;
    }
    
    /**
     * Check system requirements
     */
    async checkSystemRequirements() {
        const warnings = [];
        
        // Check Node.js version
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
        
        if (majorVersion < 14) {
            warnings.push(`Node.js ${majorVersion} detected. Recommended: Node.js 14+`);
        }
        
        // Check available memory
        const totalMemory = require('os').totalmem();
        const totalMemoryMB = Math.round(totalMemory / 1024 / 1024);
        
        if (totalMemoryMB < 2048) {
            warnings.push(`Low system memory (${totalMemoryMB}MB). Recommended: 2GB+`);
        }
        
        // Check if Playwright is available
        try {
            require('playwright');
        } catch (error) {
            warnings.push('Playwright not found. Run: npm install playwright');
        }
        
        if (warnings.length > 0) {
            console.log(chalk.yellow.bold('⚠️  System Warnings:'));
            warnings.forEach(warning => {
                console.log(chalk.yellow(`  • ${warning}`));
            });
            console.log(''); // Empty line
        }
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const runner = new BenchmarkRunner();
    
    // Show help if requested
    if (args.includes('--help') || args.includes('-h')) {
        runner.showHelp();
        return;
    }
    
    // Check system requirements
    await runner.checkSystemRequirements();
    
    // Parse arguments
    const options = runner.parseArguments(args);
    
    // Validate scenario
    if (!runner.validateScenario(options.scenario)) {
        process.exit(1);
    }
    
    // Run benchmark
    try {
        await runner.runBenchmark(options);
    } catch (error) {
        console.error(chalk.red('Failed to run benchmark:'), error.message);
        process.exit(1);
    }
}

// Execute if called directly
if (require.main === module) {
    main().catch(error => {
        console.error(chalk.red('Unexpected error:'), error);
        process.exit(1);
    });
}

module.exports = BenchmarkRunner;