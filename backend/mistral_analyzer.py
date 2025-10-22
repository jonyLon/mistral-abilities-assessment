#!/usr/bin/env python3
"""
Mistral Nemo Analyzer для оцінки здібностей через аналіз відповідей користувача
Використовує локальну модель Mistral Nemo через Ollama

Спрощена версія - тільки аналіз відповідей, без генерації питань
"""

import asyncio
import json
import logging
from typing import Dict, List, Any
import aiohttp

# Настройка детального логирування
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


class MistralAnalyzer:
    """Аналізатор на основі локальної Mistral Nemo моделі"""

    def __init__(self,
                 ollama_url: str = None,
                 model_name: str = "mistral-nemo:latest"):
        # Використовуємо змінну оточення або default
        import os
        self.ollama_url = ollama_url or os.getenv('OLLAMA_URL', 'http://localhost:11434')
        self.model_name = model_name

    async def check_status(self) -> str:
        """Перевірити доступність Ollama та моделі Mistral Nemo"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.ollama_url}/api/tags") as response:
                    if response.status == 200:
                        models = await response.json()
                        available_models = [m["name"]
                                            for m in models.get("models", [])]

                        if self.model_name in available_models:
                            return "ready"
                        else:
                            return f"model_not_found: {available_models}"
                    else:
                        return "ollama_not_available"
        except Exception as e:
            return f"error: {str(e)}"


    async def analyze_responses(self, responses: Dict[str, Any]) -> Dict[str, Any]:
        """
        Проаналізувати відповіді користувача
        Повертає оцінки здібностей (0-100) та інсайти
        
        Args:
            responses: Dict з відповідями користувача {"stage1": {"choice": ..., "category": ...}, ...}
        
        Returns:
            Dict з ability_scores, confidence, та insights
        """

        # Підготувати промпт для Mistral Nemo
        analysis_prompt = self._build_analysis_prompt(responses)

        try:
            # Викликати Mistral Nemo через Ollama API
            result = await self._call_ollama(analysis_prompt)

            # Розібрати та валідувати результат
            return self._parse_analysis_result(result)

        except Exception as e:
            logger.error(f"Mistral Nemo analysis failed: {e}")
            if hasattr(e, '__traceback__'):
                import traceback
                logger.debug(
                    f"Analysis error traceback: {traceback.format_exc()}")
            # Повертаємо fallback результат
            return self._generate_fallback_analysis()

    def _build_analysis_prompt(self, responses: Dict[str, Any]) -> str:
        """Створити промпт для аналізу здібностей"""

        prompt = f"""ТІЛЬКИ JSON! Проаналізуй відповіді користувача та поверни лише JSON без пояснень.

Відповіді користувача на 10 етапів тесту:
{json.dumps(responses, indent=1, ensure_ascii=False)}

На основі цих відповідей оціни здібності користувача за 5 категоріями (0-100):
- analytical: аналітичне мислення, логіка, розв'язання проблем
- creative: творчі здібності, креативність, інноваційність
- social: соціальні навички, емпатія, комунікація
- technical: технічні навички, практичність, реалізація
- research: дослідницький потенціал, експерименти, відкриття

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
    "Творчий підхід до вирішення задач",
    "Рекомендації для розвитку"
  ]
}}

ТІЛЬКИ JSON - БЕЗ ТЕКСТУ!"""

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
                # Збільшено для Mistral Nemo
                timeout=aiohttp.ClientTimeout(total=120)
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
            ability_keys = ['analytical', 'creative',
                            'social', 'technical', 'research']

            if not all(key in result for key in required_keys):
                raise ValueError("Missing required keys in result")

            if not all(key in result['ability_scores'] for key in ability_keys):
                raise ValueError("Missing ability scores")

            # Нормалізувати оцінки до діапазону 0-100
            for ability in ability_keys:
                score = result['ability_scores'][ability]
                result['ability_scores'][ability] = max(
                    0.0, min(100.0, float(score)))

            # Валідувати довіру (0-1)
            result['confidence'] = max(
                0.0, min(1.0, float(result['confidence'])))

            return result

        except Exception as e:
            logger.error(f"Failed to parse Mistral Nemo response: {e}")
            logger.debug(f"Raw response: {mistral_response[:500]}...")
            raise


    def _generate_fallback_analysis(self) -> Dict[str, Any]:
        """Створити fallback аналіз якщо Mistral недоступний"""

        # Базові середні оцінки
        base_scores = {
            "analytical": 50.0,
            "creative": 50.0,
            "social": 50.0,
            "technical": 50.0,
            "research": 50.0
        }

        return {
            "ability_scores": base_scores,
            "confidence": 0.3,  # Дуже низька довіра до fallback результату
            "insights": [
                "⚠️ Mistral Nemo недоступний - базовий аналіз",
                "Результати можуть бути неточними",
                "Перевірте підключення до Ollama та перезапустіть тест"
            ]
        }


# Утиліти для тестування


async def test_mistral_connection():
    """Тестова функція для перевірки підключення до Mistral Nemo"""
    analyzer = MistralAnalyzer()
    status = await analyzer.check_status()
    print(f"Mistral Nemo Status: {status}")

    if status == "ready":
        # Тестовий аналіз
        test_responses = {
            "stage1": {"choice": 0, "category": "analytical", "weight": 0.9},
            "stage2": {"choice": 2, "category": "creative", "weight": 0.7},
            "stage3": {"choice": 1, "category": "social", "weight": 0.8}
        }

        result = await analyzer.analyze_responses(test_responses)
        print(
            f"Test Analysis Result: {json.dumps(result, indent=2, ensure_ascii=False)}")
    else:
        print("❌ Mistral Nemo недоступний. Перевірте Ollama.")

if __name__ == "__main__":
    asyncio.run(test_mistral_connection())
