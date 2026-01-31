"""
Self-Healing Support Agent - Main FastAPI Application
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import Dict, Any, List, Optional
from datetime import datetime
import asyncio

from database import connect_to_mongodb, close_mongodb_connection
from agent import agent, observer, decider, executor
from workflows import workflow_engine
from data_system import webhooks_router, error_generator_router, scenarios_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown."""
    # Startup
    await connect_to_mongodb()
    
    # Start agent loop in background
    asyncio.create_task(agent.start())
    
    yield
    
    # Shutdown
    await agent.stop()
    await close_mongodb_connection()


app = FastAPI(
    title="Self-Healing Support Agent",
    description="Agentic AI system for self-healing support during headless e-commerce migration",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(webhooks_router)
app.include_router(error_generator_router)
app.include_router(scenarios_router)

# Mount static files for evidence
from fastapi.staticfiles import StaticFiles
import os
os.makedirs("static/evidence", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


# ============ Dashboard API Endpoints ============

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "Self-Healing Support Agent",
        "version": "1.0.0",
        "status": agent.get_status(),
    }


@app.get("/api/agent/status")
async def get_agent_status():
    """Get current agent status."""
    return agent.get_status()


@app.post("/api/agent/start")
async def start_agent():
    """Start the agent loop."""
    if not agent.running:
        asyncio.create_task(agent.start())
    return {"status": "started"}


@app.post("/api/agent/stop")
async def stop_agent():
    """Stop the agent loop."""
    await agent.stop()
    return {"status": "stopped"}


@app.delete("/api/clear-database")
async def clear_database():
    """Clear all database collections (for testing)."""
    from database import get_signals_collection, get_issues_collection, get_workflows_collection, get_audit_logs_collection
    
    signals_col = get_signals_collection()
    issues_col = get_issues_collection()
    workflows_col = get_workflows_collection()
    audit_col = get_audit_logs_collection()
    
    results = {
        "signals": (await signals_col.delete_many({})).deleted_count,
        "issues": (await issues_col.delete_many({})).deleted_count,
        "workflows": (await workflows_col.delete_many({})).deleted_count,
        "audit_logs": (await audit_col.delete_many({})).deleted_count,
    }
    
    return {"status": "cleared", "deleted": results}


# ============ Signals API ============

@app.get("/api/signals")
async def list_signals(
    processed: Optional[bool] = None,
    signal_type: Optional[str] = None,
    limit: int = 50
):
    """List recent signals."""
    from database import get_signals_collection
    
    query = {}
    if processed is not None:
        query["processed"] = processed
    if signal_type:
        query["type"] = signal_type
    
    signals_col = get_signals_collection()
    cursor = signals_col.find(query).sort("timestamp", -1).limit(limit)
    signals = await cursor.to_list(length=limit)
    
    for s in signals:
        s["_id"] = str(s["_id"])
    
    return {"signals": signals, "count": len(signals)}


@app.get("/api/signals/stats")
async def get_signal_stats():
    """Get signal statistics."""
    return await observer.get_signal_stats()


# ============ Issues API ============

@app.get("/api/issues")
async def list_issues(
    status: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 50
):
    """List issues."""
    from database import get_issues_collection
    
    query = {}
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    
    issues_col = get_issues_collection()
    cursor = issues_col.find(query).sort("created_at", -1).limit(limit)
    issues = await cursor.to_list(length=limit)
    
    for i in issues:
        i["_id"] = str(i["_id"])
    
    return {"issues": issues, "count": len(issues)}


@app.get("/api/issues/{issue_id}")
async def get_issue(issue_id: str):
    """Get a specific issue with full details."""
    from database import get_issues_collection
    from bson import ObjectId
    
    issues_col = get_issues_collection()
    issue = await issues_col.find_one({"_id": ObjectId(issue_id)})
    
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    issue["_id"] = str(issue["_id"])
    return issue


# ============ Workflows API ============

@app.get("/api/workflows")
async def list_workflows(
    status: Optional[str] = None,
    limit: int = 50
):
    """List workflows."""
    workflows = await workflow_engine.list_workflows(status=status, limit=limit)
    return {"workflows": workflows, "count": len(workflows)}


@app.get("/api/workflows/pending")
async def get_pending_workflows():
    """Get workflows pending approval."""
    workflows = await decider.get_pending_workflows()
    return {"workflows": workflows, "count": len(workflows)}


@app.get("/api/workflows/stats")
async def get_workflow_stats():
    """Get workflow statistics."""
    return await workflow_engine.get_workflow_stats()


@app.get("/api/workflows/{workflow_id}")
async def get_workflow(workflow_id: str):
    """Get a specific workflow."""
    workflow = await workflow_engine.get_workflow(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow


@app.post("/api/workflows/{workflow_id}/approve")
async def approve_workflow(
    workflow_id: str,
    approver: str = "admin",
    comment: str = ""
):
    """Approve a workflow."""
    result = await decider.approve_workflow(workflow_id, approver, comment)
    
    # If fully approved, execute
    if result:
        asyncio.create_task(executor.execute_workflow(workflow_id))
    
    return {"approved": result, "executing": result}


@app.post("/api/workflows/{workflow_id}/reject")
async def reject_workflow(
    workflow_id: str,
    rejector: str = "admin",
    reason: str = ""
):
    """Reject a workflow."""
    result = await decider.reject_workflow(workflow_id, rejector, reason)
    return {"rejected": result}


@app.post("/api/workflows/{workflow_id}/pause")
async def pause_workflow(workflow_id: str):
    """Pause a running workflow."""
    result = await workflow_engine.pause_workflow(workflow_id)
    return {"paused": result}


@app.post("/api/workflows/{workflow_id}/resume")
async def resume_workflow(workflow_id: str):
    """Resume a paused workflow."""
    result = await workflow_engine.resume_workflow(workflow_id)
    if result:
        asyncio.create_task(executor.execute_workflow(workflow_id))
    return {"resumed": result}


@app.post("/api/workflows/{workflow_id}/rollback")
async def rollback_workflow(workflow_id: str, reason: str = "Manual rollback"):
    """Rollback a workflow."""
    result = await executor.rollback_workflow(workflow_id, reason)
    return result


# ============ Audit API ============

@app.get("/api/audit")
async def list_audit_logs(
    event_type: Optional[str] = None,
    limit: int = 100
):
    """List audit logs."""
    from database import get_audit_logs_collection
    
    query = {}
    if event_type:
        query["event_type"] = event_type
    
    audit_col = get_audit_logs_collection()
    cursor = audit_col.find(query).sort("timestamp", -1).limit(limit)
    logs = await cursor.to_list(length=limit)
    
    for log in logs:
        log["_id"] = str(log["_id"])
    
    return {"logs": logs, "count": len(logs)}


# ============ Dashboard Stats ============

@app.get("/api/dashboard/stats")
async def get_dashboard_stats():
    """Get comprehensive dashboard statistics."""
    from database import get_signals_collection, get_issues_collection
    
    signals_col = get_signals_collection()
    issues_col = get_issues_collection()
    
    # Signal counts
    total_signals = await signals_col.count_documents({})
    unprocessed_signals = await signals_col.count_documents({"processed": False})
    
    # Issue counts
    total_issues = await issues_col.count_documents({})
    open_issues = await issues_col.count_documents({"status": {"$nin": ["resolved"]}})
    
    # Workflow stats
    workflow_stats = await workflow_engine.get_workflow_stats()
    
    # Agent status
    agent_status = agent.get_status()
    
    return {
        "agent": agent_status,
        "signals": {
            "total": total_signals,
            "unprocessed": unprocessed_signals,
        },
        "issues": {
            "total": total_issues,
            "open": open_issues,
        },
        "workflows": workflow_stats,
    }


# ============ WebSocket for Real-time Updates ============

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time agent updates."""
    await websocket.accept()
    agent.register_websocket(websocket)
    
    try:
        while True:
            # Keep connection alive and listen for messages
            data = await websocket.receive_text()
            
            # Handle ping/pong
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        agent.unregister_websocket(websocket)


# ============ Run Server ============

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
