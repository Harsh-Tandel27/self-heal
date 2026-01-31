"""
Pydantic models for issues - analyzed problems identified by the agent.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class IssueCategory(str, Enum):
    MIGRATION = "migration"
    PLATFORM_BUG = "platform_bug"
    DOCUMENTATION_GAP = "documentation_gap"
    MERCHANT_CONFIG = "merchant_config"
    UNKNOWN = "unknown"


class IssueStatus(str, Enum):
    DETECTED = "detected"
    ANALYZING = "analyzing"
    PENDING_ACTION = "pending_action"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    ESCALATED = "escalated"


class ReasoningStep(BaseModel):
    """A single step in the AI reasoning chain."""
    step_number: int
    observation: str
    inference: str
    confidence: float  # 0-1


class Issue(BaseModel):
    """An analyzed issue identified by the agent."""
    id: Optional[str] = Field(default=None, alias="_id")
    
    # Linked signals
    signal_ids: List[str] = []
    
    # Classification
    category: IssueCategory
    subcategory: Optional[str] = None
    
    # Analysis
    title: str
    summary: str
    root_cause: str
    reasoning_chain: List[ReasoningStep] = []
    confidence: float  # Overall confidence 0-1
    
    # Impact assessment
    affected_merchants: List[str] = []
    merchant_count: int = 1
    estimated_impact: str  # "low", "medium", "high", "critical"
    financial_impact: Optional[float] = None
    
    # Status tracking
    status: IssueStatus = IssueStatus.DETECTED
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None
    
    # Agent action tracking
    proposed_actions: List[str] = []
    workflow_id: Optional[str] = None

    class Config:
        populate_by_name = True


class IssuePattern(BaseModel):
    """A recurring pattern of issues."""
    id: Optional[str] = Field(default=None, alias="_id")
    pattern_name: str
    description: str
    category: IssueCategory
    trigger_conditions: Dict[str, Any]
    occurrence_count: int = 0
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    recommended_workflow_template: Optional[str] = None
