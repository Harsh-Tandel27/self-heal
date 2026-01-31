"""
Workflow Engine - Execution and management of workflows.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
from bson import ObjectId
from models import Workflow, WorkflowStatus, StepStatus
from database import get_workflows_collection, get_issues_collection


class WorkflowEngine:
    """
    Manages workflow lifecycle and execution.
    """
    
    async def get_workflow(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """Get a workflow by ID."""
        workflows_col = get_workflows_collection()
        workflow = await workflows_col.find_one({"_id": ObjectId(workflow_id)})
        if workflow:
            workflow["_id"] = str(workflow["_id"])
        return workflow
    
    async def list_workflows(
        self,
        status: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """List workflows with optional status filter."""
        workflows_col = get_workflows_collection()
        
        query = {}
        if status:
            query["status"] = status
        
        cursor = workflows_col.find(query).sort("created_at", -1).limit(limit)
        workflows = await cursor.to_list(length=limit)
        
        for w in workflows:
            w["_id"] = str(w["_id"])
        
        return workflows
    
    async def pause_workflow(self, workflow_id: str) -> bool:
        """Pause a running workflow."""
        workflows_col = get_workflows_collection()
        result = await workflows_col.update_one(
            {"_id": ObjectId(workflow_id), "status": WorkflowStatus.RUNNING.value},
            {"$set": {"status": WorkflowStatus.PAUSED.value}}
        )
        return result.modified_count > 0
    
    async def resume_workflow(self, workflow_id: str) -> bool:
        """Resume a paused workflow."""
        workflows_col = get_workflows_collection()
        result = await workflows_col.update_one(
            {"_id": ObjectId(workflow_id), "status": WorkflowStatus.PAUSED.value},
            {"$set": {"status": WorkflowStatus.APPROVED.value}}
        )
        return result.modified_count > 0
    
    async def update_workflow_step(
        self,
        workflow_id: str,
        step_id: int,
        updates: Dict[str, Any]
    ) -> bool:
        """Update a specific step in a workflow."""
        workflows_col = get_workflows_collection()
        
        # Find the step index
        workflow = await workflows_col.find_one({"_id": ObjectId(workflow_id)})
        if not workflow:
            return False
        
        step_index = None
        for i, step in enumerate(workflow.get("steps", [])):
            if step.get("id") == step_id:
                step_index = i
                break
        
        if step_index is None:
            return False
        
        # Build update
        set_updates = {f"steps.{step_index}.{k}": v for k, v in updates.items()}
        set_updates["updated_at"] = datetime.utcnow()
        
        result = await workflows_col.update_one(
            {"_id": ObjectId(workflow_id)},
            {"$set": set_updates}
        )
        return result.modified_count > 0
    
    async def get_workflow_stats(self) -> Dict[str, Any]:
        """Get workflow statistics."""
        workflows_col = get_workflows_collection()
        
        pipeline = [
            {
                "$group": {
                    "_id": "$status",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        by_status = await workflows_col.aggregate(pipeline).to_list(length=20)
        
        total = await workflows_col.count_documents({})
        pending = await workflows_col.count_documents({"status": WorkflowStatus.PENDING_APPROVAL.value})
        running = await workflows_col.count_documents({"status": WorkflowStatus.RUNNING.value})
        completed = await workflows_col.count_documents({"status": WorkflowStatus.COMPLETED.value})
        
        return {
            "total": total,
            "pending_approval": pending,
            "running": running,
            "completed": completed,
            "by_status": {item["_id"]: item["count"] for item in by_status}
        }


# Global engine instance
workflow_engine = WorkflowEngine()
