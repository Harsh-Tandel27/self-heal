"""
Core Agent - Main orchestration loop.
"""
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime
from agent.observer import observer
from agent.reasoner import reasoner
from agent.decider import decider
from agent.executor import executor
from config import get_settings
from database import get_workflows_collection
from models import WorkflowStatus


settings = get_settings()


class SelfHealingAgent:
    """
    Main agent that coordinates the observe-reason-decide-act loop.
    """
    
    def __init__(self):
        self.running = False
        self.loop_count = 0
        self.last_run: Optional[datetime] = None
        self.status = "idle"
        self._websocket_clients: List = []
    
    async def start(self):
        """Start the agent loop."""
        self.running = True
        self.status = "running"
        print("🤖 Self-Healing Agent started")
        
        while self.running:
            try:
                await self._run_cycle()
                self.loop_count += 1
                self.last_run = datetime.utcnow()
            except Exception as e:
                print(f"❌ Agent cycle error: {e}")
                self.status = "error"
            
            await asyncio.sleep(settings.agent_loop_interval_seconds)
    
    async def stop(self):
        """Stop the agent loop."""
        self.running = False
        self.status = "stopped"
        print("🛑 Self-Healing Agent stopped")
    
    async def _run_cycle(self):
        """Run one cycle of the agent loop."""
        self.status = "observing"
        
        # 1. OBSERVE - Get unprocessed signals and detect patterns
        patterns = await observer.detect_patterns()
        
        if not patterns:
            # No patterns detected, check for individual signals
            signals = await observer.get_unprocessed_signals(limit=10)
            if signals:
                # Group signals by type and merchant for analysis
                patterns = self._group_signals(signals)
        
        if not patterns:
            self.status = "idle"
            return
        
        # 2. REASON - Analyze each pattern group
        self.status = "reasoning"
        for pattern in patterns[:5]:  # Process top 5 patterns per cycle
            signal_ids = pattern.get("signals", [])
            if not signal_ids:
                continue
            
            # Fetch full signal data
            from database import get_signals_collection
            from bson import ObjectId
            signals_col = get_signals_collection()
            
            signals = await signals_col.find(
                {"_id": {"$in": [ObjectId(sid) for sid in signal_ids]}}
            ).to_list(length=50)
            
            for s in signals:
                s["_id"] = str(s["_id"])
            
            if not signals:
                continue
            
            # Analyze signals
            try:
                issue = await reasoner.analyze_signals(signals)
                
                # Mark signals as processed
                await observer.mark_signals_processed(signal_ids, issue.id)
                
                # 3. DECIDE - Create workflow
                self.status = "deciding"
                workflow = await decider.decide_action(issue)
                
                # 4. ACT - Execute if auto-approved
                if workflow.status == WorkflowStatus.APPROVED:
                    self.status = "executing"
                    await executor.execute_workflow(workflow.id)
                
                # Broadcast update to WebSocket clients
                await self._broadcast_update({
                    "type": "issue_detected",
                    "issue_id": issue.id,
                    "title": issue.title,
                    "confidence": issue.confidence,
                    "workflow_id": workflow.id,
                    "workflow_status": workflow.status.value,
                })
                
            except Exception as e:
                print(f"Error processing pattern: {e}")
                continue
        
        # Also check for approved workflows that need execution
        await self._execute_pending_workflows()
        
        self.status = "idle"
    
    def _group_signals(self, signals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Group individual signals into pattern-like structures."""
        groups = {}
        for s in signals:
            key = f"{s.get('type', 'unknown')}:{s.get('merchant_id', 'unknown')}"
            if key not in groups:
                groups[key] = {"signals": [], "_id": {"type": s.get("type"), "merchant_id": s.get("merchant_id")}}
            groups[key]["signals"].append(s.get("_id", ""))
        
        return list(groups.values())
    
    async def _execute_pending_workflows(self):
        """Execute any approved workflows waiting for execution."""
        workflows_col = get_workflows_collection()
        approved = await workflows_col.find(
            {"status": WorkflowStatus.APPROVED.value}
        ).to_list(length=10)
        
        for wf in approved:
            wf_id = str(wf["_id"])
            try:
                await executor.execute_workflow(wf_id)
            except Exception as e:
                print(f"Error executing workflow {wf_id}: {e}")
    
    async def _broadcast_update(self, data: Dict[str, Any]):
        """Broadcast update to all connected WebSocket clients."""
        import json
        message = json.dumps(data)
        for ws in self._websocket_clients[:]:
            try:
                await ws.send_text(message)
            except:
                self._websocket_clients.remove(ws)
    
    def register_websocket(self, ws):
        """Register a WebSocket client for updates."""
        self._websocket_clients.append(ws)
    
    def unregister_websocket(self, ws):
        """Unregister a WebSocket client."""
        if ws in self._websocket_clients:
            self._websocket_clients.remove(ws)
    
    def get_status(self) -> Dict[str, Any]:
        """Get current agent status."""
        return {
            "status": self.status,
            "running": self.running,
            "loop_count": self.loop_count,
            "last_run": self.last_run.isoformat() if self.last_run else None,
        }


# Global agent instance
agent = SelfHealingAgent()
