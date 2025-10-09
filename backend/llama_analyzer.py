#!/usr/bin/env python3
"""
LLaMA Analyzer для оцінки здібностей через аналіз відповідей та поведінки
Використовує локальну модель через Ollama
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Any, Optional
import aiohttp
from datetime import datetime

logger = logging.getLogger(__name__)

class LlamaAnalyzer:
    """Аналізатор на основі локальної LLaMA моделі"""
    
    def __init__(self, 
                 ollama_url: str = "http://localhost:11434",
                 model_name: str = "mistral-nemo:latest"):
        self.ollama_url = ollama_url
        self.model_name = model_name
        self.generated_questions = {}  # Кеш генерованих питань по етапам
        
    async def check_status(self) -> str:
        """Перевірити доступність Ollama та моделі"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.ollama_url}/api/tags") as response:
                    if response.status == 200:
                        models = await response.json()
                        available_models = [m["name"] for m in models.get("models", [])]
                        
                        if self.model_name in available_models:
                            return "ready"
                        else:
                            return f"model_not_found: {available_models}"
                    else:
                        return "ollama_not_available"
        except Exception as e:
            return f"error: {str(e)}"
    
    async def generate_question(self,
                               stage_name: str,
                               user_context: Dict[str, Any] = None,
                               session_history: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Генерувати питання для конкретного етапу тесту
        """
        user_context = user_context or {}
        session_history = session_history or {}
        
        # Перевірити кеш питань для цього етапу
        if stage_name not in self.generated_questions:
            self.generated_questions[stage_name] = []
        
        # Макс 3 спроби генерації унікального питання
        for attempt in range(3):
            try:
                # Підготувати промпт з інформацією про попередні питання
                previous_questions = self.generated_questions[stage_name]
                question_prompt = self._build_question_generation_prompt(
                    stage_name, user_context, session_history, previous_questions, attempt
                )
                
                # Викликати LLaMA через Ollama API
                result = await self._call_ollama(question_prompt)
                
                # Розібрати та валідувати результат
                question_data = self._parse_question_result(result, stage_name)
                
                # Перевірити унікальність
                if not self._is_duplicate_question(question_data, previous_questions):
                    # Додати в кеш
                    self.generated_questions[stage_name].append(question_data['question'])
                    logger.info(f"✅ Генеровано унікальне питання для {stage_name} (спроба {attempt + 1})")
                    return question_data
                else:
                    logger.warning(f"⚠️ Повтор питання для {stage_name}, спроба {attempt + 1}")
                
            except Exception as e:
                logger.error(f"Question generation attempt {attempt + 1} failed: {e}")
        
        # Якщо всі спроби не вдалися, повернути fallback
        logger.warning(f"⚠️ Всі спроби генерації не вдалися, використовуємо fallback")
        return self._generate_fallback_question(stage_name)

    async def analyze_responses(self, 
                              responses: Dict[str, Any],
                              creative_outputs: List[str],
                              behavioral_data: Dict[str, float]) -> Dict[str, Any]:
        """
        Проаналізувати відповіді користувача та поведінкові дані
        Повертає оцінки здібностей та інсайти
        """
        
        # Підготувати промпт для LLaMA
        analysis_prompt = self._build_analysis_prompt(
            responses, creative_outputs, behavioral_data
        )
        
        try:
            # Викликати LLaMA через Ollama API
            result = await self._call_ollama(analysis_prompt)
            
            # Розібрати та валідувати результат
            return self._parse_analysis_result(result)
            
        except Exception as e:
            logger.error(f"LLaMA analysis failed: {e}")
            # Повертаємо fallback результат
            return self._generate_fallback_analysis(behavioral_data)
    
    def _build_analysis_prompt(self, 
                              responses: Dict[str, Any],
                              creative_outputs: List[str],
                              behavioral_data: Dict[str, float]) -> str:
        """Створити промпт для аналізу здібностей"""
        
        prompt = f"""Пиши ОБОВ’ЯЗКОВО ЛИШЕ УКРАЇНСЬКОЮ МОВОЮ! Ні слова англійською!

Ти експерт-психолог та аналітик здібностей. Проаналізуй наступні дані з інтерактивного тестування та визначи здібності людини в 5 категоріях.

ОБОВ’ЯЗКОВО: Відповідай ЛИШЕ українською мовою. Англійська заборонена!

=== ВІДПОВІДІ КОРИСТУВАЧА ===
{json.dumps(responses, indent=2, ensure_ascii=False)}

=== ТВОРЧІ РЕЗУЛЬТАТИ ===
{json.dumps(creative_outputs, indent=2, ensure_ascii=False)}

=== ПОВЕДІНКОВІ МЕТРИКИ ===
Час реакції: {behavioral_data.get('avg_reaction_time', 0.5)} секунд
Послідовність рішень: {behavioral_data.get('decision_consistency', 0.5)}
Глибина дослідження: {behavioral_data.get('exploration_score', 0.5)}
Відновлення після помилок: {behavioral_data.get('error_recovery', 0.5)}
Наполегливість: {behavioral_data.get('persistence', 0.5)}

=== ЗАВДАННЯ ===
Оціни здібності людини в цих 5 вимірах (0-100%):
1. АНАЛІТИЧНІ - Логіка, системне мислення, розв'язання проблем
2. ТВОРЧІ - Інновації, художнє мислення, оригінальні ідеї
3. СОЦІАЛЬНІ - Емпатія, комунікація, міжособистісні навички
4. ТЕХНІЧНІ - Практичні навички, механічне мислення, впровадження
5. ДОСЛІДНИЦЬКІ - Цікавість, експерименти, орієнтація на відкриття

Врахуй:
- Паттерни відповідей та стиль мислення
- Оригінальність та глибину творчих результатів
- Послідовність поведінкових даних
- Управління часом та паттерни прийняття рішень

Поверни ТІЛЬКИ валідний JSON українською мовою в цьому форматі:
{{
  "ability_scores": {{
    "analytical": 75.5,
    "creative": 68.2, 
    "social": 45.0,
    "technical": 82.1,
    "research": 71.8
  }},
  "confidence": 0.85,
  "insights": [
    "Має сильні аналітичні здібності та логічне мислення",
    "Проявляє творчість у пошуку нових рішень",
    "Потребує розвитку комунікативних навичок"
  ]
}}"""
        
        return prompt
    
    async def _call_ollama(self, prompt: str) -> str:
        """Викликати Ollama API для генерації відповіді"""
        
        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.7,  # Підвищено для різноманітності
                "top_p": 0.95,
                "top_k": 60,
                "repeat_penalty": 1.15,  # Запобігає повторенням
                "seed": int(time.time() * 1000) % 2147483647,  # Випадковий seed
                "num_predict": 512,  # Обмеження довжини відповіді
                "stop": ["\n\n\n", "###", "---"]  # Стоп секвенції
            }
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.ollama_url}/api/generate",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=30)  # Скорочено для швидшого відгуку
            ) as response:
                
                if response.status != 200:
                    raise Exception(f"Ollama API error: {response.status}")
                
                result = await response.json()
                return result.get("response", "")
    
    def _parse_analysis_result(self, llama_response: str) -> Dict[str, Any]:
        """Розібрати відповідь LLaMA та валідувати"""
        
        try:
            # Спробувати знайти JSON в відповіді
            start_idx = llama_response.find('{')
            end_idx = llama_response.rfind('}') + 1
            
            if start_idx == -1 or end_idx == 0:
                raise ValueError("No JSON found in response")
            
            json_str = llama_response[start_idx:end_idx]
            result = json.loads(json_str)
            
            # Валідувати структуру
            required_keys = ['ability_scores', 'confidence', 'insights']
            ability_keys = ['analytical', 'creative', 'social', 'technical', 'research']
            
            if not all(key in result for key in required_keys):
                raise ValueError("Missing required keys in result")
            
            if not all(key in result['ability_scores'] for key in ability_keys):
                raise ValueError("Missing ability scores")
            
            # Нормалізувати оцінки до діапазону 0-100
            for ability in ability_keys:
                score = result['ability_scores'][ability]
                result['ability_scores'][ability] = max(0.0, min(100.0, float(score)))
            
            # Валідувати довіру (0-1)
            result['confidence'] = max(0.0, min(1.0, float(result['confidence'])))
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to parse LLaMA response: {e}")
            logger.debug(f"Raw response: {llama_response[:500]}...")
            raise
    
    def _generate_fallback_analysis(self, behavioral_data: Dict[str, float]) -> Dict[str, Any]:
        """Створити fallback аналіз на основі поведінкових даних"""
        
        # Базові оцінки з поведінкових метрик
        base_scores = {
            "analytical": behavioral_data.get("logic_score", 0.5) * 100,
            "creative": behavioral_data.get("creativity_score", 0.5) * 100,
            "social": behavioral_data.get("social_score", 0.5) * 100,
            "technical": behavioral_data.get("technical_score", 0.5) * 100,
            "research": behavioral_data.get("exploration_score", 0.5) * 100
        }
        
        return {
            "ability_scores": base_scores,
            "confidence": 0.6,  # Нижча довіра до fallback результату
            "insights": [
                "Analysis based on behavioral data only",
                "Results may be less accurate without AI interpretation"
            ]
        }
    
    def _build_question_generation_prompt(self, 
                                          stage_name: str,
                                          user_context: Dict[str, Any],
                                          session_history: Dict[str, Any],
                                          previous_questions: List[str] = None,
                                          attempt: int = 0) -> str:
        """Створити промпт для генерації питань"""
        
        stage_descriptions = {
            "analytical": "аналітичне мислення, логіка, розв'язання проблем",
            "creative": "творчі здібності, креативність, інноваційне мислення",
            "social": "соціальні навички, емпатія, комунікація",
            "technical": "технічні навички, практичне мислення, реалізація",
            "research": "дослідницький потенціал, експерименти, відкриття",
            "memory": "пам'ять, увага, концентрація",
            "problem": "розв'язання проблем, стратегічне мислення",
            "collaboration": "командна робота, лідерство, співпраця"
        }
        
        stage_desc = stage_descriptions.get(stage_name, "загальні здібності")
        
        # Додаємо унікальний ідентифікатор для запобігання повторенням
        timestamp = int(time.time())
        previous_questions = previous_questions or []
        
        # Формуємо інформацію про попередні питання
        previous_info = ""
        if previous_questions:
            previous_info = f"""
=== НЕ ПОВТОРЮЙ ПОПЕРЕДНІ ПИТАННЯ ===
ВЖЕ ГЕНЕРОВАНО {len(previous_questions)} питань:
{chr(10).join([f"- {q[:100]}..." for q in previous_questions[-3:]])}

ОБОВ'ЯЗКОВО: Створи ПОВНІСТЮ НОВОМУ, ІНШОМУ питання!
="""
        
        prompt = f"""Пиши ОБОВ'ЯЗКОВО ЛИШЕ УКРАЇНСЬКОЮ МОВОЮ! Ні слова англійською!

Ти експерт з психології та освіти. Створи НОВЕ, УНІКАЛЬНЕ питання для оцінки {stage_desc}.
ОБОВ'ЯЗКОВО: НЕ ПОВТОРЮЙ питання з попередніх сесій!

=== УНІКАЛЬНИЙ КОНТЕКСТ #{timestamp} ===
Створи питання ПО НОВОМУ сценарію о параметрі {stage_name}.
Контекст: {json.dumps(user_context, indent=1, ensure_ascii=False)}
Попередні питання: {len(session_history)} вже створено

ОБОВ'ЯЗКОВО: Відповідай ЛИШЕ українською! Ні слова англійською!

=== ОБОВ'ЯЗКОВІ ВИМОГИ ===
1. НОВИЙ практичний сценарій з реального життя
2. Читири РІЗНІ підходи вирішення ситуації
3. Оцініть {stage_desc} через вибір стратегії
4. Українська мова і культура
5. НЕ повторювати стандартні приклади!
6. Коротко, ясно, цікаво

=== ФОРМАТ ВІДПОВІДІ ===
Поверни ТІЛЬКИ валідний JSON українською мовою:
{{
  "question": "Детальний сценарій-питання українською",
  "choices": [
    {{
      "text": "Варіант 1 українською",
      "category": "{stage_name}",
      "weight": 0.8
    }},
    {{
      "text": "Варіант 2 українською",
      "category": "alternative1",
      "weight": 0.6
    }},
    {{
      "text": "Варіант 3 українською",
      "category": "alternative2",
      "weight": 0.4
    }},
    {{
      "text": "Варіант 4 українською",
      "category": "alternative3",
      "weight": 0.2
    }}
  ],
  "type": "multiple_choice"
}}"""
        
        return prompt
    
    def _parse_question_result(self, llama_response: str, stage_name: str) -> Dict[str, Any]:
        """Розібрати відповідь LLaMA для питання"""
        
        try:
            # Знайти JSON в відповіді
            start_idx = llama_response.find('{')
            end_idx = llama_response.rfind('}') + 1
            
            if start_idx == -1 or end_idx == 0:
                raise ValueError("No JSON found in response")
            
            json_str = llama_response[start_idx:end_idx]
            result = json.loads(json_str)
            
            # Валідувати структуру
            if 'question' not in result or 'choices' not in result:
                raise ValueError("Missing required fields")
            
            if len(result['choices']) < 2:
                raise ValueError("Need at least 2 choices")
            
            # Додати метадані
            result['stage'] = stage_name
            result['generated_at'] = datetime.now().isoformat()
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to parse question result: {e}")
            raise
    
    def _generate_fallback_question(self, stage_name: str) -> Dict[str, Any]:
        """Створити fallback питання"""
        
        fallback_questions = {
            "analytical": {
                "question": "Ви помітили, що продуктивність вашої команди знизилася. Як ви підійдете до вирішення цієї проблеми?",
                "choices": [
                    {"text": "Проведу детальний аналіз метрик та знайду першопричину", "category": "analytical", "weight": 0.9},
                    {"text": "Організую творчу сесію для пошуку нових підходів", "category": "creative", "weight": 0.7},
                    {"text": "Поговорю з кожним учасником індивідуально", "category": "social", "weight": 0.6},
                    {"text": "Впроваджу нові інструменти та процеси", "category": "technical", "weight": 0.8}
                ]
            },
            "creative": {
                "question": "Вам потрібно презентувати складну технічну інформацію нетехнічній аудиторії. Ваш підхід?",
                "choices": [
                    {"text": "Використаю метафори, історії та візуальні образи", "category": "creative", "weight": 0.9},
                    {"text": "Створю чіткі діаграми та покрокову структуру", "category": "analytical", "weight": 0.7},
                    {"text": "Зосереджуся на практичних прикладах", "category": "technical", "weight": 0.6},
                    {"text": "Адаптую стиль під кожного слухача", "category": "social", "weight": 0.8}
                ]
            },
            "social": {
                "question": "Під час зустрічі колега висловлює незгоду з вашою ідеєю досить емоційно. Ваша реакція?",
                "choices": [
                    {"text": "Спокійно вислухаю його точку зору та знайду спільні моменти", "category": "social", "weight": 0.9},
                    {"text": "Логічно обґрунтую переваги своєї пропозиції", "category": "analytical", "weight": 0.7},
                    {"text": "Запропоную компромісне рішення", "category": "creative", "weight": 0.6},
                    {"text": "Покажу конкретні приклади реалізації", "category": "technical", "weight": 0.5}
                ]
            }
        }
        
        question_data = fallback_questions.get(stage_name, fallback_questions["analytical"])
        question_data["type"] = "multiple_choice"
        question_data["stage"] = stage_name
        question_data["generated_at"] = datetime.now().isoformat()
        
        return question_data

# Утиліти для тестування
async def test_llama_connection():
    """Тестова функція для перевірки підключення до LLaMA"""
    analyzer = LlamaAnalyzer()
    status = await analyzer.check_status()
    print(f"LLaMA Status: {status}")
    
    if status == "ready":
        # Тестовий аналіз
        test_responses = {"q1": "analytical approach", "q2": "creative solution"}
        test_creative = ["innovative game idea"]
        test_behavioral = {"logic_score": 0.8, "creativity_score": 0.7}
        
        result = await analyzer.analyze_responses(
            test_responses, test_creative, test_behavioral
        )
        print(f"Test Analysis Result: {json.dumps(result, indent=2)}")

if __name__ == "__main__":
    asyncio.run(test_llama_connection())