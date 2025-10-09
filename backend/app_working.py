#!/usr/bin/env python3
"""
Інноваційна система оцінки здібностей людини - Робоча версія
Backend API з інтеграцією локального LLaMA
"""

import json
import time
from typing import Dict, List, Optional, Any
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Імпортуємо наші модулі
try:
from llama_analyzer import LlamaAnalyzer
from behavioral_processor import BehavioralDataProcessor
from ability_descriptions import format_results_for_display
    MODULES_LOADED = True
except ImportError as e:
    print(f"Warning: Could not import modules: {e}")
    MODULES_LOADED = False

app = FastAPI(
    title="Abilities Assessment System",
    description="AI-powered behavioral assessment through interactive experience",
    version="1.0.0"
)

# CORS для інтеграції з React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ініціалізація компонентів (тільки якщо модулі завантажені)
if MODULES_LOADED:
    try:
        llama_analyzer = LlamaAnalyzer()
        behavioral_processor = BehavioralDataProcessor()
        print("✅ All modules loaded successfully")
    except Exception as e:
        print(f"Warning: Could not initialize modules: {e}")
        MODULES_LOADED = False

# Моделі даних
class GameEvent(BaseModel):
    """Подія в грі (натискання, рух миші, вибір тощо)"""
    event_type: str
    timestamp: float
    data: Dict[str, Any]
    
class AssessmentSession(BaseModel):
    """Сесія оцінки користувача"""
    session_id: str
    events: List[GameEvent]
    responses: Dict[str, Any]
    creative_outputs: List[str]

class AbilityProfile(BaseModel):
    """Профіль здібностей користувача"""
    analytical: float    # 0-100%
    creative: float      # 0-100%
    social: float        # 0-100%
    technical: float     # 0-100%
    research: float      # 0-100%
    confidence: float    # Рівень довіри до оцінки
    insights: List[str]  # Текстові інсайти про користувача

# Зберігання активних сесій
active_sessions: Dict[str, AssessmentSession] = {}

@app.get("/")
async def root():
    return {"message": "Abilities Assessment API Running", "status": "healthy"}

@app.get("/health")
async def health_check():
    """Перевірка здоров'я системи"""
    if MODULES_LOADED:
        try:
            llama_status = await llama_analyzer.check_status()
        except:
            llama_status = "error"
    else:
        llama_status = "modules_not_loaded"
        
    return {
        "api": "running",
        "llama": llama_status,
        "modules": "loaded" if MODULES_LOADED else "not_loaded",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/session/start")
async def start_session():
    """Розпочати нову сесію оцінки"""
    session_id = f"session_{int(time.time() * 1000)}"
    active_sessions[session_id] = AssessmentSession(
        session_id=session_id,
        events=[],
        responses={},
        creative_outputs=[]
    )
    return {"session_id": session_id, "status": "started"}

@app.post("/session/{session_id}/event")
async def log_event(session_id: str, event: GameEvent):
    """Записати подію з гри"""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    active_sessions[session_id].events.append(event)
    return {"status": "logged"}

@app.post("/session/{session_id}/response")
async def log_response(session_id: str, response_data: Dict[str, Any]):
    """Записати відповідь користувача"""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    active_sessions[session_id].responses.update(response_data)
    return {"status": "logged"}

@app.post("/session/{session_id}/analyze")
async def analyze_session(session_id: str) -> AbilityProfile:
    """Проаналізувати сесію та повернути профіль здібностей"""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if not MODULES_LOADED:
        # Якщо модулі не завантажені, повертаємо mock дані
        return AbilityProfile(
            analytical=75.5,
            creative=68.2,
            social=45.0,
            technical=82.1,
            research=71.8,
            confidence=0.85,
            insights=[
                "Mock analysis - modules not fully loaded",
                "This would be real AI analysis in production",
                "Shows systematic thinking patterns"
            ]
        )
    
    session_data = active_sessions[session_id]
    
    try:
        # 1. Обробити поведінкові дані
        events_dict = [event.dict() for event in session_data.events]
        behavioral_metrics = behavioral_processor.process_events(events_dict)
        
        # 2. Проаналізувати відповіді через LLaMA
        llama_analysis = await llama_analyzer.analyze_responses(
            responses=session_data.responses,
            creative_outputs=session_data.creative_outputs,
            behavioral_data=behavioral_metrics
        )
        
        # 3. Поєднати результати в єдиний профіль
        basic_profile = combine_analysis_results(behavioral_metrics, llama_analysis)
        
        # 4. Отримуємо детальні описи та рекомендації
        detailed_results = format_results_for_display(
            {
                "analytical": basic_profile.analytical,
                "creative": basic_profile.creative,
                "social": basic_profile.social,
                "technical": basic_profile.technical,
                "research": basic_profile.research
            },
            basic_profile.confidence,
            basic_profile.insights
        )
        
        return detailed_results
        
    except Exception as e:
        print(f"Analysis error: {e}")
        # Fallback результат
        return AbilityProfile(
            analytical=70.0,
            creative=65.0,
            social=55.0,
            technical=75.0,
            research=68.0,
            confidence=0.60,
            insights=[
                f"Partial analysis due to error: {str(e)[:100]}",
                "Fallback scoring applied",
                "Contact support for full analysis"
            ]
        )

def combine_analysis_results(behavioral_metrics: Dict, llama_analysis: Dict) -> AbilityProfile:
    """Поєднати результати поведінкового аналізу та LLaMA"""
    
    # Базові оцінки з поведінкових метрик (0-1)
    behavioral_scores = {
        "analytical": behavioral_metrics.get("logic_score", 0.5),
        "creative": behavioral_metrics.get("creativity_score", 0.5),  
        "social": behavioral_metrics.get("social_score", 0.5),
        "technical": behavioral_metrics.get("technical_score", 0.5),
        "research": behavioral_metrics.get("exploration_score", 0.5)
    }
    
    # LLaMA оцінки (0-100)
    llama_scores = llama_analysis.get("ability_scores", {})
    
    # Зважене поєднання (60% LLaMA, 40% поведінкові дані)
    final_scores = {}
    for ability in ["analytical", "creative", "social", "technical", "research"]:
        behavioral_val = behavioral_scores.get(ability, 0.5) * 100
        llama_val = llama_scores.get(ability, 50.0)
        
        final_scores[ability] = round(0.6 * llama_val + 0.4 * behavioral_val, 1)
    
    return AbilityProfile(
        analytical=final_scores["analytical"],
        creative=final_scores["creative"],
        social=final_scores["social"],
        technical=final_scores["technical"],
        research=final_scores["research"],
        confidence=llama_analysis.get("confidence", 0.75),
        insights=llama_analysis.get("insights", ["Analysis completed successfully"])
    )

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Abilities Assessment API...")
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=False)