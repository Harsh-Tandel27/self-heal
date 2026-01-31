"""
Real Data System - Webhook receivers for external integrations.
"""
from fastapi import APIRouter, Request, HTTPException
from typing import Dict, Any
from datetime import datetime
from models import Signal, SignalType, SignalSeverity
from agent.observer import observer
import json

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/stripe")
async def stripe_webhook(request: Request):
    """
    Receive Stripe webhooks (payment failures, disputes, etc.)
    """
    try:
        payload = await request.json()
    except:
        payload = {}
    
    event_type = payload.get("type", "unknown")
    
    # Map Stripe events to signal types
    severity = SignalSeverity.MEDIUM
    if "failed" in event_type or "dispute" in event_type:
        severity = SignalSeverity.HIGH
    
    signal = Signal(
        type=SignalType.CHECKOUT_EVENT,
        source="stripe",
        merchant_id=payload.get("data", {}).get("object", {}).get("metadata", {}).get("merchant_id", "unknown"),
        severity=severity,
        title=f"Stripe: {event_type}",
        content={
            "event_type": event_type,
            "event_id": payload.get("id"),
            "object": payload.get("data", {}).get("object", {}),
        },
        metadata={"raw_payload_size": len(str(payload))}
    )
    
    signal_id = await observer.ingest_signal(signal)
    
    return {"status": "received", "signal_id": signal_id}


@router.post("/shopify")
async def shopify_webhook(request: Request):
    """
    Receive Shopify webhooks (order failures, inventory issues, etc.)
    """
    try:
        payload = await request.json()
    except:
        payload = {}
    
    topic = request.headers.get("X-Shopify-Topic", "unknown")
    shop = request.headers.get("X-Shopify-Shop-Domain", "unknown")
    
    # Determine severity based on topic
    severity = SignalSeverity.MEDIUM
    if "checkout" in topic or "order" in topic:
        severity = SignalSeverity.HIGH
    
    signal = Signal(
        type=SignalType.CHECKOUT_EVENT if "checkout" in topic else SignalType.API_ERROR,
        source="shopify",
        merchant_id=shop,
        severity=severity,
        title=f"Shopify: {topic}",
        content={
            "topic": topic,
            "shop": shop,
            "payload": payload
        },
    )
    
    signal_id = await observer.ingest_signal(signal)
    
    return {"status": "received", "signal_id": signal_id}


@router.post("/zendesk")
async def zendesk_webhook(request: Request):
    """
    Receive Zendesk webhooks (new tickets, updates, etc.)
    """
    try:
        payload = await request.json()
    except:
        payload = {}
    
    ticket = payload.get("ticket", {})
    
    # Determine severity based on priority
    priority = ticket.get("priority", "normal")
    severity_map = {
        "urgent": SignalSeverity.CRITICAL,
        "high": SignalSeverity.HIGH,
        "normal": SignalSeverity.MEDIUM,
        "low": SignalSeverity.LOW,
    }
    severity = severity_map.get(priority, SignalSeverity.MEDIUM)
    
    signal = Signal(
        type=SignalType.SUPPORT_TICKET,
        source="zendesk",
        merchant_id=ticket.get("custom_fields", {}).get("merchant_id", "unknown"),
        severity=severity,
        title=ticket.get("subject", "Support Ticket"),
        content={
            "ticket_id": ticket.get("id"),
            "subject": ticket.get("subject"),
            "description": ticket.get("description", "")[:1000],  # Truncate
            "priority": priority,
            "tags": ticket.get("tags", []),
            "requester_email": ticket.get("requester", {}).get("email"),
        },
    )
    
    signal_id = await observer.ingest_signal(signal)
    
    return {"status": "received", "signal_id": signal_id}


@router.post("/freshdesk")
async def freshdesk_webhook(request: Request):
    """
    Receive Freshdesk webhooks.
    """
    try:
        payload = await request.json()
    except:
        payload = {}
    
    ticket = payload.get("freshdesk_webhook", payload)
    
    signal = Signal(
        type=SignalType.SUPPORT_TICKET,
        source="freshdesk",
        merchant_id=str(ticket.get("company_id", "unknown")),
        severity=SignalSeverity.MEDIUM,
        title=ticket.get("ticket_subject", "Support Ticket"),
        content={
            "ticket_id": ticket.get("ticket_id"),
            "subject": ticket.get("ticket_subject"),
            "description": ticket.get("ticket_description", "")[:1000],
            "status": ticket.get("ticket_status"),
            "requester_email": ticket.get("ticket_requester_email"),
        },
    )
    
    signal_id = await observer.ingest_signal(signal)
    
    return {"status": "received", "signal_id": signal_id}


@router.post("/generic")
async def generic_webhook(request: Request):
    """
    Generic webhook receiver for any system.
    Expects: {type, merchant_id, title, content, severity?}
    """
    try:
        payload = await request.json()
    except:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    
    signal_type_str = payload.get("type", "api_error")
    try:
        signal_type = SignalType(signal_type_str)
    except ValueError:
        signal_type = SignalType.API_ERROR
    
    severity_str = payload.get("severity", "medium")
    try:
        severity = SignalSeverity(severity_str)
    except ValueError:
        severity = SignalSeverity.MEDIUM
    
    signal = Signal(
        type=signal_type,
        source=payload.get("source", "generic"),
        merchant_id=payload.get("merchant_id", "unknown"),
        severity=severity,
        title=payload.get("title", "Generic Signal"),
        content=payload.get("content", {}),
        metadata=payload.get("metadata", {}),
    )
    
    signal_id = await observer.ingest_signal(signal)
    
    return {"status": "received", "signal_id": signal_id}
