"""
Observer - Signal ingestion and pattern detection.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from models import Signal, SignalType, SignalSeverity
from database import get_signals_collection, get_audit_logs_collection
from models.audit import AuditLog, AuditEventType
import asyncio


class Observer:
    """
    Observes and ingests signals from various sources.
    Detects patterns in incoming data.
    """
    
    def __init__(self):
        self.signal_buffer: List[Signal] = []
        self.pattern_cache: Dict[str, int] = {}  # pattern_key -> count
        
    async def ingest_signal(self, signal: Signal) -> str:
        """Ingest a new signal and store in MongoDB."""
        signals_col = get_signals_collection()
        audit_col = get_audit_logs_collection()
        
        # Insert signal
        signal_dict = signal.model_dump(by_alias=True, exclude={"id"})
        result = await signals_col.insert_one(signal_dict)
        signal_id = str(result.inserted_id)
        
        # Log to audit
        audit = AuditLog(
            event_type=AuditEventType.SIGNAL_RECEIVED,
            action="signal_ingested",
            description=f"Received {signal.type.value} signal from {signal.source}",
            signal_id=signal_id,
            details={
                "type": signal.type.value,
                "source": signal.source,
                "merchant_id": signal.merchant_id,
                "severity": signal.severity.value,
            }
        )
        await audit_col.insert_one(audit.model_dump(by_alias=True, exclude={"id"}))
        
        # Update pattern cache for detection
        pattern_key = f"{signal.type.value}:{signal.merchant_id}"
        self.pattern_cache[pattern_key] = self.pattern_cache.get(pattern_key, 0) + 1
        
        return signal_id
    
    async def get_unprocessed_signals(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetch unprocessed signals for analysis."""
        signals_col = get_signals_collection()
        cursor = signals_col.find({"processed": False}).sort("timestamp", -1).limit(limit)
        signals = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string
        for s in signals:
            s["_id"] = str(s["_id"])
        
        return signals
    
    async def mark_signals_processed(self, signal_ids: List[str], issue_id: str):
        """Mark signals as processed and link to issue."""
        from bson import ObjectId
        signals_col = get_signals_collection()
        
        await signals_col.update_many(
            {"_id": {"$in": [ObjectId(sid) for sid in signal_ids]}},
            {"$set": {"processed": True, "issue_id": issue_id}}
        )
    
    async def detect_patterns(self) -> List[Dict[str, Any]]:
        """Detect recurring patterns in recent signals."""
        signals_col = get_signals_collection()
        
        # Aggregate signals from last hour by type and merchant
        pipeline = [
            {
                "$match": {
                    "timestamp": {"$gte": datetime.utcnow() - timedelta(hours=1)},
                    "processed": False
                }
            },
            {
                "$group": {
                    "_id": {
                        "type": "$type",
                        "merchant_id": "$merchant_id"
                    },
                    "count": {"$sum": 1},
                    "signals": {"$push": "$_id"},
                    "severities": {"$push": "$severity"}
                }
            },
            {
                "$match": {"count": {"$gte": 2}}  # At least 2 occurrences
            },
            {
                "$sort": {"count": -1}
            }
        ]
        
        patterns = await signals_col.aggregate(pipeline).to_list(length=100)
        
        # Convert ObjectIds to strings
        for p in patterns:
            p["signals"] = [str(s) for s in p["signals"]]
        
        return patterns
    
    async def get_signal_stats(self) -> Dict[str, Any]:
        """Get signal statistics for dashboard."""
        signals_col = get_signals_collection()
        
        # Count by type
        pipeline = [
            {
                "$match": {
                    "timestamp": {"$gte": datetime.utcnow() - timedelta(hours=24)}
                }
            },
            {
                "$group": {
                    "_id": "$type",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        by_type = await signals_col.aggregate(pipeline).to_list(length=10)
        
        # Count by severity
        severity_pipeline = [
            {
                "$match": {
                    "timestamp": {"$gte": datetime.utcnow() - timedelta(hours=24)}
                }
            },
            {
                "$group": {
                    "_id": "$severity",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        by_severity = await signals_col.aggregate(severity_pipeline).to_list(length=10)
        
        # Total unprocessed
        unprocessed = await signals_col.count_documents({"processed": False})
        
        return {
            "by_type": {item["_id"]: item["count"] for item in by_type},
            "by_severity": {item["_id"]: item["count"] for item in by_severity},
            "unprocessed_count": unprocessed,
        }


# Global observer instance
observer = Observer()
