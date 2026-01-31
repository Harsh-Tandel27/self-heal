"""
Pydantic models for workflows - remediation action sequences.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class WorkflowStatus(str, Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"


class StepStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ActionType(str, Enum):
    SEND_NOTIFICATION = "send_notification"
    UPDATE_CONFIG = "update_config"
    ESCALATE_ENGINEERING = "escalate_engineering"
    REPLY_TICKET = "reply_ticket"
    TRIGGER_WEBHOOK = "trigger_webhook"
    RUN_DIAGNOSTIC = "run_diagnostic"
    APPLY_HOTFIX = "apply_hotfix"
    ROLLBACK_CHANGE = "rollback_change"
    UPDATE_DOCUMENTATION = "update_documentation"
    NOTIFY_MERCHANT = "notify_merchant"
    FIX_STORE_CHAOS = "fix_store_chaos"
    TAKE_SCREENSHOT = "take_screenshot"  # NEW: Visual Proof


class WorkflowStep(BaseModel):
    """A single step in a workflow."""
    id: int
    name: str
    action_type: ActionType
    description: str
    parameters: Dict[str, Any] = {}
    
    # Execution
    status: StepStatus = StepStatus.PENDING
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    
    # Dependencies
    depends_on: List[int] = []  # Step IDs this depends on
    
    # Risk
    risk_level: RiskLevel = RiskLevel.LOW
    requires_approval: bool = False
    rollback_action: Optional[str] = None


class Workflow(BaseModel):
    """A remediation workflow for an issue."""
    id: Optional[str] = Field(default=None, alias="_id")
    
    # Link to issue
    issue_id: str
    
    # Workflow definition
    name: str
    description: str
    steps: List[WorkflowStep]
    
    # Origin
    created_by: str = "agent"  # "agent" or user ID
    template_id: Optional[str] = None
    
    # Risk assessment
    overall_risk: RiskLevel = RiskLevel.LOW
    requires_approval: bool = True
    approval_count_required: int = 1
    
    # Approvals
    approvals: List[Dict[str, Any]] = []  # [{user, timestamp, comment}]
    rejections: List[Dict[str, Any]] = []
    
    # Execution
    status: WorkflowStatus = WorkflowStatus.DRAFT
    current_step: int = 0
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Outcome tracking
    outcome: Optional[str] = None
    merchant_feedback: Optional[str] = None

    class Config:
        populate_by_name = True


class WorkflowTemplate(BaseModel):
    """Pre-built workflow templates for common issues."""
    id: Optional[str] = Field(default=None, alias="_id")
    name: str
    description: str
    category: str  # Maps to IssueCategory
    trigger_patterns: List[str]
    steps: List[WorkflowStep]
    overall_risk: RiskLevel
    usage_count: int = 0
    success_rate: float = 0.0
