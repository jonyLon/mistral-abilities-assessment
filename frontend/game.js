/**
 * 🧠 Спрощена система оцінки здібностей
 * Лінійний прохід через 10 етапів без складної логіки
 */

// Глобальний стан гри
const gameState = {
    questions: [],
    currentStageIndex: 0,
    responses: {},
    startTime: Date.now()
};

// API базовий URL
const API_BASE = 'http://localhost:8000';

/**
 * Ініціалізація гри при завантаженні сторінки
 */
async function initGame() {
    console.log('🎮 Ініціалізація гри...');
    
    try {
        // Завантажити питання з JSON
        const response = await fetch('questions.json');
        const data = await response.json();
        gameState.questions = data.stages;
        
        console.log(`✅ Завантажено ${gameState.questions.length} етапів`);
        
        // Показати перший етап
        showStage(0);
        
    } catch (error) {
        console.error('❌ Помилка завантаження питань:', error);
        alert('Помилка завантаження гри. Перезавантажте сторінку.');
    }
}

/**
 * Показати поточний етап
 */
function showStage(index) {
    const stage = gameState.questions[index];
    const container = document.getElementById('gameContainer');
    
    if (!stage) {
        console.error('❌ Етап не знайдено:', index);
        return;
    }
    
    console.log(`📊 Показуємо етап ${index + 1}/${gameState.questions.length}: ${stage.title}`);
    
    // Оновити прогрес бар
    const progress = ((index + 1) / gameState.questions.length) * 100;
    document.getElementById('progressBar').style.width = `${progress}%`;
    document.getElementById('stageCounter').textContent = `Етап ${index + 1} з ${gameState.questions.length}`;
    
    // Створити HTML для етапу
    container.innerHTML = `
        <div class="stage-container">
            <div class="stage-header">
                <span class="stage-icon">${stage.icon}</span>
                <h2 class="stage-title">${stage.title}</h2>
            </div>
            
            <div class="question">
                <p>${stage.question}</p>
            </div>
            
            <div class="choices-grid">
                ${stage.choices.map((choice, i) => `
                    <button class="choice-button" onclick="selectChoice(${i})" id="choice-${i}">
                        ${choice.text}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * Обробити вибір відповіді
 */
function selectChoice(choiceIndex) {
    const stage = gameState.questions[gameState.currentStageIndex];
    const choice = stage.choices[choiceIndex];
    
    console.log(`✅ Вибрано: ${choice.text} (${choice.category}, вага: ${choice.weight})`);
    
    // Зберегти відповідь
    gameState.responses[stage.id] = {
        choice: choiceIndex,
        category: choice.category,
        weight: choice.weight,
        timestamp: Date.now() - gameState.startTime
    };
    
    // Візуальний фідбек
    document.getElementById(`choice-${choiceIndex}`).classList.add('selected');
    
    // Затримка перед переходом
    setTimeout(() => {
        nextStage();
    }, 500);
}

/**
 * Перейти до наступного етапу
 */
function nextStage() {
    gameState.currentStageIndex++;
    
    if (gameState.currentStageIndex >= gameState.questions.length) {
        // Тест завершено - показати завантаження і відправити на аналіз
        showLoading();
        analyzeResults();
    } else {
        // Показати наступний етап
        showStage(gameState.currentStageIndex);
    }
}

/**
 * Показати екран завантаження
 */
function showLoading() {
    const container = document.getElementById('gameContainer');
    container.innerHTML = `
        <div class="loading-screen">
            <div class="spinner"></div>
            <h2>🧠 Аналізуємо ваші відповіді...</h2>
            <p>Mistral Nemo обробляє дані для створення вашого профілю здібностей</p>
        </div>
    `;
}

/**
 * Відправити результати на аналіз
 */
async function analyzeResults() {
    console.log('📤 Відправляємо результати на аналіз...');
    console.log('Відповіді:', gameState.responses);
    
    try {
        const response = await fetch(`${API_BASE}/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                responses: gameState.responses
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const results = await response.json();
        console.log('✅ Отримано результати:', results);
        
        showResults(results);
        
    } catch (error) {
        console.error('❌ Помилка аналізу:', error);
        
        // Показати помилку користувачу
        const container = document.getElementById('gameContainer');
        container.innerHTML = `
            <div class="error-screen">
                <h2>⚠️ Помилка аналізу</h2>
                <p>Не вдалося отримати результати від сервера.</p>
                <p class="error-details">${error.message}</p>
                <button onclick="location.reload()" class="restart-button">
                    Спробувати знову
                </button>
            </div>
        `;
    }
}

/**
 * Показати результати аналізу
 */
function showResults(results) {
    const container = document.getElementById('gameContainer');
    
    const scores = results.ability_scores || {};
    const insights = results.insights || [];
    const confidence = (results.confidence || 0) * 100;
    
    console.log('📊 Показуємо результати:', results);
    
    // Знайти топ здібності
    const topAbilities = Object.entries(scores)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3);
    
    container.innerHTML = `
        <div class="results-screen">
            <h1>🎉 Ваш профіль здібностей</h1>
            
            <div class="confidence-indicator">
                <p>Рівень достовірності: <strong>${confidence.toFixed(0)}%</strong></p>
            </div>
            
            <div class="abilities-chart">
                ${createAbilityBar('📊 Аналітичні', scores.analytical || 0, '#2196F3')}
                ${createAbilityBar('🎨 Творчі', scores.creative || 0, '#9C27B0')}
                ${createAbilityBar('👥 Соціальні', scores.social || 0, '#4CAF50')}
                ${createAbilityBar('🔧 Технічні', scores.technical || 0, '#FF9800')}
                ${createAbilityBar('🔬 Дослідницькі', scores.research || 0, '#F44336')}
            </div>
            
            <div class="top-abilities">
                <h3>🏆 Ваші сильні сторони:</h3>
                <ol>
                    ${topAbilities.map(([ability, score]) => `
                        <li>${getAbilityName(ability)}: <strong>${score.toFixed(0)}%</strong></li>
                    `).join('')}
                </ol>
            </div>
            
            <div class="insights">
                <h3>💡 Інсайти:</h3>
                <ul>
                    ${insights.map(insight => `<li>${insight}</li>`).join('')}
                </ul>
            </div>
            
            <button onclick="location.reload()" class="restart-button">
                🔄 Пройти тест знову
            </button>
        </div>
    `;
    
    // Анімувати бари
    setTimeout(() => {
        document.querySelectorAll('.ability-fill').forEach(bar => {
            bar.style.width = bar.dataset.width;
        });
    }, 100);
}

/**
 * Створити бар здібності
 */
function createAbilityBar(name, value, color) {
    return `
        <div class="ability-row">
            <span class="ability-name">${name}</span>
            <div class="ability-bar-container">
                <div class="ability-fill" data-width="${value}%" style="background-color: ${color}"></div>
            </div>
            <span class="ability-value">${value.toFixed(0)}%</span>
        </div>
    `;
}

/**
 * Отримати українську назву здібності
 */
function getAbilityName(ability) {
    const names = {
        analytical: 'Аналітичні',
        creative: 'Творчі',
        social: 'Соціальні',
        technical: 'Технічні',
        research: 'Дослідницькі'
    };
    return names[ability] || ability;
}

// Запустити гру при завантаженні сторінки
document.addEventListener('DOMContentLoaded', initGame);
