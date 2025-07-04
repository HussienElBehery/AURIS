from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from .models import UserRole, ProcessingStatus

# User schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: UserRole
    agent_id: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    agent_id: Optional[str] = None
    avatar: Optional[str] = None

class UserResponse(UserBase):
    id: str
    avatar: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Authentication schemas
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class RefreshTokenRequest(BaseModel):
    refresh_token: str

# Chat Log schemas
class TranscriptMessage(BaseModel):
    sender: str
    text: str
    timestamp: Optional[datetime] = None

class ChatLogUpload(BaseModel):
    transcript: List[TranscriptMessage]

class ChatLogCreate(BaseModel):
    interaction_id: str
    agent_id: Optional[str] = None
    agent_persona: Optional[str] = None
    transcript: List[TranscriptMessage]

class ChatLogResponse(BaseModel):
    id: str
    interaction_id: str
    agent_id: Optional[str] = None
    agent_persona: Optional[str] = None
    transcript: List[TranscriptMessage]
    status: ProcessingStatus
    uploaded_by: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Evaluation schemas
class EvaluationReasoning(BaseModel):
    coherence: Dict[str, Any]  # Contains score and reasoning
    relevance: Dict[str, Any]  # Contains score and reasoning
    politeness: Dict[str, Any]  # Contains score and reasoning
    resolution: Dict[str, Any]  # Contains score and reasoning

class EvaluationCreate(BaseModel):
    chat_log_id: str
    coherence: Optional[float] = None
    relevance: Optional[float] = None
    politeness: Optional[float] = None
    resolution: Optional[float] = None
    reasoning: Optional[EvaluationReasoning] = None
    evaluation_summary: Optional[str] = None
    error_message: Optional[str] = None

class EvaluationResponse(BaseModel):
    id: str
    chat_log_id: str
    agent_id: Optional[str] = None
    coherence: Optional[float] = None
    relevance: Optional[float] = None
    politeness: Optional[float] = None
    resolution: Optional[float] = None
    reasoning: Optional[Dict[str, Any]] = None  # Store the full reasoning object
    evaluation_summary: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Analysis schemas
class GuidelineResult(BaseModel):
    name: str
    passed: bool
    description: str

class AnalysisCreate(BaseModel):
    chat_log_id: str
    agent_id: Optional[str] = None
    guidelines: Optional[List[GuidelineResult]] = None
    issues: Optional[List[str]] = None
    highlights: Optional[List[str]] = None
    analysis_summary: Optional[str] = None
    error_message: Optional[str] = None

class AnalysisResponse(BaseModel):
    id: str
    chat_log_id: str
    agent_id: Optional[str] = None
    guidelines: Optional[List[GuidelineResult]] = None
    issues: Optional[List[str]] = None
    highlights: Optional[List[str]] = None
    analysis_summary: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Recommendation schemas
class RecommendationCreate(BaseModel):
    chat_log_id: str
    error_message: Optional[str] = None
    specific_feedback: Optional[List[Dict[str, str]]] = None
    long_term_coaching: Optional[str] = None

class RecommendationResponse(BaseModel):
    id: str
    chat_log_id: str
    error_message: Optional[str] = None
    specific_feedback: Optional[List[Dict[str, str]]] = None
    long_term_coaching: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Processing schemas
class ProcessingRequest(BaseModel):
    chat_log_id: str

class ProcessingStatusResponse(BaseModel):
    chat_log_id: str
    status: ProcessingStatus
    progress: Dict[str, str]  # Agent status: "pending", "processing", "completed", "failed"
    error_messages: Dict[str, str]  # Agent error messages
    details: Optional[Dict[str, Any]] = None  # Agent details: started_at, finished_at, estimated_time, current_step

# Response schemas
class MessageResponse(BaseModel):
    message: str
    success: bool = True

class ErrorResponse(BaseModel):
    detail: str
    success: bool = False 