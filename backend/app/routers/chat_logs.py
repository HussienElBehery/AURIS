from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import json
import uuid
from datetime import datetime

from ..database import get_db
from ..dependencies import get_current_user
from ..models import User, ChatLog, Evaluation, Analysis, Recommendation, ProcessingStatus
from ..schemas import (
    ChatLogUpload, ChatLogResponse, ProcessingRequest, ProcessingStatusResponse,
    EvaluationResponse, AnalysisResponse, RecommendationResponse, MessageResponse
)
from ..services.processing_pipeline import processing_pipeline
from ..services.ollama_service import ollama_service

router = APIRouter(prefix="/chat-logs", tags=["chat-logs"])

@router.get("/debug/model-status")
async def get_model_status(
    current_user: User = Depends(get_current_user)
):
    """
    Debug endpoint to check Ollama status.
    """
    try:
        model_info = {
            "ollama_running": ollama_service.is_ollama_running(),
            "available_models": ollama_service.get_available_models(),
            "current_model": ollama_service.get_current_model(),
            "system_info": ollama_service.get_system_info()
        }
        
        return model_info
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting model status: {str(e)}")

@router.post("/upload", response_model=ChatLogResponse)
async def upload_chat_log(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a JSON chat log file for processing.
    """
    try:
        # Validate file type
        if not file.filename.endswith('.json'):
            raise HTTPException(status_code=400, detail="Only JSON files are allowed")
        
        # Read and parse JSON file
        content = await file.read()
        try:
            data = json.loads(content.decode('utf-8'))
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON format")
        
        # Extract transcript data
        transcript_data = data.get('transcript', [])
        if not transcript_data:
            raise HTTPException(status_code=400, detail="No transcript data found")
        
        # Convert transcript to our format with optional timestamps
        transcript = []
        
        for message in transcript_data:
            if isinstance(message, dict):
                sender = message.get('sender', 'unknown')
                text = message.get('text', '')
                timestamp = message.get('timestamp')
                
                if text:  # Only add non-empty messages
                    message_data = {"sender": sender, "text": text}
                    
                    # Handle timestamp
                    if timestamp:
                        # If timestamp is a string, try to parse it
                        if isinstance(timestamp, str):
                            try:
                                # Try different timestamp formats
                                for fmt in ["%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"]:
                                    try:
                                        parsed_timestamp = datetime.strptime(timestamp, fmt)
                                        message_data["timestamp"] = parsed_timestamp.isoformat()
                                        break
                                    except ValueError:
                                        continue
                                else:
                                    # If no format matches, use current time
                                    message_data["timestamp"] = datetime.now().isoformat()
                            except:
                                message_data["timestamp"] = datetime.now().isoformat()
                        else:
                            message_data["timestamp"] = timestamp
                    else:
                        # No timestamp provided, use current time
                        message_data["timestamp"] = datetime.now().isoformat()
                    
                    transcript.append(message_data)
        
        if not transcript:
            raise HTTPException(status_code=400, detail="No valid messages found in transcript")
        
        # Create chat log record
        chat_log_id = str(uuid.uuid4())
        interaction_id = f"chat-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{chat_log_id[:8]}"
        
        # Determine agent_id and agent_persona
        agent_id = None
        agent_persona = None
        
        if current_user.role == "agent":
            # If user is an agent, assign them as the agent for this chat
            agent_id = current_user.agent_id or current_user.id
            agent_persona = f"{current_user.name} - {current_user.role.title()}"
        else:
            # For managers, agent will be assigned later
            agent_id = None
            agent_persona = None
        
        chat_log = ChatLog(
            id=chat_log_id,
            interaction_id=interaction_id,
            agent_id=agent_id,
            agent_persona=agent_persona,
            transcript=transcript,
            status=ProcessingStatus.PENDING,
            uploaded_by=current_user.id
        )
        
        db.add(chat_log)
        db.commit()
        db.refresh(chat_log)
        
        return ChatLogResponse(
            id=chat_log.id,
            interaction_id=chat_log.interaction_id,
            agent_id=chat_log.agent_id,
            agent_persona=chat_log.agent_persona,
            transcript=transcript,
            status=chat_log.status,
            uploaded_by=chat_log.uploaded_by,
            created_at=chat_log.created_at,
            updated_at=chat_log.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading chat log: {str(e)}")

@router.post("/{chat_log_id}/process", response_model=MessageResponse)
async def process_chat_log(
    chat_log_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start processing a chat log through all agents.
    """
    try:
        # Get chat log
        chat_log = db.query(ChatLog).filter(ChatLog.id == chat_log_id).first()
        if not chat_log:
            raise HTTPException(status_code=404, detail="Chat log not found")
        
        # Check if already processed
        if chat_log.status in [ProcessingStatus.PROCESSING, ProcessingStatus.COMPLETED]:
            raise HTTPException(status_code=400, detail="Chat log is already being processed or completed")
        
        # Update status to processing
        chat_log.status = ProcessingStatus.PROCESSING
        db.commit()
        
        # Start background processing
        background_tasks.add_task(
            process_chat_log_background,
            chat_log_id,
            chat_log.transcript,
            current_user.id,
            db
        )
        
        return MessageResponse(message="Processing started successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting processing: {str(e)}")

@router.get("/{chat_log_id}/status", response_model=ProcessingStatusResponse)
async def get_processing_status(
    chat_log_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the processing status of a chat log.
    """
    try:
        # Get chat log
        chat_log = db.query(ChatLog).filter(ChatLog.id == chat_log_id).first()
        if not chat_log:
            raise HTTPException(status_code=404, detail="Chat log not found")
        
        # Get agent results
        evaluation = db.query(Evaluation).filter(Evaluation.chat_log_id == chat_log_id).first()
        analysis = db.query(Analysis).filter(Analysis.chat_log_id == chat_log_id).first()
        recommendation = db.query(Recommendation).filter(Recommendation.chat_log_id == chat_log_id).first()
        
        # Build progress status
        progress = {}
        error_messages = {}
        
        if evaluation:
            progress["evaluation"] = "completed" if not evaluation.error_message else "failed"
            if evaluation.error_message:
                error_messages["evaluation"] = evaluation.error_message
        else:
            progress["evaluation"] = "pending"
        
        if analysis:
            progress["analysis"] = "completed" if not analysis.error_message else "failed"
            if analysis.error_message:
                error_messages["analysis"] = analysis.error_message
        else:
            progress["analysis"] = "pending"
        
        if recommendation:
            progress["recommendation"] = "completed" if not recommendation.error_message else "failed"
            if recommendation.error_message:
                error_messages["recommendation"] = recommendation.error_message
        else:
            progress["recommendation"] = "pending"
        
        return ProcessingStatusResponse(
            chat_log_id=chat_log_id,
            status=chat_log.status,
            progress=progress,
            error_messages=error_messages
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting status: {str(e)}")

@router.get("/{chat_log_id}/evaluation", response_model=EvaluationResponse)
async def get_evaluation(
    chat_log_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get evaluation results for a chat log.
    """
    try:
        evaluation = db.query(Evaluation).filter(Evaluation.chat_log_id == chat_log_id).first()
        if not evaluation:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        
        return EvaluationResponse(
            id=evaluation.id,
            chat_log_id=evaluation.chat_log_id,
            coherence=evaluation.coherence,
            relevance=evaluation.relevance,
            politeness=evaluation.politeness,
            resolution=evaluation.resolution,
            reasoning=evaluation.reasoning,
            evaluation_summary=evaluation.evaluation_summary,
            error_message=evaluation.error_message,
            created_at=evaluation.created_at,
            updated_at=evaluation.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting evaluation: {str(e)}")

@router.get("/{chat_log_id}/analysis", response_model=AnalysisResponse)
async def get_analysis(
    chat_log_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get analysis results for a chat log.
    """
    try:
        analysis = db.query(Analysis).filter(Analysis.chat_log_id == chat_log_id).first()
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        return AnalysisResponse(
            id=analysis.id,
            chat_log_id=analysis.chat_log_id,
            guidelines=analysis.guidelines,
            issues=analysis.issues,
            highlights=analysis.highlights,
            analysis_summary=analysis.analysis_summary,
            error_message=analysis.error_message,
            created_at=analysis.created_at,
            updated_at=analysis.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting analysis: {str(e)}")

@router.get("/{chat_log_id}/recommendation", response_model=RecommendationResponse)
async def get_recommendation(
    chat_log_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get recommendation results for a chat log.
    """
    try:
        recommendation = db.query(Recommendation).filter(Recommendation.chat_log_id == chat_log_id).first()
        if not recommendation:
            raise HTTPException(status_code=404, detail="Recommendation not found")
        
        return RecommendationResponse(
            id=recommendation.id,
            chat_log_id=recommendation.chat_log_id,
            original_message=recommendation.original_message,
            improved_message=recommendation.improved_message,
            reasoning=recommendation.reasoning,
            coaching_suggestions=recommendation.coaching_suggestions,
            error_message=recommendation.error_message,
            created_at=recommendation.created_at,
            updated_at=recommendation.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting recommendation: {str(e)}")

@router.post("/{chat_log_id}/assign-agent")
async def assign_agent_to_chat(
    chat_log_id: str,
    request: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Assign an agent to a chat log (managers only)
    """
    try:
        # Only managers can assign agents
        if current_user.role != "manager":
            raise HTTPException(status_code=403, detail="Only managers can assign agents")
        
        agent_id = request.get("agent_id")
        agent_persona = request.get("agent_persona", "Customer Service Agent")
        
        if not agent_id:
            raise HTTPException(status_code=400, detail="agent_id is required")
        
        # Get chat log
        chat_log = db.query(ChatLog).filter(ChatLog.id == chat_log_id).first()
        if not chat_log:
            raise HTTPException(status_code=404, detail="Chat log not found")
        
        # Update chat log with assigned agent
        chat_log.agent_id = agent_id
        chat_log.agent_persona = agent_persona
        
        db.commit()
        db.refresh(chat_log)
        
        return {
            "success": True,
            "message": f"Agent {agent_id} assigned to chat log {chat_log_id}",
            "data": {
                "chat_log_id": chat_log_id,
                "agent_id": agent_id,
                "agent_persona": agent_persona
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error assigning agent: {str(e)}")

@router.delete("/{chat_log_id}")
async def delete_chat_log(
    chat_log_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a chat log (only the uploader or managers can delete)
    """
    try:
        # Get chat log
        chat_log = db.query(ChatLog).filter(ChatLog.id == chat_log_id).first()
        if not chat_log:
            raise HTTPException(status_code=404, detail="Chat log not found")
        
        # Check permissions
        if current_user.role != "manager" and chat_log.uploaded_by != current_user.id:
            raise HTTPException(status_code=403, detail="You can only delete your own chat logs")
        
        # Delete related records first
        db.query(Evaluation).filter(Evaluation.chat_log_id == chat_log_id).delete()
        db.query(Analysis).filter(Analysis.chat_log_id == chat_log_id).delete()
        db.query(Recommendation).filter(Recommendation.chat_log_id == chat_log_id).delete()
        
        # Delete the chat log
        db.delete(chat_log)
        db.commit()
        
        return {
            "success": True,
            "message": f"Chat log {chat_log_id} deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting chat log: {str(e)}")

@router.get("/", response_model=List[ChatLogResponse])
async def list_chat_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List chat logs based on user role:
    - Agents see chats assigned to them
    - Managers see all chats
    """
    try:
        if current_user.role == "manager":
            # Managers can see all chat logs
            chat_logs = db.query(ChatLog).all()
        else:
            # Agents see chats assigned to them OR uploaded by them
            agent_id = current_user.agent_id or current_user.id
            chat_logs = db.query(ChatLog).filter(
                (ChatLog.agent_id == agent_id) | 
                (ChatLog.uploaded_by == current_user.id)
            ).all()
        
        return [
            ChatLogResponse(
                id=chat_log.id,
                interaction_id=chat_log.interaction_id,
                agent_id=chat_log.agent_id,
                agent_persona=chat_log.agent_persona,
                transcript=chat_log.transcript,
                status=chat_log.status,
                uploaded_by=chat_log.uploaded_by,
                created_at=chat_log.created_at,
                updated_at=chat_log.updated_at
            )
            for chat_log in chat_logs
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing chat logs: {str(e)}")

@router.get("/{chat_log_id}", response_model=ChatLogResponse)
async def get_chat_log(
    chat_log_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a single chat log by ID
    """
    try:
        # Get chat log
        chat_log = db.query(ChatLog).filter(ChatLog.id == chat_log_id).first()
        if not chat_log:
            raise HTTPException(status_code=404, detail="Chat log not found")
        
        # Check permissions
        if current_user.role != "manager":
            agent_id = current_user.agent_id or current_user.id
            if chat_log.agent_id != agent_id and chat_log.uploaded_by != current_user.id:
                raise HTTPException(status_code=403, detail="You can only view your own chat logs")
        
        return ChatLogResponse(
            id=chat_log.id,
            interaction_id=chat_log.interaction_id,
            agent_id=chat_log.agent_id,
            agent_persona=chat_log.agent_persona,
            transcript=chat_log.transcript,
            status=chat_log.status,
            uploaded_by=chat_log.uploaded_by,
            created_at=chat_log.created_at,
            updated_at=chat_log.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting chat log: {str(e)}")

async def process_chat_log_background(
    chat_log_id: str,
    transcript: List[Dict[str, str]],
    user_id: str,
    db: Session
):
    """
    Background task to process chat log through all agents.
    """
    try:
        # Process through pipeline
        results = await processing_pipeline.process_chat_log(transcript, chat_log_id)
        
        # Store results in database
        for agent_type, agent_data in results["agents"].items():
            if agent_data["status"] == "completed" and "result" in agent_data:
                result = agent_data["result"]
                
                if agent_type == "evaluation":
                    result_data = result
                    evaluation = Evaluation(
                        id=str(uuid.uuid4()),
                        chat_log_id=chat_log_id,
                        coherence=result_data.get("coherence", {}).get("score"),
                        relevance=result_data.get("relevance", {}).get("score"),
                        politeness=result_data.get("politeness", {}).get("score"),
                        resolution=result_data.get("resolution", {}).get("score"),
                        reasoning=result_data,  # Store the full reasoning object
                        evaluation_summary=result_data.get("evaluation_summary"),
                        error_message=result_data.get("error_message")
                    )
                    db.add(evaluation)
                
                elif agent_type == "analysis":
                    analysis = Analysis(
                        id=str(uuid.uuid4()),
                        chat_log_id=chat_log_id,
                        guidelines=result.get("guidelines"),
                        issues=result.get("issues"),
                        highlights=result.get("highlights"),
                        analysis_summary=result.get("analysis_summary"),
                        error_message=result.get("error_message")
                    )
                    db.add(analysis)
                
                elif agent_type == "recommendation":
                    recommendation = Recommendation(
                        id=str(uuid.uuid4()),
                        chat_log_id=chat_log_id,
                        original_message=result.get("original_message"),
                        improved_message=result.get("improved_message"),
                        reasoning=result.get("reasoning"),
                        coaching_suggestions=result.get("coaching_suggestions"),
                        error_message=result.get("error_message")
                    )
                    db.add(recommendation)
            
            elif agent_data["status"] == "failed":
                # Create error records
                if agent_type == "evaluation":
                    evaluation = Evaluation(
                        id=str(uuid.uuid4()),
                        chat_log_id=chat_log_id,
                        error_message=agent_data["error_message"]
                    )
                    db.add(evaluation)
                
                elif agent_type == "analysis":
                    analysis = Analysis(
                        id=str(uuid.uuid4()),
                        chat_log_id=chat_log_id,
                        error_message=agent_data["error_message"]
                    )
                    db.add(analysis)
                
                elif agent_type == "recommendation":
                    recommendation = Recommendation(
                        id=str(uuid.uuid4()),
                        chat_log_id=chat_log_id,
                        error_message=agent_data["error_message"]
                    )
                    db.add(recommendation)
        
        # Update chat log status
        chat_log = db.query(ChatLog).filter(ChatLog.id == chat_log_id).first()
        if chat_log:
            if results["overall_status"] == "completed":
                chat_log.status = ProcessingStatus.COMPLETED
            elif results["overall_status"] == "failed":
                chat_log.status = ProcessingStatus.FAILED
            else:
                chat_log.status = ProcessingStatus.COMPLETED  # Partial success is still completed
        
        db.commit()
        
    except Exception as e:
        # Update chat log status to failed
        try:
            chat_log = db.query(ChatLog).filter(ChatLog.id == chat_log_id).first()
            if chat_log:
                chat_log.status = ProcessingStatus.FAILED
            db.commit()
        except:
            pass
        
        print(f"Error in background processing: {e}") 