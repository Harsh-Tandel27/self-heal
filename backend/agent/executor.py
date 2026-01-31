"""
Executor - Bounded action execution with safety controls.
"""
from typing import Dict, Any, Optional
from datetime import datetime
from models import Workflow, WorkflowStatus, StepStatus, ActionType
from database import get_workflows_collection, get_issues_collection, get_audit_logs_collection
from models.audit import AuditLog, AuditEventType
from models.issue import IssueStatus
from bson import ObjectId


class Executor:
    """
    Executes approved workflows with safety boundaries.
    Supports rollback and human override.
    """
    
    # Actions that are NEVER auto-executed (require explicit human action)
    FORBIDDEN_AUTO_ACTIONS = {
        ActionType.APPLY_HOTFIX,  # Code changes need review
    }
    
    # Actions that involve money/transactions
    FINANCIAL_ACTIONS = {
        ActionType.ROLLBACK_CHANGE,  # Could affect transactions
    }
    
    def __init__(self):
        self.action_handlers = {
            ActionType.SEND_NOTIFICATION: self._execute_notification,
            ActionType.UPDATE_CONFIG: self._execute_config_update,
            ActionType.ESCALATE_ENGINEERING: self._execute_escalation,
            ActionType.REPLY_TICKET: self._execute_ticket_reply,
            ActionType.TRIGGER_WEBHOOK: self._execute_webhook,
            ActionType.RUN_DIAGNOSTIC: self._execute_diagnostic,
            ActionType.APPLY_HOTFIX: self._execute_hotfix,
            ActionType.ROLLBACK_CHANGE: self._execute_rollback,
            ActionType.UPDATE_DOCUMENTATION: self._execute_doc_update,
            ActionType.NOTIFY_MERCHANT: self._execute_merchant_notification,
            ActionType.NOTIFY_MERCHANT: self._execute_merchant_notification,
            ActionType.FIX_STORE_CHAOS: self._execute_store_fix,
            ActionType.TAKE_SCREENSHOT: self._execute_screenshot,  # NEW: Visual Evidence
        }
    
    async def execute_workflow(self, workflow_id: str) -> Dict[str, Any]:
        """
        Execute an approved workflow step by step.
        Returns execution result.
        """
        workflows_col = get_workflows_collection()
        workflow_doc = await workflows_col.find_one({"_id": ObjectId(workflow_id)})
        
        if not workflow_doc:
            return {"success": False, "error": "Workflow not found"}
        
        if workflow_doc["status"] != WorkflowStatus.APPROVED.value:
            return {"success": False, "error": "Workflow not approved"}
        
        # Start execution
        await workflows_col.update_one(
            {"_id": ObjectId(workflow_id)},
            {
                "$set": {
                    "status": WorkflowStatus.RUNNING.value,
                    "started_at": datetime.utcnow()
                }
            }
        )
        
        # Log start
        audit_col = get_audit_logs_collection()
        await audit_col.insert_one(AuditLog(
            event_type=AuditEventType.WORKFLOW_STARTED,
            action="workflow_started",
            description=f"Started executing workflow: {workflow_doc['name']}",
            workflow_id=workflow_id,
            issue_id=workflow_doc.get("issue_id"),
        ).model_dump(by_alias=True, exclude={"id"}))
        
        # Execute each step
        steps = workflow_doc.get("steps", [])
        results = []
        
        for i, step in enumerate(steps):
            step_result = await self._execute_step(workflow_id, step, i)
            results.append(step_result)
            
            if not step_result["success"]:
                # Step failed - pause workflow
                await workflows_col.update_one(
                    {"_id": ObjectId(workflow_id)},
                    {"$set": {"status": WorkflowStatus.PAUSED.value, "current_step": i}}
                )
                return {
                    "success": False,
                    "error": f"Step {i+1} failed: {step_result.get('error')}",
                    "completed_steps": i,
                    "results": results
                }
        
        # All steps completed
        await workflows_col.update_one(
            {"_id": ObjectId(workflow_id)},
            {
                "$set": {
                    "status": WorkflowStatus.COMPLETED.value,
                    "completed_at": datetime.utcnow()
                }
            }
        )
        
        # Update issue status
        issues_col = get_issues_collection()
        await issues_col.update_one(
            {"_id": ObjectId(workflow_doc["issue_id"])},
            {
                "$set": {
                    "status": IssueStatus.RESOLVED.value,
                    "resolved_at": datetime.utcnow()
                }
            }
        )
        
        # Log completion
        await audit_col.insert_one(AuditLog(
            event_type=AuditEventType.WORKFLOW_COMPLETED,
            action="workflow_completed",
            description=f"Workflow completed successfully",
            workflow_id=workflow_id,
            issue_id=workflow_doc.get("issue_id"),
        ).model_dump(by_alias=True, exclude={"id"}))
        
        return {
            "success": True,
            "completed_steps": len(steps),
            "results": results
        }
    
    async def _execute_step(
        self, workflow_id: str, step: Dict[str, Any], step_index: int
    ) -> Dict[str, Any]:
        """Execute a single workflow step."""
        workflows_col = get_workflows_collection()
        audit_col = get_audit_logs_collection()
        
        action_type = ActionType(step["action_type"])
        step_id = step["id"]
        
        # Check if action is forbidden for auto-execution
        if action_type in self.FORBIDDEN_AUTO_ACTIONS:
            return {
                "success": False,
                "error": f"Action {action_type.value} requires manual execution",
                "requires_manual": True
            }
        
        # Update step status to running
        await workflows_col.update_one(
            {"_id": ObjectId(workflow_id)},
            {"$set": {f"steps.{step_index}.status": StepStatus.RUNNING.value}}
        )
        
        # Get handler
        handler = self.action_handlers.get(action_type)
        if not handler:
            return {"success": False, "error": f"No handler for action {action_type.value}"}
        
        try:
            # Execute action
            result = await handler(step.get("parameters", {}))
            
            # Update step status
            new_status = StepStatus.COMPLETED.value if result["success"] else StepStatus.FAILED.value
            await workflows_col.update_one(
                {"_id": ObjectId(workflow_id)},
                {
                    "$set": {
                        f"steps.{step_index}.status": new_status,
                        f"steps.{step_index}.completed_at": datetime.utcnow(),
                        f"steps.{step_index}.result": result
                    }
                }
            )
            
            # Audit log
            await audit_col.insert_one(AuditLog(
                event_type=AuditEventType.STEP_EXECUTED if result["success"] else AuditEventType.STEP_FAILED,
                action=f"step_{action_type.value}",
                description=f"Step '{step['name']}' {'completed' if result['success'] else 'failed'}",
                workflow_id=workflow_id,
                step_id=step_id,
                success=result["success"],
                details=result,
            ).model_dump(by_alias=True, exclude={"id"}))
            
            return result
            
        except Exception as e:
            error_msg = str(e)
            await workflows_col.update_one(
                {"_id": ObjectId(workflow_id)},
                {
                    "$set": {
                        f"steps.{step_index}.status": StepStatus.FAILED.value,
                        f"steps.{step_index}.error": error_msg
                    }
                }
            )
            return {"success": False, "error": error_msg}
    
    # Action handlers
    async def _execute_notification(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Send internal notification."""
        # In production: integrate with Slack, email, etc.
        print(f"📢 Notification: {params.get('message', 'No message')}")
        return {"success": True, "action": "notification_sent", "details": params}
    
    async def _execute_config_update(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Update configuration."""
        # In production: update actual config
        print(f"⚙️ Config update: {params}")
        return {"success": True, "action": "config_updated", "details": params}
    
    async def _execute_escalation(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Escalate to engineering."""
        print(f"🚨 Escalation to engineering: {params.get('team', 'platform')}")
        return {"success": True, "action": "escalated", "team": params.get("team")}
    
    async def _execute_ticket_reply(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Reply to support ticket."""
        print(f"💬 Ticket reply: {params.get('message', '')[:100]}...")
        return {"success": True, "action": "ticket_replied", "details": params}
    
    async def _execute_webhook(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Trigger a webhook."""
        import httpx
        url = params.get("url", "")
        if url:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, json=params.get("payload", {}))
                    return {"success": response.is_success, "status_code": response.status_code}
            except Exception as e:
                return {"success": False, "error": str(e)}
        return {"success": False, "error": "No URL provided"}
    
    async def _execute_diagnostic(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Run diagnostic check."""
        print(f"🔍 Running diagnostic: {params.get('check_type', 'general')}")
        return {"success": True, "action": "diagnostic_completed", "results": params}
    
    async def _execute_hotfix(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Apply hotfix - REQUIRES MANUAL APPROVAL."""
        # This should never auto-execute
        return {"success": False, "error": "Hotfix requires manual deployment", "requires_manual": True}
    
    async def _execute_rollback(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Rollback a change."""
        print(f"⏪ Rollback: {params.get('target', 'unknown')}")
        return {"success": True, "action": "rollback_initiated", "details": params}
    
    async def _execute_doc_update(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Update documentation."""
        print(f"📝 Doc update: {params.get('doc_id', 'unknown')}")
        return {"success": True, "action": "documentation_updated", "details": params}
    
    async def _execute_merchant_notification(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Notify merchant."""
        print(f"📧 Merchant notification: {params.get('merchant_id', 'unknown')}")
        return {"success": True, "action": "merchant_notified", "details": params}
    
    async def _execute_store_fix(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        FIX STORE CHAOS MODE - THIS IS A REAL FIX!
        Calls the simulated store's API to disable chaos modes.
        Also stops the backend scenario generator.
        """
        import httpx
        
        store_url = params.get("store_url", "http://localhost:3001")
        chaos_mode = params.get("chaos_mode", "checkout_fails")
        scenario_id = params.get("scenario_id")
        action = params.get("action", "disable")
        
        result_details = {}
        
        try:
            # 1. Stop the backend scenario generator if ID provided
            if scenario_id:
                try:
                    print(f"🛑 Stopping backend scenario: {scenario_id}")
                    async with httpx.AsyncClient(timeout=5.0) as client:
                        stop_response = await client.post(f"http://localhost:8000/scenarios/stop/{scenario_id}")
                        if stop_response.is_success:
                            print(f"✅ Backend scenario {scenario_id} stopped")
                            result_details["scenario_stopped"] = True
                        else:
                            print(f"⚠️ Failed to stop scenario: {stop_response.status_code}")
                            result_details["scenario_stopped"] = False
                except Exception as e:
                    print(f"⚠️ Error stopping scenario: {e}")
                    result_details["scenario_stop_error"] = str(e)

            # 2. Call Store API to disable visual chaos
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{store_url}/api/chaos",
                    json={
                        "action": action,
                        "mode": chaos_mode,
                        "token": "self-healing-agent-token",  # Agent auth token
                    }
                )
                
                if response.is_success:
                    result = response.json()
                    print(f"🔧 FIXED: Disabled chaos mode '{chaos_mode}' in store")
                    return {
                        "success": True,
                        "action": "store_chaos_fixed",
                        "chaos_mode": chaos_mode,
                        "scenario_id": scenario_id,
                        "store_response": result,
                        "details": result_details,
                        "message": f"Successfully disabled {chaos_mode} mode in store and stopped scenario"
                    }
                else:
                    return {
                        "success": False,
                        "error": f"Store returned {response.status_code}",
                        "response": response.text,
                        "details": result_details
                    }
        except Exception as e:
            print(f"❌ Failed to fix store chaos: {e}")
            return {"success": False, "error": str(e)}
    
    async def rollback_workflow(self, workflow_id: str, reason: str) -> Dict[str, Any]:
        """Rollback a partially executed workflow."""
        workflows_col = get_workflows_collection()
        audit_col = get_audit_logs_collection()
        
        await workflows_col.update_one(
            {"_id": ObjectId(workflow_id)},
            {"$set": {"status": WorkflowStatus.ROLLED_BACK.value}}
        )
        
        await audit_col.insert_one(AuditLog(
            event_type=AuditEventType.WORKFLOW_ROLLED_BACK,
            action="workflow_rolled_back",
            description=f"Workflow rolled back: {reason}",
            workflow_id=workflow_id,
            details={"reason": reason},
        ).model_dump(by_alias=True, exclude={"id"}))
        
        return {"success": True, "action": "rolled_back"}


    async def _execute_screenshot(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Takes a screenshot of the provided URL for visual evidence.
        """
        from services.visual_verifier import visual_verifier
        
        url = params.get("url", "http://localhost:3001")
        label = params.get("label", "evidence")
        
        print(f"📸 Taking screenshot of {url} ({label})...")
        
        try:
            result = await visual_verifier.capture_evidence(url, label)
            
            if result["success"]:
                return {
                    "success": True,
                    "action": "screenshot_captured",
                    "file_url": f"/static/evidence/{result['filename']}",
                    "details": result
                }
            else:
                return {
                    "success": False, 
                    "error": result.get("error", "Unknown screenshot error")
                }
        except Exception as e:
            return {"success": False, "error": str(e)}

# Global executor instance
executor = Executor()
