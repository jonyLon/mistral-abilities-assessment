/**
 * 🎮 Core Game Management Module
 * Handles game state, initialization, timer management, and stage transitions
 * Central orchestrator for all game flow and navigation logic
 */

import { 
    API_BASE, 
    GAME_DURATION, 
    GAME_STAGES, 
    AI_STAGES, 
    GAME_MODES,
    formatTime,
    safeGetElement 
} from './utilities-config.js';

import { 
    startBehaviorTracking, 
    logEvent, 
    logResponse,
    stopBehaviorTracking 
} from './event-tracking.js';

/**
 * 🎯 GameState Class
 * Manages all game state, timing, and progression logic
 * Singleton class that maintains the current state of the game session
 */
export class GameState {
    constructor() {
        console.log('🎮 GameState initializing...');
        
        // 📊 Core game state
        this.sessionId = null;
        this.currentStage = 0;            // Index in GAME_STAGES array
        this.startTime = null;
        this.testMode = null;             // 'standard' or 'ai'
        this.aiStageCount = 0;            // Counter for AI stages
        
        // ⏰ Timer management
        this.gameTimer = null;
        this.timerUpdateInterval = null;
        
        // 📈 Game data storage
        this.gameData = {
            responses: {},              // User responses to questions
            events: [],                // Logged events (also in behaviorTracker)
            mouseTrackData: [],        // Mouse movement data  
            reactionTimes: [],         // Reaction time measurements
            puzzleSolvingTime: 0,      // Time spent on puzzles
            creativityText: '',        // Creative writing content
            aiQuestions: []            // AI-generated questions history
        };
        
        // 🎯 Stage management
        this.stages = [...GAME_STAGES];    // Copy of standard stages
        this.aiStages = [...AI_STAGES];    // Copy of AI stages
        
        console.log('✅ GameState initialized');
    }

    /**
     * 🚀 Initialize a new game session
     * Creates session on server, starts tracking, and initializes UI
     * @returns {Promise<boolean>} Success status
     */
    async initializeGame() {
        console.log('🚀 Initializing new game session...');
        
        try {
            // Create new session with server
            const sessionData = await this.createServerSession();
            if (!sessionData) {
                throw new Error('Failed to create server session');
            }
            
            this.sessionId = sessionData.session_id;
            this.startTime = Date.now();
            
            console.log(`✅ Game session created: ${this.sessionId}`);
            
            // Initialize behavior tracking
            startBehaviorTracking(this.sessionId);
            
            // Start game timer
            this.startGameTimer();
            
            // Log game start
            await logEvent('game_started', {
                session_id: this.sessionId,
                start_time: this.startTime,
                timestamp: Date.now()
            });
            
            // Initialize the first stage (mode-select)
            this.initializeCurrentStage();
            
            return true;
            
        } catch (error) {
            console.error('❌ Game initialization failed:', error);
            this.handleInitializationError(error);
            return false;
        }
    }

