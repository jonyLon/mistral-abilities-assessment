/**
 * 🛠️ Utilities and Configuration Module
 * Provides global constants, enums, and shared utility functions
 * Used by all other game modules for consistent configuration and utilities
 */

// 🌐 API Configuration
export const API_BASE = 'http://127.0.0.1:8000';

// ⏰ Game Timing Configuration  
export const GAME_DURATION = 12 * 60 * 1000; // 12 minutes in milliseconds for 10 stages

// 🎯 Game Stage Definitions
// Standard game stages - used in sequential order for standard mode
export const GAME_STAGES = [
    'mode-select',    // Initial mode selection (standard vs AI)
    'logic',          // Logical thinking test
    'creative',       // Creative writing task  
    'reaction',       // Reaction time test
    'puzzle',         // Pattern recognition puzzle
    'social',         // Social situation handling
    'memory',         // Memory sequence test
    'prioritize',     // Task prioritization  
    'collaboration',  // Team collaboration scenario
    'visual',         // Visual/spatial reasoning
    'problem',        // Problem solving scenario
    'loading',        // Results analysis loading
    'results'         // Final results display
];

// 🤖 AI Stage Definitions
// AI-generated stages - used when AI mode is selected
export const AI_STAGES = [
    'analytical',     // AI analytical thinking questions
    'creative',       // AI creative ability questions
    'social',         // AI social skills assessment
    'technical',      // AI technical knowledge evaluation
    'research',       // AI research capability test
    'memory',         // AI memory and attention test
    'collaboration',  // AI team collaboration assessment
    'problem'         // AI problem solving evaluation
];

// 🎨 Stage Display Configuration
// Icons and titles for displaying stages to users
export const STAGE_ICONS = {
    'analytical': '📊',
    'creative': '🎨',
    'social': '👥', 
    'technical': '🔧',
    'research': '🔬',
    'memory': '🧠',
    'collaboration': '🤝',
    'problem': '🧩'
};

export const STAGE_TITLES = {
    'analytical': 'Аналітичне мислення',
    'creative': 'Творчі здібності',
    'social': 'Соціальні навички',
    'technical': 'Технічні навички', 
    'research': 'Дослідницький потенціал',
    'memory': 'Пам\'ять і увага',
    'collaboration': 'Командна співпраця',
    'problem': 'Розв\'язання проблем'
};

// 🎨 Color Schemes for Results Display
export const ABILITY_COLORS = {
    'analytical': '#2196F3',
    'creative': '#9C27B0',
    'social': '#4CAF50',
    'technical': '#FF9800',
    'research': '#F44336'
};

// 📊 Game State Enums
export const GAME_MODES = {
    STANDARD: 'standard',  // Traditional sequential stages
    AI: 'ai'              // AI-generated adaptive questions
};

/**
 * 🛠️ Utility Functions
 */

/**
 * Formats time from milliseconds to MM:SS format
 * @param {number} milliseconds - Time in milliseconds
 * @returns {string} Formatted time string (e.g., "05:30")
 */
export function formatTime(milliseconds) {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Generates a unique session identifier
 * @returns {string} Unique session ID
 */
export function generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Gets the color associated with an ability type for consistent UI theming
 * @param {string} abilityType - Type of ability (analytical, creative, etc.)
 * @returns {string} Hex color code
 */
export function getAbilityColor(abilityType) {
    return ABILITY_COLORS[abilityType] || '#666';
}

/**
 * Validates that required DOM elements exist before proceeding
 * @param {string[]} elementIds - Array of DOM element IDs to check
 * @returns {boolean} True if all elements exist, false otherwise
 */
export function validateDOMElements(elementIds) {
    const missingElements = [];
    
    for (const id of elementIds) {
        const element = document.getElementById(id);
        if (!element) {
            missingElements.push(id);
            console.error(`❌ Missing DOM element: ${id}`);
        }
    }
    
    if (missingElements.length > 0) {
        console.error(`❌ Missing ${missingElements.length} required DOM elements:`, missingElements);
        return false;
    }
    
    return true;
}

/**
 * Safely gets a DOM element with error logging
 * @param {string} elementId - ID of the DOM element
 * @param {string} context - Context for error logging (e.g., function name)
 * @returns {HTMLElement|null} DOM element or null if not found
 */
export function safeGetElement(elementId, context = '') {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`❌ Element not found: ${elementId} ${context ? `(in ${context})` : ''}`);
    }
    return element;
}

/**
 * Throttle function execution to limit frequency
 * @param {Function} func - Function to throttle
 * @param {number} limit - Minimum time between executions in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

/**
 * Debounce function execution to delay until after calls have stopped
 * @param {Function} func - Function to debounce
 * @param {number} wait - Time to wait after last call in milliseconds  
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Creates a deep copy of an object to avoid reference issues
 * @param {Object} obj - Object to clone
 * @returns {Object} Deep cloned object
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    
    if (obj instanceof Array) {
        return obj.map(item => deepClone(item));
    }
    
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

console.log('✅ Utilities & Configuration module loaded');