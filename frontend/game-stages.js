/**
 * 🎯 Game Stages Logic Module
 * Contains implementations for all standard game stages
 * Each stage tests specific cognitive abilities and skills
 */

import { safeGetElement } from './utilities-config.js';
import { logEvent, logResponse, recordTiming } from './event-tracking.js';
import { gameState } from './core-game-management.js';

/**
 * 🧠 LogicStageHandler Class
 * Handles logical thinking assessment stage
 */
export class LogicStageHandler {
    /**
     * 🚀 Initialize logic stage with multiple choice questions
     */
    static async initialize() {
        console.log('🧠 Initializing logic stage...');
        
        const choices = document.querySelectorAll('#stage-logic .choice-button');
        
        if (choices.length === 0) {
            console.error('❌ No logic choices found');
            return;
        }
        
        const startTime = Date.now();
        
        choices.forEach(choice => {
            // Remove any existing event listeners
            const newChoice = choice.cloneNode(true);
            choice.parentNode.replaceChild(newChoice, choice);
            
            newChoice.addEventListener('click', async (e) => {
                console.log('🧠 Logic choice clicked:', newChoice.dataset.choice);
                
                // Visual feedback
                choices.forEach(c => c.classList.remove('selected'));
                newChoice.classList.add('selected');
                
                // Record timing
                const responseTime = Date.now() - startTime;
                recordTiming('logic_stage_response', responseTime);
                
                // Get choice data
                const choiceValue = newChoice.dataset.choice;
                const category = newChoice.dataset.category;
                
                // Log the selection
                await logEvent('choice', {
                    stage: 'logic',
                    choice: choiceValue,
                    category: category,
                    response_time: responseTime,
                    timestamp: Date.now()
                });
                
                await logResponse('logic_choice', {
                    choice: choiceValue,
                    category: category,
                    text: newChoice.textContent.trim(),
                    response_time: responseTime
                });
                
                // Enable next button
                const nextButton = safeGetElement('nextButton', 'LogicStageHandler');
                if (nextButton) {
                    nextButton.disabled = false;
                }
                
                console.log('✅ Logic stage choice processed');
            });
        });
        
        console.log('✅ Logic stage initialized');
    }
}

/**
 * 🎨 CreativeStageHandler Class
 * Handles creative writing and expression assessment
 */
export class CreativeStageHandler {
    /**
     * 🚀 Initialize creative stage with text input tracking
     */
    static async initialize() {
        console.log('🎨 Initializing creative stage...');
        
        const textArea = safeGetElement('creativeInput', 'CreativeStageHandler');
        
        if (!textArea) {
            console.error('❌ Creative input not found');
            return;
        }
        
        let typingStartTime = null;
        let keystrokes = 0;
        let wordCount = 0;
        
        // Track when user starts typing
        textArea.addEventListener('focus', async () => {
            if (typingStartTime === null) {
                typingStartTime = Date.now();
                console.log('🎨 Creative writing started');
                
                await logEvent('creative_start', { 
                    timestamp: Date.now() 
                });
            }
        });
        
        // Track typing behavior
        textArea.addEventListener('input', async (e) => {
            keystrokes++;
            wordCount = e.target.value.trim().split(/\s+/).filter(word => word.length > 0).length;
            
            // Log typing metrics periodically
            if (keystrokes % 10 === 0) {
                await logEvent('creative_typing', {
                    length: e.target.value.length,
                    word_count: wordCount,
                    keystrokes: keystrokes,
                    timestamp: Date.now()
                });
            }
            
            // Enable next button if sufficient content
            const nextButton = safeGetElement('nextButton', 'CreativeStageHandler');
            if (nextButton && e.target.value.trim().length > 20) {
                nextButton.disabled = false;
            }
        });
        
        // Track when user finishes
        textArea.addEventListener('blur', async () => {
            if (typingStartTime !== null) {
                const typingDuration = Date.now() - typingStartTime;
                
                console.log('🎨 Creative writing finished');
                
                await logEvent('creative_finish', {
                    typing_duration: typingDuration,
                    final_length: textArea.value.length,
                    final_word_count: wordCount,
                    keystrokes: keystrokes,
                    timestamp: Date.now()
                });
                
                await logResponse('creative_text', {
                    content: textArea.value,
                    typing_duration: typingDuration,
                    keystrokes: keystrokes,
                    word_count: wordCount,
                    character_count: textArea.value.length
                });
                
                recordTiming('creative_stage_completion', typingDuration);
            }
        });
        
        console.log('✅ Creative stage initialized');
    }
}

