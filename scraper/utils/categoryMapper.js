#!/usr/bin/env node

/**
 * Category Mapper for Hash Event Scraper
 * 
 * Maps scraped event data to valid Hash app categories.
 * Ensures maximum 2 categories per event as required by app.
 */

const chalk = require('chalk');

class CategoryMapper {
    constructor() {
        // EXACT categories from Hash app (must match EventFormModels.swift)
        this.VALID_CATEGORIES = [
            'Music',
            'Festivals', 
            'Food Events',
            'Sports/Games',
            'Comedy Shows',
            'Art Shows',
            'Bars',
            'Nightclubs'
        ];
        
        // Keyword mappings for automatic category detection
        this.CATEGORY_KEYWORDS = {
            'Music': [
                'concert', 'music', 'band', 'singer', 'musician', 'orchestra', 'symphony',
                'jazz', 'rock', 'pop', 'hip-hop', 'hip hop', 'rap', 'country', 'folk',
                'classical', 'electronic', 'edm', 'techno', 'house', 'disco', 'blues',
                'reggae', 'punk', 'metal', 'indie', 'acoustic', 'piano', 'guitar',
                'violin', 'drums', 'dj', 'live music', 'musical', 'choir', 'singing',
                'karaoke', 'open mic', 'battle of the bands', 'record release', 'album',
                'tour', 'headliner', 'opening act', 'soundcloud', 'spotify',
                // Enhanced keywords for better detection
                'afrobeats', 'afro', 'vibes', 'beats', 'rhythm', 'sound', 'audio',
                'reggaeton', 'latin music', 'salsa', 'bachata', 'rumba', 'merengue',
                'ambient', 'world music', 'fusion', 'experimental', 'underground',
                'mixtape', 'playlist', 'track', 'song', 'melody', 'harmony'
            ],
            
            'Festivals': [
                'festival', 'fest', 'celebration', 'carnival', 'parade', 'street fair',
                'block party', 'outdoor event', 'multi-day', 'weekend event',
                'cultural festival', 'music festival', 'food festival', 'art festival',
                'beer festival', 'wine festival', 'harvest', 'oktoberfest', 'mardi gras',
                'pride', 'cultural celebration', 'ethnic festival', 'community event',
                'fair', 'expo', 'convention', 'gathering', 'meetup', 'conference'
            ],
            
            'Food Events': [
                'food', 'dining', 'restaurant', 'cafe', 'coffee', 'brunch', 'dinner',
                'lunch', 'breakfast', 'tasting', 'wine tasting', 'beer tasting',
                'cooking', 'chef', 'culinary', 'cuisine', 'menu', 'special menu',
                'prix fixe', 'farm to table', 'food truck', 'pop-up', 'popup',
                'happy hour', 'drinks', 'cocktail', 'mixer', 'food and drink',
                'bakery', 'dessert', 'ice cream', 'pizza', 'bbq', 'barbecue',
                'seafood', 'sushi', 'mexican', 'italian', 'chinese', 'thai',
                'fusion', 'vegan', 'vegetarian', 'organic', 'local food'
            ],
            
            'Sports/Games': [
                'sports', 'game', 'match', 'tournament', 'competition', 'league',
                'football', 'basketball', 'baseball', 'soccer', 'tennis', 'golf',
                'hockey', 'volleyball', 'swimming', 'running', 'marathon', '5k', '10k',
                'cycling', 'bike', 'triathlon', 'fitness', 'gym', 'workout', 'yoga',
                'pilates', 'crossfit', 'martial arts', 'boxing', 'mma', 'wrestling',
                'skateboarding', 'surfing', 'climbing', 'hiking', 'outdoor activity',
                'recreation', 'pickup game', 'intramural', 'amateur', 'professional',
                'playoffs', 'championship', 'bowl game', 'world cup', 'olympics',
                'esports', 'gaming', 'video games', 'board games', 'trivia', 'quiz'
            ],
            
            'Comedy Shows': [
                'comedy', 'comedian', 'stand-up', 'standup', 'stand up', 'funny',
                'humor', 'humour', 'laugh', 'laughs', 'jokes', 'comic', 'comics',
                'improv', 'improvisation', 'sketch', 'sketch comedy', 'open mic comedy',
                'comedy club', 'comedy show', 'comedy night', 'roast', 'roasting',
                'storytelling', 'funny story', 'hilarious', 'entertaining',
                'comedy competition', 'comedy battle', 'comedy showcase'
            ],
            
            'Art Shows': [
                'art', 'artist', 'gallery', 'museum', 'exhibition', 'exhibit', 'show',
                'painting', 'sculpture', 'photography', 'photo', 'drawing', 'sketch',
                'installation', 'mixed media', 'contemporary art', 'modern art',
                'abstract', 'figurative', 'landscape', 'portrait', 'still life',
                'watercolor', 'oil painting', 'acrylic', 'digital art', 'graphic design',
                'illustration', 'printmaking', 'ceramics', 'pottery', 'jewelry',
                'textile', 'fiber art', 'performance art', 'video art', 'multimedia',
                'art walk', 'art tour', 'artist talk', 'workshop', 'art class',
                'art opening', 'reception', 'vernissage', 'first friday', 'art market'
            ],
            
            'Bars': [
                'bar', 'pub', 'tavern', 'lounge', 'cocktail bar', 'wine bar', 'beer bar',
                'sports bar', 'dive bar', 'rooftop bar', 'speakeasy', 'brewery',
                'craft beer', 'beer garden', 'beer hall', 'tap room', 'tasting room',
                'happy hour', 'drink special', 'cocktail', 'mixology', 'bartender',
                'drinks', 'alcohol', 'wine', 'beer', 'spirits', 'whiskey', 'vodka',
                'gin', 'rum', 'tequila', 'margarita', 'bloody mary', 'mimosa',
                'bottomless', 'two-for-one', '2-for-1', 'dollar drinks', 'cheap drinks',
                'karaoke bar', 'pool', 'billiards', 'darts', 'trivia night'
            ],
            
            'Nightclubs': [
                'nightclub', 'club', 'dance', 'dancing', 'dj', 'house music', 'techno',
                'electronic', 'edm', 'rave', 'party', 'late night', 'after hours',
                'bottle service', 'vip', 'guest list', 'cover charge', 'door charge',
                'dance floor', 'dance party', 'club night', 'theme party', 
                'costume party', 'halloween party', 'new years party', 'countdown',
                'beats', 'bass', 'sound system', 'light show', 'laser show',
                'go-go', 'burlesque', 'cabaret', 'strip club', 'gentlemen\'s club',
                '21+', '18+', 'over 21', 'nightlife', 'clubbing', 'party scene'
            ]
        };
        
        // Priority order for categories when multiple matches
        this.CATEGORY_PRIORITY = [
            'Festivals',    // Highest - festivals often include other elements
            'Comedy Shows', // High - specific entertainment type  
            'Art Shows',    // High - specific cultural events
            'Sports/Games', // High - specific but broad
            'Nightclubs',   // Medium-high - specific venue/experience type
            'Music',        // Medium - very common, often secondary to venue type
            'Food Events',  // Medium - common but often secondary
            'Bars'          // Lowest - often combined with other activities
        ];
        
        // Minimum thresholds for intelligent categorization
        this.MIN_SECONDARY_MATCHES = 2;    // Secondary category needs at least 2 keyword matches
        this.MIN_STRENGTH_RATIO = 0.4;     // Secondary must be at least 40% strength of primary
        
        // Context-aware keyword resolution
        this.CONTEXT_RULES = {
            'wine': {
                'Food Events': ['appetizers', 'tasting', 'pairing', 'cheese', 'food', 'dining', 'reception'],
                'Bars': ['bar', 'pub', 'cocktail', 'drink', 'happy hour', 'bottle service']
            },
            'art': {
                'Art Shows': ['gallery', 'exhibition', 'artist', 'painting', 'sculpture', 'museum'],
                'Music': ['performance', 'quartet', 'band', 'live', 'show'] // Avoid false art matches
            }
        };
    }
    
