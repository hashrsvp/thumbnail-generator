#!/usr/bin/env node

/**
 * Setup Validation Script for Universal Scraper Testing Framework
 * 
 * Validates that all dependencies and configurations are properly set up
 * before running the comprehensive test suite.
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

class SetupValidator {
    constructor() {
        this.issues = [];
        this.warnings = [];
        this.passed = [];
    }
    
    /**
     * Run all validation checks
     */
    async validateSetup() {
        console.log(chalk.blue.bold('🔍 Validating Universal Scraper Test Framework Setup\n'));
        
        await this.checkFileStructure();
        await this.checkDependencies();
        await this.checkParentDirectory();
        await this.checkConfigurations();
        await this.checkBrowserSetup();
        
        this.displayResults();
        
        return {
            valid: this.issues.length === 0,
            issues: this.issues,
            warnings: this.warnings,
            passed: this.passed
        };
    }
    
    /**
     * Check if all required files exist
     */
    async checkFileStructure() {
        console.log(chalk.cyan('📁 Checking file structure...'));
        
        const requiredFiles = [
            'universalScraperTests.js',
            'runTests.js', 
            'package.json',
            'README.md',
            'testConfig.js'
        ];
        
        for (const file of requiredFiles) {
            try {
                await fs.access(path.join(__dirname, file));
                this.passed.push(`✓ ${file} exists`);
            } catch (error) {
                this.issues.push(`❌ Missing required file: ${file}`);
            }
        }
        
        // Check if results directory will be created
        try {
            await fs.mkdir(path.join(__dirname, 'results'), { recursive: true });
            this.passed.push('✓ Results directory ready');
        } catch (error) {
            this.issues.push('❌ Cannot create results directory');
        }
    }
    
    /**
     * Check Node.js dependencies
     */
    async checkDependencies() {
        console.log(chalk.cyan('📦 Checking dependencies...'));
        
        // Check Node.js version
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
        
        if (majorVersion >= 16) {
            this.passed.push(`✓ Node.js version ${nodeVersion} is supported`);
        } else {
            this.issues.push(`❌ Node.js version ${nodeVersion} is too old (requires >=16.0.0)`);
        }
        
        // Check required packages
        const requiredPackages = ['playwright', 'chalk'];
        
        for (const pkg of requiredPackages) {
            try {
                require(pkg);
                this.passed.push(`✓ ${pkg} is available`);
            } catch (error) {
                this.issues.push(`❌ Missing dependency: ${pkg} (run: npm install)`);
            }
        }
        
        // Check if package.json exists and has correct scripts
        try {
            const packageJson = require('./package.json');
            
            const requiredScripts = ['test', 'test:quick', 'test:comprehensive'];
            for (const script of requiredScripts) {
                if (packageJson.scripts && packageJson.scripts[script]) {
                    this.passed.push(`✓ npm script "${script}" configured`);
                } else {
                    this.warnings.push(`⚠️ npm script "${script}" missing`);
                }
            }
        } catch (error) {
            this.issues.push('❌ Cannot read package.json');
        }
    }
    
    /**
     * Check parent directory structure (scraper utilities)
     */
    async checkParentDirectory() {
        console.log(chalk.cyan('🔧 Checking scraper utilities...'));
        
        const parentDir = path.join(__dirname, '..');
        const requiredUtils = [
            'utils/universalExtractor.js',
            'utils/categoryMapper.js'
        ];
        
        for (const util of requiredUtils) {
            try {
                await fs.access(path.join(parentDir, util));
                this.passed.push(`✓ ${util} exists`);
            } catch (error) {
                this.issues.push(`❌ Missing required utility: ${util}`);
            }
        }
        
        // Check venue data files
        const venueFiles = ['BayAreaVenues.txt', 'AustinVenues.txt'];
        for (const file of venueFiles) {
            try {
                const content = await fs.readFile(path.join(parentDir, file), 'utf8');
                if (content.length > 100) {
                    this.passed.push(`✓ ${file} contains venue data`);
                } else {
                    this.warnings.push(`⚠️ ${file} appears empty`);
                }
            } catch (error) {
                this.warnings.push(`⚠️ Cannot read ${file} (may affect venue testing)`);
            }
        }
    }
    
    /**
     * Check configuration files
     */
    async checkConfigurations() {
        console.log(chalk.cyan('⚙️ Checking configurations...'));
        
        try {
            const config = require('./testConfig');
            
            // Test configuration loading
            const devConfig = config.getConfig('development');
            const ciConfig = config.getConfig('ci');
            
            this.passed.push('✓ Test configurations load successfully');
            
            // Validate configuration structure
            const validation = config.validateConfig(devConfig);
            if (validation.valid) {
                this.passed.push('✓ Configuration validation passes');
            } else {
                for (const error of validation.errors) {
                    this.issues.push(`❌ Config error: ${error}`);
                }
            }
            
            // Check venue selections
            const venues = config.getVenues('smoke');
            if (venues && Object.keys(venues).length > 0) {
                this.passed.push('✓ Venue selections configured');
            } else {
                this.issues.push('❌ No venue selections available');
            }
            
        } catch (error) {
            this.issues.push(`❌ Configuration error: ${error.message}`);
        }
    }
    
    /**
     * Check browser setup
     */
    async checkBrowserSetup() {
        console.log(chalk.cyan('🌐 Checking browser setup...'));
        
        try {
            const { chromium } = require('playwright');
            
            // Try to launch browser
            const browser = await chromium.launch({ 
                headless: true,
                timeout: 10000 
            });
            
            await browser.close();
            this.passed.push('✓ Playwright browser launches successfully');
            
        } catch (error) {
            this.issues.push(`❌ Browser setup error: ${error.message}`);
            this.issues.push('💡 Try running: npx playwright install chromium');
        }
    }
    
    /**
     * Display validation results
     */
    displayResults() {
        console.log(chalk.blue.bold('\n📊 Validation Results'));
        console.log(chalk.blue('=' .repeat(50)));
        
        // Show passed checks
        if (this.passed.length > 0) {
            console.log(chalk.green.bold('\n✅ Passed Checks:'));
            for (const pass of this.passed) {
                console.log(chalk.green(`   ${pass}`));
            }
        }
        
        // Show warnings
        if (this.warnings.length > 0) {
            console.log(chalk.yellow.bold('\n⚠️  Warnings:'));
            for (const warning of this.warnings) {
                console.log(chalk.yellow(`   ${warning}`));
            }
        }
        
        // Show issues
        if (this.issues.length > 0) {
            console.log(chalk.red.bold('\n❌ Issues Found:'));
            for (const issue of this.issues) {
                console.log(chalk.red(`   ${issue}`));
            }
        }
        
        // Overall status
        console.log(chalk.blue.bold('\n🎯 Overall Status'));
        if (this.issues.length === 0) {
            console.log(chalk.green.bold('✅ READY TO TEST'));
            console.log(chalk.green('   The test framework is properly configured.'));
            console.log(chalk.gray('\n   Next steps:'));
            console.log(chalk.gray('   • Run quick test: npm run test:quick'));
            console.log(chalk.gray('   • Run full suite: npm run test:comprehensive'));
            console.log(chalk.gray('   • View help: node runTests.js'));
        } else {
            console.log(chalk.red.bold('❌ SETUP INCOMPLETE'));
            console.log(chalk.red(`   Found ${this.issues.length} issue(s) that need attention.`));
            console.log(chalk.gray('\n   Fix the issues above before running tests.'));
        }
        
        if (this.warnings.length > 0) {
            console.log(chalk.yellow(`\n⚠️  Note: ${this.warnings.length} warning(s) found.`));
            console.log(chalk.yellow('   Tests will run but some features may be limited.'));
        }
    }
    
    /**
     * Run a simple connectivity test
     */
    async testConnectivity() {
        console.log(chalk.cyan('\n🌐 Testing connectivity...'));
        
        try {
            const { chromium } = require('playwright');
            const browser = await chromium.launch({ headless: true });
            const context = await browser.newContext();
            const page = await context.newPage();
            
            // Test with a reliable site
            await page.goto('https://www.google.com', { 
                waitUntil: 'networkidle',
                timeout: 10000 
            });
            
            const title = await page.title();
            await browser.close();
            
            if (title.includes('Google')) {
                console.log(chalk.green('   ✓ Internet connectivity working'));
                return true;
            } else {
                console.log(chalk.yellow('   ⚠️ Unexpected response from test site'));
                return false;
            }
            
        } catch (error) {
            console.log(chalk.red(`   ❌ Connectivity test failed: ${error.message}`));
            return false;
        }
    }
}

// CLI interface
if (require.main === module) {
    const validator = new SetupValidator();
    
    async function main() {
        try {
            const result = await validator.validateSetup();
            
            // Run connectivity test if basic setup passes
            if (result.valid && process.argv.includes('--connectivity')) {
                await validator.testConnectivity();
            }
            
            process.exit(result.valid ? 0 : 1);
            
        } catch (error) {
            console.error(chalk.red(`\n❌ Validation error: ${error.message}`));
            process.exit(1);
        }
    }
    
    main();
}

module.exports = SetupValidator;