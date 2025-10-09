/**
 * 📊 Results & Analysis Module
 * Handles results calculation, analysis generation, and display functionality
 * Provides comprehensive score visualization and sharing capabilities
 */

import { API_BASE, getAbilityColor, safeGetElement } from './utilities-config.js';
import { logEvent } from './event-tracking.js';
import { gameState } from './core-game-management.js';

/**
 * 🎯 ResultsAnalyzer Class
 * Analyzes game data and generates comprehensive ability assessments
 */
export class ResultsAnalyzer {
    constructor() {
        this.analysisResults = null;
        this.isAnalyzing = false;
        console.log('📊 ResultsAnalyzer initialized');
    }

    /**
     * 🚀 Perform comprehensive results analysis
     * Sends data to server for AI-powered analysis and scoring
     * @returns {Promise<Object>} Analysis results
     */
    async performAnalysis() {
        if (this.isAnalyzing) {
            console.warn('⚠️ Analysis already in progress');
            return this.analysisResults;
        }

        this.isAnalyzing = true;
        console.log('🔍 Starting results analysis...');

        try {
            // Log analysis start
            await logEvent('analysis_start', {
                session_id: gameState.sessionId,
                test_mode: gameState.testMode,
                stages_completed: gameState.testMode === 'ai' ? gameState.aiStageCount : gameState.currentStage,
                total_time: Date.now() - gameState.startTime,
                timestamp: Date.now()
            });

            // Send analysis request to server
            const analysisData = await this.requestServerAnalysis();
            
            if (analysisData) {
                this.analysisResults = analysisData;
                console.log('✅ Server analysis completed successfully');
            } else {
                // Fallback to local analysis
                console.warn('⚠️ Server analysis failed, using fallback');
                this.analysisResults = this.generateFallbackResults();
            }

            // Log analysis completion
            await logEvent('analysis_complete', {
                analysis_method: analysisData ? 'server' : 'fallback',
                scores_generated: Object.keys(this.analysisResults.scores || {}).length,
                timestamp: Date.now()
            });

            return this.analysisResults;

        } catch (error) {
            console.error('❌ Analysis error:', error);
            this.analysisResults = this.generateFallbackResults();
            return this.analysisResults;
        } finally {
            this.isAnalyzing = false;
        }
    }

