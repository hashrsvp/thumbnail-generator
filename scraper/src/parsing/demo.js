#!/usr/bin/env node

/**
 * Demo script for Event Details Parser
 * Shows real-world usage examples with various OCR text scenarios
 */

const { EventDetailsParser } = require('./index');

// Create parser instance with default options
const parser = new EventDetailsParser({
  minConfidence: 0.5,
  enableFuzzyMatching: true,
  enableSpellCorrection: true
});

// Demo data - realistic OCR text samples
const demoTexts = [
  {
    name: 'Perfect Quality OCR',
    text: 'Jazz Concert Friday January 15th 8:00 PM at Blue Note Club Tickets $35 Doors 7:30 PM',
    description: 'High-quality OCR with all event details clearly readable'
  },
  {
    name: 'OCR with Common Artifacts',
    text: 'C0NCERT Januar7 Il5 8:3O PII at The 0bservat0r7 Ticket5 $25.OO',
    description: 'Text with typical OCR character substitution errors'
  },
  {
    name: 'Free Event',
    text: 'Art Gallery Opening Reception Tonight 6PM 456 Art Street FREE ADMISSION',
    description: 'Free event with relative date and address venue'
  },
  {
    name: 'Complex Pricing',
    text: 'Theater Performance Saturday 2PM & 8PM $15 Students $25 General $35 VIP',
    description: 'Multiple showtimes with tiered pricing structure'
  },
  {
    name: 'Time Range Format',
    text: 'Workshop Series March 10-12 Daily 9:00 AM - 5:00 PM Community Center $150',
    description: 'Multi-day event with daily time ranges'
  },
  {
    name: 'Door vs Show Times',
    text: 'LIVE MUSIC TONIGHT Doors open 7PM Show starts 8PM Cover $10',
    description: 'Distinction between door time and show time'
  },
  {
    name: 'Price Range',
    text: 'Concert Tickets $20-40 depending on seating February 28 8:30PM',
    description: 'Price range with additional context'
  },
  {
    name: 'Heavily Corrupted OCR',
    text: 'Sh0w t0m0rr0w 8PII C0ver $Il0 at CIub Luna',
    description: 'Poor quality OCR requiring significant correction'
  }
];

// Known venues for demonstration
const knownVenues = [
  { name: 'Blue Note Club', city: 'New York', capacity: 200, type: 'jazz_club' },
  { name: 'The Observatory', city: 'Los Angeles', capacity: 500, type: 'music_venue' },
  { name: 'Madison Square Garden', city: 'New York', capacity: 20000, type: 'arena' },
  { name: 'Club Luna', city: 'San Francisco', capacity: 150, type: 'nightclub' },
  { name: 'Community Center', city: 'Various', capacity: 300, type: 'community' }
];

function formatResult(result) {
  const { success, data, confidence, metadata } = result;
  
  return {
    success,
    confidence: confidence.toFixed(3),
    extractedData: {
      date: data.date ? {
        day: data.date.day,
        month: data.date.month,
        year: data.date.year,
        dayOfWeek: data.date.dayOfWeek,
        relative: data.date.relative
      } : null,
      time: data.time ? {
        hour: data.time.hour,
        minute: data.time.minute,
        type: data.time.type,
        format: data.time.format,
        period: data.time.period
      } : null,
      price: data.price ? {
        min: data.price.min,
        max: data.price.max,
        currency: data.price.currency,
        type: data.price.type,
        isFree: data.price.isFree,
        tier: data.price.tier,
        timing: data.price.timing
      } : null,
      venue: data.venue ? {
        name: data.venue.name,
        type: data.venue.type,
        venueType: data.venue.venueType,
        knownVenue: data.venue.knownVenue
      } : null
    },
    issues: metadata.issues,
    processingTime: `${Date.now() - metadata.processingTime}ms`
  };
}

