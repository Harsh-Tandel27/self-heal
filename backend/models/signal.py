"""
Pydantic models for signals - raw events from various sources.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
from bson import ObjectId


class SignalType(str, Enum):
    SUPPORT_TICKET = "support_ticket"
    API_ERROR = "api_error"
    WEBHOOK_FAILURE = "webhook_failure"
    CHECKOUT_EVENT = "checkout_event"
    MIGRATION_EVENT = "migration_event"


class SignalSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Signal(BaseModel):
    """A raw signal from any source."""
    id: Optional[str] = Field(default=None, alias="_id")
    type: SignalType
    source: str  # e.g., "stripe", "shopify", "zendesk", "merchant_sdk"
    merchant_id: str
    severity: SignalSeverity = SignalSeverity.MEDIUM
    title: str
    content: Dict[str, Any]
    metadata: Dict[str, Any] = {}
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    processed: bool = False
    issue_id: Optional[str] = None  # Linked issue once processed

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class SupportTicket(BaseModel):
    """Support ticket signal content."""
    ticket_id: str
    subject: str
    description: str
    customer_email: str
    priority: str
    tags: List[str] = []
    merchant_name: str


class APIError(BaseModel):
    """API error signal content."""
    endpoint: str
    method: str
    status_code: int
    error_message: str
    request_id: str
    stack_trace: Optional[str] = None


class WebhookFailure(BaseModel):
    """Webhook failure signal content."""
    webhook_url: str
    event_type: str
    payload_snippet: str
    failure_reason: str
    retry_count: int
    last_attempt: datetime


class CheckoutEvent(BaseModel):
    """Checkout event signal content."""
    checkout_id: str
    cart_value: float
    currency: str
    stage: str  # cart, shipping, payment, confirmation
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    customer_id: Optional[str] = None


class MigrationEvent(BaseModel):
    """Migration stage event signal content."""
    migration_id: str
    stage: str  # pre_migration, data_sync, cutover, post_migration
    status: str  # started, in_progress, completed, failed
    components_affected: List[str]
    error_details: Optional[str] = None
