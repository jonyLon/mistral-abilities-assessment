/**
 * 🧠 Інноваційна система оцінки здібностей
 * JavaScript логіка гри з збором реальних поведінкових даних
 * 
 * 🏗️ REFACTORED MODULAR ARCHITECTURE
 * This file now serves as the main orchestrator that coordinates between:
 * - utilities-config.js: Global constants, utilities, and configuration
 * - event-tracking.js: User behavior tracking and analytics
 * - core-game-management.js: Game state, initialization, and flow control
 * - mode-selection-ai.js: AI mode logic and question generation
 * - game-stages.js: Individual stage implementations
 * - results-analysis.js: Results calculation and display
 */

// 📦 Import all refactored modules
import {
    API_BASE,
    GAME_DURATION,
    GAME_STAGES,
    AI_STAGES,
    GAME_MODES,
    validateDOMElements
} from './utilities-config.js';

import {
    behaviorTracker,
    startBehaviorTracking,
    logEvent,
    logResponse,
    stopBehaviorTracking
} from './event-tracking.js';

import {
    gameState,
    initializeGame,
    nextStage,
    restartGame,
    finishGame
} from './core-game-management.js';

import {
    initAIStage,
    isAIMode,
    getCurrentAIStage,
    getAIProgress
} from './mode-selection-ai.js';

import {
    initializeGameStage
} from './game-stages.js';

import {
    analyzeAndDisplayResults,
    shareResults
} from './results-analysis.js';

/**
 * 🎮 ORCHESTRATOR FUNCTIONS
 * High-level functions that coordinate between modules
 */

// 🎨 Enhanced initGame function that delegates to core game management
async function initGame() {
    console.log('🎨 Оркестратор: Ініціалізація гри...');
    
    try {
        // Validate essential DOM elements before starting
        const requiredElements = [
            'timer', 'progressBar', 'navigationButtons', 'nextButton',
            'stage-mode-select', 'standardMode', 'aiMode'
        ];
        
        if (!validateDOMElements(requiredElements)) {
            throw new Error('Не знайдено обов’язкові елементи DOM');
        }
        
        // Delegate to core game management module
        const success = await initializeGame();
        
        if (!success) {
            throw new Error('Помилка ініціалізації основної системи');
        }
        
        // Initialize stage-specific logic integration
        setupStageLogicIntegration();
        
        console.log('✅ Оркестратор: Гра успішно ініціалізована');
        
    } catch (error) {
        console.error('❌ Оркестратор: Помилка ініціалізації:', error);
        alert('Помилка запуску гри. Спробуйте оновити сторінку.');
    }
}

/**
 * 🔌 Stage Logic Integration Setup
 * Connects the core game management with stage-specific implementations
 */
function setupStageLogicIntegration() {
    console.log('🔌 Налаштовуємо інтеграцію логіки етапів...');
    
    // Override the stage logic initialization in core game management
    if (gameState && gameState.initializeStageLogic) {
        const originalInitStageLogic = gameState.initializeStageLogic;
        
        gameState.initializeStageLogic = async function(stageName) {
            console.log(`🔌 Інтеграція: ініціалізація логіки етапу ${stageName}`);
            
            try {
                // Check if this is an AI mode stage
                if (isAIMode() && stageName !== 'mode-select') {
                    console.log('🤖 Запускаємо AI етап:', stageName);
                    await initAIStage(stageName);
                } else if (stageName !== 'mode-select' && stageName !== 'loading' && stageName !== 'results') {
                    console.log('🎯 Запускаємо стандартний етап:', stageName);
                    await initializeGameStage(stageName);
                } else if (stageName === 'results') {
                    console.log('📊 Запускаємо аналіз результатів...');
                    await analyzeAndDisplayResults();
                }
                
                console.log(`✅ Логіка етапу ${stageName} успішно ініціалізована`);
                
            } catch (error) {
                console.error(`❌ Помилка ініціалізації логіки етапу ${stageName}:`, error);
                
                // Fallback: enable next button after delay
                setTimeout(() => {
                    const nextButton = document.getElementById('nextButton');
                    if (nextButton) {
                        nextButton.disabled = false;
                        console.log('⚠️ Активовано кнопку "Далі" як fallback');
                    }
                }, 2000);
            }
        };
    }
    
    console.log('✅ Інтеграція логіки етапів налаштована');
}

