#!/usr/bin/env node

/**
 * Focused test on Capitol City Comedy Club - highest success probability venue
 */

const EventScraper = require("./improved-event-scraper-2");
const chalk = require('chalk');

async function testCapitolCityComedy() {
    console.log(chalk.blue('🎭 Testing Capitol City Comedy Club'));
    console.log(chalk.gray('Highest probability venue based on analysis'));
    
    const scraper = new EventScraper({
        headless: true,
        debug: true,
        timeout: 30000
    });
    
    const testResults = {
        venue: 'Capitol City Comedy Club',
        url: 'https://www.capcitycomedy.com/',
        startTime: Date.now(),
        multiEventTest: null,
        singleEventTest: null,
        dataQuality: null
    };
    
    try {
        console.log('🚀 Initializing and navigating to Capitol City Comedy...');
        await scraper.initBrowser();
        
        await scraper.page.goto(testResults.url, { 
            waitUntil: 'domcontentloaded',
            timeout: 25000 
        });
        
        console.log('✅ Page loaded successfully');
        console.log(`📄 Title: ${await scraper.page.title()}`);
        
        await scraper.page.waitForTimeout(2000);
        
        // Test 1: Multi-event extraction
        console.log('\n📋 Testing multi-event extraction (scrapeEventListing)...');
        const multiEventStart = Date.now();
        
        const events = await scraper.scrapeEventListing({
            maxEvents: 5, // Limit for manageable testing
            includeImages: true,
            enhanceAddresses: true
        });
        
        const multiEventTime = Date.now() - multiEventStart;
        
        testResults.multiEventTest = {
            success: events && events.length > 0,
            eventsFound: events?.length || 0,
            processingTime: multiEventTime,
            extractionMethod: events?.[0]?._extraction?.method || 'unknown',
            sampleEvent: events?.[0] || null
        };
        
        console.log(`📊 Multi-event results: ${testResults.multiEventTest.eventsFound} events in ${multiEventTime}ms`);
        
        if (testResults.multiEventTest.success) {
            console.log(`🔧 Extraction method: ${testResults.multiEventTest.extractionMethod}`);
            
            // Test 2: Single event extraction (if we have an event URL)
            const firstEvent = events[0];
            if (firstEvent && (firstEvent.url || firstEvent.ticketsLink)) {
                const eventUrl = firstEvent.url || firstEvent.ticketsLink;
                console.log(`\n🎫 Testing single event extraction on: ${eventUrl}`);
                
                try {
                    await scraper.page.goto(eventUrl, { 
                        waitUntil: 'domcontentloaded',
                        timeout: 20000 
                    });
                    
                    await scraper.page.waitForTimeout(1500);
                    
                    const singleEventStart = Date.now();
                    const singleEvent = await scraper.scrapeGeneric({
                        includeImages: true,
                        enhanceAddress: true
                    });
                    const singleEventTime = Date.now() - singleEventStart;
                    
                    testResults.singleEventTest = {
                        success: singleEvent && singleEvent.title,
                        processingTime: singleEventTime,
                        extractionMethod: singleEvent?._extraction?.method || 'unknown',
                        event: singleEvent
                    };
                    
                    console.log(`🎫 Single event result: ${testResults.singleEventTest.success ? 'SUCCESS' : 'FAILED'} in ${singleEventTime}ms`);
                    
                } catch (singleEventError) {
                    testResults.singleEventTest = {
                        success: false,
                        error: singleEventError.message
                    };
                    console.log(`❌ Single event test failed: ${singleEventError.message}`);
                }
            }
            
            // Test 3: Data Quality Assessment
            console.log('\n🔍 Assessing data quality...');
            testResults.dataQuality = assessDataQuality(events, testResults.singleEventTest?.event);
            
            displayDataQuality(testResults.dataQuality);
        }
        
        // Final Results Summary
        console.log('\n' + '='.repeat(60));
        console.log(chalk.bold.blue('🎭 CAPITOL CITY COMEDY TEST RESULTS'));
        console.log('='.repeat(60));
        
        const totalTime = Date.now() - testResults.startTime;
        console.log(`⏱️  Total test time: ${totalTime}ms`);
        
        if (testResults.multiEventTest.success) {
            console.log(chalk.green(`✅ Multi-Event Extraction: SUCCESS`));
            console.log(`   Events found: ${testResults.multiEventTest.eventsFound}`);
            console.log(`   Method: ${testResults.multiEventTest.extractionMethod}`);
            console.log(`   Time: ${testResults.multiEventTest.processingTime}ms`);
        } else {
            console.log(chalk.red(`❌ Multi-Event Extraction: FAILED`));
        }
        
        if (testResults.singleEventTest) {
            const status = testResults.singleEventTest.success ? 
                chalk.green('✅ SUCCESS') : chalk.red('❌ FAILED');
            console.log(`${status} Single-Event Extraction`);
            if (testResults.singleEventTest.success) {
                console.log(`   Method: ${testResults.singleEventTest.extractionMethod}`);
                console.log(`   Time: ${testResults.singleEventTest.processingTime}ms`);
            }
        }
        
        if (testResults.dataQuality) {
            console.log(`📊 Data Quality Score: ${testResults.dataQuality.overallScore}%`);
        }
        
        // Show sample event
        if (testResults.multiEventTest.sampleEvent) {
            console.log('\n📋 Sample Event Data:');
            const sample = testResults.multiEventTest.sampleEvent;
            console.log(`   Title: ${sample.title}`);
            console.log(`   Date: ${sample.date}`);
            console.log(`   Time: ${sample.time || sample.startTime}`);
            console.log(`   Venue: ${sample.venueName || sample.venue}`);
            console.log(`   Address: ${sample.address}`);
            console.log(`   Category: ${sample.category}`);
            console.log(`   Free: ${sample.free}`);
            if (sample.imageUrls && sample.imageUrls.length > 0) {
                console.log(`   Image: ${sample.imageUrls[0]}`);
            }
        }
        
        // Recommendations
        console.log('\n💡 Recommendations:');
        if (testResults.multiEventTest.success) {
            console.log('   ✅ Capitol City Comedy is successfully scrapable');
            console.log(`   ✅ ${testResults.multiEventTest.extractionMethod} method working well`);
            console.log(`   ✅ Processing time is reasonable (${testResults.multiEventTest.processingTime}ms)`);
        }
        
        if (testResults.dataQuality?.overallScore > 80) {
            console.log('   ✅ High data quality suitable for Hash app');
        } else if (testResults.dataQuality?.overallScore > 60) {
            console.log('   ⚠️  Moderate data quality - some fields may need enhancement');
        } else {
            console.log('   ❌ Data quality issues detected - review extraction patterns');
        }
        
    } catch (error) {
        console.error(chalk.red('❌ Test failed:'), error.message);
        testResults.error = error.message;
    } finally {
        if (scraper.browser) {
            await scraper.close();
        }
        
        // Save results
        const fs = require('fs');
        const reportPath = `capitol-city-comedy-test-${Date.now()}.json`;
        fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
        console.log(`\n📊 Test results saved: ${reportPath}`);
    }
}

