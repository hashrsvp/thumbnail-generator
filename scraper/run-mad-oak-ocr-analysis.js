#!/usr/bin/env node

/**
 * Mad Oak Bar OCR Analysis Runner
 * 
 * Comprehensive test suite that runs both structure analysis and OCR force testing
 * to provide complete insights into why traditional extraction fails and how OCR can help.
 * 
 * Execution Flow:
 * 1. Structure Analysis - Understand page layout and content distribution
 * 2. OCR Force Test - Test forced OCR extraction with 95% threshold
 * 3. Comparative Analysis - Compare results and generate recommendations
 * 
 * @author Claude Code Test Suite
 * @version 1.0.0
 */

const chalk = require('chalk');
const fs = require('fs').promises;

// Import test components
const MadOakStructureAnalyzer = require('./analyze-mad-oak-structure');
const MadOakOcrForceTest = require('./test-mad-oak-ocr-force');

class MadOakAnalysisRunner {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            url: 'https://madoakbar.com/oakland-mad-oak-bar-n-yard-happenings',
            testPlan: {
                phase1: 'Structure Analysis',
                phase2: 'OCR Force Test', 
                phase3: 'Comparative Analysis'
            },
            structureAnalysis: null,
            ocrTest: null,
            comparison: null,
            recommendations: []
        };
    }

    async runStructureAnalysis() {
        console.log(chalk.blue.bold('\n🔬 PHASE 1: STRUCTURE ANALYSIS'));
        console.log(chalk.blue('================================\n'));
        
        try {
            const analyzer = new MadOakStructureAnalyzer();
            await analyzer.run();
            
            // The analyzer saves its own results, but we can access them
            console.log(chalk.green('✅ Phase 1 Complete: Structure Analysis'));
            
            return { status: 'completed', phase: 'structure_analysis' };
            
        } catch (error) {
            console.error(chalk.red('❌ Phase 1 Failed:'), error.message);
            return { status: 'failed', phase: 'structure_analysis', error: error.message };
        }
    }

    async runOcrForceTest() {
        console.log(chalk.blue.bold('\n🧪 PHASE 2: OCR FORCE TEST'));
        console.log(chalk.blue('============================\n'));
        
        try {
            const ocrTest = new MadOakOcrForceTest();
            await ocrTest.run();
            
            console.log(chalk.green('✅ Phase 2 Complete: OCR Force Test'));
            
            return { status: 'completed', phase: 'ocr_force_test' };
            
        } catch (error) {
            console.error(chalk.red('❌ Phase 2 Failed:'), error.message);
            return { status: 'failed', phase: 'ocr_force_test', error: error.message };
        }
    }

    async runComparativeAnalysis() {
        console.log(chalk.blue.bold('\n📊 PHASE 3: COMPARATIVE ANALYSIS'));
        console.log(chalk.blue('==================================\n'));
        
        try {
            // Load the most recent results from both tests
            const structureFiles = await this.findRecentFiles('mad-oak-structure-analysis-*.json');
            const ocrTestFiles = await this.findRecentFiles('mad-oak-ocr-force-test-*.json');
            
            let structureData = null;
            let ocrData = null;
            
            if (structureFiles.length > 0) {
                const structureContent = await fs.readFile(structureFiles[0], 'utf8');
                structureData = JSON.parse(structureContent);
                console.log(chalk.blue('📄 Loaded structure analysis data'));
            }
            
            if (ocrTestFiles.length > 0) {
                const ocrContent = await fs.readFile(ocrTestFiles[0], 'utf8');
                ocrData = JSON.parse(ocrContent);
                console.log(chalk.blue('📄 Loaded OCR test data'));
            }
            
            if (!structureData && !ocrData) {
                console.log(chalk.yellow('⚠️  No test result files found - generating analysis based on expectations'));
            }
            
            const comparison = this.generateComparison(structureData, ocrData);
            await this.saveComparativeAnalysis(comparison);
            
            console.log(chalk.green('✅ Phase 3 Complete: Comparative Analysis'));
            
            return { status: 'completed', phase: 'comparative_analysis', comparison };
            
        } catch (error) {
            console.error(chalk.red('❌ Phase 3 Failed:'), error.message);
            return { status: 'failed', phase: 'comparative_analysis', error: error.message };
        }
    }

    async findRecentFiles(pattern) {
        try {
            const { glob } = await import('glob');
            const files = await glob(`/Users/user/Desktop/hash/scripts/scraper/${pattern}`);
            return files.sort().reverse(); // Most recent first
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Could not find files matching ${pattern}`));
            return [];
        }
    }

    generateComparison(structureData, ocrData) {
        const comparison = {
            timestamp: new Date().toISOString(),
            testsRun: {
                structureAnalysis: !!structureData,
                ocrForceTest: !!ocrData
            },
            findings: {},
            recommendations: []
        };

        // Analyze structure findings
        if (structureData) {
            comparison.findings.structure = {
                eventImagesDetected: structureData.imageAnalysis?.eventImages?.length || 0,
                textDensity: structureData.textAnalysis?.totalTextLength || 0,
                dynamicContent: structureData.renderingAnalysis?.contentChanged || false,
                hiddenElements: structureData.cssAnalysis?.hiddenElements?.length || 0,
                layoutPattern: structureData.eventStructure?.patternCounts?.imageTextCombos || 0
            };
        }

        // Analyze OCR findings
        if (ocrData) {
            comparison.findings.ocr = {
                traditionalConfidence: ocrData.traditionalResults?.metadata?.totalConfidence || 0,
                ocrConfidence: ocrData.ocrResults?.metadata?.totalConfidence || 0,
                targetTextsFound: ocrData.comparison?.ocr?.hasTargetTexts || false,
                standaloneOcrSuccess: ocrData.comparison?.standalone?.targetTextsFound || 0
            };
        }

        // Generate integrated recommendations
        const recommendations = [];

        // High-priority recommendations
        if (structureData?.imageAnalysis?.eventImages?.length > 0) {
            recommendations.push({
                priority: 'HIGH',
                category: 'OCR Integration',
                finding: `${structureData.imageAnalysis.eventImages.length} event images detected`,
                recommendation: 'Enable OCR with ocrTriggerThreshold set to 75% or lower',
                implementation: `ocrTriggerThreshold: 75, maxFlyerImages: ${Math.min(structureData.imageAnalysis.eventImages.length, 5)}`
            });
        }

        if (structureData?.textAnalysis?.eventKeywordDensity < 5) {
            recommendations.push({
                priority: 'HIGH',
                category: 'Content Strategy',
                finding: 'Low event keyword density in HTML text',
                recommendation: 'Text is likely embedded in images - OCR is essential',
                implementation: 'enableAllLayers: true, focusOnImageExtraction: true'
            });
        }

        if (ocrData?.comparison?.ocr?.hasTargetTexts && !ocrData?.comparison?.traditional?.hasTargetTexts) {
            recommendations.push({
                priority: 'HIGH',
                category: 'Extraction Success',
                finding: 'OCR found target texts that traditional methods missed',
                recommendation: 'Integrate OCR as primary extraction method for this site',
                implementation: 'ocrTriggerThreshold: 70, prioritizeOcrResults: true'
            });
        }

        // Medium-priority recommendations  
        if (structureData?.renderingAnalysis?.contentChanged) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'Dynamic Content',
                finding: 'Content loads dynamically after page load',
                recommendation: 'Increase wait times and add content stability checks',
                implementation: 'waitForTimeout: 5000, waitForNetworkIdle: true'
            });
        }

        if (structureData?.cssAnalysis?.hiddenElements?.length > 20) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'Hidden Content',
                finding: `${structureData.cssAnalysis.hiddenElements.length} hidden elements detected`,
                recommendation: 'Check for collapsible/accordion content that needs expansion',
                implementation: 'expandHiddenContent: true, checkAccordions: true'
            });
        }

        // Performance recommendations
        if (ocrData?.ocrResults?.extractionTime > 15000) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'Performance',
                finding: 'OCR extraction time exceeds 15 seconds',
                recommendation: 'Optimize image preprocessing and add timeout safeguards',
                implementation: 'ocrTimeout: 20000, imagePreprocessing: optimized'
            });
        }

        comparison.recommendations = recommendations;
        return comparison;
    }

    async saveComparativeAnalysis(comparison) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Save detailed comparison
        const comparisonFile = `/Users/user/Desktop/hash/scripts/scraper/mad-oak-comparative-analysis-${timestamp}.json`;
        await fs.writeFile(comparisonFile, JSON.stringify(comparison, null, 2));
        
        // Generate executive summary
        const executiveSummary = this.generateExecutiveSummary(comparison);
        const summaryFile = `/Users/user/Desktop/hash/scripts/scraper/MAD_OAK_EXECUTIVE_SUMMARY.md`;
        await fs.writeFile(summaryFile, executiveSummary);
        
        console.log(chalk.green(`💾 Comparative analysis saved: ${comparisonFile}`));
        console.log(chalk.green(`📋 Executive summary: ${summaryFile}`));
    }

    generateExecutiveSummary(comparison) {
        const { findings, recommendations } = comparison;
        
        return `# Mad Oak Bar OCR Analysis - Executive Summary

## Test Overview
**Date**: ${comparison.timestamp}  
**URL**: https://madoakbar.com/oakland-mad-oak-bar-n-yard-happenings  
**Tests Conducted**: Structure Analysis ${comparison.testsRun.structureAnalysis ? '✅' : '❌'}, OCR Force Test ${comparison.testsRun.ocrForceTest ? '✅' : '❌'}

## Key Findings

### Why Traditional Extraction Fails
${findings.structure ? `
- **Event Images**: ${findings.structure.eventImagesDetected} images contain event information
- **Text Density**: ${findings.structure.textDensity} characters of HTML text
- **Dynamic Content**: ${findings.structure.dynamicContent ? 'Yes - content loads after page render' : 'No - static content'}
- **Hidden Elements**: ${findings.structure.hiddenElements} elements hidden by CSS
- **Layout**: ${findings.structure.layoutPattern} image/text combination containers
` : 'Structure analysis data not available'}

### OCR Effectiveness
${findings.ocr ? `
- **Traditional Method**: ${findings.ocr.traditionalConfidence}% confidence
- **OCR Method**: ${findings.ocr.ocrConfidence}% confidence  
- **Target Texts Found**: ${findings.ocr.targetTextsFound ? '✅ YES' : '❌ NO'}
- **Standalone OCR Success**: ${findings.ocr.standaloneOcrSuccess} images with target content
` : 'OCR test data not available'}

## Critical Recommendations

### High Priority Actions
${recommendations.filter(r => r.priority === 'HIGH').map(r => `
**${r.category}**: ${r.recommendation}
- *Finding*: ${r.finding}
- *Implementation*: \`${r.implementation}\`
`).join('\n')}

### Medium Priority Optimizations
${recommendations.filter(r => r.priority === 'MEDIUM').map(r => `
**${r.category}**: ${r.recommendation}
- *Finding*: ${r.finding}
- *Implementation*: \`${r.implementation}\`
`).join('\n')}

## Recommended Configuration

\`\`\`javascript
const madOakConfig = {
    // OCR Settings
    ocrTriggerThreshold: 75, // Force OCR for image-heavy sites
    maxFlyerImages: 5,
    ocrTimeout: 20000,
    
    // Content Loading
    waitForTimeout: 5000, // Allow dynamic content to load
    waitForNetworkIdle: true,
    
    // Layer Configuration
    enabledLayers: [1, 2, 3, 4, 5, 6], // All layers including OCR
    minConfidence: 60,
    
    // Image Selection
    imageMinSize: 200, // Focus on larger images
    focusOnImageExtraction: true,
    
    // Performance
    enableEarlyTermination: false, // Ensure OCR runs
    prioritizeOcrResults: true
};
\`\`\`

## Success Metrics

| Metric | Traditional | With OCR | Improvement |
|--------|-------------|----------|-------------|
| Confidence | ${findings.ocr?.traditionalConfidence || 'N/A'}% | ${findings.ocr?.ocrConfidence || 'N/A'}% | ${findings.ocr ? `${findings.ocr.ocrConfidence - findings.ocr.traditionalConfidence}%` : 'N/A'} |
| Target Texts | ${findings.ocr?.targetTextsFound === false ? 'None' : 'Unknown'} | ${findings.ocr?.targetTextsFound ? 'Found' : 'Not Found'} | ${findings.ocr?.targetTextsFound ? '✅ Success' : '❌ Failed'} |

## Next Steps

1. **Immediate**: Implement OCR with recommended configuration
2. **Testing**: Validate with target texts: "TRIVIA NIGHT", "KARAOKE WEDNESDAY"
3. **Optimization**: Fine-tune image selection and preprocessing
4. **Scaling**: Apply similar OCR strategy to other venue sites

## Conclusion

${findings.structure?.eventImagesDetected > 0 ? 
'Mad Oak Bar relies heavily on image-based event information, making OCR essential for complete data extraction.' :
'Further analysis needed to determine optimal extraction strategy.'}

${findings.ocr?.targetTextsFound ? 
'OCR successfully extracted target information that traditional methods missed, validating the OCR integration approach.' :
'OCR configuration may need adjustment or target texts may not be present in expected format.'}

---
*Generated by Mad Oak Bar Analysis Suite*
*For detailed technical analysis, see the full JSON reports*
`;
    }

    async printSummary(results) {
        console.log(chalk.blue.bold('\n📋 ANALYSIS SUMMARY'));
        console.log(chalk.blue('===================\n'));
        
        results.forEach((result, index) => {
            const phase = result.phase.replace(/_/g, ' ').toUpperCase();
            const status = result.status === 'completed' ? 
                chalk.green('✅ COMPLETED') : 
                chalk.red('❌ FAILED');
            
            console.log(chalk.blue(`Phase ${index + 1}: ${phase} - ${status}`));
            if (result.error) {
                console.log(chalk.red(`   Error: ${result.error}`));
            }
        });

        const completed = results.filter(r => r.status === 'completed').length;
        const total = results.length;
        
        console.log(chalk.blue(`\nOverall Progress: ${completed}/${total} phases completed`));
        
        if (completed === total) {
            console.log(chalk.green.bold('\n🎉 All Analysis Complete!'));
            console.log(chalk.blue('Check MAD_OAK_EXECUTIVE_SUMMARY.md for key findings and recommendations.'));
        } else {
            console.log(chalk.yellow.bold('\n⚠️  Some phases failed - check individual error messages above.'));
        }
    }

    async run() {
        try {
            console.log(chalk.blue.bold('\n🚀 MAD OAK BAR COMPREHENSIVE OCR ANALYSIS'));
            console.log(chalk.blue('============================================\n'));
            console.log(chalk.blue('This analysis will determine why traditional extraction fails'));
            console.log(chalk.blue('and test if OCR can successfully extract target event information.\n'));
            
            const results = [];
            
            // Phase 1: Structure Analysis
            const phase1 = await this.runStructureAnalysis();
            results.push(phase1);
            
            // Phase 2: OCR Force Test (run regardless of Phase 1 result)
            const phase2 = await this.runOcrForceTest();
            results.push(phase2);
            
            // Phase 3: Comparative Analysis  
            const phase3 = await this.runComparativeAnalysis();
            results.push(phase3);
            
            // Print summary
            await this.printSummary(results);
            
        } catch (error) {
            console.error(chalk.red.bold('\n💥 CRITICAL ERROR:'), error.message);
            console.error(error.stack);
        }
    }
}

// Execute the comprehensive analysis
if (require.main === module) {
    const runner = new MadOakAnalysisRunner();
    runner.run().catch(console.error);
}

module.exports = MadOakAnalysisRunner;