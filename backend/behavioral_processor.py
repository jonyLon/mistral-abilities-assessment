#!/usr/bin/env python3
"""
Обробник поведінкових даних - аналізує взаємодії користувача з грою
для виявлення патернів мислення та схильностей
"""

import numpy as np
from typing import Dict, List, Any, Tuple
from datetime import datetime
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class GameEvent:
    """Подія в грі з типом, часом та даними"""
    event_type: str
    timestamp: float
    data: Dict[str, Any]

class BehavioralDataProcessor:
    """Процесор для аналізу поведінкових даних з гри"""
    
    def __init__(self):
        # Процесор готовий до роботи
        pass
    
    def process_events(self, events: List[Dict]) -> Dict[str, float]:
        """
        Обробити всі події з гри та повернути метрики здібностей
        
        Returns:
            Dict з метриками від 0.0 до 1.0 для кожного типу здібностей
        """
        
        # Конвертувати словники в об'єкти GameEvent
        processed_events = []
        for event_dict in events:
            event = GameEvent(
                event_type=event_dict.get('event_type', ''),
                timestamp=event_dict.get('timestamp', 0.0),
                data=event_dict.get('data', {})
            )
            processed_events.append(event)
        
        # Обчислити базові метрики
        metrics = {
            'avg_reaction_time': 0.5,
            'decision_consistency': 0.5,
            'exploration_score': 0.5,
            'error_recovery': 0.5,
            'persistence': 0.5,
            'logic_score': 0.5,
            'creativity_score': 0.5,
            'social_score': 0.5,
            'technical_score': 0.5
        }
        
        if not processed_events:
            return metrics
            
        # Обробити події за типами
        event_groups = self._group_events_by_type(processed_events)
        
        # Обчислити специфічні метрики
        metrics.update({
            'avg_reaction_time': self._calculate_reaction_times(event_groups),
            'decision_consistency': self._calculate_decision_consistency(event_groups),
            'exploration_score': self._calculate_exploration_patterns(event_groups),
            'error_recovery': self._calculate_error_recovery(event_groups),
            'persistence': self._calculate_task_persistence(event_groups),
        })
        
        # Обчислити оцінки здібностей на основі метрик
        ability_scores = self._derive_ability_scores(metrics, event_groups)
        metrics.update(ability_scores)
        
        return metrics
    
    def _group_events_by_type(self, events: List[GameEvent]) -> Dict[str, List[GameEvent]]:
        """Групувати події за типами"""
        groups = {}
        for event in events:
            event_type = event.event_type
            if event_type not in groups:
                groups[event_type] = []
            groups[event_type].append(event)
        return groups
    
    def _calculate_reaction_times(self, event_groups: Dict) -> float:
        """Обчислити середній час реакції (0.0 = повільно, 1.0 = швидко)"""
        reaction_times = []
        
        # Аналізуємо клікі та вибори
        for event_type in ['click', 'choice', 'keypress']:
            events = event_groups.get(event_type, [])
            
            for i in range(1, len(events)):
                time_diff = events[i].timestamp - events[i-1].timestamp
                if 0.1 < time_diff < 10.0:  # Фільтруємо нереалістичні значення
                    reaction_times.append(time_diff)
        
        if not reaction_times:
            return 0.5
        
        avg_time = np.mean(reaction_times)
        # Нормалізуємо: швидше = краще (інвертуємо і масштабуємо)
        normalized = max(0.0, min(1.0, 1.0 - (avg_time - 0.5) / 3.0))
        return normalized
    
    def _calculate_decision_consistency(self, event_groups: Dict) -> float:
        """Обчислити консистентність рішень (0.0 = хаотично, 1.0 = послідовно)"""
        choice_events = event_groups.get('choice', [])
        
        if len(choice_events) < 3:
            return 0.5
        
        # Аналізуємо послідовність вибору
        choice_patterns = []
        for event in choice_events:
            choice_type = event.data.get('choice_category', 'unknown')
            choice_patterns.append(choice_type)
        
        # Обчислюємо ентропію вибору (менше ентропії = більше послідовності)
        pattern_counts = {}
        for pattern in choice_patterns:
            pattern_counts[pattern] = pattern_counts.get(pattern, 0) + 1
        
        if len(pattern_counts) == 1:
            return 0.8  # Дуже послідовно, але можливо занадто
        
        # Shannon entropy
        total = len(choice_patterns)
        entropy = 0
        for count in pattern_counts.values():
            p = count / total
            if p > 0:
                entropy -= p * np.log2(p)
        
        # Нормалізуємо ентропію (менше ентропії = вища консистентність)
        max_entropy = np.log2(len(pattern_counts)) if len(pattern_counts) > 1 else 1
        consistency = 1.0 - (entropy / max_entropy) if max_entropy > 0 else 0.5
        
        return max(0.0, min(1.0, consistency))
    
    def _calculate_exploration_patterns(self, event_groups: Dict) -> float:
        """Обчислити схильність до дослідження (0.0 = консервативно, 1.0 = експериментально)"""
        mouse_events = event_groups.get('mouse_move', [])
        choice_events = event_groups.get('choice', [])
        
        exploration_score = 0.5
        
        # Аналіз рухів миші (різноманітність областей)
        if mouse_events:
            positions = [(event.data.get('x', 0), event.data.get('y', 0)) for event in mouse_events]
            if len(positions) > 10:
                # Обчислюємо площу, покриту мишею
                x_coords, y_coords = zip(*positions)
                x_range = max(x_coords) - min(x_coords)
                y_range = max(y_coords) - min(y_coords)
                coverage = (x_range * y_range) / (1920 * 1080)  # Нормалізуємо до розміру екрану
                exploration_score = max(exploration_score, min(1.0, coverage * 2))
        
        # Аналіз різноманітності вибору
        if choice_events:
            unique_choices = len(set(event.data.get('choice', '') for event in choice_events))
            total_choices = len(choice_events)
            
            if total_choices > 0:
                choice_diversity = unique_choices / total_choices
                exploration_score = (exploration_score + choice_diversity) / 2
        
        return max(0.0, min(1.0, exploration_score))
    
    def _calculate_error_recovery(self, event_groups: Dict) -> float:
        """Обчислити здатність до відновлення після помилок"""
        error_events = event_groups.get('error', [])
        
        if not error_events:
            return 0.7  # Нейтральна оцінка, якщо помилок не було
        
        recovery_scores = []
        
        for error_event in error_events:
            error_time = error_event.timestamp
            
            # Знайти наступну успішну дію після помилки
            subsequent_events = [e for e in event_groups.get('choice', []) + event_groups.get('click', [])
                               if e.timestamp > error_time and e.timestamp < error_time + 30]  # 30 секунд після помилки
            
            if subsequent_events:
                # Час до відновлення
                recovery_time = min(e.timestamp - error_time for e in subsequent_events)
                # Коротший час = краще відновлення
                recovery_score = max(0.0, 1.0 - recovery_time / 30.0)
                recovery_scores.append(recovery_score)
            else:
                recovery_scores.append(0.2)  # Не відновився
        
        return np.mean(recovery_scores) if recovery_scores else 0.5
    
    def _calculate_task_persistence(self, event_groups: Dict) -> float:
        """Обчислити наполегливість у виконанні завдань"""
        all_events = []
        for events in event_groups.values():
            all_events.extend(events)
        
        if not all_events:
            return 0.5
        
        # Сортуємо за часом
        all_events.sort(key=lambda e: e.timestamp)
        
        # Аналізуємо проміжки між діями
        action_intervals = []
        for i in range(1, len(all_events)):
            interval = all_events[i].timestamp - all_events[i-1].timestamp
            if 0.1 < interval < 60:  # Фільтруємо нереалістичні проміжки
                action_intervals.append(interval)
        
        if not action_intervals:
            return 0.5
        
        # Менші проміжки = більша наполегливість
        avg_interval = np.mean(action_intervals)
        persistence = max(0.0, min(1.0, 1.0 - (avg_interval - 2.0) / 20.0))
        
        return persistence
    
    def _derive_ability_scores(self, metrics: Dict, event_groups: Dict) -> Dict[str, float]:
        """Вивести оцінки здібностей з базових метрик"""
        
        # Логічні/аналітичні здібності
        logic_score = (
            metrics['decision_consistency'] * 0.4 +
            (1.0 - metrics['avg_reaction_time']) * 0.3 +  # Швидкі, але обмірковані рішення
            metrics['error_recovery'] * 0.3
        )
        
        # Творчі здібності
        creativity_score = (
            metrics['exploration_score'] * 0.5 +
            (1.0 - metrics['decision_consistency']) * 0.3 +  # Деяка непередбачуваність як креативність
            self._assess_creative_variety(event_groups) * 0.2
        )
        
        # Соціальні здібності (складніше оцінити з поведінкових даних)
        social_score = (
            metrics['error_recovery'] * 0.4 +  # Адаптивність
            metrics['persistence'] * 0.3 +     # Терпіння
            0.5 * 0.3                          # Базова оцінка
        )
        
        # Технічні здібності
        technical_score = (
            metrics['avg_reaction_time'] * 0.4 +        # Швидкість
            metrics['decision_consistency'] * 0.4 +      # Систематичність
            metrics['persistence'] * 0.2
        )
        
        return {
            'logic_score': max(0.0, min(1.0, logic_score)),
            'creativity_score': max(0.0, min(1.0, creativity_score)),
            'social_score': max(0.0, min(1.0, social_score)),
            'technical_score': max(0.0, min(1.0, technical_score))
        }
    
    def _assess_creative_variety(self, event_groups: Dict) -> float:
        """Оцінити різноманітність креативних входів"""
        creative_events = event_groups.get('creative_input', [])
        
        if not creative_events:
            return 0.5
        
        # Аналізуємо різноманітність креативних входів
        input_types = set()
        for event in creative_events:
            input_type = event.data.get('input_type', 'text')
            input_types.add(input_type)
        
        # Більше типів входів = більша креативність
        variety_score = min(1.0, len(input_types) / 3.0)
        return variety_score

# Утилітарні функції для тестування
def create_test_events() -> List[Dict]:
    """Створити тестові події для перевірки процесора"""
    events = [
        {
            'event_type': 'click',
            'timestamp': 1.0,
            'data': {'x': 100, 'y': 200, 'target': 'button1'}
        },
        {
            'event_type': 'choice',
            'timestamp': 3.5,
            'data': {'choice': 'analytical', 'choice_category': 'thinking_style'}
        },
        {
            'event_type': 'mouse_move',
            'timestamp': 5.2,
            'data': {'x': 300, 'y': 400}
        },
        {
            'event_type': 'error',
            'timestamp': 8.0,
            'data': {'error_type': 'wrong_choice'}
        },
        {
            'event_type': 'choice',
            'timestamp': 10.5,
            'data': {'choice': 'creative', 'choice_category': 'thinking_style'}
        }
    ]
    return events

if __name__ == "__main__":
    # Тестування процесора
    processor = BehavioralDataProcessor()
    test_events = create_test_events()
    
    metrics = processor.process_events(test_events)
    
    print("Behavioral Analysis Results:")
    for metric, value in metrics.items():
        print(f"  {metric}: {value:.3f}")