    /**
     * Map raw event data to valid Hash categories (max 2)
     */
    mapCategories(title = '', description = '', venue = '', tags = []) {
        const searchText = [title, description, venue, ...tags]
            .join(' ')
            .toLowerCase();
        
        const categoryMatches = [];
        
        // Find all matching categories
        for (const [category, keywords] of Object.entries(this.CATEGORY_KEYWORDS)) {
            let matchCount = 0;
            let matchedKeywords = [];
            
            for (const keyword of keywords) {
                if (searchText.includes(keyword.toLowerCase())) {
                    matchCount++;
                    matchedKeywords.push(keyword);
                }
            }
            
            if (matchCount > 0) {
                categoryMatches.push({
                    category: category,
                    matchCount: matchCount,
                    matchedKeywords: matchedKeywords,
                    priority: this.CATEGORY_PRIORITY.indexOf(category)
                });
            }
        }
        
        // Apply context-aware filtering
        const contextFilteredMatches = this.applyContextRules(categoryMatches, searchText);
        
        // Sort by match count (desc) then by priority (asc - lower index = higher priority)
        contextFilteredMatches.sort((a, b) => {
            if (a.matchCount !== b.matchCount) {
                return b.matchCount - a.matchCount; // More matches first
            }
            return a.priority - b.priority; // Higher priority first
        });
        
        // Apply intelligent thresholds for secondary categories
        const selectedCategories = this.selectIntelligentCategories(contextFilteredMatches);
        
        // Debug logging
        if (categoryMatches.length > 0) {
            console.log(chalk.cyan(`🏷️  Category mapping for: "${title}"`));
            categoryMatches.slice(0, 3).forEach(match => {
                const selected = selectedCategories.includes(match.category) ? '✅' : '⚪';
                console.log(chalk.gray(`   ${selected} ${match.category} (${match.matchCount} matches: ${match.matchedKeywords.slice(0, 3).join(', ')})`));
            });
        }
        
        return selectedCategories;
    }
    
