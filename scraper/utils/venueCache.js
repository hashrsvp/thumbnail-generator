#!/usr/bin/env node

/**
 * Venue Lookup Cache for Performance Optimization
 * 
 * Implements an in-memory cache for venue lookups to avoid repeated database queries
 * during event processing. Includes TTL (Time To Live) and size limits.
 * 
 * @author Claude Code
 * @version 1.0.0
 */

const chalk = require('chalk');

class VenueCache {
    constructor(options = {}) {
        this.options = {
            maxSize: options.maxSize || 1000,
            ttlMs: options.ttlMs || 300000, // 5 minutes default
            cleanupIntervalMs: options.cleanupIntervalMs || 60000, // 1 minute cleanup
            debug: options.debug || false,
            ...options
        };
        
        // Cache storage: Map for O(1) lookups
        this.cache = new Map();
        this.accessTimes = new Map();
        this.hits = 0;
        this.misses = 0;
        
        // Start cleanup timer
        this.cleanupTimer = setInterval(() => this.cleanup(), this.options.cleanupIntervalMs);
        
        this.log = this.options.debug ? console.log : () => {};
    }
    
    /**
     * Get venue data from cache
     * @param {string} key - Cache key (venue name or address)
     * @returns {Object|null} Cached venue data or null if not found/expired
     */
    get(key) {
        if (!key || typeof key !== 'string') return null;
        
        const normalizedKey = this.normalizeKey(key);
        const cachedItem = this.cache.get(normalizedKey);
        
        if (!cachedItem) {
            this.misses++;
            return null;
        }
        
        // Check TTL
        const now = Date.now();
        if (now - cachedItem.timestamp > this.options.ttlMs) {
            this.cache.delete(normalizedKey);
            this.accessTimes.delete(normalizedKey);
            this.misses++;
            this.log(chalk.yellow(`🗑️  Expired cache entry: ${normalizedKey}`));
            return null;
        }
        
        // Update access time for LRU
        this.accessTimes.set(normalizedKey, now);
        this.hits++;
        
        this.log(chalk.green(`🎯 Cache hit: ${normalizedKey}`));
        return cachedItem.data;
    }
    
    /**
     * Set venue data in cache
     * @param {string} key - Cache key
     * @param {Object} data - Venue data to cache
     */
    set(key, data) {
        if (!key || typeof key !== 'string' || !data) return;
        
        const normalizedKey = this.normalizeKey(key);
        const now = Date.now();
        
        // Check cache size limit
        if (this.cache.size >= this.options.maxSize) {
            this.evictLeastRecentlyUsed();
        }
        
        // Store in cache
        this.cache.set(normalizedKey, {
            data: data,
            timestamp: now
        });
        this.accessTimes.set(normalizedKey, now);
        
        this.log(chalk.cyan(`💾 Cached venue: ${normalizedKey}`));
    }
    
    /**
     * Check if venue is in cache (without returning data)
     * @param {string} key - Cache key
     * @returns {boolean} True if valid cached entry exists
     */
    has(key) {
        return this.get(key) !== null;
    }
    
    /**
     * Clear entire cache
     */
    clear() {
        this.cache.clear();
        this.accessTimes.clear();
        this.hits = 0;
        this.misses = 0;
        this.log(chalk.gray('🧹 Cache cleared'));
    }
    
    /**
     * Get cache statistics
     * @returns {Object} Cache performance stats
     */
    getStats() {
        const total = this.hits + this.misses;
        return {
            size: this.cache.size,
            maxSize: this.options.maxSize,
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? (this.hits / total * 100).toFixed(2) + '%' : '0%',
            memoryUsage: this.estimateMemoryUsage()
        };
    }
    
    /**
     * Normalize cache key for consistent lookup
     * @param {string} key - Raw key
     * @returns {string} Normalized key
     */
    normalizeKey(key) {
        return key.toLowerCase().trim().replace(/\s+/g, ' ');
    }
    
    /**
     * Remove expired entries
     */
    cleanup() {
        const now = Date.now();
        let removed = 0;
        
        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > this.options.ttlMs) {
                this.cache.delete(key);
                this.accessTimes.delete(key);
                removed++;
            }
        }
        
        if (removed > 0) {
            this.log(chalk.yellow(`🗑️  Cleaned up ${removed} expired cache entries`));
        }
    }
    
    /**
     * Evict least recently used entries when cache is full
     */
    evictLeastRecentlyUsed() {
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, time] of this.accessTimes.entries()) {
            if (time < oldestTime) {
                oldestTime = time;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.accessTimes.delete(oldestKey);
            this.log(chalk.yellow(`🗑️  Evicted LRU entry: ${oldestKey}`));
        }
    }
    
    /**
     * Estimate memory usage (rough approximation)
     * @returns {string} Memory usage estimate
     */
    estimateMemoryUsage() {
        let totalSize = 0;
        
        for (const [key, item] of this.cache.entries()) {
            totalSize += key.length * 2; // chars to bytes (rough)
            totalSize += JSON.stringify(item.data).length * 2;
            totalSize += 16; // timestamp overhead
        }
        
        if (totalSize < 1024) return `${totalSize}B`;
        if (totalSize < 1024 * 1024) return `${(totalSize / 1024).toFixed(1)}KB`;
        return `${(totalSize / 1024 / 1024).toFixed(1)}MB`;
    }
    
    /**
     * Create cache key from venue/address data
     * @param {string} venue - Venue name
     * @param {string} address - Venue address
     * @returns {string} Composite cache key
     */
    createCompositeKey(venue, address) {
        const parts = [];
        if (venue) parts.push(venue);
        if (address) parts.push(address);
        return parts.join('|');
    }
    
    /**
     * Shutdown cache and cleanup timers
     */
    shutdown() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        
        this.log(chalk.gray('🛑 Venue cache shutdown'));
    }
}

// Global cache instance for shared use across scraping sessions
let globalVenueCache = null;

/**
 * Get or create global venue cache instance
 * @param {Object} options - Cache configuration
 * @returns {VenueCache} Global cache instance
 */
function getGlobalVenueCache(options = {}) {
    if (!globalVenueCache) {
        globalVenueCache = new VenueCache(options);
    }
    return globalVenueCache;
}

/**
 * Clear and reset global cache
 */
function resetGlobalVenueCache() {
    if (globalVenueCache) {
        globalVenueCache.shutdown();
        globalVenueCache = null;
    }
}

module.exports = {
    VenueCache,
    getGlobalVenueCache,
    resetGlobalVenueCache
};