function runDemo() {
  console.log('🎭 EVENT DETAILS PARSER DEMONSTRATION\n');
  console.log('=' .repeat(80));
  
  demoTexts.forEach((demo, index) => {
    console.log(`\n${index + 1}. ${demo.name}`);
    console.log(`Description: ${demo.description}`);
    console.log(`Input: "${demo.text}"`);
    console.log('-'.repeat(60));
    
    // Parse without context
    console.log('📝 Basic Parsing:');
    const basicResult = parser.parse(demo.text);
    console.log(JSON.stringify(formatResult(basicResult), null, 2));
    
    // Parse with known venues context
    console.log('\n🏢 With Known Venues Context:');
    const contextResult = parser.parse(demo.text, { knownVenues });
    const contextFormatted = formatResult(contextResult);
    
    // Show improvement in confidence or venue matching
    if (contextResult.confidence > basicResult.confidence) {
      console.log(`✅ Confidence improved: ${basicResult.confidence.toFixed(3)} → ${contextResult.confidence.toFixed(3)}`);
    }
    
    if (contextResult.data.venue?.knownVenue) {
      console.log(`✅ Matched known venue: ${contextResult.data.venue.name}`);
    }
    
    console.log(JSON.stringify(contextFormatted, null, 2));
    
    // Validation
    const validation = parser.validate(contextResult);
    if (validation.issues.length > 0 || validation.warnings.length > 0) {
      console.log('\n⚠️  Validation Results:');
      if (validation.issues.length > 0) {
        console.log(`Issues: ${validation.issues.join(', ')}`);
      }
      if (validation.warnings.length > 0) {
        console.log(`Warnings: ${validation.warnings.join(', ')}`);
      }
    }
    
    console.log('='.repeat(80));
  });
  
  // Field-specific parsing demo
  console.log('\n🔍 FIELD-SPECIFIC PARSING DEMONSTRATION\n');
  const sampleText = 'Concert January 15th 8:00 PM at The Observatory $25';
  console.log(`Sample text: "${sampleText}"\n`);
  
  const fieldTypes = ['date', 'time', 'price', 'venue'];
  
  fieldTypes.forEach(fieldType => {
    console.log(`${fieldType.toUpperCase()} parsing:`);
    try {
      const fieldResult = parser.parseField(sampleText, fieldType);
      console.log(JSON.stringify(fieldResult, null, 2));
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
    console.log();
  });
  
  // Performance demo
  console.log('⚡ PERFORMANCE DEMONSTRATION\n');
  console.log('Testing batch processing speed...');
  
  const batchTexts = demoTexts.map(demo => demo.text);
  const startTime = Date.now();
  const batchResults = batchTexts.map(text => parser.parse(text, { knownVenues }));
  const endTime = Date.now();
  
  const processingTime = endTime - startTime;
  const averageTime = processingTime / batchTexts.length;
  const successRate = batchResults.filter(r => r.success).length / batchResults.length;
  
  console.log(`Processed ${batchTexts.length} texts in ${processingTime}ms`);
  console.log(`Average time per text: ${averageTime.toFixed(2)}ms`);
  console.log(`Success rate: ${(successRate * 100).toFixed(1)}%`);
  console.log(`Texts per second: ${(1000 / averageTime).toFixed(1)}`);
  
  // Error handling demo
  console.log('\n🛡️  ERROR HANDLING DEMONSTRATION\n');
  const errorInputs = [
    { name: 'Empty string', input: '' },
    { name: 'Null input', input: null },
    { name: 'Number input', input: 123 },
    { name: 'Object input', input: {} },
    { name: 'Very long text', input: 'Concert '.repeat(1000) + 'January 15 8PM $25' },
    { name: 'Special characters', input: '\x00\x01\x02\x03Concert\x04\x05' }
  ];
  
  errorInputs.forEach(({ name, input }) => {
    console.log(`Testing ${name}:`);
    try {
      const result = parser.parse(input);
      console.log(`✅ Handled gracefully - Success: ${result.success}, Confidence: ${result.confidence.toFixed(3)}`);
    } catch (error) {
      console.log(`❌ Threw error: ${error.message}`);
    }
    console.log();
  });
  
  console.log('🎉 Demo completed successfully!');
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runDemo();
}

module.exports = { runDemo };