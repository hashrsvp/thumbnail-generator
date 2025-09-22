#!/usr/bin/env node

/**
 * Test Category Intelligence
 * 
 * Analyze how smart the category mapper is at selecting primary and secondary categories
 */

const CategoryMapper = require('./utils/categoryMapper');
const chalk = require('chalk');

class CategoryIntelligenceTest {
    constructor() {
        this.categoryMapper = new CategoryMapper();
    }

    /**
     * Test various event scenarios
     */
    runTests() {
        console.log(chalk.blue('🧠 Category Intelligence Analysis'));
        console.log('='.repeat(50));

        const testCases = [
            // Recent actual events
            {
                name: "Recent Event: Lagos Island",
                title: "LAGOS ISLAND: Labor Day Weekend Vibes", 
                description: "Escape to Lagos no passport needed. Join us for a rooftop-inspired Afrobeats nightlife experience this Labor Day Weekend in San Francisco.",
                venue: "The Valencia Room",
                expected: ["Nightclubs", "Music"] // Nightclub event with music
            },
            {
                name: "Recent Event: Colombia Night",
                title: "ONE NIGHT IN COLOMBIA TWO DANCE FLOORS | RUMBA SAN FRANCISCO", 
                description: "HOT LATIN SATURDAY NIGHT IN SAN FRANCISCO | TWO DANCE FLOOR + OUTDOOR PATIO EVENT IN THE LABOR DAY WKND | DJS & FOOD STAND AT THE ENDUP SF",
                venue: "The EndUp",
                expected: ["Nightclubs", "Music"]
            },
            // Edge cases for intelligence testing
            {
                name: "Music Festival",
                title: "Outside Lands Music Festival",
                description: "Three-day music festival featuring rock, pop, electronic, and indie artists in Golden Gate Park",
                venue: "Golden Gate Park",
                expected: ["Festivals", "Music"] // Should prioritize Festivals over Music
            },
            {
                name: "Comedy + Food",
                title: "Stand-Up Comedy & Dinner Show",
                description: "Enjoy hilarious stand-up comedy while dining on chef-prepared meals and craft cocktails",
                venue: "The Punch Line",
                expected: ["Comedy Shows", "Food Events"]
            },
            {
                name: "Art Gallery Opening",
                title: "Contemporary Art Exhibition Opening Reception", 
                description: "Opening reception for new contemporary art exhibition featuring local artists, wine and appetizers served",
                venue: "SFMOMA",
                expected: ["Art Shows", "Food Events"]
            },
            {
                name: "Sports Bar Event",
                title: "Monday Night Football Watch Party",
                description: "Watch the big game on big screens with drink specials and bar food",
                venue: "Sports Bar & Grill", 
                expected: ["Sports/Games", "Bars"]
            },
            {
                name: "Wine Tasting",
                title: "Napa Valley Wine Tasting",
                description: "Sample premium wines from local vineyards with cheese pairings",
                venue: "Wine Bar",
                expected: ["Food Events", "Bars"]
            },
            {
                name: "DJ + Club Night",
                title: "Electronic Dance Music Night with DJ Snake",
                description: "World-famous DJ Snake brings electronic beats and dance music to the club",
                venue: "The Warfield",
                expected: ["Nightclubs", "Music"] // Should get both
            },
            // Single category events
            {
                name: "Pure Music Event",
                title: "Jazz Quartet Live Performance",
                description: "Intimate jazz performance by award-winning quartet",
                venue: "The Blue Note",
                expected: ["Music"] // Should only get Music
            },
            {
                name: "Pure Food Event", 
                title: "Farm-to-Table Dinner Experience",
                description: "Five-course meal featuring locally sourced ingredients",
                venue: "Chez Panisse",
                expected: ["Food Events"]
            }
        ];

        console.log(`\n📊 Testing ${testCases.length} scenarios...\n`);

        const results = [];
        
        for (const testCase of testCases) {
            console.log(chalk.cyan(`🧪 Testing: ${testCase.name}`));
            console.log(chalk.gray(`   Title: "${testCase.title}"`));
            console.log(chalk.gray(`   Venue: "${testCase.venue}"`));
            console.log(chalk.gray(`   Expected: [${testCase.expected.join(', ')}]`));
            
            const actualCategories = this.categoryMapper.smartMapCategories({
                title: testCase.title,
                description: testCase.description,
                venue: testCase.venue
            });
            
            const isCorrect = this.compareCategories(actualCategories, testCase.expected);
            const result = isCorrect ? '✅' : '❌';
            
            console.log(chalk.gray(`   Actual: [${actualCategories.join(', ')}] ${result}`));
            
            results.push({
                name: testCase.name,
                expected: testCase.expected,
                actual: actualCategories,
                correct: isCorrect
            });
            
            console.log(''); // spacing
        }
        
        this.analyzeResults(results);
    }

