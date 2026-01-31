"""
Workflow Templates - Pre-built workflows for common issues.
"""
from typing import List
from models import Issue, IssueCategory, WorkflowStep, ActionType, RiskLevel, StepStatus


def get_template_for_issue(issue: Issue) -> List[WorkflowStep]:
    """
    Get appropriate workflow steps based on issue category.
    """
    templates = {
        IssueCategory.MIGRATION: _migration_workflow,
        IssueCategory.PLATFORM_BUG: _platform_bug_workflow,
        IssueCategory.DOCUMENTATION_GAP: _documentation_workflow,
        IssueCategory.MERCHANT_CONFIG: _merchant_config_workflow,
        IssueCategory.UNKNOWN: _generic_workflow,
    }
    
    template_fn = templates.get(issue.category, _generic_workflow)
    steps = template_fn(issue)
    
    # Universally inject demo fix if applicable
    return _inject_demo_fix(steps, issue)


def _inject_demo_fix(steps: List[WorkflowStep], issue: Issue) -> List[WorkflowStep]:
    """Helper to inject demo fix step if issue is from simulated store."""
    demo_patterns = ['simulated_store', 'demo_store', 'merchant_', 'store_', 'shop_', 'client_', 'brand_']
    is_demo = any(any(p in str(m).lower() for p in demo_patterns) for m in issue.affected_merchants)
    
    if is_demo:
        # Detect chaos mode from issue content
        chaos_mode = "checkout_fails"  # Default
        scenario_id = "checkout_storm"
        
        title_lower = issue.title.lower()
        root_cause_lower = issue.root_cause.lower()
        
        if "api" in title_lower or "api" in root_cause_lower:
            chaos_mode = "api_errors"
            scenario_id = "api_degradation"
        elif "webhook" in title_lower:
            chaos_mode = "webhook_drops"
            scenario_id = "webhook_cascade"
        elif "migration" in title_lower:
            chaos_mode = "migration_mode"
            scenario_id = "migration_chaos"
        elif "config" in title_lower or "drift" in title_lower:
            chaos_mode = "api_errors" # Default for config drift
            scenario_id = "config_drift"
            
        # Determine next ID
        try:
            next_id = max([s.id for s in steps]) + 1
        except ValueError:
            next_id = 1
        
        # Step 1: Capture Evidence (Before)
        steps.append(WorkflowStep(
            id=next_id,
            name="Capture Failure Evidence",
            action_type=ActionType.TAKE_SCREENSHOT,
            description="Capture screenshot of the checkout page error state",
            status=StepStatus.PENDING,
            parameters={
                "url": "http://localhost:3001/checkout",
                "label": "before_fix"
            },
            risk_level=RiskLevel.LOW
        ))

        # Step 2: Apply Fix
        steps.append(WorkflowStep(
            id=next_id + 1,
            name="Fix Store Chaos Mode",
            action_type=ActionType.FIX_STORE_CHAOS,
            description=f"Disable {chaos_mode} mode in the store (REAL FIX)",
            parameters={
                "store_url": "http://localhost:3001",
                "chaos_mode": chaos_mode,
                "scenario_id": scenario_id,
                "action": "disable"
            },
            risk_level=RiskLevel.MEDIUM,
            requires_approval=True,
            depends_on=[next_id],
        ))
        
        # Step 3: Verify Fix (After)
        steps.append(WorkflowStep(
            id=next_id + 2,
            name="Verify Fix Visually",
            action_type=ActionType.TAKE_SCREENSHOT,
            description="Capture screenshot of checkout page success state",
            status=StepStatus.PENDING,
            parameters={
                "url": "http://localhost:3001/checkout",
                "label": "after_fix"
            },
            risk_level=RiskLevel.LOW,
            depends_on=[next_id + 1],
        ))
        
    return steps


def _migration_workflow(issue: Issue) -> List[WorkflowStep]:
    """Workflow for migration-related issues."""
    return [
        WorkflowStep(
            id=1,
            name="Send Internal Alert",
            action_type=ActionType.SEND_NOTIFICATION,
            description="Alert the migration team about the detected issue",
            parameters={
                "channel": "migration-alerts",
                "message": f"Migration issue detected: {issue.title}",
                "priority": "high"
            },
            risk_level=RiskLevel.LOW,
        ),
        WorkflowStep(
            id=2,
            name="Run Migration Diagnostic",
            action_type=ActionType.RUN_DIAGNOSTIC,
            description="Run diagnostic checks on migration state",
            parameters={
                "check_type": "migration_state",
                "merchant_ids": issue.affected_merchants
            },
            risk_level=RiskLevel.LOW,
            depends_on=[1],
        ),
        WorkflowStep(
            id=3,
            name="Notify Affected Merchants",
            action_type=ActionType.NOTIFY_MERCHANT,
            description="Proactively notify merchants about the issue and ETA",
            parameters={
                "merchant_ids": issue.affected_merchants,
                "template": "migration_delay",
                "issue_summary": issue.summary
            },
            risk_level=RiskLevel.MEDIUM,
            requires_approval=True,
            depends_on=[2],
        ),
        WorkflowStep(
            id=4,
            name="Escalate to Engineering",
            action_type=ActionType.ESCALATE_ENGINEERING,
            description="Escalate to platform engineering if not auto-resolved",
            parameters={
                "team": "platform-migration",
                "severity": issue.estimated_impact,
                "issue_id": issue.id
            },
            risk_level=RiskLevel.LOW,
            depends_on=[2],
        ),
    ]


