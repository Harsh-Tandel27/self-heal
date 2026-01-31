"""
Error Generator - API endpoints to trigger real errors for testing.
"""
from fastapi import APIRouter
from typing import Dict, Any, Optional
from datetime import datetime
from models import Signal, SignalType, SignalSeverity
from agent.observer import observer
import random
import uuid

router = APIRouter(prefix="/trigger", tags=["error-generator"])


@router.post("/checkout-failure")
async def trigger_checkout_failure(
    merchant_id: str = "test_merchant",
    error_type: str = "payment_declined",
    cart_value: float = 99.99
):
    """
    Trigger a real checkout failure event.
    """
    error_types = {
        "payment_declined": {
            "error_code": "card_declined",
            "message": "The card was declined",
            "severity": SignalSeverity.HIGH,
        },
        "invalid_cart": {
            "error_code": "invalid_cart",
            "message": "Cart contains unavailable items",
            "severity": SignalSeverity.MEDIUM,
        },
        "shipping_unavailable": {
            "error_code": "shipping_error",
            "message": "No shipping options available for address",
            "severity": SignalSeverity.MEDIUM,
        },
        "timeout": {
            "error_code": "gateway_timeout",
            "message": "Payment gateway timeout",
            "severity": SignalSeverity.CRITICAL,
        },
    }
    
    error_info = error_types.get(error_type, error_types["payment_declined"])
    
    signal = Signal(
        type=SignalType.CHECKOUT_EVENT,
        source="headless_checkout",
        merchant_id=merchant_id,
        severity=error_info["severity"],
        title=f"Checkout Failure: {error_info['error_code']}",
        content={
            "checkout_id": f"chk_{uuid.uuid4().hex[:12]}",
            "cart_value": cart_value,
            "currency": "USD",
            "stage": "payment",
            "error_code": error_info["error_code"],
            "error_message": error_info["message"],
            "customer_id": f"cust_{uuid.uuid4().hex[:8]}",
        },
    )
    
    signal_id = await observer.ingest_signal(signal)
    
    return {
        "status": "error_triggered",
        "signal_id": signal_id,
        "error_type": error_type,
        "merchant_id": merchant_id
    }


@router.post("/api-misconfiguration")
async def trigger_api_misconfiguration(
    merchant_id: str = "test_merchant",
    endpoint: str = "/api/products",
    error_type: str = "auth_failure"
):
    """
    Trigger an API misconfiguration error.
    """
    error_types = {
        "auth_failure": {
            "status_code": 401,
            "message": "Invalid API key or token expired",
            "severity": SignalSeverity.HIGH,
        },
        "rate_limit": {
            "status_code": 429,
            "message": "Rate limit exceeded",
            "severity": SignalSeverity.MEDIUM,
        },
        "invalid_endpoint": {
            "status_code": 404,
            "message": "Endpoint not found - check API version",
            "severity": SignalSeverity.MEDIUM,
        },
        "server_error": {
            "status_code": 500,
            "message": "Internal server error",
            "severity": SignalSeverity.CRITICAL,
        },
        "bad_request": {
            "status_code": 400,
            "message": "Invalid request parameters",
            "severity": SignalSeverity.LOW,
        },
    }
    
    error_info = error_types.get(error_type, error_types["auth_failure"])
    
    signal = Signal(
        type=SignalType.API_ERROR,
        source="platform_api",
        merchant_id=merchant_id,
        severity=error_info["severity"],
        title=f"API Error: {error_info['status_code']} on {endpoint}",
        content={
            "endpoint": endpoint,
            "method": "GET",
            "status_code": error_info["status_code"],
            "error_message": error_info["message"],
            "request_id": f"req_{uuid.uuid4().hex[:12]}",
        },
    )
    
    signal_id = await observer.ingest_signal(signal)
    
    return {
        "status": "error_triggered",
        "signal_id": signal_id,
        "error_type": error_type,
        "endpoint": endpoint
    }