/**
 * ⚡ ReactionStageHandler Class
 * Handles reaction time testing
 */
export class ReactionStageHandler {
    /**
     * 🚀 Initialize reaction time test
     */
    static async initialize() {
        console.log('⚡ Initializing reaction stage...');
        
        const circle = safeGetElement('reactionCircle', 'ReactionStageHandler');
        const result = safeGetElement('reactionResult', 'ReactionStageHandler');
        
        if (!circle || !result) {
            console.error('❌ Reaction stage elements not found');
            return;
        }
        
        let reactionStartTime = null;
        let testCompleted = false;
        const testStartTime = Date.now();
        
        // Reset circle state
        circle.classList.remove('ready');
        circle.textContent = 'Чекайте...';
        result.textContent = '';
        
        // Set random delay (2-6 seconds)
        const waitTime = 2000 + Math.random() * 4000;
        console.log(`⚡ Reaction test will start in ${waitTime}ms`);
        
        const timeoutId = setTimeout(() => {
            if (!testCompleted) {
                circle.classList.add('ready');
                circle.textContent = 'НАТИСКАЙТЕ!';
                reactionStartTime = Date.now();
                
                console.log('⚡ Reaction test activated');
                
                logEvent('reaction_ready', { 
                    wait_time: waitTime,
                    timestamp: Date.now() 
                });
            }
        }, waitTime);
        
        // Handle clicks
        const clickHandler = async (e) => {
            if (testCompleted) return;
            
            testCompleted = true;
            clearTimeout(timeoutId);
            
            if (reactionStartTime) {
                // Successful reaction
                const reactionTime = Date.now() - reactionStartTime;
                
                console.log(`⚡ Reaction time: ${reactionTime}ms`);
                
                result.textContent = `Ваш час реакції: ${reactionTime} мс`;
                result.style.color = reactionTime < 400 ? '#4CAF50' : 
                                   reactionTime < 700 ? '#FF9800' : '#F44336';
                
                await logEvent('reaction_success', {
                    reaction_time: reactionTime,
                    wait_time: waitTime,
                    timestamp: Date.now()
                });
                
                await logResponse('reaction_time', {
                    time: reactionTime,
                    performance_level: reactionTime < 400 ? 'excellent' : 
                                     reactionTime < 700 ? 'good' : 'slow'
                });
                
                recordTiming('reaction_stage_completion', reactionTime);
                
                // Enable next button
                setTimeout(() => {
                    const nextButton = safeGetElement('nextButton', 'ReactionStageHandler');
                    if (nextButton) {
                        nextButton.disabled = false;
                    }
                }, 1000);
                
            } else {
                // Early click
                console.log('⚡ Early click detected');
                
                result.textContent = 'Занадто рано! Почекайте, поки коло стане зеленим.';
                result.style.color = '#F44336';
                
                await logEvent('reaction_early', { 
                    wait_time: waitTime,
                    timestamp: Date.now() 
                });
                
                await logResponse('reaction_error', 'early_click');
                
                // Restart test after delay
                setTimeout(() => {
                    if (document.getElementById('stage-reaction').classList.contains('active')) {
                        this.initialize();
                    }
                }, 2000);
            }
        };
        
        circle.addEventListener('click', clickHandler);
        
        console.log('✅ Reaction stage initialized');
    }
}

/**
 * 🧩 PuzzleStageHandler Class
 * Handles pattern recognition and logical puzzles
 */
export class PuzzleStageHandler {
    /**
     * 🚀 Initialize puzzle stage with pattern recognition
     */
    static async initialize() {
        console.log('🧩 Initializing puzzle stage...');
        
        const sequenceContainer = safeGetElement('patternSequence', 'PuzzleStageHandler');
        const choicesContainer = safeGetElement('patternChoices', 'PuzzleStageHandler');
        
        if (!sequenceContainer || !choicesContainer) {
            console.error('❌ Puzzle stage elements not found');
            return;
        }
        
        const startTime = Date.now();
        
        // Define pattern sets
        const patterns = [
            { 
                sequence: [2, 4, 6, 8], 
                answer: 10, 
                choices: [9, 10, 12, 14],
                type: 'arithmetic_progression'
            },
            { 
                sequence: [1, 4, 9, 16], 
                answer: 25, 
                choices: [20, 25, 30, 36],
                type: 'squares'
            },
            { 
                sequence: [3, 6, 12, 24], 
                answer: 48, 
                choices: [36, 42, 48, 54],
                type: 'geometric_progression'
            },
            {
                sequence: [1, 1, 2, 3, 5],
                answer: 8,
                choices: [7, 8, 9, 10],
                type: 'fibonacci'
            }
        ];
        
        // Select random pattern
        const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
        console.log('🧩 Selected pattern:', selectedPattern);
        
        // Display sequence
        this.displaySequence(sequenceContainer, selectedPattern);
        
        // Create choice buttons
        this.createChoices(choicesContainer, selectedPattern, startTime);
        
        console.log('✅ Puzzle stage initialized');
    }
    
