#!/usr/bin/env python3
"""
Mistral Nemo Analyzer для оцінки здібностей через аналіз відповідей та поведінки
Використовує локальну модель Mistral Nemo через Ollama
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Any, Optional
import aiohttp
from datetime import datetime

# Настройка детального логирования
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class MistralAnalyzer:
    """Аналізатор на основі локальної Mistral Nemo моделі"""
    
    def __init__(self, 
                 ollama_url: str = "http://localhost:11434",
                 model_name: str = "mistral-nemo:latest"):
        self.ollama_url = ollama_url
        self.model_name = model_name
        self.generated_questions = {}  # Кеш генерованих питань по етапам
        
    async def check_status(self) -> str:
        """Перевірити доступність Ollama та моделі Mistral Nemo"""
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
                
                # Викликати Mistral Nemo через Ollama API
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
                if hasattr(e, '__traceback__'):
                    import traceback
                    logger.debug(f"Full traceback: {traceback.format_exc()}")
        
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
        
        # Підготувати промпт для Mistral Nemo
        analysis_prompt = self._build_analysis_prompt(
            responses, creative_outputs, behavioral_data
        )
        
        try:
            # Викликати Mistral Nemo через Ollama API
            result = await self._call_ollama(analysis_prompt)
            
            # Розібрати та валідувати результат
            return self._parse_analysis_result(result)
            
        except Exception as e:
            logger.error(f"Mistral Nemo analysis failed: {e}")
            if hasattr(e, '__traceback__'):
                import traceback
                logger.debug(f"Analysis error traceback: {traceback.format_exc()}")
            # Повертаємо fallback результат
            return self._generate_fallback_analysis(behavioral_data)
    
    def _build_analysis_prompt(self, 
                              responses: Dict[str, Any],
                              creative_outputs: List[str],
                              behavioral_data: Dict[str, float]) -> str:
        """Створити промпт для аналізу здібностей"""
        
        prompt = f"""ТІЛЬКИ JSON! Проаналізуй та поверни лише JSON без пояснень.

Дані користувача:
- Відповіді: {json.dumps(responses, indent=1, ensure_ascii=False)}
- Творчість: {json.dumps(creative_outputs, indent=1, ensure_ascii=False)}
- Поведінка: реакція {behavioral_data.get('avg_reaction_time', 0.5)}с, послідовність {behavioral_data.get('decision_consistency', 0.5)}

ВЕРНИ ТІЛЬКИ ЦЕЙ JSON:
{{
  "ability_scores": {{
    "analytical": 75,
    "creative": 68, 
    "social": 45,
    "technical": 82,
    "research": 71
  }},
  "confidence": 0.85,
  "insights": [
    "Користувач показує сильні аналітичні навички",
    "Творчий підхід до вирішення задач"
  ]
}}

ТЛЬКИ JSON - БЕЗ ТЕКСТУ!"""
        
        return prompt
    
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
        previous_questions = previous_questions or []
        
        # Формуємо інформацію про попередні питання
        previous_info = ""
        if previous_questions:
            previous_info = f"""
УВАГА: Уже створено {len(previous_questions)} питань:
{chr(10).join([f"- {q[:80]}..." for q in previous_questions[-2:]])}
СТВОРИ ПОВНІСТЮ ІНШЕ питання!
"""

        prompt = f"""Створи нове питання українською для оцінки: {stage_desc}

{previous_info}

ВИМОГИ:
1. Практична ситуація з роботи/життя
2. 4 варіанти відповіді (різні підходи)
3. Коротко і зрозуміло
4. Тільки українська мова

