"""
Pydantic models for audit logs - complete history of agent actions.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum


class AuditEventType(str, Enum):
    SIGNAL_RECEIVED = "signal_received"
    ISSUE_DETECTED = "issue_detected"
    ISSUE_ANALYZED = "issue_analyzed"
    WORKFLOW_CREATED = "workflow_created"
    WORKFLOW_APPROVED = "workflow_approved"
    WORKFLOW_REJECTED = "workflow_rejected"
    WORKFLOW_STARTED = "workflow_started"
    STEP_EXECUTED = "step_executed"
    STEP_FAILED = "step_failed"
    WORKFLOW_COMPLETED = "workflow_completed"
    WORKFLOW_ROLLED_BACK = "workflow_rolled_back"
    HUMAN_OVERRIDE = "human_override"
    ESCALATION = "escalation"
    CONFIG_CHANGE = "config_change"


class AuditLog(BaseModel):
    """An audit log entry for any agent action."""
    id: Optional[str] = Field(default=None, alias="_id")
    
    # Event details
    event_type: AuditEventType
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # Actor
    actor: str = "agent"  # "agent" or user ID
    
    # Context
    signal_id: Optional[str] = None
    issue_id: Optional[str] = None
    workflow_id: Optional[str] = None
    step_id: Optional[int] = None
    
    # Details
    action: str
    description: str
    details: Dict[str, Any] = {}
    
    # Outcome
    success: bool = True
    error_message: Optional[str] = None
    
    # For explainability
    reasoning: Optional[str] = None
    confidence: Optional[float] = None

    class Config:
        populate_by_name = True
