"""
Scenario Engine - Multi-step realistic error scenarios.
"""
from fastapi import APIRouter, BackgroundTasks
from typing import Dict, Any, List, Optional
from datetime import datetime
import asyncio
import random
from data_system.error_generator import (
    trigger_checkout_failure,
    trigger_api_misconfiguration,
    trigger_webhook_failure,
    trigger_migration_issue,
    trigger_support_ticket,
)

router = APIRouter(prefix="/scenarios", tags=["scenarios"])

# Active scenarios tracking
active_scenarios: Dict[str, Dict[str, Any]] = {}


@router.get("/")
async def list_scenarios():
    """List all available scenarios."""
    return {
        "available": [
            {
                "id": "migration_chaos",
                "name": "Migration Chaos",
                "description": "Simulates 10 merchants mid-migration with random failures",
                "duration": "5 minutes",
            },
            {
                "id": "checkout_storm",
                "name": "Checkout Storm",
                "description": "Rapid checkout failures across multiple merchants",
                "duration": "3 minutes",
            },
            {
                "id": "webhook_cascade",
                "name": "Webhook Cascade",
                "description": "Webhook delivery failures causing downstream issues",
                "duration": "4 minutes",
            },
            {
                "id": "api_degradation",
                "name": "API Degradation",
                "description": "Gradual API response time increase leading to failures",
                "duration": "5 minutes",
            },
            {
                "id": "config_drift",
                "name": "Configuration Drift",
                "description": "Merchant config becomes invalid over time",
                "duration": "4 minutes",
            },
        ],
        "active": list(active_scenarios.keys())
    }


@router.post("/start/{scenario_id}")
async def start_scenario(scenario_id: str, background_tasks: BackgroundTasks):
    """Start a scenario in the background."""
    if scenario_id in active_scenarios:
        return {"status": "error", "message": "Scenario already running"}
    
    scenarios = {
        "migration_chaos": run_migration_chaos,
        "checkout_storm": run_checkout_storm,
        "webhook_cascade": run_webhook_cascade,
        "api_degradation": run_api_degradation,
        "config_drift": run_config_drift,
    }
    
    if scenario_id not in scenarios:
        return {"status": "error", "message": "Unknown scenario"}
    
    active_scenarios[scenario_id] = {
        "started_at": datetime.utcnow().isoformat(),
        "status": "running",
        "events_generated": 0,
    }
    
    background_tasks.add_task(scenarios[scenario_id], scenario_id)
    
    return {"status": "started", "scenario_id": scenario_id}


@router.post("/stop/{scenario_id}")
async def stop_scenario(scenario_id: str):
    """Stop a running scenario."""
    if scenario_id in active_scenarios:
        active_scenarios[scenario_id]["status"] = "stopping"
        # Give it a moment then force remove
        await asyncio.sleep(0.5)
        if scenario_id in active_scenarios:
            active_scenarios[scenario_id]["status"] = "stopped"
            del active_scenarios[scenario_id]
        return {"status": "stopped", "scenario_id": scenario_id}
    return {"status": "error", "message": "Scenario not running"}


@router.post("/stop-all")
async def stop_all_scenarios():
    """Stop all running scenarios."""
    stopped = []
    for scenario_id in list(active_scenarios.keys()):
        active_scenarios[scenario_id]["status"] = "stopping"
        stopped.append(scenario_id)
    
    await asyncio.sleep(0.5)
    
    # Force remove all
    for scenario_id in stopped:
        if scenario_id in active_scenarios:
            del active_scenarios[scenario_id]
    
    return {"status": "stopped", "scenarios": stopped}


@router.get("/status/{scenario_id}")
async def get_scenario_status(scenario_id: str):
    """Get status of a scenario."""
    if scenario_id in active_scenarios:
        return active_scenarios[scenario_id]
    return {"status": "not_running"}


# Scenario implementations

async def run_migration_chaos(scenario_id: str):
    """Simulate 10 merchants mid-migration with random failures."""
    merchants = [f"merchant_{i}" for i in range(1, 11)]
    stages = ["pre_migration", "data_sync", "cutover", "post_migration"]
    issue_types = ["sync_failure", "schema_mismatch", "webhook_gap", "theme_incompatible"]
    
    try:
        for round_num in range(10):  # 10 rounds
            if active_scenarios.get(scenario_id, {}).get("status") == "stopping":
                break
            
            # Random subset of merchants have issues
            affected = random.sample(merchants, k=random.randint(2, 5))
            
            for merchant in affected:
                await trigger_migration_issue(
                    merchant_id=merchant,
                    stage=random.choice(stages),
                    issue_type=random.choice(issue_types)
                )
                if scenario_id in active_scenarios:
                    active_scenarios[scenario_id]["events_generated"] = \
                        active_scenarios[scenario_id].get("events_generated", 0) + 1
            
            # Also generate some support tickets
            if random.random() > 0.5:
                await trigger_support_ticket(
                    merchant_id=random.choice(affected),
                    subject="Migration blocking our store",
                    priority="urgent",
                    tags="migration,urgent,blocking"
                )
                if scenario_id in active_scenarios:
                    active_scenarios[scenario_id]["events_generated"] += 1
            
            await asyncio.sleep(30)  # Wait 30 seconds between rounds
    finally:
        if scenario_id in active_scenarios:
            active_scenarios[scenario_id]["status"] = "completed"


