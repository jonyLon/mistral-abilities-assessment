#!/usr/bin/env python3
"""
Швидкий тест підтримки української мови в LLaMA
"""

import asyncio
from llama_analyzer import LlamaAnalyzer

async def test_ukrainian_support():
    print("🇺🇦 Тестуємо підтримку української мови в LLaMA...")
    
    analyzer = LlamaAnalyzer()
    
    # Перевіряємо статус
    status = await analyzer.check_status()
    print(f"Статус LLaMA: {status}")
    
    if status != "ready":
        print("❌ LLaMA не готова до роботи")
        return
    
    # Тестові дані українською
    test_responses = {
        "creative_text": "Я хочу створити додаток, який допоможе людям вивчати мови через ігри та інтерактивні завдання",
        "logic_choice": "Я завжди аналізую проблему системно перед прийняттям рішень",
        "social_choice": "Вважаю за краще вислухати всі сторони перед вирішенням конфлікту"
    }
    
    test_creative = ["Інноваційна платформа для навчання"]
    
    test_behavioral = {
        "logic_score": 0.8,
        "creativity_score": 0.75,
        "social_score": 0.6,
        "technical_score": 0.7,
        "exploration_score": 0.85
    }
    
    try:
        print("\n📊 Запускаємо аналіз українських даних...")
        
        result = await analyzer.analyze_responses(
            responses=test_responses,
            creative_outputs=test_creative,
            behavioral_data=test_behavioral
        )
        
        print("\n✅ Результат аналізу:")
        print("📈 Оцінки здібностей:")
        for ability, score in result['ability_scores'].items():
            print(f"  - {ability}: {score}%")
        
        print(f"\n🎯 Рівень довіри: {result['confidence']:.1%}")
        
        print("\n💡 Інсайти від AI:")
        for i, insight in enumerate(result['insights'], 1):
            print(f"  {i}. {insight}")
            
        # Перевіряємо, чи відповідь містить українську
        ukrainian_chars = any(char in ''.join(result['insights']) for char in 'абвгґдеєжзиіїйклмнопрстуфхцчшщьюя')
        
        if ukrainian_chars:
            print("\n✅ LLaMA успішно генерує текст українською!")
        else:
            print("\n⚠️ LLaMA відповідає англійською, але розуміє українську")
            
    except Exception as e:
        print(f"❌ Помилка під час аналізу: {e}")

if __name__ == "__main__":
    asyncio.run(test_ukrainian_support())