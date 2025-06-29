from sqlalchemy import Column, String, DateTime, Boolean, Text, Enum, Float, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

Base = declarative_base()

class UserRole(str, enum.Enum):
    AGENT = "agent"
    MANAGER = "manager"

class ProcessingStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.AGENT)
    avatar = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=False)
    token = Column(Text, nullable=False, unique=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<RefreshToken(user_id={self.user_id}, expires_at={self.expires_at})>"

class ChatLog(Base):
    __tablename__ = "chat_logs"
    
    id = Column(String, primary_key=True, index=True)
    interaction_id = Column(String, unique=True, index=True, nullable=False)
    agent_id = Column(String, nullable=True)  # Assigned agent
    agent_persona = Column(String, nullable=True)
    transcript = Column(JSON, nullable=False)  # Store the full transcript
    status = Column(Enum(ProcessingStatus), default=ProcessingStatus.PENDING)
    uploaded_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    evaluation = relationship("Evaluation", back_populates="chat_log", uselist=False)
    analysis = relationship("Analysis", back_populates="chat_log", uselist=False)
    recommendation = relationship("Recommendation", back_populates="chat_log", uselist=False)
    
    def __repr__(self):
        return f"<ChatLog(id={self.id}, interaction_id={self.interaction_id}, status={self.status})>"

class Evaluation(Base):
    __tablename__ = "evaluations"
    
    id = Column(String, primary_key=True, index=True)
    chat_log_id = Column(String, ForeignKey("chat_logs.id"), nullable=False)
    coherence = Column(Float, nullable=True)
    relevance = Column(Float, nullable=True)
    politeness = Column(Float, nullable=True)
    resolution = Column(Float, nullable=True)
    reasoning = Column(JSON, nullable=True)  # Store reasoning for each metric
    evaluation_summary = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    chat_log = relationship("ChatLog", back_populates="evaluation")
    
    def __repr__(self):
        return f"<Evaluation(id={self.id}, chat_log_id={self.chat_log_id})>"

class Analysis(Base):
    __tablename__ = "analyses"
    
    id = Column(String, primary_key=True, index=True)
    chat_log_id = Column(String, ForeignKey("chat_logs.id"), nullable=False)
    guidelines = Column(JSON, nullable=True)  # Store guideline compliance results
    issues = Column(JSON, nullable=True)  # Array of issues
    highlights = Column(JSON, nullable=True)  # Array of highlights
    analysis_summary = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    chat_log = relationship("ChatLog", back_populates="analysis")
    
    def __repr__(self):
        return f"<Analysis(id={self.id}, chat_log_id={self.chat_log_id})>"

class Recommendation(Base):
    __tablename__ = "recommendations"
    
    id = Column(String, primary_key=True, index=True)
    chat_log_id = Column(String, ForeignKey("chat_logs.id"), nullable=False)
    original_message = Column(Text, nullable=True)
    improved_message = Column(Text, nullable=True)
    reasoning = Column(Text, nullable=True)
    coaching_suggestions = Column(JSON, nullable=True)  # Array of coaching points
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    chat_log = relationship("ChatLog", back_populates="recommendation")
    
    def __repr__(self):
        return f"<Recommendation(id={self.id}, chat_log_id={self.chat_log_id})>" 