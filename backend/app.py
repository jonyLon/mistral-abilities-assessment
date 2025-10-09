#!/usr/bin/env python3
"""
Інноваційна система оцінки здібностей людини
Backend API з інтеграцією Mistral Nemo через Ollama
"""

import json
import time
from typing import Dict, List, Optional, Any
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np

from mistral_analyzer import MistralAnalyzer
from behavioral_processor import BehavioralDataProcessor

app = FastAPI(
    title="Abilities Assessment System",
    description="AI-powered behavioral assessment through interactive experience",
    version="1.0.0"
)

# CORS для інтеграції з React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ініціалізація компонентів
mistral_analyzer = MistralAnalyzer()
behavioral_processor = BehavioralDataProcessor()

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
    mistral_status = await mistral_analyzer.check_status()
    return {
        "api": "running",
        "mistral": mistral_status,
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

@app.post("/session/{session_id}/generate-question")
async def generate_question(session_id: str, request: Dict[str, Any]):
    """Генерувати питання для конкретного етапу через Mistral Nemo"""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    stage_name = request.get('stage_name', 'analytical')
    user_context = request.get('user_context', {})
    
    try:
        # Генеруємо питання через Mistral Nemo
        question_data = await mistral_analyzer.generate_question(
            stage_name=stage_name,
            user_context=user_context,
            session_history=active_sessions[session_id].responses
        )
        
        return {
            "question": question_data.get('question', ''),
            "choices": question_data.get('choices', []),
            "question_type": question_data.get('type', 'multiple_choice'),
            "stage": stage_name,
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Question generation failed: {str(e)}")

@app.post("/session/{session_id}/analyze")
async def analyze_session(session_id: str) -> AbilityProfile:
    """Проаналізувати сесію та повернути профіль здібностей"""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session_data = active_sessions[session_id]
    
    try:
        # 1. Обробити поведінкові дані
        behavioral_metrics = behavioral_processor.process_events(session_data.events)
        
        # 2. Проаналізувати відповіді через Mistral Nemo
        mistral_analysis = await mistral_analyzer.analyze_responses(
            responses=session_data.responses,
            creative_outputs=session_data.creative_outputs,
            behavioral_data=behavioral_metrics
        )
        
        # 3. Поєднати результати в єдиний профіль
        profile = combine_analysis_results(behavioral_metrics, mistral_analysis)
        
        return profile
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

def combine_analysis_results(behavioral_metrics: Dict, mistral_analysis: Dict) -> AbilityProfile:
    """Поєднати результати поведінкового аналізу та Mistral Nemo"""
    
    # Базові оцінки з поведінкових метрик (0-1)
    behavioral_scores = {
        "analytical": behavioral_metrics.get("logic_score", 0.5),
        "creative": behavioral_metrics.get("creativity_score", 0.5),  
        "social": behavioral_metrics.get("social_score", 0.5),
        "technical": behavioral_metrics.get("technical_score", 0.5),
        "research": behavioral_metrics.get("exploration_score", 0.5)
    }
    
    # Mistral Nemo оцінки (0-100)
    mistral_scores = mistral_analysis.get("ability_scores", {})
    
    # Зважене поєднання (60% Mistral Nemo, 40% поведінкові дані)
    final_scores = {}
    for ability in ["analytical", "creative", "social", "technical", "research"]:
        behavioral_val = behavioral_scores.get(ability, 0.5) * 100
        mistral_val = mistral_scores.get(ability, 50.0)
        
        final_scores[ability] = round(0.6 * mistral_val + 0.4 * behavioral_val, 1)
    
    return AbilityProfile(
        analytical=final_scores["analytical"],
        creative=final_scores["creative"],
        social=final_scores["social"],
        technical=final_scores["technical"],
        research=final_scores["research"],
        confidence=mistral_analysis.get("confidence", 0.75),
        insights=mistral_analysis.get("insights", [])
    )

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket для реального часу збору даних"""
    await websocket.accept()
    
    if session_id not in active_sessions:
        await websocket.send_json({"error": "Session not found"})
        await websocket.close()
        return
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "event":
                event = GameEvent(**data["payload"])
                active_sessions[session_id].events.append(event)
                
            elif data.get("type") == "response":
                active_sessions[session_id].responses.update(data["payload"])
                
            # Підтвердження отримання
            await websocket.send_json({"status": "received"})
            
    except WebSocketDisconnect:
        print(f"WebSocket connection closed for session {session_id}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)