    /**
     * 🌐 Create a new session on the server
     * @returns {Promise<Object>} Session data from server
     * @private
     */
    async createServerSession() {
        console.log('🌐 Creating server session...');
        
        const response = await fetch(`${API_BASE}/session/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Server session created successfully');
        return data;
    }

    /**
     * ⏰ Start the game timer with visual updates
     * Updates timer display and progress bar every second
     */
    startGameTimer() {
        console.log('⏰ Starting game timer...');
        
        const timerElement = safeGetElement('timer', 'startGameTimer');
        const progressBar = safeGetElement('progressBar', 'startGameTimer');
        
        // Clear any existing timer
        if (this.timerUpdateInterval) {
            clearInterval(this.timerUpdateInterval);
        }
        
        this.timerUpdateInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const remaining = GAME_DURATION - elapsed;
            
            // Check if time is up
            if (remaining <= 0) {
                console.log('⏰ Game time expired, finishing game...');
                this.finishGameDueToTimeout();
                return;
            }
            
            // Update timer display
            if (timerElement) {
                timerElement.textContent = `Час: ${formatTime(remaining)}`;
            }
            
            // Update progress bar
            if (progressBar) {
                const progress = ((GAME_DURATION - remaining) / GAME_DURATION) * 100;
                progressBar.style.width = `${progress}%`;
            }
            
        }, 1000);
        
        console.log('✅ Game timer started');
    }

    /**
     * 🎪 Initialize the current stage
     * Sets up the UI and logic for the current game stage
     */
    async initializeCurrentStage() {
        const stageName = this.getCurrentStageName();
        console.log(`🎪 Initializing stage: ${stageName} (index: ${this.currentStage})`);
        
        // Log stage initialization
        await logEvent('stage_init', {
            stage_name: stageName,
            stage_index: this.currentStage,
            test_mode: this.testMode,
            timestamp: Date.now()
        });
        
        // Special handling for mode selection stage
        if (stageName === 'mode-select') {
            this.initializeModeSelection();
            return;
        }
        
        // Show current stage and hide others
        this.showCurrentStage(stageName);
        
        // Initialize stage-specific logic
        await this.initializeStageLogic(stageName);
    }

    /**
     * 🎯 Get the name of the current stage
     * @returns {string} Current stage name
     */
    getCurrentStageName() {
        if (this.testMode === GAME_MODES.AI && this.currentStage > 0) {
            // In AI mode, use AI stages after mode selection
            const aiIndex = this.aiStageCount;
            return aiIndex < this.aiStages.length ? this.aiStages[aiIndex] : 'results';
        }
        
        return this.currentStage < this.stages.length 
            ? this.stages[this.currentStage] 
            : 'results';
    }

    /**
     * 🖼️ Show the current stage and hide all others
     * @param {string} stageName - Name of stage to show
     */
    showCurrentStage(stageName) {
        console.log(`🖼️ Showing stage: ${stageName}`);
        
        // Hide all stages
        document.querySelectorAll('.game-stage').forEach(stage => {
            stage.classList.remove('active');
        });
        
        // Show current stage
        const stageElement = safeGetElement(`stage-${stageName}`, 'showCurrentStage');
        if (stageElement) {
            stageElement.classList.add('active');
            console.log(`✅ Stage ${stageName} is now visible`);
        } else {
            console.error(`❌ Could not find stage element: stage-${stageName}`);
        }
        
        // Manage navigation buttons visibility
        this.updateNavigationButtons(stageName);
    }

    /**
     * 🧭 Update navigation button visibility based on current stage
     * @param {string} stageName - Current stage name
     */
    updateNavigationButtons(stageName) {
        const navigationButtons = safeGetElement('navigationButtons', 'updateNavigationButtons');
        const nextButton = safeGetElement('nextButton', 'updateNavigationButtons');
        
        if (!navigationButtons) return;
        
        // Hide navigation on special stages
        if (['mode-select', 'loading', 'results'].includes(stageName)) {
            navigationButtons.style.display = 'none';
            console.log('🧭 Navigation buttons hidden for stage:', stageName);
        } else {
            navigationButtons.style.display = 'flex';
            console.log('🧭 Navigation buttons shown for stage:', stageName);
        }
        
        // Disable next button initially (stage logic will enable it)
        if (nextButton) {
            nextButton.disabled = true;
        }
    }

    /**
     * 🚀 Initialize stage-specific logic
     * @param {string} stageName - Name of stage to initialize
     * @private
     */
    async initializeStageLogic(stageName) {
        console.log(`🚀 Initializing logic for stage: ${stageName}`);
        
        // This will be implemented by importing and calling stage-specific modules
        // For now, we'll just log the initialization
        await logEvent('stage_logic_init', {
            stage_name: stageName,
            timestamp: Date.now()
        });
    }

    /**
     * 🎮 Initialize mode selection stage
     * Sets up event listeners for standard vs AI mode selection
     */
    initializeModeSelection() {
        console.log('🎮 Initializing mode selection...');
        
        // Hide navigation buttons during mode selection
        const navButtons = safeGetElement('navigationButtons', 'initializeModeSelection');
        if (navButtons) {
            navButtons.style.display = 'none';
        }
        
        // Get mode selection buttons
        const standardMode = safeGetElement('standardMode', 'initializeModeSelection');
        const aiMode = safeGetElement('aiMode', 'initializeModeSelection');
        
        if (!standardMode || !aiMode) {
            console.error('❌ Mode selection buttons not found!');
            return;
        }
        
        console.log('🎮 Mode selection buttons found, attaching event listeners...');
        
        // Remove any existing event listeners by cloning elements
        const newStandardMode = standardMode.cloneNode(true);
        const newAiMode = aiMode.cloneNode(true);
        
        standardMode.parentNode.replaceChild(newStandardMode, standardMode);
        aiMode.parentNode.replaceChild(newAiMode, aiMode);
        
        // Attach fresh event listeners
        newStandardMode.addEventListener('click', () => {
            console.log('📊 Standard mode clicked');
            this.selectMode(GAME_MODES.STANDARD);
        });
        
        newAiMode.addEventListener('click', () => {
            console.log('🤖 AI mode clicked');
            this.selectMode(GAME_MODES.AI);
        });
        
        console.log('✅ Mode selection event listeners attached');
    }

    /**
     * 🎯 Handle mode selection
     * @param {string} selectedMode - Selected game mode (standard or ai)
     */
    async selectMode(selectedMode) {
        console.log(`🎯 Mode selected: ${selectedMode}`);
        
        this.testMode = selectedMode;
        
        // Visual feedback for selection
        document.querySelectorAll('#stage-mode-select .choice-button').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        if (selectedMode === GAME_MODES.STANDARD) {
            safeGetElement('standardMode', 'selectMode')?.classList.add('selected');
        } else {
            safeGetElement('aiMode', 'selectMode')?.classList.add('selected');
        }
        
        // Log the selection
        await logEvent('mode_selected', {
            mode: selectedMode,
            timestamp: Date.now()
        });
        
        await logResponse('test_mode', selectedMode);
        
        console.log('🚀 Proceeding to next stage after mode selection...');
        
        // Proceed to next stage after a brief delay
        setTimeout(() => {
            this.advanceToNextStage();
        }, 1500);
    }

    /**
     * ➡️ Advance to the next stage in the game flow
     */
    async advanceToNextStage() {
        console.log('➡️ Advancing to next stage...');
        
        // Log current stage completion
        const currentStageName = this.getCurrentStageName();
        await logEvent('stage_complete', {
            completed_stage: currentStageName,
            stage_index: this.currentStage,
            test_mode: this.testMode,
            timestamp: Date.now()
        });
        
        // Determine next stage based on mode
        if (this.testMode === GAME_MODES.AI) {
            if (currentStageName === 'mode-select') {
                // Start AI stages
                this.currentStage = 1; // Move past mode-select
                this.aiStageCount = 0;
                console.log('🤖 Starting AI mode stages');
            } else {
                // Continue with AI stages
                this.aiStageCount++;
                console.log(`🤖 Advancing to AI stage ${this.aiStageCount}`);
                
                if (this.aiStageCount >= this.aiStages.length) {
                    console.log('🤖 AI stages complete, moving to results');
                    this.finishGame();
                    return;
                }
            }
        } else {
            // Standard mode progression
            this.currentStage++;
            console.log(`📊 Advancing to standard stage ${this.currentStage}`);
            
            if (this.currentStage >= this.stages.length) {
                console.log('📊 Standard stages complete, moving to results');
                this.finishGame();
                return;
            }
        }
        
        // Initialize the new stage
        await this.initializeCurrentStage();
    }

    /**
     * 🏁 Finish the game and show results
     */
    async finishGame() {
        console.log('🏁 Finishing game...');
        
        // Stop timer
        if (this.timerUpdateInterval) {
            clearInterval(this.timerUpdateInterval);
            this.timerUpdateInterval = null;
        }
        
        // Stop behavior tracking
        stopBehaviorTracking();
        
        // Log game completion
        await logEvent('game_complete', {
            completion_reason: 'natural',
            total_time: Date.now() - this.startTime,
            stages_completed: this.testMode === GAME_MODES.AI ? this.aiStageCount : this.currentStage,
            test_mode: this.testMode,
            timestamp: Date.now()
        });
        
        // Show loading stage while analyzing
        this.showCurrentStage('loading');
        
        // Start results analysis
        setTimeout(() => {
            this.analyzeAndShowResults();
        }, 2000);
    }

    /**
     * ⏰ Handle game finish due to timeout
     */
    async finishGameDueToTimeout() {
        console.log('⏰ Game finished due to timeout');
        
        // Stop timer
        if (this.timerUpdateInterval) {
            clearInterval(this.timerUpdateInterval);
            this.timerUpdateInterval = null;
        }
        
        // Stop behavior tracking
        stopBehaviorTracking();
        
        // Log timeout
        await logEvent('game_timeout', {
            stages_completed: this.testMode === GAME_MODES.AI ? this.aiStageCount : this.currentStage,
            test_mode: this.testMode,
            timestamp: Date.now()
        });
        
        // Show loading and then results
        this.showCurrentStage('loading');
        
        setTimeout(() => {
            this.analyzeAndShowResults();
        }, 2000);
    }

    /**
     * 📊 Analyze results and show final screen
     * @private
     */
    async analyzeAndShowResults() {
        console.log('📊 Analyzing results...');
        
        try {
            // This will be implemented in the results analysis module
            await logEvent('results_analysis_start', {
                session_id: this.sessionId,
                timestamp: Date.now()
            });
            
            // Show results stage
            this.showCurrentStage('results');
            
        } catch (error) {
            console.error('❌ Results analysis failed:', error);
            
            // Show error message
            const resultsElement = safeGetElement('stage-results', 'analyzeAndShowResults');
            if (resultsElement) {
                resultsElement.innerHTML = `
                    <div style="text-align: center; padding: 2rem;">
                        <h2>⚠️ Помилка аналізу результатів</h2>
                        <p>Не вдалося проаналізувати ваші результати через технічні проблеми.</p>
                        <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem;">
                            Спробувати знову
                        </button>
                    </div>
                `;
            }
        }
    }

    /**
     * ❌ Handle initialization errors
     * @param {Error} error - The initialization error
     * @private
     */
    handleInitializationError(error) {
        console.error('❌ Handling initialization error:', error);
        
        const errorMessage = error.message.includes('Failed to fetch') 
            ? 'Помилка підключення до сервера. Перевірте, чи запущений backend.'
            : 'Помилка ініціалізації гри. Спробуйте оновити сторінку.';
        
        alert(errorMessage);
    }

    /**
     * 🎮 Restart the game
     */
    restartGame() {
        if (confirm('Ви дійсно хочете розпочати тест заново?')) {
            console.log('🎮 Restarting game...');
            location.reload();
        }
    }
}

// 🌐 Global game state instance
export const gameState = new GameState();

/**
 * 🚀 Initialize the game when called from main logic
 * @returns {Promise<boolean>} Success status
 */
export async function initializeGame() {
    return await gameState.initializeGame();
}

/**
 * ➡️ Move to next stage (convenience function)
 */
export async function nextStage() {
    await gameState.advanceToNextStage();
}

/**
 * 🎮 Restart game (convenience function)
 */
export function restartGame() {
    gameState.restartGame();
}

/**
 * 🏁 Finish game (convenience function)
 */
export async function finishGame() {
    await gameState.finishGame();
}

console.log('✅ Core Game Management module loaded');