async def run_checkout_storm(scenario_id: str):
    """Rapid checkout failures across multiple merchants."""
    merchants = [f"store_{i}" for i in range(1, 8)]
    error_types = ["payment_declined", "timeout", "invalid_cart", "shipping_unavailable"]
    
    try:
        for round_num in range(18):  # 18 rounds, ~10 seconds each = 3 minutes
            if active_scenarios.get(scenario_id, {}).get("status") == "stopping":
                break
            
            # Generate burst of errors
            for _ in range(random.randint(3, 8)):
                await trigger_checkout_failure(
                    merchant_id=random.choice(merchants),
                    error_type=random.choice(error_types),
                    cart_value=round(random.uniform(10, 500), 2)
                )
                if scenario_id in active_scenarios:
                    active_scenarios[scenario_id]["events_generated"] = \
                        active_scenarios[scenario_id].get("events_generated", 0) + 1
            
            await asyncio.sleep(10)
    finally:
        if scenario_id in active_scenarios:
            active_scenarios[scenario_id]["status"] = "completed"


async def run_webhook_cascade(scenario_id: str):
    """Webhook delivery failures causing downstream issues."""
    merchants = [f"shop_{i}" for i in range(1, 6)]
    webhook_types = ["order.created", "order.paid", "inventory.updated", "customer.created"]
    failure_reasons = ["connection_refused", "timeout", "ssl_error", "invalid_response"]
    
    try:
        for round_num in range(12):  # 12 rounds
            if active_scenarios.get(scenario_id, {}).get("status") == "stopping":
                break
            
            # Cascade effect - one merchant's failures trigger more
            primary_merchant = random.choice(merchants)
            
            # Initial failure
            await trigger_webhook_failure(
                merchant_id=primary_merchant,
                webhook_type=random.choice(webhook_types),
                failure_reason=random.choice(failure_reasons)
            )
            if scenario_id in active_scenarios:
                active_scenarios[scenario_id]["events_generated"] = \
                    active_scenarios[scenario_id].get("events_generated", 0) + 1
            
            # This causes more failures
            await asyncio.sleep(2)
            
            for _ in range(random.randint(2, 4)):
                await trigger_webhook_failure(
                    merchant_id=primary_merchant,
                    webhook_type=random.choice(webhook_types),
                    failure_reason="timeout"  # Cascade usually causes timeouts
                )
                if scenario_id in active_scenarios:
                    active_scenarios[scenario_id]["events_generated"] += 1
            
            # Support tickets start coming in
            if round_num > 3:
                await trigger_support_ticket(
                    merchant_id=primary_merchant,
                    subject="Webhooks not being delivered",
                    priority="high",
                    tags="webhooks,integration,data-loss"
                )
                if scenario_id in active_scenarios:
                    active_scenarios[scenario_id]["events_generated"] += 1
            
            await asyncio.sleep(18)
    finally:
        if scenario_id in active_scenarios:
            active_scenarios[scenario_id]["status"] = "completed"


async def run_api_degradation(scenario_id: str):
    """Gradual API response time increase leading to failures."""
    merchants = [f"client_{i}" for i in range(1, 7)]
    endpoints = ["/api/products", "/api/orders", "/api/inventory", "/api/customers"]
    
    try:
        # Start with rate limits, escalate to errors
        error_progression = [
            ("rate_limit", 4),
            ("rate_limit", 6),
            ("bad_request", 3),
            ("auth_failure", 2),
            ("server_error", 5),
            ("server_error", 8),
        ]
        
        for error_type, count in error_progression:
            if active_scenarios.get(scenario_id, {}).get("status") == "stopping":
                break
            
            for _ in range(count):
                await trigger_api_misconfiguration(
                    merchant_id=random.choice(merchants),
                    endpoint=random.choice(endpoints),
                    error_type=error_type
                )
                if scenario_id in active_scenarios:
                    active_scenarios[scenario_id]["events_generated"] = \
                        active_scenarios[scenario_id].get("events_generated", 0) + 1
            
            await asyncio.sleep(50)
    finally:
        if scenario_id in active_scenarios:
            active_scenarios[scenario_id]["status"] = "completed"


async def run_config_drift(scenario_id: str):
    """Merchant config becomes invalid over time."""
    merchants = [f"brand_{i}" for i in range(1, 6)]
    
    try:
        drift_sequence = [
            ("api-misconfiguration", "rate_limit"),
            ("api-misconfiguration", "auth_failure"),
            ("webhook-failure", "ssl_error"),
            ("checkout-failure", "payment_declined"),
            ("migration-issue", "webhook_gap"),
        ]
        
        for drift_type, subtype in drift_sequence:
            if active_scenarios.get(scenario_id, {}).get("status") == "stopping":
                break
            
            affected = random.sample(merchants, k=random.randint(1, 3))
            
            for merchant in affected:
                if drift_type == "api-misconfiguration":
                    await trigger_api_misconfiguration(
                        merchant_id=merchant,
                        error_type=subtype
                    )
                elif drift_type == "webhook-failure":
                    await trigger_webhook_failure(
                        merchant_id=merchant,
                        failure_reason=subtype
                    )
                elif drift_type == "checkout-failure":
                    await trigger_checkout_failure(
                        merchant_id=merchant,
                        error_type=subtype
                    )
                elif drift_type == "migration-issue":
                    await trigger_migration_issue(
                        merchant_id=merchant,
                        issue_type=subtype
                    )
                
                if scenario_id in active_scenarios:
                    active_scenarios[scenario_id]["events_generated"] = \
                        active_scenarios[scenario_id].get("events_generated", 0) + 1
            
            # Merchants eventually file tickets
            if random.random() > 0.3:
                await trigger_support_ticket(
                    merchant_id=random.choice(affected),
                    subject="Our integration stopped working",
                    priority="high",
                    tags="config,integration,broken"
                )
                if scenario_id in active_scenarios:
                    active_scenarios[scenario_id]["events_generated"] += 1
            
            await asyncio.sleep(48)
    finally:
        if scenario_id in active_scenarios:
            active_scenarios[scenario_id]["status"] = "completed"