/**
 * 🌐 GLOBAL FUNCTIONS
 * Expose module functionality to maintain compatibility with existing HTML
 */

// 🎨 Navigation functions (compatible with existing onclick handlers)
window.nextStage = async function() {
    console.log('🌐 Оркестратор: nextStage викликано');
    try {
        await nextStage();
    } catch (error) {
        console.error('❌ Помилка переходу на наступний етап:', error);
    }
};

window.restartGame = function() {
    console.log('🌐 Оркестратор: restartGame викликано');
    restartGame();
};

window.finishGame = async function() {
    console.log('🌐 Оркестратор: finishGame викликано');
    try {
        await finishGame();
    } catch (error) {
        console.error('❌ Помилка завершення гри:', error);
    }
};

window.shareResults = function() {
    console.log('🌐 Оркестратор: shareResults викликано');
    shareResults();
};

// 📊 Отримання статистики (для дебагу)
window.getGameStats = function() {
    return {
        gameState: gameState,
        behaviorStats: behaviorTracker.getTrackingStats(),
        aiProgress: isAIMode() ? getAIProgress() : null,
        currentStage: gameState.getCurrentStageName ? gameState.getCurrentStageName() : 'unknown'
    };
};

// 🔧 Функції для дебагу (для сумісності з консолью розробника)
window.debugGame = {
    skipToStage: function(stageName) {
        console.log(`🔧 Дебаг: перехід на етап ${stageName}`);
        // This would need to be implemented in the core module
    },
    
    getCurrentState: function() {
        return window.getGameStats();
    },
    
    logCurrentEvents: function() {
        console.log('🔧 Поточні події:', behaviorTracker.getTrackingStats());
    }
};

/**
 * 🎯 ERROR HANDLING & MODULE LOADING
 */

// 🚨 Обробка помилок завантаження модулів
function handleModuleError(error, moduleName) {
    console.error(`🚨 Помилка завантаження модуля ${moduleName}:`, error);
    
    const errorMessage = `
        Помилка завантаження модуля: ${moduleName}
        ${error.message}
        
        Перевірте:
        1. Чи всі файли модулів присутні
        2. Чи сервер підтримує ES модулі
        3. Чи використовується type="module" в HTML
    `;
    
    alert(errorMessage);
}

/**
 * 🏠 PAGE INITIALIZATION
 * Main page load and cleanup handlers
 */

// 🚀 Ініціалізація при завантаженні сторінки
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Запуск рефакторованої гри оцінки здібностей...');
    
    try {
        // Чекаємо, чи всі модулі завантажено
        if (typeof gameState === 'undefined') {
            throw new Error('Модуль core-game-management.js не завантажено');
        }
        
        if (typeof behaviorTracker === 'undefined') {
            throw new Error('Модуль event-tracking.js не завантажено');
        }
        
        console.log('✅ Всі модулі успішно завантажено');
        
        // Запускаємо основну гру
        await initGame();
        
    } catch (error) {
        console.error('❌ Критична помилка ініціалізації:', error);
        handleModuleError(error, 'Основна система');
    }
});

// 🧹 Очищення при покиданні сторінки
window.addEventListener('beforeunload', (e) => {
    console.log('🧹 Покидання сторінки, логуємо подію...');
    
    try {
        logEvent('game_exit', { 
            stage: gameState.getCurrentStageName ? gameState.getCurrentStageName() : 'unknown',
            timestamp: Date.now() 
        });
        
        // Зупиняємо трекінг
        if (behaviorTracker && behaviorTracker.isTracking) {
            stopBehaviorTracking();
        }
        
    } catch (error) {
        console.error('❌ Помилка при покиданні сторінки:', error);
    }
});

// 🏁 Повідомлення про успішне завантаження
console.log('✅ Оркестратор game-logic.js успішно завантажено');
console.log('🏗️ Модульна архітектура активна');