def _platform_bug_workflow(issue: Issue) -> List[WorkflowStep]:
    """Workflow for platform bug issues - includes store chaos fix."""
    steps = [
        WorkflowStep(
            id=1,
            name="Alert Engineering",
            action_type=ActionType.ESCALATE_ENGINEERING,
            description="Immediately alert platform engineering about the bug",
            parameters={
                "team": "platform-bugs",
                "severity": issue.estimated_impact,
                "title": issue.title,
                "root_cause": issue.root_cause
            },
            risk_level=RiskLevel.LOW,
        ),
    ]
    
    
    # Check if this is from the simulated store - add real fix action
    # (Now handled by _inject_demo_fix global wrapper)
    
    steps.extend([
        WorkflowStep(
            id=2,
            name="Check for Known Fix",
            action_type=ActionType.RUN_DIAGNOSTIC,
            description="Check if this is a known issue with existing fix",
            parameters={
                "check_type": "known_issues",
                "error_pattern": issue.root_cause
            },
            risk_level=RiskLevel.LOW,
            depends_on=[1],
        ),
        WorkflowStep(
            id=3,
            name="Reply to Support Tickets",
            action_type=ActionType.REPLY_TICKET,
            description="Send acknowledgment to affected merchants' tickets",
            parameters={
                "template": "platform_issue_ack",
                "issue_summary": issue.summary,
                "eta": "investigating"
            },
            risk_level=RiskLevel.MEDIUM,
            requires_approval=True,
            depends_on=[1],
        ),
    ])
    
    return steps


def _documentation_workflow(issue: Issue) -> List[WorkflowStep]:
    """Workflow for documentation gap issues."""
    return [
        WorkflowStep(
            id=1,
            name="Flag Documentation Gap",
            action_type=ActionType.SEND_NOTIFICATION,
            description="Notify documentation team about the gap",
            parameters={
                "channel": "docs-updates",
                "message": f"Documentation gap identified: {issue.title}",
                "context": issue.root_cause
            },
            risk_level=RiskLevel.LOW,
        ),
        WorkflowStep(
            id=2,
            name="Create Doc Update Task",
            action_type=ActionType.UPDATE_DOCUMENTATION,
            description="Create task to update documentation",
            parameters={
                "topic": issue.title,
                "content_needed": issue.summary,
                "priority": "medium"
            },
            risk_level=RiskLevel.LOW,
            depends_on=[1],
        ),
        WorkflowStep(
            id=3,
            name="Send Interim Guidance",
            action_type=ActionType.REPLY_TICKET,
            description="Provide interim guidance to merchant",
            parameters={
                "template": "documentation_guidance",
                "workaround": issue.summary
            },
            risk_level=RiskLevel.LOW,
            depends_on=[1],
        ),
    ]


def _merchant_config_workflow(issue: Issue) -> List[WorkflowStep]:
    """Workflow for merchant configuration issues."""
    return [
        WorkflowStep(
            id=1,
            name="Diagnose Configuration",
            action_type=ActionType.RUN_DIAGNOSTIC,
            description="Run configuration diagnostic for merchant",
            parameters={
                "check_type": "merchant_config",
                "merchant_ids": issue.affected_merchants
            },
            risk_level=RiskLevel.LOW,
        ),
        WorkflowStep(
            id=2,
            name="Send Configuration Guide",
            action_type=ActionType.REPLY_TICKET,
            description="Send configuration fix guide to merchant",
            parameters={
                "template": "config_fix_guide",
                "issue_type": issue.subcategory or "general",
                "steps": issue.root_cause
            },
            risk_level=RiskLevel.LOW,
            depends_on=[1],
        ),
        WorkflowStep(
            id=3,
            name="Offer Config Assistance",
            action_type=ActionType.NOTIFY_MERCHANT,
            description="Offer to assist with configuration",
            parameters={
                "merchant_ids": issue.affected_merchants,
                "template": "config_assistance_offer"
            },
            risk_level=RiskLevel.LOW,
            depends_on=[2],
        ),
    ]


def _generic_workflow(issue: Issue) -> List[WorkflowStep]:
    """Generic workflow for unknown issue types."""
    return [
        WorkflowStep(
            id=1,
            name="Log Issue for Review",
            action_type=ActionType.SEND_NOTIFICATION,
            description="Log the issue for manual review",
            parameters={
                "channel": "support-triage",
                "message": f"Issue requires review: {issue.title}",
                "confidence": issue.confidence
            },
            risk_level=RiskLevel.LOW,
        ),
        WorkflowStep(
            id=2,
            name="Acknowledge Ticket",
            action_type=ActionType.REPLY_TICKET,
            description="Send acknowledgment to merchant",
            parameters={
                "template": "issue_received",
                "eta": "under review"
            },
            risk_level=RiskLevel.LOW,
            depends_on=[1],
        ),
    ]


# Export all templates
WORKFLOW_TEMPLATES = {
    "migration": _migration_workflow,
    "platform_bug": _platform_bug_workflow,
    "documentation": _documentation_workflow,
    "merchant_config": _merchant_config_workflow,
    "generic": _generic_workflow,
}