    /**
     * 🔢 Display the number sequence
     * @param {HTMLElement} container - Container for sequence
     * @param {Object} pattern - Pattern data
     */
    static displaySequence(container, pattern) {
        container.innerHTML = '';
        
        // Add sequence numbers
        pattern.sequence.forEach(num => {
            const item = document.createElement('div');
            item.className = 'pattern-item';
            item.textContent = num;
            container.appendChild(item);
        });
        
        // Add missing item placeholder
        const missingItem = document.createElement('div');
        missingItem.className = 'pattern-item missing';
        missingItem.textContent = '?';
        container.appendChild(missingItem);
    }
    
    /**
     * 🎮 Create choice buttons
     * @param {HTMLElement} container - Container for choices
     * @param {Object} pattern - Pattern data
     * @param {number} startTime - Start time for timing
     */
    static createChoices(container, pattern, startTime) {
        container.innerHTML = '';
        
        pattern.choices.forEach(choice => {
            const choiceElement = document.createElement('div');
            choiceElement.className = 'pattern-choice';
            choiceElement.textContent = choice;
            
            choiceElement.addEventListener('click', async () => {
                // Prevent multiple clicks
                if (choiceElement.classList.contains('processed')) return;
                
                container.querySelectorAll('.pattern-choice').forEach(c => {
                    c.classList.add('processed');
                    c.classList.remove('selected');
                });
                
                choiceElement.classList.add('selected');
                
                const solveTime = Date.now() - startTime;
                const isCorrect = choice === pattern.answer;
                
                console.log(`🧩 Pattern choice: ${choice}, correct: ${isCorrect}, time: ${solveTime}ms`);
                
                // Visual feedback
                if (isCorrect) {
                    choiceElement.style.background = 'rgba(76, 175, 80, 0.6)';
                    choiceElement.style.border = '2px solid #4CAF50';
                } else {
                    choiceElement.style.background = 'rgba(244, 67, 54, 0.6)';
                    choiceElement.style.border = '2px solid #F44336';
                    
                    // Highlight correct answer
                    container.querySelectorAll('.pattern-choice').forEach(c => {
                        if (parseInt(c.textContent) === pattern.answer) {
                            c.style.background = 'rgba(76, 175, 80, 0.6)';
                            c.style.border = '2px solid #4CAF50';
                        }
                    });
                }
                
                // Log results
                await logEvent('pattern_solve', {
                    selected_answer: choice,
                    correct_answer: pattern.answer,
                    is_correct: isCorrect,
                    solve_time: solveTime,
                    pattern_sequence: pattern.sequence,
                    pattern_type: pattern.type,
                    timestamp: Date.now()
                });
                
                await logResponse('pattern_result', {
                    selected: choice,
                    correct: pattern.answer,
                    accuracy: isCorrect,
                    solve_time: solveTime,
                    pattern_type: pattern.type,
                    difficulty: pattern.sequence.length
                });
                
                recordTiming('puzzle_stage_completion', solveTime);
                
                // Enable next button
                setTimeout(() => {
                    const nextButton = safeGetElement('nextButton', 'PuzzleStageHandler');
                    if (nextButton) {
                        nextButton.disabled = false;
                    }
                }, 1500);
            });
            
            container.appendChild(choiceElement);
        });
    }
}

/**
 * 👥 SocialStageHandler Class
 * Handles social situation assessment
 */
