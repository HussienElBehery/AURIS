from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import json
import uuid
from datetime import datetime
import logging
import traceback

from ..database import get_db
from ..dependencies import get_current_user
from ..models import User, ChatLog, Evaluation, Analysis, Recommendation, ProcessingStatus
from ..schemas import (
    ChatLogUpload, ChatLogResponse, ProcessingRequest, ProcessingStatusResponse,
    EvaluationResponse, AnalysisResponse, RecommendationResponse, MessageResponse
)
from ..services.processing_pipeline import processing_pipeline
from ..services.ollama_service import ollama_service
from ..services.analysis_agent import analysis_agent

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

@router.post("/upload", response_model=List[ChatLogResponse])
async def upload_chat_log(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a JSON chat log file for processing. Supports single or batch (array) uploads.
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
        
        # If data is a list, treat as batch upload
        chat_logs_data = data if isinstance(data, list) else [data]
        if not chat_logs_data:
            raise HTTPException(status_code=400, detail="No chat logs found in file")
        
        created_chat_logs = []
        for chat_data in chat_logs_data:
            transcript_data = chat_data.get('transcript', [])
            if not transcript_data:
                continue  # Skip empty chat logs
            transcript = []
            for message in transcript_data:
                if isinstance(message, dict):
                    sender = message.get('sender', 'unknown')
                    text = message.get('text', '')
                    timestamp = message.get('timestamp')
                    if text:
                        message_data = {"sender": sender, "text": text}
                        if timestamp:
                            message_data["timestamp"] = timestamp
                        transcript.append(message_data)
            if not transcript:
                continue  # Skip if no valid messages
            chat_log_id = str(uuid.uuid4())
            interaction_id = f"chat-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{chat_log_id[:8]}"
            # Determine agent_id and agent_persona
            agent_id = None
            agent_persona = None
            if current_user.role == "agent":
                agent_id = current_user.agent_id or current_user.id
                agent_persona = f"{current_user.name} - {current_user.role.title()}"
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
            created_chat_logs.append(ChatLogResponse(
                id=chat_log.id,
                interaction_id=chat_log.interaction_id,
                agent_id=chat_log.agent_id,
                agent_persona=chat_log.agent_persona,
                transcript=transcript,
                status=chat_log.status,
                uploaded_by=chat_log.uploaded_by,
                created_at=chat_log.created_at,
                updated_at=chat_log.updated_at
            ))
        if not created_chat_logs:
            raise HTTPException(status_code=400, detail="No valid chat logs found in file")
        return created_chat_logs
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading chat log(s): {str(e)}")

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
        chat_log = get_chat_log_or_404(db, chat_log_id)
        
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
        chat_log = get_chat_log_or_404(db, chat_log_id)
        evaluation = get_evaluation_or_none(db, chat_log_id)
        analysis = get_analysis_or_none(db, chat_log_id)
        recommendation = get_recommendation_or_none(db, chat_log_id)
        progress = {}
        error_messages = {}
        details = {}
        agents = {}
        # Try to get model_used from in-memory pipeline results
        from app.services.processing_pipeline import processing_pipeline
        pipeline_results = None
        try:
            if hasattr(processing_pipeline, 'results_cache'):
                pipeline_results = processing_pipeline.results_cache.get(chat_log_id)
        except Exception:
            pipeline_results = None
        def get_model_used(agent_key):
            if pipeline_results and 'agents' in pipeline_results and agent_key in pipeline_results['agents']:
                agent_result = pipeline_results['agents'][agent_key]
                if 'result' in agent_result and isinstance(agent_result['result'], dict):
                    return agent_result['result'].get('model_used')
            return None
        # Evaluation
        if evaluation:
            progress["evaluation"] = "completed" if not evaluation.error_message else "failed"
            if evaluation.error_message:
                error_messages["evaluation"] = evaluation.error_message
            details["evaluation"] = {
                "started_at": getattr(evaluation, "created_at", None),
                "finished_at": getattr(evaluation, "updated_at", None),
                "estimated_time": (evaluation.updated_at - evaluation.created_at).total_seconds() if evaluation.created_at and evaluation.updated_at else None,
                "model_name": get_model_used("evaluation"),
            }
            agents["evaluation"] = {
                "status": progress["evaluation"],
                "result": {
                    "coherence": evaluation.coherence,
                    "relevance": evaluation.relevance,
                    "politeness": evaluation.politeness,
                    "resolution": evaluation.resolution,
                    "reasoning": evaluation.reasoning,
                    "evaluation_summary": evaluation.evaluation_summary,
                    "error_message": evaluation.error_message
                }
            }
        else:
            progress["evaluation"] = "pending"
            details["evaluation"] = {}
        # Analysis
        if analysis:
            progress["analysis"] = "completed" if not analysis.error_message else "failed"
            if analysis.error_message:
                error_messages["analysis"] = analysis.error_message
            details["analysis"] = {
                "started_at": getattr(analysis, "created_at", None),
                "finished_at": getattr(analysis, "updated_at", None),
                "estimated_time": (analysis.updated_at - analysis.created_at).total_seconds() if analysis.created_at and analysis.updated_at else None,
                "model_name": get_model_used("analysis"),
            }
            agents["analysis"] = {
                "status": progress["analysis"],
                "result": {
                    "guidelines": analysis.guidelines,
                    "issues": analysis.issues,
                    "highlights": analysis.highlights,
                    "analysis_summary": analysis.analysis_summary,
                    "error_message": analysis.error_message
                }
            }
        else:
            progress["analysis"] = "pending"
            details["analysis"] = {}
        # Recommendation
        if recommendation:
            progress["recommendation"] = "completed" if not recommendation.error_message else "failed"
            if recommendation.error_message:
                error_messages["recommendation"] = recommendation.error_message
            details["recommendation"] = {
                "started_at": getattr(recommendation, "created_at", None),
                "finished_at": getattr(recommendation, "updated_at", None),
                "estimated_time": (recommendation.updated_at - recommendation.created_at).total_seconds() if recommendation.created_at and recommendation.updated_at else None,
                "model_name": get_model_used("recommendation"),
            }
            agents["recommendation"] = {
                "status": progress["recommendation"],
                "result": {
                    "specific_feedback": recommendation.specific_feedback,
                    "long_term_coaching": recommendation.long_term_coaching,
                    "error_message": recommendation.error_message
                }
            }
        else:
            progress["recommendation"] = "pending"
            details["recommendation"] = {}
        # Status logic: completed only if all agents are completed, failed if any agent failed
        agent_statuses = [progress.get(agent) for agent in ["evaluation", "analysis", "recommendation"]]
        if all(s == "completed" for s in agent_statuses):
            overall_status = "completed"
        elif any(s == "failed" for s in agent_statuses):
            overall_status = "failed"
        else:
            overall_status = "processing"
        return {
            "chat_log_id": chat_log_id,
            "status": overall_status,
            "progress": progress,
            "error_messages": error_messages,
            "details": details,
            "agents": agents
        }
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
        evaluation = get_evaluation_or_none(db, chat_log_id)
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
    agent_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the analysis for a chat log, optionally filtered by agent_id.
    """
    try:
        query = db.query(Analysis).filter(Analysis.chat_log_id == chat_log_id)
        if agent_id:
            query = query.filter(Analysis.agent_id == agent_id)
        analysis = query.order_by(Analysis.created_at.desc()).first()
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
        return AnalysisResponse(
            id=analysis.id,
            chat_log_id=analysis.chat_log_id,
            agent_id=analysis.agent_id,
            guidelines=[
                {**g, 'passed': bool(g.get('passed', False))} if isinstance(g, dict) else g
                for g in (analysis.guidelines or [])
            ] if analysis.guidelines else None,
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
        logging.error(f"Error in get_analysis: {e}\n{traceback.format_exc()}")
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
        recommendation = get_recommendation_or_none(db, chat_log_id)
        if not recommendation:
            raise HTTPException(status_code=404, detail="Recommendation not found")
        return RecommendationResponse(
            id=recommendation.id,
            chat_log_id=recommendation.chat_log_id,
            error_message=recommendation.error_message,
            specific_feedback=recommendation.specific_feedback,
            long_term_coaching=recommendation.long_term_coaching,
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
        chat_log = get_chat_log_or_404(db, chat_log_id)
        
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
        chat_log = get_chat_log_or_404(db, chat_log_id)
        
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
        chat_log = get_chat_log_or_404(db, chat_log_id)
        
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

@router.get("/evaluations/by-agent/{agent_id}", response_model=List[EvaluationResponse])
async def get_evaluations_by_agent(
    agent_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all evaluations for a specific agent.
    Managers can see all agents, agents can only see their own evaluations.
    """
    try:
        # Check permissions
        if current_user.role != "manager":
            user_agent_id = current_user.agent_id or current_user.id
            if agent_id != user_agent_id:
                raise HTTPException(status_code=403, detail="You can only view your own evaluations")
        
        # Get evaluations for the agent
        evaluations = db.query(Evaluation).filter(Evaluation.agent_id == agent_id).all()
        
        return [
            EvaluationResponse(
                id=evaluation.id,
                chat_log_id=evaluation.chat_log_id,
                agent_id=evaluation.agent_id,
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
            for evaluation in evaluations
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting evaluations by agent: {str(e)}")

@router.get("/evaluations/all", response_model=List[EvaluationResponse])
async def get_all_evaluations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all evaluations (managers only).
    """
    try:
        # Check permissions
        if current_user.role != "manager":
            raise HTTPException(status_code=403, detail="Only managers can view all evaluations")
        
        # Get all evaluations
        evaluations = db.query(Evaluation).all()
        
        return [
            EvaluationResponse(
                id=evaluation.id,
                chat_log_id=evaluation.chat_log_id,
                agent_id=evaluation.agent_id,
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
            for evaluation in evaluations
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting all evaluations: {str(e)}")

async def process_chat_log_background(
    chat_log_id: str,
    transcript: List[Dict[str, str]],
    user_id: str,
    db: Session
):
    """
    Background task to process chat log through all agents.
    """
    import logging
    logger = logging.getLogger(__name__)
    try:
        logger.info(f"[PROCESSING] Starting background processing for chat_log_id={chat_log_id}")
        # Process through pipeline
        results = await processing_pipeline.process_chat_log(transcript, chat_log_id)
        logger.info(f"[PROCESSING] Pipeline results for chat_log_id={chat_log_id}: {results}")
        # Store results in database
        agent_types = ["evaluation", "analysis", "recommendation"]
        for agent_type in agent_types:
            agent_data = results["agents"].get(agent_type)
            if agent_data:
                if agent_data["status"] == "completed" and "result" in agent_data:
                    result = agent_data["result"]
                    logger.info(f"[PROCESSING] {agent_type} completed for chat_log_id={chat_log_id}")
                    if agent_type == "evaluation":
                        chat_log = db.query(ChatLog).filter(ChatLog.id == chat_log_id).first()
                        evaluation = Evaluation(
                            id=str(uuid.uuid4()),
                            chat_log_id=chat_log_id,
                            agent_id=chat_log.agent_id if chat_log else None,
                            coherence=result.get("coherence", {}).get("score"),
                            relevance=result.get("relevance", {}).get("score"),
                            politeness=result.get("politeness", {}).get("score"),
                            resolution=result.get("resolution", {}).get("score"),
                            reasoning=result,  # Store the full reasoning object
                            evaluation_summary=result.get("evaluation_summary"),
                            error_message=result.get("error_message"),
                            raw_output=result.get("raw_output")
                        )
                        db.add(evaluation)
                    elif agent_type == "analysis":
                        chat_log = db.query(ChatLog).filter(ChatLog.id == chat_log_id).first()
                        def map_guidelines(guidelines):
                            return [
                                {
                                    "name": g.get("guideline", g.get("name", "")),
                                    "passed": g.get("status", g.get("passed", False)) == "Passed" or g.get("passed", False) is True,
                                    "description": g.get("details", g.get("description", ""))
                                }
                                for g in (guidelines or [])
                            ]
                        analysis = Analysis(
                            id=str(uuid.uuid4()),
                            chat_log_id=chat_log_id,
                            agent_id=chat_log.agent_id if chat_log else None,
                            guidelines=map_guidelines(result.get("guidelines")),
                            issues=result.get("issues") or result.get("key_issues"),
                            highlights=result.get("highlights") or result.get("positive_highlights"),
                            analysis_summary=result.get("analysis_summary"),
                            error_message=result.get("error_message"),
                            raw_output=result.get("raw_output")
                        )
                        db.add(analysis)
                    elif agent_type == "recommendation":
                        # Normalize specific_feedback to always have 'original_text' and 'suggested_text' keys
                        def normalize_feedback(feedback):
                            if not feedback:
                                return []
                            normalized = []
                            for item in feedback:
                                if isinstance(item, dict):
                                    orig = item.get('original_text') or item.get('original') or ''
                                    sugg = item.get('suggested_text') or item.get('suggested') or ''
                                    normalized.append({'original_text': orig, 'suggested_text': sugg})
                                elif isinstance(item, (list, tuple)) and len(item) == 2:
                                    normalized.append({'original_text': item[0], 'suggested_text': item[1]})
                                else:
                                    # fallback: treat as string
                                    normalized.append({'original_text': str(item), 'suggested_text': ''})
                            return normalized
                        normalized_feedback = normalize_feedback(result.get("specific_feedback"))
                        recommendation = Recommendation(
                            id=str(uuid.uuid4()),
                            chat_log_id=chat_log_id,
                            error_message=result.get("error_message"),
                            specific_feedback=normalized_feedback,
                            long_term_coaching=result.get("long_term_coaching"),
                            raw_output=result.get("raw_output")
                        )
                        db.add(recommendation)
                elif agent_data["status"] == "failed":
                    logger.error(f"[PROCESSING] {agent_type} failed for chat_log_id={chat_log_id}: {agent_data.get('error_message')}")
                    chat_log = db.query(ChatLog).filter(ChatLog.id == chat_log_id).first()
                    if agent_type == "evaluation":
                        evaluation = Evaluation(
                            id=str(uuid.uuid4()),
                            chat_log_id=chat_log_id,
                            agent_id=chat_log.agent_id if chat_log else None,
                            error_message=agent_data.get("error_message")
                        )
                        db.add(evaluation)
                    elif agent_type == "analysis":
                        analysis = Analysis(
                            id=str(uuid.uuid4()),
                            chat_log_id=chat_log_id,
                            agent_id=chat_log.agent_id if chat_log else None,
                            error_message=agent_data.get("error_message")
                        )
                        db.add(analysis)
                    elif agent_type == "recommendation":
                        recommendation = Recommendation(
                            id=str(uuid.uuid4()),
                            chat_log_id=chat_log_id,
                            error_message=agent_data.get("error_message")
                        )
                        db.add(recommendation)
            else:
                logger.warning(f"[PROCESSING] No result for agent {agent_type} for chat_log_id={chat_log_id}")
        # Update chat log status
        chat_log = db.query(ChatLog).filter(ChatLog.id == chat_log_id).first()
        if chat_log:
            logger.info(f"[PROCESSING] Setting chat_log.status for chat_log_id={chat_log_id} to {results['overall_status']}")
            if results["overall_status"] == "completed":
                chat_log.status = ProcessingStatus.COMPLETED
            elif results["overall_status"] == "failed":
                chat_log.status = ProcessingStatus.FAILED
            else:
                chat_log.status = ProcessingStatus.COMPLETED  # Partial success is still completed
        db.commit()
        logger.info(f"[PROCESSING] Finished processing and committed for chat_log_id={chat_log_id}")
    except Exception as e:
        # Update chat log status to failed
        logger.error(f"[PROCESSING] Exception in background processing for chat_log_id={chat_log_id}: {e}")
        try:
            chat_log = db.query(ChatLog).filter(ChatLog.id == chat_log_id).first()
            if chat_log:
                chat_log.status = ProcessingStatus.FAILED
            db.commit()
        except Exception as db_e:
            logger.error(f"[PROCESSING] Failed to update chat_log status to FAILED for chat_log_id={chat_log_id}: {db_e}")

@router.get("/analyses/by-agent/{agent_id}", response_model=List[AnalysisResponse])
async def get_analyses_by_agent(
    agent_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all analyses for a given agent_id.
    """
    try:
        analyses = db.query(Analysis).filter(Analysis.agent_id == agent_id).all()
        def map_guidelines(guidelines):
            return [
                {
                    "name": g.get("guideline", g.get("name", "")),
                    "passed": g.get("status", g.get("passed", False)) == "Passed" or g.get("passed", False) is True,
                    "description": g.get("details", g.get("description", ""))
                }
                for g in (guidelines or [])
            ]
        return [
            AnalysisResponse(
                id=a.id,
                chat_log_id=a.chat_log_id,
                agent_id=a.agent_id,
                guidelines=map_guidelines(a.guidelines),
                issues=a.issues,
                highlights=a.highlights,
                analysis_summary=a.analysis_summary,
                error_message=a.error_message,
                created_at=a.created_at,
                updated_at=a.updated_at
            ) for a in analyses
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting analyses by agent: {str(e)}")

@router.get("/analyses/all", response_model=List[AnalysisResponse])
async def get_all_analyses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all analyses.
    """
    try:
        analyses = db.query(Analysis).all()
        def map_guidelines(guidelines):
            return [
                {
                    "name": g.get("guideline", g.get("name", "")),
                    "passed": g.get("status", g.get("passed", False)) == "Passed" or g.get("passed", False) is True,
                    "description": g.get("details", g.get("description", ""))
                }
                for g in (guidelines or [])
            ]
        return [
            AnalysisResponse(
                id=a.id,
                chat_log_id=a.chat_log_id,
                agent_id=a.agent_id,
                guidelines=map_guidelines(a.guidelines),
                issues=a.issues,
                highlights=a.highlights,
                analysis_summary=a.analysis_summary,
                error_message=a.error_message,
                created_at=a.created_at,
                updated_at=a.updated_at
            ) for a in analyses
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting all analyses: {str(e)}")

# --- Helper functions ---
def get_chat_log_or_404(db: Session, chat_log_id: str) -> ChatLog:
    chat_log = db.query(ChatLog).filter(ChatLog.id == chat_log_id).first()
    if not chat_log:
        raise HTTPException(status_code=404, detail="Chat log not found")
    return chat_log

def get_evaluation_or_none(db: Session, chat_log_id: str) -> Optional[Evaluation]:
    return db.query(Evaluation).filter(Evaluation.chat_log_id == chat_log_id).first()

def get_analysis_or_none(db: Session, chat_log_id: str) -> Optional[Analysis]:
    return db.query(Analysis).filter(Analysis.chat_log_id == chat_log_id).first()

def get_recommendation_or_none(db: Session, chat_log_id: str) -> Optional[Recommendation]:
    return db.query(Recommendation).filter(Recommendation.chat_log_id == chat_log_id).first() 