@router.post("/webhook-failure")
async def trigger_webhook_failure(
    merchant_id: str = "test_merchant",
    webhook_type: str = "order.created",
    failure_reason: str = "connection_refused"
):
    """
    Trigger a webhook delivery failure.
    """
    reasons = {
        "connection_refused": "Connection refused by merchant server",
        "timeout": "Webhook delivery timed out",
        "ssl_error": "SSL certificate validation failed",
        "invalid_response": "Merchant returned non-2xx response",
    }
    
    signal = Signal(
        type=SignalType.WEBHOOK_FAILURE,
        source="webhook_service",
        merchant_id=merchant_id,
        severity=SignalSeverity.HIGH,
        title=f"Webhook Failed: {webhook_type}",
        content={
            "webhook_url": f"https://{merchant_id}.example.com/webhooks",
            "event_type": webhook_type,
            "payload_snippet": '{"order_id": "123", "event": "..."}',
            "failure_reason": reasons.get(failure_reason, failure_reason),
            "retry_count": random.randint(1, 5),
            "last_attempt": datetime.utcnow().isoformat(),
        },
    )
    
    signal_id = await observer.ingest_signal(signal)
    
    return {
        "status": "error_triggered",
        "signal_id": signal_id,
        "webhook_type": webhook_type,
        "failure_reason": failure_reason
    }


@router.post("/migration-issue")
async def trigger_migration_issue(
    merchant_id: str = "test_merchant",
    stage: str = "data_sync",
    issue_type: str = "sync_failure"
):
    """
    Trigger a migration-related issue.
    """
    issues = {
        "sync_failure": {
            "message": "Product catalog sync failed - 150 products missing",
            "severity": SignalSeverity.HIGH,
            "components": ["catalog", "inventory"],
        },
        "schema_mismatch": {
            "message": "Schema mismatch detected in customer data",
            "severity": SignalSeverity.CRITICAL,
            "components": ["customers", "orders"],
        },
        "webhook_gap": {
            "message": "Webhooks not configured for headless endpoints",
            "severity": SignalSeverity.MEDIUM,
            "components": ["webhooks"],
        },
        "theme_incompatible": {
            "message": "Legacy theme components not compatible with headless",
            "severity": SignalSeverity.MEDIUM,
            "components": ["frontend", "theme"],
        },
    }
    
    issue_info = issues.get(issue_type, issues["sync_failure"])
    
    signal = Signal(
        type=SignalType.MIGRATION_EVENT,
        source="migration_service",
        merchant_id=merchant_id,
        severity=issue_info["severity"],
        title=f"Migration Issue: {issue_type}",
        content={
            "migration_id": f"mig_{uuid.uuid4().hex[:8]}",
            "stage": stage,
            "status": "failed",
            "components_affected": issue_info["components"],
            "error_details": issue_info["message"],
        },
    )
    
    signal_id = await observer.ingest_signal(signal)
    
    return {
        "status": "error_triggered",
        "signal_id": signal_id,
        "stage": stage,
        "issue_type": issue_type
    }


@router.post("/support-ticket")
async def trigger_support_ticket(
    merchant_id: str = "test_merchant",
    subject: str = "Checkout not working",
    priority: str = "high",
    tags: str = "checkout,headless,urgent"
):
    """
    Create a simulated support ticket.
    """
    severity_map = {
        "urgent": SignalSeverity.CRITICAL,
        "high": SignalSeverity.HIGH,
        "normal": SignalSeverity.MEDIUM,
        "low": SignalSeverity.LOW,
    }
    
    signal = Signal(
        type=SignalType.SUPPORT_TICKET,
        source="support_portal",
        merchant_id=merchant_id,
        severity=severity_map.get(priority, SignalSeverity.MEDIUM),
        title=subject,
        content={
            "ticket_id": f"TKT-{random.randint(10000, 99999)}",
            "subject": subject,
            "description": f"We are experiencing issues with our headless checkout. The {subject.lower()} since we started the migration. Please help urgently.",
            "customer_email": f"support@{merchant_id}.com",
            "priority": priority,
            "tags": tags.split(","),
            "merchant_name": merchant_id.replace("_", " ").title(),
        },
    )
    
    signal_id = await observer.ingest_signal(signal)
    
    return {
        "status": "ticket_created",
        "signal_id": signal_id,
        "subject": subject,
        "priority": priority
    }