    /**
     * Apply context-aware rules to resolve keyword conflicts
     */
    applyContextRules(categoryMatches, searchText) {
        const filtered = [...categoryMatches];
        
        for (const [keyword, rules] of Object.entries(this.CONTEXT_RULES)) {
            if (searchText.includes(keyword)) {
                // Check which context this keyword appears in
                for (const [category, contextWords] of Object.entries(rules)) {
                    const hasContext = contextWords.some(word => searchText.includes(word));
                    
                    if (hasContext) {
                        // Boost this category's match count for this keyword
                        const matchIndex = filtered.findIndex(m => m.category === category);
                        if (matchIndex >= 0) {
                            filtered[matchIndex].matchCount += 1; // Context boost
                            filtered[matchIndex].matchedKeywords.push(`${keyword} (context)`);
                        }
                    }
                }
            }
        }
        
        return filtered;
    }
    
    /**
     * Select categories using intelligent thresholds and context-aware ordering
     */
    selectIntelligentCategories(sortedMatches) {
        if (sortedMatches.length === 0) return [];
        
        // Apply smart reordering for nightclub/music combinations
        const reorderedMatches = this.applySmartReordering(sortedMatches);
        
        const selected = [reorderedMatches[0].category]; // Always take the primary
        
        if (reorderedMatches.length > 1) {
            const primary = reorderedMatches[0];
            const secondary = reorderedMatches[1];
            
            // Check if secondary meets minimum criteria
            const meetsMatchThreshold = secondary.matchCount >= this.MIN_SECONDARY_MATCHES;
            const meetsStrengthRatio = secondary.matchCount >= (primary.matchCount * this.MIN_STRENGTH_RATIO);
            
            if (meetsMatchThreshold && meetsStrengthRatio) {
                selected.push(secondary.category);
            }
        }
        
        return selected;
    }
    
    /**
     * Apply smart reordering based on event context
     */
    applySmartReordering(matches) {
        const reordered = [...matches];
        
        // Handle Festivals vs Music prioritization
        const musicIndex = reordered.findIndex(m => m.category === 'Music');
        const festivalIndex = reordered.findIndex(m => m.category === 'Festivals');
        
        if (musicIndex >= 0 && festivalIndex >= 0) {
            const musicMatch = reordered[musicIndex];
            const festivalMatch = reordered[festivalIndex];
            
            // Check festival-specific keywords in the matches
            const festivalSpecificKeywords = ['festival', 'fest', 'multi-day', 'weekend event', 'outdoor event'];
            const hasStrongFestivalContext = festivalMatch.matchedKeywords.some(keyword => 
                festivalSpecificKeywords.some(specific => keyword.toLowerCase().includes(specific))
            );
            
            // If festival context exists, prioritize festival over music regardless of match count
            if (hasStrongFestivalContext && festivalIndex > musicIndex) {
                // Move festival to higher position
                [reordered[musicIndex], reordered[festivalIndex]] = [reordered[festivalIndex], reordered[musicIndex]];
            }
        }
        
        // Handle Music vs Nightclubs prioritization  
        const nightclubIndex = reordered.findIndex(m => m.category === 'Nightclubs');
        const updatedMusicIndex = reordered.findIndex(m => m.category === 'Music');
        
        if (updatedMusicIndex >= 0 && nightclubIndex >= 0) {
            const musicMatch = reordered[updatedMusicIndex];
            const nightclubMatch = reordered[nightclubIndex];
            
            // Check nightclub-specific keywords in the matches
            const nightclubSpecificKeywords = ['nightlife', 'club', 'dance floor', 'party', 'beats'];
            const hasStrongNightclubContext = nightclubMatch.matchedKeywords.some(keyword => 
                nightclubSpecificKeywords.some(specific => keyword.toLowerCase().includes(specific))
            );
            
            // If similar match counts and strong nightclub context, prioritize nightclub
            const matchCountDiff = Math.abs(musicMatch.matchCount - nightclubMatch.matchCount);
            if (matchCountDiff <= 2 && hasStrongNightclubContext && nightclubIndex > updatedMusicIndex) {
                // Move nightclub to higher position
                [reordered[updatedMusicIndex], reordered[nightclubIndex]] = [reordered[nightclubIndex], reordered[updatedMusicIndex]];
            }
        }
        
        return reordered;
    }
    