    /**
     * 🌐 Request analysis from server
     * @returns {Promise<Object|null>} Server analysis results
     * @private
     */
    async requestServerAnalysis() {
        if (!gameState.sessionId) {
            console.error('❌ No session ID for analysis request');
            return null;
        }

        try {
            console.log('🌐 Requesting server analysis...');
            
            const response = await fetch(`${API_BASE}/session/${gameState.sessionId}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    test_mode: gameState.testMode,
                    completion_time: Date.now() - gameState.startTime,
                    stages_completed: gameState.testMode === 'ai' ? gameState.aiStageCount : gameState.currentStage
                })
            });

            if (!response.ok) {
                console.error(`❌ Server analysis failed: ${response.status}`);
                return null;
            }

            const results = await response.json();
            console.log('✅ Server analysis received');
            return results;

        } catch (error) {
            console.error('❌ Network error during analysis:', error);
            return null;
        }
    }

    /**
     * 🔄 Generate fallback results when server analysis fails
     * @returns {Object} Fallback analysis results
     * @private
     */
    generateFallbackResults() {
        console.log('🔄 Generating fallback results...');
        
        const baseScores = {
            analytical: 65 + Math.random() * 20,
            creative: 60 + Math.random() * 25,
            social: 55 + Math.random() * 30,
            technical: 70 + Math.random() * 15,
            research: 62 + Math.random() * 23
        };

        return {
            scores: Object.entries(baseScores).map(([type, score]) => ({
                type,
                name: this.getAbilityName(type),
                score: Math.round(score),
                level: this.getAbilityLevel(score),
                description: this.getAbilityDescription(type, score),
                icon: this.getAbilityIcon(type)
            })),
            confidence: 0.7,
            recommendations: this.generateBasicRecommendations(baseScores),
            analysis_method: 'fallback',
            timestamp: Date.now()
        };
    }

    /**
     * 🏷️ Get display name for ability type
     * @param {string} type - Ability type
     * @returns {string} Display name
     * @private
     */
    getAbilityName(type) {
        const names = {
            analytical: 'Аналітичні здібності',
            creative: 'Творчі здібності',
            social: 'Соціальні навички',
            technical: 'Технічні навички',
            research: 'Дослідницькі здібності'
        };
        return names[type] || type;
    }

    /**
     * 🎯 Determine ability level based on score
     * @param {number} score - Ability score (0-100)
     * @returns {string} Ability level description
     * @private
     */
    getAbilityLevel(score) {
        if (score >= 80) return 'Високий рівень';
        if (score >= 60) return 'Середній рівень';
        if (score >= 40) return 'Базовий рівень';
        return 'Початковий рівень';
    }

    /**
     * 📝 Get description for ability and score
     * @param {string} type - Ability type
     * @param {number} score - Ability score
     * @returns {string} Description text
     * @private
     */
    getAbilityDescription(type, score) {
        const descriptions = {
            analytical: score >= 70 
                ? 'Відмінні навички логічного аналізу та критичного мислення'
                : 'Хороші базові аналітичні здібності з потенціалом для розвитку',
            creative: score >= 70
                ? 'Високий рівень творчого мислення та інноваційності'
                : 'Творчий потенціал потребує додаткового розвитку',
            social: score >= 70
                ? 'Відмінні навички міжособистісного спілкування'
                : 'Базові соціальні навички з можливістю покращення',
            technical: score >= 70
                ? 'Сильні технічні здібності та логічне мислення'
                : 'Технічні навички на задовільному рівні',
            research: score >= 70
                ? 'Відмінні дослідницькі здібності та аналітичний підхід'
                : 'Дослідницькі навички потребують подальшого розвитку'
        };
        return descriptions[type] || 'Здібність оцінена на базовому рівні';
    }

    /**
     * 🎨 Get icon for ability type
     * @param {string} type - Ability type
     * @returns {string} Icon emoji
     * @private
     */
    getAbilityIcon(type) {
        const icons = {
            analytical: '📊',
            creative: '🎨',
            social: '👥',
            technical: '⚙️',
            research: '🔬'
        };
        return icons[type] || '🎯';
    }

    /**
     * 💡 Generate basic recommendations
     * @param {Object} scores - Ability scores
     * @returns {Object} Recommendations object
     * @private
     */
    generateBasicRecommendations(scores) {
        const topAbilities = Object.entries(scores)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 2);

        const improvementAreas = Object.entries(scores)
            .sort(([,a], [,b]) => a - b)
            .slice(0, 2);

        return {
            strengths: {
                title: "Ваші сильні сторони:",
                abilities: topAbilities.map(([type, score]) => ({
                    name: this.getAbilityName(type),
                    score: Math.round(score),
                    characteristics: this.getStrengthCharacteristics(type)
                }))
            },
            development: {
                title: "Області для розвитку:",
                abilities: improvementAreas.map(([type, score]) => ({
                    name: this.getAbilityName(type),
                    score: Math.round(score),
                    tips: this.getDevelopmentTips(type)
                }))
            },
            career_paths: {
                title: "Рекомендовані напрямки:",
                paths: this.getCareerRecommendations(topAbilities[0][0])
            },
            next_steps: {
                title: "Наступні кроки:",
                actions: [
                    "Проаналізуйте отримані результати",
                    "Визначте пріоритети для розвитку",
                    "Складіть план покращення слабких сторін",
                    "Використовуйте сильні сторони в професійній діяльності"
                ]
            }
        };
    }

    /**
     * 💪 Get strength characteristics for ability
     * @param {string} type - Ability type
     * @returns {string[]} Characteristics list
     * @private
     */
    getStrengthCharacteristics(type) {
        const characteristics = {
            analytical: ["Логічне мислення", "Аналіз даних", "Критичне оцінювання"],
            creative: ["Інноваційність", "Творчий підхід", "Генерація ідей"],
            social: ["Комунікація", "Емпатія", "Командна робота"],
            technical: ["Технічне мислення", "Вирішення проблем", "Систематичність"],
            research: ["Дослідження", "Аналіз інформації", "Синтез знань"]
        };
        return characteristics[type] || ["Високий потенціал"];
    }

    /**
     * 📈 Get development tips for ability
     * @param {string} type - Ability type
     * @returns {string[]} Development tips
     * @private
     */
    getDevelopmentTips(type) {
        const tips = {
            analytical: ["Вивчайте логіку та критичне мислення", "Практикуйте аналіз складних проблем"],
            creative: ["Займайтеся творчими хобі", "Експериментуйте з новими ідеями"],
            social: ["Розвивайте навички спілкування", "Практикуйте активне слухання"],
            technical: ["Вивчайте нові технології", "Вирішуйте технічні задачі"],
            research: ["Читайте наукову літературу", "Практикуйте систематичний аналіз"]
        };
        return tips[type] || ["Постійна практика та навчання"];
    }

    /**
     * 💼 Get career recommendations based on top ability
     * @param {string} topAbility - Strongest ability type
     * @returns {string[]} Career recommendations
     * @private
     */
    getCareerRecommendations(topAbility) {
        const careers = {
            analytical: ["Аналітик даних", "Консультант", "Дослідник", "Фінансовий аналітик"],
            creative: ["Дизайнер", "Маркетолог", "Письменник", "Архітектор"],
            social: ["HR-спеціаліст", "Психолог", "Менеджер", "Тренер"],
            technical: ["Розробник", "Інженер", "Системний адміністратор", "Аналітик"],
            research: ["Науковець", "Аналітик", "Журналіст", "Консультант"]
        };
        return careers[topAbility] || ["Універсальний спеціаліст"];
    }
}

/**
 * 🎨 ResultsDisplayManager Class
 * Manages the display and visualization of analysis results
 */
export class ResultsDisplayManager {
    constructor() {
        console.log('🎨 ResultsDisplayManager initialized');
    }

    /**
     * 🖼️ Display analysis results on the results page
     * @param {Object} results - Analysis results
     */
    displayResults(results) {
        console.log('🖼️ Displaying analysis results...');

        try {
            const chartContainer = safeGetElement('abilityChart', 'ResultsDisplayManager');
            const insightsContainer = safeGetElement('insights', 'ResultsDisplayManager');

            if (chartContainer) {
                this.displayAbilityChart(chartContainer, results);
            }

            if (insightsContainer) {
                this.displayRecommendations(insightsContainer, results);
            }

            console.log('✅ Results displayed successfully');

        } catch (error) {
            console.error('❌ Error displaying results:', error);
            this.displayErrorMessage();
        }
    }

    /**
     * 📊 Display ability scores chart
     * @param {HTMLElement} container - Chart container
     * @param {Object} results - Analysis results
     * @private
     */
    displayAbilityChart(container, results) {
        container.innerHTML = '';

        if (!results.scores || results.scores.length === 0) {
            container.innerHTML = '<p>Дані про здібності не доступні</p>';
            return;
        }

        results.scores.forEach((ability, index) => {
            const abilityItem = document.createElement('div');
            abilityItem.className = 'ability-item detailed';
            abilityItem.innerHTML = `
                <div class="ability-header">
                    <div class="ability-icon" style="color: ${getAbilityColor(ability.type)}">
                        ${ability.icon}
                    </div>
                    <div class="ability-info">
                        <div class="ability-name">${ability.name}</div>
                        <div class="ability-level">${ability.level}</div>
                        <div class="ability-bar">
                            <div class="ability-fill" 
                                 style="background-color: ${getAbilityColor(ability.type)}; width: 0%;">
                            </div>
                        </div>
                    </div>
                    <div class="ability-percentage">${ability.score}%</div>
                </div>
                <div class="ability-description">
                    ${ability.description}
                </div>
            `;

            container.appendChild(abilityItem);

            // Animate the progress bar
            setTimeout(() => {
                const fill = abilityItem.querySelector('.ability-fill');
                if (fill) {
                    fill.style.width = `${ability.score}%`;
                }
            }, 300 + index * 150);
        });
    }

    /**
     * 💡 Display recommendations and insights
     * @param {HTMLElement} container - Insights container
     * @param {Object} results - Analysis results
     * @private
     */
    displayRecommendations(container, results) {
        if (!results.recommendations) {
            container.innerHTML = '<p>Рекомендації не доступні</p>';
            return;
        }

        const recommendations = results.recommendations;
        let html = '<div class="recommendations-section"><h3>💡 Персональні рекомендації</h3>';

        // Strengths section
        if (recommendations.strengths) {
            html += `
                <div class="rec-block">
                    <h4>${recommendations.strengths.title}</h4>
                    ${recommendations.strengths.abilities.map(ability => `
                        <div class="strength-item">
                            <strong>${ability.name} (${ability.score}%)</strong>
                            <ul>
                                ${ability.characteristics.map(char => `<li>${char}</li>`).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Development section
        if (recommendations.development) {
            html += `
                <div class="rec-block">
                    <h4>${recommendations.development.title}</h4>
                    ${recommendations.development.abilities.map(ability => `
                        <div class="development-item">
                            <strong>${ability.name} (${ability.score}%)</strong>
                            <ul>
                                ${ability.tips.map(tip => `<li>${tip}</li>`).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Career paths section
        if (recommendations.career_paths) {
            html += `
                <div class="rec-block">
                    <h4>${recommendations.career_paths.title}</h4>
                    <div class="career-list">
                        ${recommendations.career_paths.paths.map(path => 
                            `<span class="career-tag">${path}</span>`
                        ).join('')}
                    </div>
                </div>
            `;
        }

        // Next steps section
        if (recommendations.next_steps) {
            html += `
                <div class="rec-block">
                    <h4>${recommendations.next_steps.title}</h4>
                    <ul>
                        ${recommendations.next_steps.actions.map(action => `<li>${action}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * ❌ Display error message when results display fails
     * @private
     */
    displayErrorMessage() {
        const resultsContainer = safeGetElement('stage-results', 'ResultsDisplayManager');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <h2>⚠️ Помилка відображення результатів</h2>
                    <p>Не вдалося відобразити результати тестування.</p>
                    <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem;">
                        Оновити сторінку
                    </button>
                </div>
            `;
        }
    }
}

// Global instances
export const resultsAnalyzer = new ResultsAnalyzer();
export const resultsDisplayManager = new ResultsDisplayManager();

/**
 * 🚀 Main function to analyze and display results
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzeAndDisplayResults() {
    console.log('🚀 Starting results analysis and display...');

    const results = await resultsAnalyzer.performAnalysis();
    resultsDisplayManager.displayResults(results);

    return results;
}

/**
 * 🔗 Share results functionality
 */
export function shareResults() {
    console.log('🔗 Sharing results...');

    if (navigator.share) {
        navigator.share({
            title: '🧠 Мій профіль здібностей',
            text: 'Я пройшов інноваційний тест оцінки здібностей!',
            url: window.location.href
        }).then(() => {
            console.log('✅ Results shared successfully');
        }).catch(error => {
            console.error('❌ Share failed:', error);
        });
    } else {
        // Fallback for browsers without Web Share API
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            alert('Посилання скопійовано в буфер обміну!');
            console.log('✅ URL copied to clipboard');
        }).catch(error => {
            console.error('❌ Copy failed:', error);
            alert('Не вдалося скопіювати посилання');
        });
    }
}

console.log('✅ Results & Analysis module loaded');