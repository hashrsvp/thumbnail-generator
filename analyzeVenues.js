const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'hash-836eb'
});

const db = admin.firestore();

async function analyzeVenues() {
  console.log('🔍 Analyzing venues in Firebase collections...');
  
  const venueFrequency = new Map();
  const venueAddresses = new Map();
  const collections = ['events', 'austinEvents', 'bayAreaEvents'];
  
  for (const collectionName of collections) {
    console.log(`\n📊 Scanning ${collectionName} collection...`);
    
    try {
      const snapshot = await db.collection(collectionName).get();
      console.log(`Found ${snapshot.size} events in ${collectionName}`);
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const venue = data.venue;
        const address = data.address;
        
        if (venue && venue.trim()) {
          const venueKey = venue.trim();
          
          // Count frequency
          venueFrequency.set(venueKey, (venueFrequency.get(venueKey) || 0) + 1);
          
          // Store address (use the most recent one if multiple)
          if (address && address.trim()) {
            venueAddresses.set(venueKey, address.trim());
          }
        }
      });
      
    } catch (error) {
      console.error(`Error scanning ${collectionName}:`, error);
    }
  }
  
  // Sort venues by frequency
  const sortedVenues = Array.from(venueFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30); // Top 30 most common venues
  
  console.log('\n🏆 TOP VENUES BY FREQUENCY:');
  console.log('='.repeat(50));
  
  const venueData = [];
  
  sortedVenues.forEach(([venue, count], index) => {
    const address = venueAddresses.get(venue) || 'Address not found';
    console.log(`${(index + 1).toString().padStart(2)}. ${venue} (${count} events)`);
    console.log(`    📍 ${address}`);
    
    venueData.push({
      venue,
      address,
      frequency: count
    });
  });
  
  // Group by city/region for better organization
  const austinVenues = venueData.filter(v => 
    v.address.toLowerCase().includes('austin') || 
    v.address.toLowerCase().includes(', tx')
  );
  
  const bayAreaVenues = venueData.filter(v => 
    v.address.toLowerCase().includes('san francisco') ||
    v.address.toLowerCase().includes('oakland') ||
    v.address.toLowerCase().includes('berkeley') ||
    v.address.toLowerCase().includes(', ca')
  );
  
  const otherVenues = venueData.filter(v => 
    !austinVenues.includes(v) && !bayAreaVenues.includes(v)
  );
  
  console.log('\n📊 VENUE BREAKDOWN:');
  console.log(`Austin venues: ${austinVenues.length}`);
  console.log(`Bay Area venues: ${bayAreaVenues.length}`);
  console.log(`Other venues: ${otherVenues.length}`);
  
  // Generate HTML options for the prefiller
  console.log('\n📝 HTML OPTIONS FOR PREFILLER:');
  console.log('='.repeat(50));
  
  if (austinVenues.length > 0) {
    console.log('<optgroup label="Austin Venues">');
    austinVenues.forEach(v => {
      console.log(`    <option value="${v.venue}|${v.address}">${v.venue} (${v.frequency} events)</option>`);
    });
    console.log('</optgroup>');
  }
  
  if (bayAreaVenues.length > 0) {
    console.log('<optgroup label="Bay Area Venues">');
    bayAreaVenues.forEach(v => {
      console.log(`    <option value="${v.venue}|${v.address}">${v.venue} (${v.frequency} events)</option>`);
    });
    console.log('</optgroup>');
  }
  
  if (otherVenues.length > 0) {
    console.log('<optgroup label="Other Venues">');
    otherVenues.forEach(v => {
      console.log(`    <option value="${v.venue}|${v.address}">${v.venue} (${v.frequency} events)</option>`);
    });
    console.log('</optgroup>');
  }
  
  // Save results to JSON file
  const results = {
    totalVenues: venueFrequency.size,
    topVenues: venueData,
    austinVenues,
    bayAreaVenues,
    otherVenues,
    generatedAt: new Date().toISOString()
  };
  
  fs.writeFileSync('./venue-analysis-results.json', JSON.stringify(results, null, 2));
  console.log('\n💾 Results saved to venue-analysis-results.json');
  
  console.log('\n✅ Venue analysis complete!');
  process.exit(0);
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

// Run the analysis
analyzeVenues().catch(console.error);