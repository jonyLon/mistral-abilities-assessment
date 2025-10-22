#!/usr/bin/env python3
"""
Спрощена система оцінки здібностей - Backend API
Тільки 2 endpoints: /health та /analyze
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any
from datetime import datetime

from mistral_analyzer import MistralAnalyzer

app = FastAPI(
    title="Abilities Assessment API",
    description="Simplified AI-powered abilities assessment",
    version="2.0.0"
)

# CORS для frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ініціалізація Mistral аналізатора
mistral_analyzer = MistralAnalyzer()

# Моделі даних
class AnalyzeRequest(BaseModel):
    """Запит на аналіз відповідей користувача"""
    responses: Dict[str, Any]

class AbilityProfile(BaseModel):
    """Профіль здібностей користувача"""
    analytical: float
    creative: float
    social: float
    technical: float
    research: float
    confidence: float
    insights: list[str]

@app.get("/")
async def root():
    """Кореневий endpoint"""
    return {
        "message": "Abilities Assessment API",
        "version": "2.0.0",
        "status": "running",
        "endpoints": {
            "/health": "Health check",
            "/analyze": "Analyze user responses"
        }
    }

@app.get("/health")
async def health_check():
    """Перевірка здоров'я системи"""
    mistral_status = await mistral_analyzer.check_status()
    
    return {
        "api": "running",
        "mistral": mistral_status,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/analyze")
async def analyze_responses(request: AnalyzeRequest) -> Dict[str, Any]:
    """
    Проаналізувати відповіді користувача через Mistral Nemo
    
    Args:
        request: Об'єкт з полем responses (dict з відповідями корист)
    
    Returns:
        Dict з ability_scores, confidence, insights
    """
    
    if not request.responses:
        raise HTTPException(status_code=400, detail="Responses cannot be empty")
    
    try:
        # Аналізувати через Mistral Nemo
        analysis = await mistral_analyzer.analyze_responses(request.responses)
        
        return analysis
        
    except Exception as e:
        print(f"❌ Analysis error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