    /**
     * Validate categories against Hash app requirements
     */
    validateCategories(categories) {
        if (!Array.isArray(categories)) {
            return {
                valid: false,
                error: 'Categories must be an array'
            };
        }
        
        if (categories.length === 0) {
            return {
                valid: false,
                error: 'At least one category is required'
            };
        }
        
        if (categories.length > 2) {
            return {
                valid: false,
                error: 'Maximum 2 categories allowed',
                suggestion: categories.slice(0, 2)
            };
        }
        
        for (const category of categories) {
            if (!this.VALID_CATEGORIES.includes(category)) {
                return {
                    valid: false,
                    error: `Invalid category: "${category}"`,
                    validOptions: this.VALID_CATEGORIES
                };
            }
        }
        
        return { valid: true };
    }
    
    /**
     * Get fallback categories if automatic mapping fails
     */
    getFallbackCategories(title = '', venue = '') {
        // Common fallbacks based on venue/title patterns
        const text = `${title} ${venue}`.toLowerCase();
        
        if (text.includes('bar') || text.includes('pub') || text.includes('tavern')) {
            return ['Bars'];
        }
        
        if (text.includes('club') && !text.includes('comedy')) {
            return ['Nightclubs'];
        }
        
        if (text.includes('restaurant') || text.includes('cafe') || text.includes('food')) {
            return ['Food Events'];
        }
        
        if (text.includes('theater') || text.includes('theatre') || text.includes('hall')) {
            return ['Music']; // Most common for performance venues
        }
        
        if (text.includes('gallery') || text.includes('museum')) {
            return ['Art Shows'];
        }
        
        // Default fallback
        return ['Music']; // Most common event type
    }
    
    /**
     * Smart category mapping with fallbacks
     */
    smartMapCategories(eventData) {
        const { title = '', description = '', venue = '', tags = [] } = eventData;
        
        // Try automatic mapping first
        let categories = this.mapCategories(title, description, venue, tags);
        
        // If no categories found, use fallbacks
        if (categories.length === 0) {
            categories = this.getFallbackCategories(title, venue);
            console.log(chalk.yellow(`⚠️  No categories detected, using fallback: ${categories.join(', ')}`));
        }
        
        // Validate result
        const validation = this.validateCategories(categories);
        if (!validation.valid) {
            if (validation.suggestion) {
                categories = validation.suggestion;
            } else {
                categories = ['Music']; // Ultimate fallback
            }
            console.log(chalk.red(`❌ Category validation failed: ${validation.error}`));
        }
        
        return categories;
    }
    
    /**
     * Debug category detection
     */
    debugCategories(eventData) {
        const { title = '', description = '', venue = '' } = eventData;
        
        console.log(chalk.cyan('\n🏷️  Category Debug:'));
        console.log(chalk.gray(`Title: "${title}"`));
        console.log(chalk.gray(`Venue: "${venue}"`));
        console.log(chalk.gray(`Description: "${description.substring(0, 100)}..."`));
        
        const categories = this.smartMapCategories(eventData);
        console.log(chalk.green(`Final categories: ${categories.join(', ')}`));
        
        return categories;
    }
    
    /**
     * Get category color (for UI consistency)
     */
    getCategoryColor(category) {
        const colors = {
            'Music': '#FF717A',
            'Festivals': '#6BC1FF', 
            'Food Events': '#a8dca4',
            'Sports/Games': '#FF8352',
            'Comedy Shows': '#e6c580',
            'Art Shows': '#d87cfc',
            'Bars': '#FFBA0E',
            'Nightclubs': '#5963D1'
        };
        
        return colors[category] || '#03A4F1';
    }
}

module.exports = CategoryMapper;