function assessDataQuality(events, singleEvent = null) {
    if (!events || events.length === 0) {
        return { overallScore: 0, issues: ['No events to assess'] };
    }
    
    const assessment = {
        titleQuality: 0,
        dateQuality: 0,
        venueQuality: 0,
        addressQuality: 0,
        categoryQuality: 0,
        hashCompliance: 0,
        overallScore: 0,
        issues: []
    };
    
    const allEvents = [...events];
    if (singleEvent) allEvents.push(singleEvent);
    
    let scores = [];
    
    for (const event of allEvents) {
        let eventScore = 100;
        
        // Title
        if (!event.title) {
            assessment.issues.push('Missing title');
            eventScore -= 20;
        } else if (event.title.length < 5) {
            assessment.issues.push('Title too short');
            eventScore -= 10;
        }
        
        // Date
        if (!event.date) {
            assessment.issues.push('Missing date');
            eventScore -= 20;
        } else {
            const date = new Date(event.date);
            if (isNaN(date.getTime())) {
                assessment.issues.push('Invalid date format');
                eventScore -= 15;
            }
        }
        
        // Venue
        if (!event.venueName && !event.venue) {
            assessment.issues.push('Missing venue name');
            eventScore -= 15;
        }
        
        // Address
        if (!event.address) {
            assessment.issues.push('Missing address');
            eventScore -= 15;
        } else if (!event.address.includes(',')) {
            assessment.issues.push('Address missing comma (Hash requirement)');
            eventScore -= 10;
        }
        
        // Category
        if (!event.category) {
            assessment.issues.push('Missing category');
            eventScore -= 15;
        }
        
        scores.push(Math.max(0, eventScore));
    }
    
    assessment.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    
    return assessment;
}

function displayDataQuality(assessment) {
    console.log(`📊 Data Quality Score: ${assessment.overallScore}%`);
    if (assessment.issues.length > 0) {
        console.log('⚠️  Issues found:');
        assessment.issues.slice(0, 5).forEach(issue => {
            console.log(`   • ${issue}`);
        });
        if (assessment.issues.length > 5) {
            console.log(`   ... and ${assessment.issues.length - 5} more issues`);
        }
    } else {
        console.log('✅ No data quality issues detected');
    }
}

testCapitolCityComedy().catch(console.error);