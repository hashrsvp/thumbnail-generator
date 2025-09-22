#!/usr/bin/env node

/**
 * Firebase Service for Hash Event Scraper
 * 
 * Provides Firebase operations with EXACT schema validation
 * to ensure scraped events display properly in the Hash app.
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

class FirebaseService {
    constructor() {
        this.db = null;
        this.storage = null;
        this.initialized = false;
        
        // EXACT field requirements based on Hash app schema
        this.REQUIRED_FIELDS = [
            'title', 'address', 'venue', 'date', 'startTime',
            'startDateTimestamp', 'categories', 'free', 'soldOutStatus',
            'createdAt'
        ];
        
        this.VALID_CATEGORIES = [
            'Music', 'Festivals', 'Food Events', 'Sports/Games',
            'Comedy Shows', 'Art Shows', 'Bars', 'Nightclubs'
        ];
        
        // Location mappings for collection routing
        this.BAY_AREA_CITIES = [
            'San Francisco', 'Oakland', 'San Jose', 'Berkeley', 'Palo Alto',
            'Mountain View', 'Redwood City', 'San Mateo', 'Fremont', 'Sunnyvale',
            'Santa Clara', 'Hayward', 'Richmond', 'Daly City', 'Alameda',
            'San Bruno', 'Millbrae', 'Foster City', 'Belmont', 'San Carlos'
        ];
        
        this.AUSTIN_CITIES = [
            'Austin', 'Del Valle', 'Round Rock', 'Cedar Park', 'Buda',
            'Pflugerville', 'Leander', 'Lakeway', 'Georgetown', 'Kyle',
            'Dripping Springs', 'Bee Cave', 'West Lake Hills'
        ];
    }
    
    /**
     * Initialize Firebase Admin SDK
     */
    async initialize() {
        if (this.initialized) return true;
        
        try {
            // Try the key path from existing scripts
            let serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
            
            // Fallback to the main key directory
            if (!fs.existsSync(serviceAccountPath)) {
                serviceAccountPath = path.join(__dirname, '..', '..', 'key', 'hash-836eb-firebase-adminsdk-ux6hs-27a7a1bb3e.json');
            }
            
            if (!fs.existsSync(serviceAccountPath)) {
                throw new Error(`Firebase service account key not found. Checked:\n- ${serviceAccountPath}\n- ../key/hash-836eb-firebase-adminsdk-*.json`);
            }
            
            const serviceAccount = require(serviceAccountPath);
            
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
                storageBucket: `${serviceAccount.project_id}.appspot.com`
            });
            
            this.db = admin.firestore();
            this.storage = admin.storage();
            this.initialized = true;
            
            console.log(chalk.green('✅ Firebase service initialized successfully'));
            return true;
            
        } catch (error) {
            console.error(chalk.red('❌ Firebase initialization failed:'), error.message);
            return false;
        }
    }
    
    /**
     * Validate event data against EXACT Hash app schema
     */
    validateEventData(eventData) {
        const errors = [];
        
        // Check all required fields exist
        for (const field of this.REQUIRED_FIELDS) {
            if (!eventData.hasOwnProperty(field) || eventData[field] === null || eventData[field] === undefined) {
                errors.push(`Missing required field: ${field}`);
            }
        }
        
        // Validate specific field formats
        if (eventData.title && typeof eventData.title !== 'string') {
            errors.push('title must be a string');
        }
        
        if (eventData.address) {
            if (typeof eventData.address !== 'string') {
                errors.push('address must be a string');
            } else if (!eventData.address.includes(',')) {
                errors.push('address must contain a comma (format: "Street, City")');
            }
        }
        
        if (eventData.venue && typeof eventData.venue !== 'string') {
            errors.push('venue must be a string');
        }
        
        // Validate time format (HH:mm:ss)
        const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
        if (eventData.startTime && !timeRegex.test(eventData.startTime)) {
            errors.push('startTime must be in HH:mm:ss format');
        }
        
        if (eventData.endTime && !timeRegex.test(eventData.endTime)) {
            errors.push('endTime must be in HH:mm:ss format');
        }
        
        // Validate date format (ISO 8601)
        if (eventData.date) {
            try {
                new Date(eventData.date);
            } catch (e) {
                errors.push('date must be valid ISO 8601 string');
            }
        }
        
        // Validate categories
        if (eventData.categories) {
            if (!Array.isArray(eventData.categories)) {
                errors.push('categories must be an array');
            } else {
                if (eventData.categories.length === 0) {
                    errors.push('at least one category is required');
                }
                if (eventData.categories.length > 2) {
                    errors.push('maximum 2 categories allowed');
                }
                
                for (const cat of eventData.categories) {
                    if (!this.VALID_CATEGORIES.includes(cat)) {
                        errors.push(`invalid category: ${cat}. Valid categories: ${this.VALID_CATEGORIES.join(', ')}`);
                    }
                }
            }
        }
        
        // Validate boolean fields
        if (eventData.free !== undefined && typeof eventData.free !== 'boolean') {
            errors.push('free must be a boolean');
        }
        
        if (eventData.soldOutStatus !== undefined && typeof eventData.soldOutStatus !== 'boolean') {
            errors.push('soldOutStatus must be a boolean');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Determine correct collection based on event location
     */
    determineCollection(eventData) {
        const city = eventData.city || '';
        const address = eventData.address || '';
        
        // Check Bay Area cities
        const isBayArea = this.BAY_AREA_CITIES.some(bayCity => 
            city.includes(bayCity) || address.includes(bayCity)
        );
        
        if (isBayArea) {
            console.log(chalk.blue(`🌉 Event "${eventData.title}" routed to Bay Area collection (${city})`));
            return 'bayAreaEvents';
        }
        
        // Check Austin cities
        const isAustin = this.AUSTIN_CITIES.some(austinCity => 
            city.includes(austinCity) || address.includes(austinCity)
        );
        
        if (isAustin) {
            console.log(chalk.yellow(`🤠 Event "${eventData.title}" routed to Austin collection (${city})`));
            return 'austinEvents';
        }
        
        // Default to Bay Area if location unclear
        console.log(chalk.cyan(`🌉 Event "${eventData.title}" defaulted to Bay Area collection (location unclear: ${city})`));
        return 'bayAreaEvents';
    }
    
    /**
     * Check if event already exists to prevent duplicates
     */
    async checkDuplicate(eventData) {
        const collections = ['bayAreaEvents', 'austinEvents', 'events'];
        
        for (const collectionName of collections) {
            try {
                const existing = await this.db.collection(collectionName)
                    .where('title', '==', eventData.title)
                    .where('date', '==', eventData.date)
                    .where('venue', '==', eventData.venue)
                    .limit(1)
                    .get();
                
                if (!existing.empty) {
                    return {
                        exists: true,
                        collection: collectionName,
                        id: existing.docs[0].id,
                        data: existing.docs[0].data()
                    };
                }
            } catch (error) {
                console.warn(chalk.yellow(`⚠️  Warning: Could not check ${collectionName}:`, error.message));
            }
        }
        
        return { exists: false };
    }
    
    /**
     * Submit event to Firebase with validation
     */
    async submitEvent(eventData, options = {}) {
        if (!this.initialized) {
            await this.initialize();
        }
        
        // Validate data
        const validation = this.validateEventData(eventData);
        if (!validation.valid) {
            throw new Error(`Event validation failed:\n${validation.errors.join('\n')}`);
        }
        
        // Check for duplicates unless explicitly disabled
        if (!options.allowDuplicates) {
            const duplicateCheck = await this.checkDuplicate(eventData);
            if (duplicateCheck.exists) {
                return {
                    success: false,
                    duplicate: true,
                    existing: duplicateCheck
                };
            }
        }
        
        // Determine collection
        const collection = this.determineCollection(eventData);
        
        try {
            // Submit to Firebase
            const docRef = await this.db.collection(collection).add(eventData);
            
            console.log(chalk.green(`✅ Event "${eventData.title}" submitted successfully`));
            console.log(chalk.gray(`   Collection: ${collection}`));
            console.log(chalk.gray(`   Document ID: ${docRef.id}`));
            
            return {
                success: true,
                eventId: docRef.id,
                collection: collection
            };
            
        } catch (error) {
            console.error(chalk.red('❌ Firebase submission failed:'), error.message);
            throw error;
        }
    }
    
    /**
     * Extract city from address for collection routing
     */
    extractCityFromAddress(address) {
        if (!address || typeof address !== 'string') return '';
        
        // Address format is expected to be "Street, City"
        const parts = address.split(',');
        if (parts.length >= 2) {
            return parts[parts.length - 1].trim();
        }
        
        return address.trim();
    }
    
    /**
     * Format event data to match exact Firebase schema
     */
    formatEventData(rawEventData) {
        const now = new Date();
        
        // Extract city from address if not provided
        const city = rawEventData.city || this.extractCityFromAddress(rawEventData.address);
        
        return {
            // REQUIRED CORE FIELDS
            title: rawEventData.title || '',
            address: rawEventData.address || '',
            venue: rawEventData.venue || '',
            date: rawEventData.date || now.toISOString(),
            startTime: rawEventData.startTime || '19:00:00',
            startDateTimestamp: admin.firestore.Timestamp.fromDate(new Date(rawEventData.date || now)),
            categories: rawEventData.categories || [],
            free: Boolean(rawEventData.free),
            soldOutStatus: Boolean(rawEventData.soldOut || rawEventData.soldOutStatus),
            createdAt: admin.firestore.Timestamp.now(),
            
            // OPTIONAL FIELDS
            description: rawEventData.description || '',
            ticketsLink: rawEventData.ticketsLink || rawEventData.ticketUrl || '',
            imageUrl: rawEventData.imageUrl || '',
            city: city,
            
            // CONDITIONAL FIELDS
            ...(rawEventData.endTime && { endTime: rawEventData.endTime }),
            ...(rawEventData.endDate && { 
                endDate: rawEventData.endDate,
                endDateTimestamp: admin.firestore.Timestamp.fromDate(new Date(rawEventData.endDate))
            })
        };
    }
}

module.exports = FirebaseService;