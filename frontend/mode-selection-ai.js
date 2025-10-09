/**
 * 🤖 Mode Selection & AI Logic Module
 * Handles AI question generation, mode-specific configurations, and AI responses
 * Manages the transition between standard and AI testing modes
 */

import { 
    API_BASE, 
    STAGE_ICONS, 
    STAGE_TITLES, 
    AI_STAGES,
    safeGetElement 
} from './utilities-config.js';

import { logEvent, logResponse } from './event-tracking.js';
import { gameState } from './core-game-management.js';

/**
 * 🎯 AIQuestionManager Class
 * Manages AI question generation and display for adaptive testing
 */
export class AIQuestionManager {
    constructor() {
        this.currentQuestion = null;
        this.questionHistory = [];
        console.log('🤖 AIQuestionManager initialized');
    }

    /**
     * 🚀 Initialize and show an AI stage
     * Generates questions dynamically based on current stage
     * @param {string} stageName - Current AI stage name
     */
    async initializeAIStage(stageName) {
        console.log(`🚀 Initializing AI stage: ${stageName}`);
        
        try {
            // Show AI stage UI
            this.showAIStageUI();
            
            // Generate question for current stage
            const questionData = await this.generateAIQuestion(stageName);
            
            if (!questionData) {
                console.error('❌ Failed to generate AI question');
                this.handleAIError();
                return;
            }
            
            // Display the generated question
            this.displayAIQuestion(questionData);
            
            // Store question in history
            this.questionHistory.push(questionData);
            this.currentQuestion = questionData;
            
            console.log('✅ AI stage initialized successfully');
            
        } catch (error) {
            console.error('❌ Error initializing AI stage:', error);
            this.handleAIError();
        }
    }

    /**
     * 🖼️ Show AI stage UI and hide loading indicators
     */
    showAIStageUI() {
        console.log('🖼️ Showing AI stage UI...');
        
        // Hide all game stages first
        document.querySelectorAll('.game-stage').forEach(stage => {
            stage.classList.remove('active');
        });
        
        // Show AI stage
        const aiStage = safeGetElement('ai-stage', 'showAIStageUI');
        if (aiStage) {
            aiStage.classList.add('active');
            console.log('✅ AI stage UI is now visible');
        }
        
        // Show loading indicator initially
        const loadingIndicator = safeGetElement('aiLoadingIndicator', 'showAIStageUI');
        const choicesContainer = safeGetElement('aiChoices', 'showAIStageUI');
        
        if (loadingIndicator) loadingIndicator.style.display = 'block';
        if (choicesContainer) choicesContainer.style.display = 'none';
    }

