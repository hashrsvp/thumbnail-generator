#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixDuplicateEvent() {
    try {
        // First, delete the incorrect duplicate
        console.log('Deleting incorrect duplicate event...');
        await db.collection('events').doc('ZKLrwJlkGmKgDewmTeyz').delete();
        console.log('✅ Deleted event ZKLrwJlkGmKgDewmTeyz');
        
        // Fetch the original event
        console.log('\nFetching original event...');
        const originalDoc = await db.collection('events').doc('fqz1uQmjMReSOJWnvaZJ').get();
        
        if (!originalDoc.exists) {
            console.error('❌ Original event not found');
            process.exit(1);
        }
        
        const originalData = originalDoc.data();
        console.log('✅ Found original event:', originalData.title);
        
        // Create proper duplicate data for October 3, 2025
        const newDate = new Date('2025-10-03T17:00:00-07:00'); // 5 PM PDT
        const endDate = new Date('2025-10-03T21:00:00-07:00'); // 9 PM PDT
        
        const duplicateData = {
            ...originalData,
            date: '2025-10-03T00:00:00.000Z',
            startDateTimestamp: admin.firestore.Timestamp.fromDate(newDate),
            endDateTimestamp: admin.firestore.Timestamp.fromDate(endDate),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            isRepeatEvent: true,
            originalEventId: 'fqz1uQmjMReSOJWnvaZJ',
            repeatCreatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Remove the documentId if it exists
        delete duplicateData.documentId;
        
        // Create the new duplicate
        console.log('\nCreating proper duplicate event for October 3, 2025...');
        const newEventRef = await db.collection('events').add(duplicateData);
        console.log('✅ Created new event with ID:', newEventRef.id);
        
        // Verify the new event
        const verifyDoc = await newEventRef.get();
        const verifyData = verifyDoc.data();
        
        console.log('\n📅 Event Details:');
        console.log('  Title:', verifyData.title);
        console.log('  Date:', verifyData.date);
        console.log('  Start Time:', verifyData.startDateTimestamp.toDate());
        console.log('  End Time:', verifyData.endDateTimestamp.toDate());
        console.log('  Original Event ID:', verifyData.originalEventId);
        console.log('  Is Repeat Event:', verifyData.isRepeatEvent);
        
        console.log('\n✅ Successfully created duplicate event for October 3, 2025!');
        console.log('New Event ID:', newEventRef.id);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixDuplicateEvent();