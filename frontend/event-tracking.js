/**
 * 📊 Event Tracking & Logging Module  
 * Handles user behavior tracking, event logging, and performance metrics
 * Collects behavioral data for ability assessment and analysis
 */

import { API_BASE, throttle } from './utilities-config.js';

/**
 * 🎯 BehaviorTracker Class
 * Tracks user interactions and behaviors throughout the game
 * Provides insights into user engagement and problem-solving patterns
 */
export class BehaviorTracker {
    constructor() {
        // 📊 Tracking state
        this.isTracking = false;
        this.sessionId = null;
        this.trackingData = {
            events: [],           // All user interaction events
            mouseMovements: [],   // Mouse movement patterns 
            keystrokes: [],       // Keyboard input tracking
            timings: {},          // Performance timing data
            responses: {}         // User responses to questions
        };
        
        console.log('📊 BehaviorTracker initialized');
    }

    /**
     * 🚀 Initialize behavior tracking for the game session
     * Sets up event listeners for mouse, keyboard, and window events
     * @param {string} sessionId - Unique session identifier
     */
    startTracking(sessionId) {
        console.log('🚀 Starting behavior tracking for session:', sessionId);
        
        this.sessionId = sessionId;
        this.isTracking = true;
        
        // Initialize all event tracking systems
        this.initMouseTracking();
        this.initClickTracking();
        this.initKeyboardTracking();
        this.initWindowTracking();
        
        this.logEvent('tracking_started', { 
            session_id: sessionId,
            timestamp: Date.now() 
        });
        
        console.log('✅ Behavior tracking activated');
    }

    /**
     * 🖱️ Initialize mouse movement tracking
     * Tracks mouse positions to understand user engagement and attention patterns
     */
    initMouseTracking() {
        // Throttle mouse tracking to avoid performance issues (max 10 times per second)
        const throttledMouseTrack = throttle((e) => {
            if (!this.isTracking) return;
            
            const mouseData = {
                x: e.clientX,
                y: e.clientY,
                timestamp: Date.now()
            };
            
            this.trackingData.mouseMovements.push(mouseData);
            
            // Also log as event for server transmission
            this.logEvent('mouse_move', mouseData);
        }, 100);
        
        document.addEventListener('mousemove', throttledMouseTrack);
        console.log('🖱️ Mouse tracking initialized');
    }

    /**
     * 🖱️ Initialize click event tracking
     * Records all user clicks including target elements and positions
     */
    initClickTracking() {
        document.addEventListener('click', (e) => {
            if (!this.isTracking) return;
            
            const clickData = {
                x: e.clientX,
                y: e.clientY,
                target: e.target.tagName,
                targetId: e.target.id || '',
                targetClass: e.target.className || '',
                timestamp: Date.now()
            };
            
            console.log('🖱️ Click tracked:', clickData);
            this.logEvent('click', clickData);
        });
        
        console.log('🖱️ Click tracking initialized');
    }

    /**
     * ⌨️ Initialize keyboard input tracking
     * Records keystrokes to analyze typing patterns and input behavior
     */
    initKeyboardTracking() {
        document.addEventListener('keydown', (e) => {
            if (!this.isTracking) return;
            
            const keystrokeData = {
                key: e.key,
                keyCode: e.keyCode,
                ctrlKey: e.ctrlKey,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                timestamp: Date.now()
            };
            
            this.trackingData.keystrokes.push(keystrokeData);
            this.logEvent('keypress', keystrokeData);
        });
        
        console.log('⌨️ Keyboard tracking initialized');
    }

    /**
     * 🪟 Initialize window focus/blur tracking
     * Tracks user attention and potential distractions during the test
     */
    initWindowTracking() {
        window.addEventListener('focus', () => {
            if (!this.isTracking) return;
            
            console.log('🪟 Window focused');
            this.logEvent('window_focus', { timestamp: Date.now() });
        });

        window.addEventListener('blur', () => {
            if (!this.isTracking) return;
            
            console.log('🪟 Window lost focus');
            this.logEvent('window_blur', { timestamp: Date.now() });
        });
        
        console.log('🪟 Window tracking initialized');
    }

    /**
     * 📝 Log a user event with automatic server transmission
     * @param {string} eventType - Type of event (click, keypress, etc.)
     * @param {Object} eventData - Event-specific data
     */
    async logEvent(eventType, eventData) {
        if (!this.isTracking || !this.sessionId) {
            console.warn('⚠️ Attempted to log event but tracking not active');
            return;
        }

        const event = {
            event_type: eventType,
            timestamp: Date.now() / 1000, // Unix timestamp in seconds
            session_id: this.sessionId,
            data: eventData
        };

        // Store locally
        this.trackingData.events.push(event);

        // Transmit to server (with error handling)
        try {
            await this.transmitEventToServer(event);
        } catch (error) {
            console.warn('⚠️ Failed to transmit event to server:', error);
            // Event is still stored locally for potential later transmission
        }
    }

