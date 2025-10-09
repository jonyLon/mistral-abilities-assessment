#!/usr/bin/env python3
"""
Простий тест FastAPI для перевірки базової функціональності
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Test API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Test API is working!", "status": "healthy"}

@app.get("/health")
async def health_check():
    return {
        "api": "running",
        "llama": "testing...",
        "timestamp": "2024-01-01T00:00:00Z"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=False)