    /**
     * Compare expected vs actual categories
     */
    compareCategories(actual, expected) {
        if (actual.length !== expected.length) return false;
        
        // Check if all expected categories are present (order doesn't matter for now)
        return expected.every(cat => actual.includes(cat));
    }

    /**
     * Analyze test results and provide intelligence assessment
     */
    analyzeResults(results) {
        console.log(chalk.blue('\n📈 Intelligence Analysis Results'));
        console.log('='.repeat(50));
        
        const totalTests = results.length;
        const correctTests = results.filter(r => r.correct).length;
        const accuracy = ((correctTests / totalTests) * 100).toFixed(1);
        
        console.log(chalk.green(`✅ Correct: ${correctTests}/${totalTests} (${accuracy}%)`));
        console.log(chalk.red(`❌ Incorrect: ${totalTests - correctTests}/${totalTests}`));
        
        // Analyze failures
        const failures = results.filter(r => !r.correct);
        if (failures.length > 0) {
            console.log(chalk.yellow('\n🔍 Failed Test Analysis:'));
            failures.forEach(failure => {
                console.log(chalk.red(`   ❌ ${failure.name}`));
                console.log(chalk.gray(`      Expected: [${failure.expected.join(', ')}]`));
                console.log(chalk.gray(`      Got: [${failure.actual.join(', ')}]`));
            });
        }
        
        // Intelligence assessment
        console.log(chalk.blue('\n🧠 Category Intelligence Assessment:'));
        
        if (accuracy >= 90) {
            console.log(chalk.green('🎯 EXCELLENT: Category mapping is highly intelligent'));
        } else if (accuracy >= 80) {
            console.log(chalk.yellow('👍 GOOD: Category mapping is reasonably intelligent'));
        } else if (accuracy >= 70) {
            console.log(chalk.yellow('⚠️  FAIR: Category mapping needs improvement'));
        } else {
            console.log(chalk.red('❌ POOR: Category mapping needs significant improvement'));
        }
        
        // Primary vs Secondary analysis
        console.log(chalk.blue('\n🥇 Primary vs Secondary Category Analysis:'));
        
        const dualCategoryTests = results.filter(r => r.expected.length === 2);
        const singleCategoryTests = results.filter(r => r.expected.length === 1);
        
        console.log(chalk.gray(`   Dual Category Events: ${dualCategoryTests.length}`));
        console.log(chalk.gray(`   Single Category Events: ${singleCategoryTests.length}`));
        
        // Check if it properly identifies when to use 1 vs 2 categories
        const correctDualCount = dualCategoryTests.filter(r => r.actual.length === 2).length;
        const correctSingleCount = singleCategoryTests.filter(r => r.actual.length === 1).length;
        
        console.log(chalk.gray(`   Correctly used 2 categories: ${correctDualCount}/${dualCategoryTests.length}`));
        console.log(chalk.gray(`   Correctly used 1 category: ${correctSingleCount}/${singleCategoryTests.length}`));
        
        // Priority analysis
        console.log(chalk.blue('\n🏆 Priority Logic Analysis:'));
        const priorityTest = this.testPriorityLogic();
        console.log(chalk.gray(`   Priority ordering test: ${priorityTest ? '✅ PASS' : '❌ FAIL'}`));
        
        return {
            accuracy: parseFloat(accuracy),
            totalTests: totalTests,
            correctTests: correctTests,
            results: results
        };
    }

    /**
     * Test if priority logic works correctly
     */
    testPriorityLogic() {
        // Test event that should prioritize Festivals over Music
        const festivalTest = this.categoryMapper.smartMapCategories({
            title: "Music Festival with Live Bands",
            description: "Multi-day festival featuring live music performances",
            venue: "Festival Grounds"
        });
        
        // Festivals should come before Music due to priority
        return festivalTest[0] === 'Festivals' && festivalTest.includes('Music');
    }
}

// Run the test
if (require.main === module) {
    const test = new CategoryIntelligenceTest();
    test.runTests();
}

module.exports = CategoryIntelligenceTest;