#!/usr/bin/env node

/**
 * Fix Lagos Island Event Venue Name
 * Update venue field to show proper venue name instead of address
 */

const admin = require('firebase-admin');
const path = require('path');
const chalk = require('chalk');

async function fixLagosVenue() {
    try {
        console.log('🏢 Fixing Lagos Island event venue name...');
        
        // Initialize Firebase
        const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
        const serviceAccount = require(serviceAccountPath);
        
        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
                storageBucket: `${serviceAccount.project_id}.appspot.com`
            });
        }
        
        const db = admin.firestore();
        const eventId = '751biOmwjEQI6mmWaHAZ';
        
        console.log(`📅 Event ID: ${eventId}`);
        
        // Get current event data
        const eventRef = db.collection('bayAreaEvents').doc(eventId);
        const eventDoc = await eventRef.get();
        
        if (!eventDoc.exists) {
            throw new Error('Event not found');
        }
        
        const currentData = eventDoc.data();
        console.log(`📍 Current venue: "${currentData.venue}"`);
        console.log(`📍 Current address: "${currentData.address}"`);
        
        // Update venue to proper name
        const updatedData = {
            venue: 'The Valencia Room',  // Proper venue name
            address: '647 Valencia Street, San Francisco, CA 94110',  // Keep address as address
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        await eventRef.update(updatedData);
        
        console.log('✅ Lagos Island event venue updated successfully!');
        console.log(`🏢 New venue: "${updatedData.venue}"`);
        console.log(`📍 Address: "${updatedData.address}"`);
        console.log('');
        console.log('✨ The event will now show:');
        console.log(`   Title: LAGOS ISLAND: Labor Day Weekend Vibes`);
        console.log(`   @ The Valencia Room`);
        console.log(`   📍 647 Valencia Street, San Francisco, CA 94110`);
        
    } catch (error) {
        console.error('❌ Error fixing Lagos venue:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    fixLagosVenue();
}

module.exports = fixLagosVenue;