"""
Decider - Action selection and workflow recommendation.
"""
from typing import List, Dict, Any, Optional
from models import (
    Issue, IssueCategory, IssueStatus,
    Workflow, WorkflowStatus, WorkflowStep, RiskLevel, ActionType, StepStatus
)
from database import get_workflows_collection, get_audit_logs_collection
from models.audit import AuditLog, AuditEventType
from config import get_settings
from workflows.templates import get_template_for_issue


settings = get_settings()


class Decider:
    """
    Decides on appropriate actions based on analyzed issues.
    Creates workflows and determines approval requirements.
    """
    
    def __init__(self):
        pass
    
    async def decide_action(self, issue: Issue) -> Workflow:
        """
        Decide on action for an issue and create a workflow.
        Returns the created workflow.
        """
        # Get appropriate template based on issue
        template_steps = get_template_for_issue(issue)
        
        # Determine overall risk
        risk_level = self._assess_risk(issue)
        
        # Determine approval requirements
        requires_approval, approval_count = self._get_approval_requirements(
            risk_level, issue.confidence
        )
        
        # Create workflow
        workflow = Workflow(
            issue_id=issue.id,
            name=f"Remediation: {issue.title}",
            description=f"Automated workflow to address: {issue.summary}",
            steps=template_steps,
            overall_risk=risk_level,
            requires_approval=requires_approval,
            approval_count_required=approval_count,
            status=WorkflowStatus.PENDING_APPROVAL if requires_approval else WorkflowStatus.APPROVED,
        )
        
        # Store workflow
        workflows_col = get_workflows_collection()
        workflow_dict = workflow.model_dump(by_alias=True, exclude={"id"})
        result = await workflows_col.insert_one(workflow_dict)
        workflow.id = str(result.inserted_id)
        
        # Update issue with workflow reference
        from database import get_issues_collection
        from bson import ObjectId
        issues_col = get_issues_collection()
        await issues_col.update_one(
            {"_id": ObjectId(issue.id)},
            {
                "$set": {
                    "workflow_id": workflow.id,
                    "status": IssueStatus.PENDING_ACTION.value,
                    "proposed_actions": [s.name for s in template_steps]
                }
            }
        )
        
        # Audit log
        audit_col = get_audit_logs_collection()
        audit = AuditLog(
            event_type=AuditEventType.WORKFLOW_CREATED,
            action="workflow_created",
            description=f"Created workflow: {workflow.name}",
            issue_id=issue.id,
            workflow_id=workflow.id,
            details={
                "risk_level": risk_level.value,
                "requires_approval": requires_approval,
                "step_count": len(template_steps),
            },
            confidence=issue.confidence,
        )
        await audit_col.insert_one(audit.model_dump(by_alias=True, exclude={"id"}))
        
        return workflow
    
    def _assess_risk(self, issue: Issue) -> RiskLevel:
        """Assess the risk level of addressing this issue."""
        # High impact issues are higher risk
        if issue.estimated_impact == "critical":
            return RiskLevel.CRITICAL
        elif issue.estimated_impact == "high":
            return RiskLevel.HIGH
        elif issue.estimated_impact == "medium":
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW
    
    def _get_approval_requirements(
        self, risk: RiskLevel, confidence: float
    ) -> tuple[bool, int]:
        """Determine if approval is needed and how many approvals."""
        
        # Critical always needs approval
        if risk == RiskLevel.CRITICAL:
            return True, 2
        
        # High risk needs approval
        if risk == RiskLevel.HIGH:
            return True, settings.high_risk_approval_count
        
        # Medium risk with high confidence might auto-approve
        if risk == RiskLevel.MEDIUM:
            if confidence >= settings.auto_approve_confidence_threshold:
                return False, 0
            return True, settings.medium_risk_approval_count
        
        # Low risk with high confidence auto-approves
        if confidence >= settings.auto_approve_confidence_threshold:
            return False, 0
        
        return True, settings.low_risk_approval_count
    
    async def get_pending_workflows(self) -> List[Dict[str, Any]]:
        """Get workflows pending approval."""
        workflows_col = get_workflows_collection()
        cursor = workflows_col.find(
            {"status": WorkflowStatus.PENDING_APPROVAL.value}
        ).sort("created_at", -1)
        
        workflows = await cursor.to_list(length=100)
        for w in workflows:
            w["_id"] = str(w["_id"])
        
        return workflows
    
    async def approve_workflow(
        self, workflow_id: str, approver: str, comment: str = ""
    ) -> bool:
        """Approve a workflow for execution."""
        from bson import ObjectId
        from datetime import datetime
        
        workflows_col = get_workflows_collection()
        
        # Get current workflow
        workflow = await workflows_col.find_one({"_id": ObjectId(workflow_id)})
        if not workflow:
            return False
        
        # Add approval
        approval = {
            "user": approver,
            "timestamp": datetime.utcnow(),
            "comment": comment
        }
        
        approvals = workflow.get("approvals", [])
        approvals.append(approval)
        
        # Check if enough approvals
        required = workflow.get("approval_count_required", 1)
        new_status = WorkflowStatus.PENDING_APPROVAL.value
        if len(approvals) >= required:
            new_status = WorkflowStatus.APPROVED.value
        
        await workflows_col.update_one(
            {"_id": ObjectId(workflow_id)},
            {
                "$set": {
                    "approvals": approvals,
                    "status": new_status
                }
            }
        )
        
        # Audit log
        audit_col = get_audit_logs_collection()
        audit = AuditLog(
            event_type=AuditEventType.WORKFLOW_APPROVED,
            actor=approver,
            action="workflow_approved",
            description=f"Workflow approved by {approver}",
            workflow_id=workflow_id,
            details={"comment": comment, "approval_count": len(approvals)},
        )
        await audit_col.insert_one(audit.model_dump(by_alias=True, exclude={"id"}))
        
        return new_status == WorkflowStatus.APPROVED.value
    
    async def reject_workflow(
        self, workflow_id: str, rejector: str, reason: str
    ) -> bool:
        """Reject a workflow."""
        from bson import ObjectId
        from datetime import datetime
        
        workflows_col = get_workflows_collection()
        
        rejection = {
            "user": rejector,
            "timestamp": datetime.utcnow(),
            "reason": reason
        }
        
        await workflows_col.update_one(
            {"_id": ObjectId(workflow_id)},
            {
                "$push": {"rejections": rejection},
                "$set": {"status": WorkflowStatus.DRAFT.value}
            }
        )
        
        # Audit log
        audit_col = get_audit_logs_collection()
        audit = AuditLog(
            event_type=AuditEventType.WORKFLOW_REJECTED,
            actor=rejector,
            action="workflow_rejected",
            description=f"Workflow rejected by {rejector}: {reason}",
            workflow_id=workflow_id,
            details={"reason": reason},
        )
        await audit_col.insert_one(audit.model_dump(by_alias=True, exclude={"id"}))
        
        return True


# Global decider instance
decider = Decider()