export class SocialStageHandler {
    /**
     * 🚀 Initialize social stage
     */
    static async initialize() {
        console.log('👥 Initializing social stage...');
        
        const choices = document.querySelectorAll('#stage-social .choice-button');
        
        if (choices.length === 0) {
            console.error('❌ No social choices found');
            return;
        }
        
        const startTime = Date.now();
        
        choices.forEach(choice => {
            const newChoice = choice.cloneNode(true);
            choice.parentNode.replaceChild(newChoice, choice);
            
            newChoice.addEventListener('click', async (e) => {
                console.log('👥 Social choice clicked:', newChoice.dataset.choice);
                
                // Visual feedback
                choices.forEach(c => c.classList.remove('selected'));
                newChoice.classList.add('selected');
                
                const responseTime = Date.now() - startTime;
                const choiceValue = newChoice.dataset.choice;
                const category = newChoice.dataset.category;
                
                await logEvent('choice', {
                    stage: 'social',
                    choice: choiceValue,
                    category: category,
                    response_time: responseTime,
                    timestamp: Date.now()
                });
                
                await logResponse('social_choice', {
                    choice: choiceValue,
                    category: category,
                    text: newChoice.textContent.trim(),
                    response_time: responseTime
                });
                
                recordTiming('social_stage_response', responseTime);
                
                const nextButton = safeGetElement('nextButton', 'SocialStageHandler');
                if (nextButton) {
                    nextButton.disabled = false;
                }
                
                console.log('✅ Social stage choice processed');
            });
        });
        
        console.log('✅ Social stage initialized');
    }
}

/**
 * 🧠 Stage Router Class
 * Routes stage initialization to appropriate handlers
 */
export class GameStageRouter {
    /**
     * 🚀 Initialize stage based on name
     * @param {string} stageName - Name of stage to initialize
     */
    static async initializeStage(stageName) {
        console.log(`🚀 Routing stage initialization: ${stageName}`);
        
        try {
            switch (stageName) {
                case 'logic':
                    await LogicStageHandler.initialize();
                    break;
                    
                case 'creative':
                    await CreativeStageHandler.initialize();
                    break;
                    
                case 'reaction':
                    await ReactionStageHandler.initialize();
                    break;
                    
                case 'puzzle':
                    await PuzzleStageHandler.initialize();
                    break;
                    
                case 'social':
                    await SocialStageHandler.initialize();
                    break;
                    
                case 'memory':
                    await this.initializeMemoryStage();
                    break;
                    
                case 'prioritize':
                    await this.initializePrioritizeStage();
                    break;
                    
                case 'collaboration':
                    await this.initializeCollaborationStage();
                    break;
                    
                case 'visual':
                    await this.initializeVisualStage();
                    break;
                    
                case 'problem':
                    await this.initializeProblemStage();
                    break;
                    
                default:
                    console.warn(`⚠️ Unknown stage: ${stageName}`);
                    break;
            }
        } catch (error) {
            console.error(`❌ Error initializing stage ${stageName}:`, error);
        }
    }
    
    /**
     * 🧠 Initialize memory stage (simplified version)
     * @private
     */
    static async initializeMemoryStage() {
        console.log('🧠 Initializing memory stage...');
        // Memory stage implementation would go here
        // For now, just enable next button after delay
        setTimeout(() => {
            const nextButton = safeGetElement('nextButton', 'GameStageRouter.memory');
            if (nextButton) nextButton.disabled = false;
        }, 3000);
    }
    
    /**
     * 📋 Initialize prioritize stage (simplified version)
     * @private
     */
    static async initializePrioritizeStage() {
        console.log('📋 Initializing prioritize stage...');
        // Prioritize stage implementation would go here
        setTimeout(() => {
            const nextButton = safeGetElement('nextButton', 'GameStageRouter.prioritize');
            if (nextButton) nextButton.disabled = false;
        }, 3000);
    }
    
    /**
     * 🤝 Initialize collaboration stage (simplified version)
     * @private
     */
    static async initializeCollaborationStage() {
        console.log('🤝 Initializing collaboration stage...');
        // Collaboration stage implementation would go here
        setTimeout(() => {
            const nextButton = safeGetElement('nextButton', 'GameStageRouter.collaboration');
            if (nextButton) nextButton.disabled = false;
        }, 3000);
    }
    
    /**
     * 👁️ Initialize visual stage (simplified version)
     * @private
     */
    static async initializeVisualStage() {
        console.log('👁️ Initializing visual stage...');
        // Visual stage implementation would go here
        setTimeout(() => {
            const nextButton = safeGetElement('nextButton', 'GameStageRouter.visual');
            if (nextButton) nextButton.disabled = false;
        }, 3000);
    }
    
    /**
     * 🔧 Initialize problem stage (simplified version)
     * @private
     */
    static async initializeProblemStage() {
        console.log('🔧 Initializing problem stage...');
        // Problem stage implementation would go here
        setTimeout(() => {
            const nextButton = safeGetElement('nextButton', 'GameStageRouter.problem');
            if (nextButton) nextButton.disabled = false;
        }, 3000);
    }
}

// Export the main router function
export async function initializeGameStage(stageName) {
    await GameStageRouter.initializeStage(stageName);
}

console.log('✅ Game Stages Logic module loaded');