    /**
     * 📤 Transmit event data to analytics server
     * @param {Object} event - Event data to transmit
     * @private
     */
    async transmitEventToServer(event) {
        const response = await fetch(`${API_BASE}/session/${this.sessionId}/event`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(event)
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
    }

    /**
     * 📝 Record a user response to a question or task
     * @param {string} responseKey - Identifier for the response
     * @param {any} responseValue - The user's response value
     */
    async logResponse(responseKey, responseValue) {
        if (!this.isTracking || !this.sessionId) {
            console.warn('⚠️ Attempted to log response but tracking not active');
            return;
        }

        console.log(`📝 Response logged: ${responseKey} =`, responseValue);
        
        // Store locally  
        this.trackingData.responses[responseKey] = responseValue;

        // Transmit to server
        try {
            const response = await fetch(`${API_BASE}/session/${this.sessionId}/response`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ [responseKey]: responseValue })
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
        } catch (error) {
            console.warn('⚠️ Failed to transmit response to server:', error);
        }
    }

    /**
     * ⏱️ Record performance timing for analysis
     * @param {string} timingKey - Identifier for the timing measurement
     * @param {number} duration - Duration in milliseconds
     * @param {Object} metadata - Additional timing context
     */
    recordTiming(timingKey, duration, metadata = {}) {
        const timingData = {
            duration,
            timestamp: Date.now(),
            ...metadata
        };
        
        this.trackingData.timings[timingKey] = timingData;
        
        console.log(`⏱️ Timing recorded: ${timingKey} = ${duration}ms`);
        
        // Also log as event
        this.logEvent('performance_timing', {
            timing_key: timingKey,
            duration,
            metadata
        });
    }

    /**
     * 🛑 Stop behavior tracking and finalize data
     * Called when game ends or user leaves
     */
    stopTracking() {
        console.log('🛑 Stopping behavior tracking');
        
        this.isTracking = false;
        
        this.logEvent('tracking_stopped', {
            total_events: this.trackingData.events.length,
            total_mouse_movements: this.trackingData.mouseMovements.length,
            total_keystrokes: this.trackingData.keystrokes.length,
            session_duration: this.getSessionDuration(),
            timestamp: Date.now()
        });
    }

    /**
     * ⏱️ Get the total duration of the current tracking session
     * @returns {number} Session duration in milliseconds
     */
    getSessionDuration() {
        if (this.trackingData.events.length === 0) return 0;
        
        const firstEvent = this.trackingData.events[0];
        const lastEvent = this.trackingData.events[this.trackingData.events.length - 1];
        
        return (lastEvent.timestamp * 1000) - (firstEvent.timestamp * 1000);
    }

    /**
     * 📊 Get tracking statistics for debugging
     * @returns {Object} Current tracking statistics
     */
    getTrackingStats() {
        return {
            isTracking: this.isTracking,
            sessionId: this.sessionId,
            totalEvents: this.trackingData.events.length,
            totalMouseMovements: this.trackingData.mouseMovements.length,
            totalKeystrokes: this.trackingData.keystrokes.length,
            totalResponses: Object.keys(this.trackingData.responses).length,
            sessionDuration: this.getSessionDuration()
        };
    }
}

// 🌐 Global behavior tracker instance
export const behaviorTracker = new BehaviorTracker();

/**
 * 🚀 Convenience function to start tracking
 * @param {string} sessionId - Session identifier
 */
export function startBehaviorTracking(sessionId) {
    behaviorTracker.startTracking(sessionId);
}

/**
 * 📝 Convenience function to log events
 * @param {string} eventType - Type of event
 * @param {Object} data - Event data
 */
export async function logEvent(eventType, data) {
    await behaviorTracker.logEvent(eventType, data);
}

/**
 * 📝 Convenience function to log responses
 * @param {string} key - Response key
 * @param {any} value - Response value
 */
export async function logResponse(key, value) {
    await behaviorTracker.logResponse(key, value);
}

/**
 * ⏱️ Convenience function to record timing
 * @param {string} key - Timing key
 * @param {number} duration - Duration in milliseconds
 * @param {Object} metadata - Additional context
 */
export function recordTiming(key, duration, metadata = {}) {
    behaviorTracker.recordTiming(key, duration, metadata);
}

/**
 * 🛑 Convenience function to stop tracking
 */
export function stopBehaviorTracking() {
    behaviorTracker.stopTracking();
}

console.log('✅ Event Tracking & Logging module loaded');