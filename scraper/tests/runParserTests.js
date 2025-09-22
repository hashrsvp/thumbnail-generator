#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Event Details Parser
 * Orchestrates all parser testing suites with reporting and validation
 */

const { ParserUnitTests } = require('./parserUnitTests');
const { ParserIntegrationTests } = require('./parserIntegrationTests');
const { ParserEdgeCaseTests } = require('./parserEdgeCaseTests');
const { ParserPerformanceTests } = require('./parserPerformanceTests');
const { ParserValidationFramework } = require('./parserValidationFramework');
const { parserTestConfigurations } = require('./parserTestConfig');
const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

class ParserTestRunner {
  constructor() {
    this.config = this.parseCommandLineArgs();
    this.testEnvironment = this.config.environment || 'development';
    this.testConfig = parserTestConfigurations[this.testEnvironment] || parserTestConfigurations.development;
    
    this.results = {
      unitTests: null,
      integrationTests: null,
      edgeCaseTests: null,
      performanceTests: null,
      validation: null,
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        overallGrade: 'F',
        duration: 0
      }
    };
    
    this.startTime = Date.now();
  }

  parseCommandLineArgs() {
    const args = process.argv.slice(2);
    const config = {
      suites: ['all'],
      environment: 'development',
      verbose: false,
      generateReports: true,
      outputDir: './results',
      runValidation: true
    };

    for (let i = 0; i < args.length; i++) {
      switch (args[i]) {
        case '--env':
        case '--environment':
          config.environment = args[++i];
          break;
        case '--suites':
          config.suites = args[++i].split(',');
          break;
        case '--verbose':
        case '-v':
          config.verbose = true;
          break;
        case '--no-reports':
          config.generateReports = false;
          break;
        case '--no-validation':
          config.runValidation = false;
          break;
        case '--output-dir':
          config.outputDir = args[++i];
          break;
        case '--help':
        case '-h':
          this.displayHelp();
          process.exit(0);
          break;
      }
    }

    return config;
  }

  displayHelp() {
    console.log(chalk.blue('\n🧪 EVENT DETAILS PARSER TEST RUNNER\n'));
    console.log('Usage: node runParserTests.js [options]\n');
    
    console.log('Options:');
    console.log('  --env, --environment <env>    Test environment: development, ci, production (default: development)');
    console.log('  --suites <suites>             Comma-separated test suites: unit,integration,edge,performance,all (default: all)');
    console.log('  --verbose, -v                 Enable verbose output');
    console.log('  --no-reports                  Skip generating test reports');
    console.log('  --no-validation               Skip validation framework analysis');
    console.log('  --output-dir <dir>            Output directory for reports (default: ./results)');
    console.log('  --help, -h                    Display this help message\n');
    
    console.log('Examples:');
    console.log('  node runParserTests.js --env ci --verbose');
    console.log('  node runParserTests.js --suites unit,integration');
    console.log('  node runParserTests.js --env production --output-dir ./reports');
  }

  /**
   * Main test execution orchestrator
   */
  async run() {
    try {
      console.log(chalk.blue('🧪 EVENT DETAILS PARSER - COMPREHENSIVE TEST SUITE\n'));
      console.log(chalk.gray(`Environment: ${this.testEnvironment}`));
      console.log(chalk.gray(`Test suites: ${this.config.suites.join(', ')}`));
      console.log(chalk.gray(`Verbose: ${this.config.verbose}`));
      console.log('=' .repeat(80));

      // Ensure output directory exists
      await this.ensureOutputDirectory();

      // Run test suites based on configuration
      if (this.config.suites.includes('all') || this.config.suites.includes('unit')) {
        await this.runUnitTests();
      }
      
      if (this.config.suites.includes('all') || this.config.suites.includes('integration')) {
        await this.runIntegrationTests();
      }
      
      if (this.config.suites.includes('all') || this.config.suites.includes('edge')) {
        await this.runEdgeCaseTests();
      }
      
      if (this.config.suites.includes('all') || this.config.suites.includes('performance')) {
        await this.runPerformanceTests();
      }

      // Run validation framework analysis
      if (this.config.runValidation) {
        await this.runValidationAnalysis();
      }

      // Generate comprehensive summary
      await this.generateSummary();

      // Generate reports if requested
      if (this.config.generateReports) {
        await this.generateReports();
      }

      // Display final results
      this.displayFinalResults();
      
      // Exit with appropriate code
      const exitCode = this.results.summary.overallGrade >= 'C' ? 0 : 1;
      process.exit(exitCode);
      
    } catch (error) {
      console.error(chalk.red(`\n❌ Test runner failed: ${error.message}`));
      console.error(error.stack);
      process.exit(1);
    }
  }

  async ensureOutputDirectory() {
    try {
      await fs.mkdir(this.config.outputDir, { recursive: true });
      await fs.mkdir(path.join(this.config.outputDir, 'reports'), { recursive: true });
      await fs.mkdir(path.join(this.config.outputDir, 'data'), { recursive: true });
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not create output directory: ${error.message}`));
    }
  }

  async runUnitTests() {
    console.log(chalk.cyan('\n▶ Running Unit Tests...'));
    
    const unitTestRunner = new ParserUnitTests({
      verbose: this.config.verbose,
      timeout: this.testConfig.timeout,
      showFailureDetails: this.config.verbose
    });
    
    this.results.unitTests = await unitTestRunner.runAllTests();
  }

  async runIntegrationTests() {
    console.log(chalk.cyan('\n▶ Running Integration Tests...'));
    
    const integrationTestRunner = new ParserIntegrationTests({
      verbose: this.config.verbose,
      timeout: this.testConfig.timeout,
      enableCrossFieldValidation: true,
      testAllSamples: this.testEnvironment === 'production'
    });
    
    this.results.integrationTests = await integrationTestRunner.runAllTests();
  }

  async runEdgeCaseTests() {
    console.log(chalk.cyan('\n▶ Running Edge Case Tests...'));
    
    const edgeCaseTestRunner = new ParserEdgeCaseTests({
      verbose: this.config.verbose,
      timeout: this.testConfig.timeout * 2, // Edge cases may take longer
      testExtremeEdgeCases: this.testEnvironment !== 'ci',
      validateRecovery: true
    });
    
    this.results.edgeCaseTests = await edgeCaseTestRunner.runAllTests();
  }

  async runPerformanceTests() {
    console.log(chalk.cyan('\n▶ Running Performance Tests...'));
    
    const performanceTestRunner = new ParserPerformanceTests({
      verbose: this.config.verbose,
      warmupRounds: this.testEnvironment === 'production' ? 10 : 3,
      benchmarkRounds: this.testEnvironment === 'production' ? 20 : 5,
      memoryMeasurements: true,
      stressTestEnabled: this.testEnvironment !== 'ci'
    });
    
    this.results.performanceTests = await performanceTestRunner.runAllTests();
  }

  async runValidationAnalysis() {
    console.log(chalk.cyan('\n▶ Running Validation Analysis...'));
    
    const validationFramework = new ParserValidationFramework({
      enableDetailedAnalysis: this.config.verbose,
      generateRecommendations: true,
      includeStatistics: true
    });
    
    this.results.validation = await validationFramework.validateResults(
      this.results, 
      this.testConfig
    );
  }

  async generateSummary() {
    console.log(chalk.cyan('\n▶ Generating Summary...'));
    
    const summary = this.results.summary;
    summary.duration = Date.now() - this.startTime;
    
    // Collect test statistics
    const testSuites = ['unitTests', 'integrationTests', 'edgeCaseTests', 'performanceTests'];
    
    for (const suite of testSuites) {
      if (this.results[suite]) {
        const suiteResults = this.results[suite];
        
        // Count tests from different result structures
        if (suiteResults.overall) {
          summary.totalTests += suiteResults.overall.passed || 0;
          summary.totalTests += suiteResults.overall.failed || 0;
          summary.passedTests += suiteResults.overall.passed || 0;
          summary.failedTests += suiteResults.overall.failed || 0;
        } else {
          // Handle different result structures
          for (const [key, result] of Object.entries(suiteResults)) {
            if (result && typeof result === 'object' && 'passed' in result && 'failed' in result) {
              summary.totalTests += result.passed + result.failed;
              summary.passedTests += result.passed;
              summary.failedTests += result.failed;
            }
          }
        }
      }
    }
    
    // Calculate overall grade
    const passRate = summary.totalTests > 0 ? (summary.passedTests / summary.totalTests) * 100 : 0;
    
    if (this.results.validation?.overall?.grade) {
      summary.overallGrade = this.results.validation.overall.grade;
    } else {
      summary.overallGrade = this.calculateGradeFromPassRate(passRate);
    }
    
    summary.passRate = passRate;
  }

  calculateGradeFromPassRate(passRate) {
    if (passRate >= 90) return 'A';
    if (passRate >= 80) return 'B';
    if (passRate >= 70) return 'C';
    if (passRate >= 60) return 'D';
    return 'F';
  }

  async generateReports() {
    console.log(chalk.cyan('\n▶ Generating Reports...'));
    
    try {
      // Generate JSON report with all test data
      const jsonReport = {
        metadata: {
          testEnvironment: this.testEnvironment,
          timestamp: new Date().toISOString(),
          duration: this.results.summary.duration,
          suites: this.config.suites,
          config: this.config
        },
        results: this.results,
        summary: this.results.summary
      };
      
      const jsonReportPath = path.join(this.config.outputDir, 'data', 'parser-test-results.json');
      await fs.writeFile(jsonReportPath, JSON.stringify(jsonReport, null, 2));
      
      // Generate HTML report
      await this.generateHtmlReport();
      
      // Generate text summary report
      await this.generateTextReport();
      
      console.log(chalk.green(`Reports generated in: ${this.config.outputDir}`));
      
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not generate reports: ${error.message}`));
    }
  }

  async generateHtmlReport() {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Event Details Parser - Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #007acc; padding-bottom: 20px; margin-bottom: 30px; }
        .grade-A { color: #28a745; font-weight: bold; }
        .grade-B { color: #007bff; font-weight: bold; }
        .grade-C { color: #ffc107; font-weight: bold; }
        .grade-D { color: #fd7e14; font-weight: bold; }
        .grade-F { color: #dc3545; font-weight: bold; }
        .metric-card { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #007acc; }
        .test-suite { margin: 20px 0; padding: 15px; border: 1px solid #dee2e6; border-radius: 5px; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .recommendation { background: #e3f2fd; padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 3px solid #2196f3; }
        .priority-high { border-left-color: #f44336; }
        .priority-medium { border-left-color: #ff9800; }
        .priority-low { border-left-color: #4caf50; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Event Details Parser Test Results</h1>
            <p>Environment: <strong>${this.testEnvironment}</strong> | 
               Duration: <strong>${(this.results.summary.duration / 1000).toFixed(2)}s</strong> | 
               Generated: <strong>${new Date().toLocaleString()}</strong>
            </p>
        </div>
        
        <div class="metric-card">
            <h2>Overall Results</h2>
            <div class="stats-grid">
                <div><strong>Grade:</strong> <span class="grade-${this.results.summary.overallGrade}">${this.results.summary.overallGrade}</span></div>
                <div><strong>Total Tests:</strong> ${this.results.summary.totalTests}</div>
                <div><strong>Passed:</strong> <span class="passed">${this.results.summary.passedTests}</span></div>
                <div><strong>Failed:</strong> <span class="failed">${this.results.summary.failedTests}</span></div>
                <div><strong>Pass Rate:</strong> ${this.results.summary.passRate?.toFixed(1) || 0}%</div>
            </div>
        </div>
        
        ${this.generateTestSuiteHtml('Unit Tests', this.results.unitTests)}
        ${this.generateTestSuiteHtml('Integration Tests', this.results.integrationTests)}
        ${this.generateTestSuiteHtml('Edge Case Tests', this.results.edgeCaseTests)}
        ${this.generateTestSuiteHtml('Performance Tests', this.results.performanceTests)}
        
        ${this.results.validation ? this.generateValidationHtml() : ''}
        
        <div class="metric-card">
            <h3>Test Environment Configuration</h3>
            <pre>${JSON.stringify(this.testConfig, null, 2)}</pre>
        </div>
    </div>
</body>
</html>`;
    
    const htmlReportPath = path.join(this.config.outputDir, 'reports', 'parser-test-report.html');
    await fs.writeFile(htmlReportPath, htmlContent);
  }

  generateTestSuiteHtml(suiteName, results) {
    if (!results) return '';
    
    let suiteHtml = `<div class="test-suite"><h3>${suiteName}</h3>`;
    
    if (results.overall) {
      const total = (results.overall.passed || 0) + (results.overall.failed || 0);
      const passRate = total > 0 ? ((results.overall.passed || 0) / total * 100) : 0;
      
      suiteHtml += `
        <div class="stats-grid">
          <div><strong>Total:</strong> ${total}</div>
          <div><strong>Passed:</strong> <span class="passed">${results.overall.passed || 0}</span></div>
          <div><strong>Failed:</strong> <span class="failed">${results.overall.failed || 0}</span></div>
          <div><strong>Pass Rate:</strong> ${passRate.toFixed(1)}%</div>
        </div>`;
    }
    
    // Add specific metrics based on test suite type
    if (results.singleTextTiming) {
      suiteHtml += `
        <h4>Performance Metrics</h4>
        <div class="stats-grid">
          <div><strong>Avg Time:</strong> ${results.singleTextTiming.average.toFixed(2)}ms</div>
          <div><strong>Median:</strong> ${results.singleTextTiming.median.toFixed(2)}ms</div>
          <div><strong>95th Percentile:</strong> ${results.singleTextTiming.p95.toFixed(2)}ms</div>
        </div>`;
    }
    
    suiteHtml += '</div>';
    return suiteHtml;
  }

  generateValidationHtml() {
    const validation = this.results.validation;
    let html = '<div class="metric-card"><h3>Validation Analysis</h3>';
    
    if (validation.overall) {
      html += `
        <div class="stats-grid">
          <div><strong>Overall Score:</strong> ${validation.overall.score.toFixed(1)}%</div>
          <div><strong>Grade:</strong> <span class="grade-${validation.overall.grade}">${validation.overall.grade}</span></div>
        </div>`;
    }
    
    if (validation.overall?.recommendations?.length > 0) {
      html += '<h4>Recommendations</h4>';
      for (const rec of validation.overall.recommendations) {
        html += `
          <div class="recommendation priority-${rec.priority.toLowerCase()}">
            <strong>[${rec.priority}] ${rec.category}:</strong> ${rec.issue}
            <ul>
              ${rec.suggestions.map(s => `<li>${s}</li>`).join('')}
            </ul>
          </div>`;
      }
    }
    
    html += '</div>';
    return html;
  }

  async generateTextReport() {
    const report = `
EVENT DETAILS PARSER - TEST RESULTS SUMMARY
${'='.repeat(50)}

Test Environment: ${this.testEnvironment}
Executed: ${new Date().toLocaleString()}
Duration: ${(this.results.summary.duration / 1000).toFixed(2)} seconds

OVERALL RESULTS:
- Grade: ${this.results.summary.overallGrade}
- Total Tests: ${this.results.summary.totalTests}
- Passed: ${this.results.summary.passedTests}
- Failed: ${this.results.summary.failedTests}
- Pass Rate: ${this.results.summary.passRate?.toFixed(1) || 0}%

${this.generateTestSuiteSummary('UNIT TESTS', this.results.unitTests)}
${this.generateTestSuiteSummary('INTEGRATION TESTS', this.results.integrationTests)}
${this.generateTestSuiteSummary('EDGE CASE TESTS', this.results.edgeCaseTests)}
${this.generateTestSuiteSummary('PERFORMANCE TESTS', this.results.performanceTests)}

${this.results.validation ? this.generateValidationSummary() : ''}

${'='.repeat(50)}
Generated by Event Details Parser Test Runner
`;
    
    const textReportPath = path.join(this.config.outputDir, 'reports', 'parser-test-summary.txt');
    await fs.writeFile(textReportPath, report);
  }

  generateTestSuiteSummary(suiteName, results) {
    if (!results) return '';
    
    let summary = `${suiteName}:\n`;
    
    if (results.overall) {
      const total = (results.overall.passed || 0) + (results.overall.failed || 0);
      const passRate = total > 0 ? ((results.overall.passed || 0) / total * 100) : 0;
      summary += `- Tests: ${total} (${results.overall.passed || 0} passed, ${results.overall.failed || 0} failed)\n`;
      summary += `- Pass Rate: ${passRate.toFixed(1)}%\n`;
    }
    
    summary += '\n';
    return summary;
  }

  generateValidationSummary() {
    const validation = this.results.validation;
    let summary = 'VALIDATION ANALYSIS:\n';
    
    if (validation.overall) {
      summary += `- Overall Score: ${validation.overall.score.toFixed(1)}%\n`;
      summary += `- Grade: ${validation.overall.grade}\n`;
      
      if (validation.overall.issues?.length > 0) {
        summary += `- Critical Issues: ${validation.overall.issues.length}\n`;
      }
      
      if (validation.overall.warnings?.length > 0) {
        summary += `- Warnings: ${validation.overall.warnings.length}\n`;
      }
      
      if (validation.overall.recommendations?.length > 0) {
        summary += `- Recommendations: ${validation.overall.recommendations.length}\n`;
      }
    }
    
    summary += '\n';
    return summary;
  }

  displayFinalResults() {
    console.log(chalk.blue('\n\n🏆 FINAL RESULTS\n'));
    console.log('=' .repeat(60));
    
    const gradeColor = this.results.summary.overallGrade === 'A' ? chalk.green :
                      this.results.summary.overallGrade === 'B' ? chalk.blue :
                      this.results.summary.overallGrade === 'C' ? chalk.yellow :
                      chalk.red;
    
    console.log(`${gradeColor(`Overall Grade: ${this.results.summary.overallGrade}`)}`);;
    console.log(`Total Tests: ${this.results.summary.totalTests}`);
    console.log(`Passed: ${chalk.green(this.results.summary.passedTests)}`);
    console.log(`Failed: ${chalk.red(this.results.summary.failedTests)}`);
    console.log(`Pass Rate: ${(this.results.summary.passRate?.toFixed(1) || 0)}%`);
    console.log(`Duration: ${(this.results.summary.duration / 1000).toFixed(2)} seconds`);
    
    if (this.config.generateReports) {
      console.log(`\n📄 Detailed reports available in: ${this.config.outputDir}`);
    }
    
    // Display key recommendations if available
    if (this.results.validation?.overall?.recommendations?.length > 0) {
      console.log(chalk.yellow('\n💡 Key Recommendations:'));
      this.results.validation.overall.recommendations
        .filter(rec => rec.priority === 'High' || rec.priority === 'Critical')
        .slice(0, 3)
        .forEach(rec => {
          console.log(`  • ${rec.category}: ${rec.issue}`);
        });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(chalk.gray('Event Details Parser Test Suite Complete'));
  }
}

// Execute if run directly
if (require.main === module) {
  const runner = new ParserTestRunner();
  runner.run().catch(error => {
    console.error(chalk.red(`Fatal error: ${error.message}`));
    process.exit(1);
  });
}

module.exports = { ParserTestRunner };