ФОРМАТ JSON:
{{
  "question": "Практичне питання українською",
  "choices": [
    {{"text": "Варіант 1", "category": "{stage_name}", "weight": 0.9}},
    {{"text": "Варіант 2", "category": "alternative1", "weight": 0.7}},
    {{"text": "Варіант 3", "category": "alternative2", "weight": 0.5}},
    {{"text": "Варіант 4", "category": "alternative3", "weight": 0.3}}
  ],
  "type": "multiple_choice"
}}"""
        
        return prompt
    
    async def _call_ollama(self, prompt: str) -> str:
        """Викликати Ollama API для генерації відповіді"""
        
        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.7,  # Знижено для стабільності
                "top_p": 0.9,
                "top_k": 40,
                "repeat_penalty": 1.1,  # М'якше значення
                "num_predict": 512,  # Зменшено для швидкості
                "stop": ["\n\n\n", "###", "---", "КІНЕЦЬ"]  # Стоп секвенції
            }
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.ollama_url}/api/generate",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=120)  # Збільшено для Mistral Nemo
            ) as response:
                
                if response.status != 200:
                    raise Exception(f"Ollama API error: {response.status}")
                
                result = await response.json()
                return result.get("response", "")
    
    def _parse_analysis_result(self, mistral_response: str) -> Dict[str, Any]:
        """Розібрати відповідь Mistral Nemo та валідувати"""
        
        try:
            # Спробувати знайти JSON в відповіді
            start_idx = mistral_response.find('{')
            end_idx = mistral_response.rfind('}') + 1
            
            if start_idx == -1 or end_idx == 0:
                raise ValueError("No JSON found in response")
            
            json_str = mistral_response[start_idx:end_idx]
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
            logger.error(f"Failed to parse Mistral Nemo response: {e}")
            logger.debug(f"Raw response: {mistral_response[:500]}...")
            raise
    
    def _parse_question_result(self, mistral_response: str, stage_name: str) -> Dict[str, Any]:
        """Розібрати відповідь Mistral Nemo для питання"""
        
        try:
            # Знайти JSON в відповіді
            start_idx = mistral_response.find('{')
            end_idx = mistral_response.rfind('}') + 1
            
            if start_idx == -1 or end_idx == 0:
                raise ValueError("No JSON found in response")
            
            json_str = mistral_response[start_idx:end_idx]
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
    
    def _is_duplicate_question(self, question_data: Dict[str, Any], previous_questions: List[str]) -> bool:
        """Перевірити чи питання є дублікатом"""
        if not previous_questions:
            return False
        
        current_question = question_data.get('question', '').lower()
        
        for prev_q in previous_questions:
            # Простий алгоритм - перевірити перші 50 символів
            if len(current_question) > 30 and len(prev_q) > 30:
                if current_question[:50] in prev_q.lower()[:50]:
                    return True
        
        return False
    
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
                "Аналіз базується лише на поведінкових даних",
                "Результати можуть бути менш точними без AI інтерпретації"
            ]
        }
    
    def _generate_fallback_question(self, stage_name: str) -> Dict[str, Any]:
        """Створити fallback питання"""
        
        fallback_questions = {
            "analytical": {
                "question": "Ваша команда стикається з технічною проблемою перед важливим дедлайном. Як ви поступите?",
                "choices": [
                    {"text": "Детально проаналізую проблему та знайду оптимальне рішення", "category": "analytical", "weight": 0.9},
                    {"text": "Організую мозковий штурм для пошуку креативних рішень", "category": "creative", "weight": 0.7},
                    {"text": "Звернуся до колег за консультацією", "category": "social", "weight": 0.6},
                    {"text": "Застосую швидке тимчасове рішення", "category": "technical", "weight": 0.8}
                ]
            },
            "creative": {
                "question": "Клієнт просить презентувати складний продукт простими словами. Ваш підхід?",
                "choices": [
                    {"text": "Використаю метафори та візуальні образи", "category": "creative", "weight": 0.9},
                    {"text": "Створю логічну структуру пояснення", "category": "analytical", "weight": 0.7},
                    {"text": "Адаптую стиль під аудиторію", "category": "social", "weight": 0.8},
                    {"text": "Покажу практичні приклади", "category": "technical", "weight": 0.6}
                ]
            },
            "social": {
                "question": "Під час зустрічі виникає конфлікт між колегами. Ваша реакція?",
                "choices": [
                    {"text": "Допоможу знайти компроміс та заспокою ситуацію", "category": "social", "weight": 0.9},
                    {"text": "Проаналізую причини конфлікту", "category": "analytical", "weight": 0.7},
                    {"text": "Запропоную творчий вихід із ситуації", "category": "creative", "weight": 0.6},
                    {"text": "Застосую стандартні процедури", "category": "technical", "weight": 0.5}
                ]
            }
        }
        
        question_data = fallback_questions.get(stage_name, fallback_questions["analytical"])
        question_data["type"] = "multiple_choice"
        question_data["stage"] = stage_name
        question_data["generated_at"] = datetime.now().isoformat()
        
        return question_data

# Утиліти для тестування
async def test_mistral_connection():
    """Тестова функція для перевірки підключення до Mistral Nemo"""
    analyzer = MistralAnalyzer()
    status = await analyzer.check_status()
    print(f"Mistral Nemo Status: {status}")
    
    if status == "ready":
        # Тестова генерація питання
        test_question = await analyzer.generate_question("analytical", {}, {})
        print(f"Test Question Generation: {json.dumps(test_question, indent=2, ensure_ascii=False)}")
        
        # Тестовий аналіз
        test_responses = {"q1": "analytical approach", "q2": "creative solution"}
        test_creative = ["innovative game idea"]
        test_behavioral = {"logic_score": 0.8, "creativity_score": 0.7}
        
        result = await analyzer.analyze_responses(
            test_responses, test_creative, test_behavioral
        )
        print(f"Test Analysis Result: {json.dumps(result, indent=2, ensure_ascii=False)}")

if __name__ == "__main__":
    asyncio.run(test_mistral_connection())