    /**
     * 🤖 Generate AI question for specified stage
     * @param {string} stageName - Name of the current stage
     * @returns {Promise<Object>} Generated question data
     */
    async generateAIQuestion(stageName) {
        console.log(`🤖 Generating AI question for stage: ${stageName}`);
        
        // Validate session
        if (!gameState.sessionId) {
            console.error('❌ No session ID available for AI question generation');
            return null;
        }
        
        try {
            const response = await fetch(`${API_BASE}/session/${gameState.sessionId}/generate-question`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    stage_name: stageName,
                    user_context: this.buildUserContext(),
                    previous_responses: this.getPreviousResponses()
                })
            });

            if (!response.ok) {
                console.error(`❌ Server error generating question: ${response.status}`);
                return null;
            }

            const questionData = await response.json();
            console.log('✅ AI question generated successfully');
            
            // Log question generation
            await logEvent('ai_question_generated', {
                stage: stageName,
                question_id: questionData.generated_at || Date.now(),
                timestamp: Date.now()
            });
            
            return questionData;

        } catch (error) {
            console.error('❌ Network error generating AI question:', error);
            return null;
        }
    }

    /**
     * 📊 Build user context for AI question generation
     * @returns {Object} User context data
     * @private
     */
    buildUserContext() {
        return {
            completed_stages: gameState.aiStageCount,
            total_time_elapsed: Date.now() - gameState.startTime,
            response_pattern: this.analyzeResponsePattern(),
            performance_indicators: this.getPerformanceIndicators()
        };
    }

    /**
     * 📝 Get previous AI responses for context
     * @returns {Array} Previous response data
     * @private  
     */
    getPreviousResponses() {
        return this.questionHistory.map(q => ({
            stage: q.stage,
            question_id: q.generated_at,
            user_choice: q.user_selected_choice || null,
            response_time: q.response_time || null
        }));
    }

    /**
     * 📊 Analyze user response patterns
     * @returns {Object} Response pattern analysis
     * @private
     */
    analyzeResponsePattern() {
        if (this.questionHistory.length === 0) {
            return { pattern: 'none', confidence: 0 };
        }

        // Simple pattern analysis - can be enhanced
        const choices = this.questionHistory
            .filter(q => q.user_selected_choice)
            .map(q => q.user_selected_choice.category);
        
        const mostCommon = this.getMostCommonChoice(choices);
        
        return {
            pattern: mostCommon,
            confidence: choices.length > 0 ? (choices.filter(c => c === mostCommon).length / choices.length) : 0,
            total_responses: choices.length
        };
    }

    /**
     * 🎯 Get most common choice from array
     * @param {Array} choices - Array of choice categories
     * @returns {string} Most common choice
     * @private
     */
    getMostCommonChoice(choices) {
        if (choices.length === 0) return 'none';
        
        const frequency = {};
        choices.forEach(choice => {
            frequency[choice] = (frequency[choice] || 0) + 1;
        });
        
        return Object.keys(frequency).reduce((a, b) => 
            frequency[a] > frequency[b] ? a : b
        );
    }

    /**
     * 📈 Get performance indicators
     * @returns {Object} Performance metrics
     * @private
     */
    getPerformanceIndicators() {
        const avgResponseTime = this.questionHistory.length > 0 
            ? this.questionHistory.reduce((sum, q) => sum + (q.response_time || 0), 0) / this.questionHistory.length
            : 0;

        return {
            average_response_time: avgResponseTime,
            stages_completed: this.questionHistory.length,
            engagement_score: this.calculateEngagementScore()
        };
    }

    /**
     * 📊 Calculate user engagement score
     * @returns {number} Engagement score (0-1)
     * @private
     */
    calculateEngagementScore() {
        // Simple engagement calculation - can be enhanced
        const baseScore = 0.5;
        const responseTimeBonus = this.questionHistory.length > 0 ? 0.3 : 0;
        const completionBonus = (this.questionHistory.length / AI_STAGES.length) * 0.2;
        
        return Math.min(1.0, baseScore + responseTimeBonus + completionBonus);
    }

    /**
     * 🎨 Display AI question with choices
     * @param {Object} questionData - Generated question data
     */
    displayAIQuestion(questionData) {
        console.log('🎨 Displaying AI question:', questionData);
        
        if (!questionData) {
            console.error('❌ No question data to display');
            return;
        }
        
        try {
            // Update stage header
            this.updateStageHeader(questionData);
            
            // Update question text
            this.updateQuestionText(questionData);
            
            // Create choice buttons
            this.createChoiceButtons(questionData);
            
            // Hide loading indicator
            this.hideLoadingIndicator();
            
            console.log('✅ AI question displayed successfully');
            
        } catch (error) {
            console.error('❌ Error displaying AI question:', error);
            this.handleAIError();
        }
    }

    /**
     * 🏷️ Update stage header with icon and title
     * @param {Object} questionData - Question data
     * @private
     */
    updateStageHeader(questionData) {
        const stageName = questionData.stage;
        const icon = STAGE_ICONS[stageName] || '🤖';
        const title = STAGE_TITLES[stageName] || 'AI Тест';
        
        const stageIcon = safeGetElement('aiStageIcon', 'updateStageHeader');
        const stageTitle = safeGetElement('aiStageTitle', 'updateStageHeader');
        
        if (stageIcon) {
            stageIcon.textContent = icon;
            console.log(`✅ Stage icon updated: ${icon}`);
        }
        
        if (stageTitle) {
            stageTitle.textContent = title;
            console.log(`✅ Stage title updated: ${title}`);
        }
    }

    /**
     * 📝 Update question text
     * @param {Object} questionData - Question data
     * @private
     */
    updateQuestionText(questionData) {
        const questionElement = safeGetElement('aiQuestion', 'updateQuestionText');
        if (questionElement) {
            questionElement.textContent = questionData.question || 'Питання не завантажилось';
            console.log('✅ Question text updated');
        }
    }

    /**
     * 🎮 Create interactive choice buttons
     * @param {Object} questionData - Question data
     * @private
     */
    createChoiceButtons(questionData) {
        const choicesContainer = safeGetElement('aiChoices', 'createChoiceButtons');
        if (!choicesContainer) {
            console.error('❌ Choices container not found');
            return;
        }
        
        // Clear existing choices
        choicesContainer.innerHTML = '';
        
        if (!questionData.choices || questionData.choices.length === 0) {
            console.error('❌ No choices available in question data');
            choicesContainer.innerHTML = '<p>Помилка: варіанти відповідей не завантажились</p>';
            return;
        }
        
        // Create choice buttons
        questionData.choices.forEach((choice, index) => {
            const choiceButton = document.createElement('div');
            choiceButton.className = 'choice-button';
            choiceButton.textContent = choice.text || `Варіант ${index + 1}`;
            choiceButton.dataset.choice = choice.category || 'unknown';
            choiceButton.dataset.weight = choice.weight || 1.0;
            choiceButton.dataset.index = index;
            
            // Add click handler
            choiceButton.addEventListener('click', () => {
                this.handleChoiceSelection(choiceButton, questionData, choice);
            });
            
            choicesContainer.appendChild(choiceButton);
        });
        
        // Show choices container
        choicesContainer.style.display = 'grid';
        console.log(`✅ Created ${questionData.choices.length} choice buttons`);
    }

    /**
     * 👆 Handle choice selection by user
     * @param {HTMLElement} choiceElement - Selected choice element
     * @param {Object} questionData - Current question data
     * @param {Object} selectedChoice - Selected choice data
     */
    async handleChoiceSelection(choiceElement, questionData, selectedChoice) {
        console.log('👆 AI choice selected:', selectedChoice);
        
        const selectionTime = Date.now();
        const responseTime = selectionTime - (this.currentQuestion.display_time || selectionTime);
        
        // Visual feedback
        this.showChoiceSelection(choiceElement);
        
        // Log the selection
        await this.logAIChoice(questionData, selectedChoice, responseTime);
        
        // Store selection in question history
        if (this.currentQuestion) {
            this.currentQuestion.user_selected_choice = selectedChoice;
            this.currentQuestion.response_time = responseTime;
            this.currentQuestion.selection_time = selectionTime;
        }
        
        // Proceed to next AI stage
        setTimeout(() => {
            this.proceedToNextAIStage();
        }, 1500);
    }

    /**
     * 🎨 Show visual feedback for choice selection
     * @param {HTMLElement} selectedElement - Selected choice element
     * @private
     */
    showChoiceSelection(selectedElement) {
        // Remove selection from other choices
        document.querySelectorAll('#aiChoices .choice-button').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Highlight selected choice
        selectedElement.classList.add('selected');
        console.log('✅ Choice selection visual feedback applied');
    }

    /**
     * 📝 Log AI choice selection
     * @param {Object} questionData - Question data
     * @param {Object} selectedChoice - Selected choice
     * @param {number} responseTime - Response time in milliseconds
     * @private
     */
    async logAIChoice(questionData, selectedChoice, responseTime) {
        // Log event
        await logEvent('ai_choice', {
            stage: questionData.stage,
            question_id: questionData.generated_at || Date.now(),
            choice_category: selectedChoice.category,
            choice_text: selectedChoice.text,
            choice_weight: selectedChoice.weight,
            response_time: responseTime,
            timestamp: Date.now()
        });
        
        // Log response
        await logResponse(`ai_${questionData.stage}_choice`, {
            question: questionData.question,
            selected_choice: selectedChoice.text,
            category: selectedChoice.category,
            weight: selectedChoice.weight,
            response_time: responseTime,
            stage: questionData.stage,
            question_id: questionData.generated_at
        });
        
        console.log('📝 AI choice logged successfully');
    }

    /**
     * ➡️ Proceed to next AI stage
     * @private
     */
    proceedToNextAIStage() {
        console.log('➡️ Proceeding to next AI stage...');
        
        gameState.aiStageCount++;
        
        if (gameState.aiStageCount >= AI_STAGES.length) {
            console.log('🏁 All AI stages completed, finishing game');
            gameState.finishGame();
        } else {
            console.log(`🚀 Moving to AI stage ${gameState.aiStageCount}`);
            const nextStageName = AI_STAGES[gameState.aiStageCount];
            this.initializeAIStage(nextStageName);
        }
    }

    /**
     * 🙈 Hide loading indicator and show choices
     * @private
     */
    hideLoadingIndicator() {
        const loadingIndicator = safeGetElement('aiLoadingIndicator', 'hideLoadingIndicator');
        const choicesContainer = safeGetElement('aiChoices', 'hideLoadingIndicator');
        
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        if (choicesContainer) choicesContainer.style.display = 'grid';
        
        // Store display time for response time calculation
        if (this.currentQuestion) {
            this.currentQuestion.display_time = Date.now();
        }
        
        console.log('✅ Loading indicator hidden, choices shown');
    }

    /**
     * ❌ Handle AI system errors
     * Fallback to standard mode or show error message
     * @private
     */
    handleAIError() {
        console.log('❌ Handling AI system error...');
        
        const questionElement = safeGetElement('aiQuestion', 'handleAIError');
        if (questionElement) {
            questionElement.innerHTML = `
                ⚠️ Помилка генерації питання. Перемикаємося на стандартний режим...
            `;
        }
        
        // Log the error
        logEvent('ai_error', {
            stage: gameState.aiStages[gameState.aiStageCount] || 'unknown',
            timestamp: Date.now()
        });
        
        // Switch to standard mode as fallback
        gameState.testMode = 'standard';
        gameState.currentStage = 1; // Skip mode selection
        
        setTimeout(() => {
            gameState.advanceToNextStage();
        }, 2000);
    }
}

// 🌐 Global AI question manager instance
export const aiQuestionManager = new AIQuestionManager();

/**
 * 🚀 Initialize AI stage (convenience function)
 * @param {string} stageName - Stage name to initialize
 */
export async function initAIStage(stageName) {
    await aiQuestionManager.initializeAIStage(stageName);
}

/**
 * 🎮 Check if current mode is AI
 * @returns {boolean} True if in AI mode
 */
export function isAIMode() {
    return gameState.testMode === 'ai';
}

/**
 * 🤖 Get current AI stage name
 * @returns {string} Current AI stage name
 */
export function getCurrentAIStage() {
    return gameState.aiStageCount < AI_STAGES.length 
        ? AI_STAGES[gameState.aiStageCount] 
        : 'completed';
}

/**
 * 📊 Get AI progress information
 * @returns {Object} AI progress data
 */
export function getAIProgress() {
    return {
        currentStage: gameState.aiStageCount,
        totalStages: AI_STAGES.length,
        completedStages: gameState.aiStageCount,
        progress: (gameState.aiStageCount / AI_STAGES.length) * 100,
        questionsAnswered: aiQuestionManager.questionHistory.length
    };
}

console.log('✅ Mode Selection & AI Logic module loaded');