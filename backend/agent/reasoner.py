"""
Reasoner - AI-powered root cause analysis using Groq API.
"""
from typing import List, Dict, Any, Optional
from config import get_settings
from models import Issue, IssueCategory, IssueStatus, ReasoningStep
from database import get_issues_collection, get_audit_logs_collection
from models.audit import AuditLog, AuditEventType
import json
import re
import httpx


settings = get_settings()


class Reasoner:
    """
    Analyzes signals using Groq AI to determine root causes.
    Provides explainable reasoning chains.
    """
    
    def __init__(self):
        self.api_key = settings.groq_api_key
        self.model = settings.groq_model
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"
        
        if self.api_key:
            print(f"✅ Groq API initialized with model: {self.model}")
        else:
            print("⚠️ No Groq API key configured, using fallback analysis")
    
    async def analyze_signals(self, signals: List[Dict[str, Any]]) -> Issue:
        """
        Analyze a group of related signals to identify the issue.
        Returns an Issue with reasoning chain.
        """
        if not signals:
            raise ValueError("No signals to analyze")
        
        # Build context for analysis
        signal_context = self._format_signals_for_analysis(signals)
        
        # Get AI analysis
        analysis = await self._get_groq_analysis(signal_context)
        
        # Create issue from analysis
        issue = Issue(
            signal_ids=[s.get("_id", s.get("id", "")) for s in signals],
            category=IssueCategory(analysis.get("category", "unknown")),
            subcategory=analysis.get("subcategory"),
            title=analysis.get("title", "Unknown Issue"),
            summary=analysis.get("summary", ""),
            root_cause=analysis.get("root_cause", "Unable to determine"),
            reasoning_chain=[
                ReasoningStep(**step) for step in analysis.get("reasoning_chain", [])
            ],
            confidence=analysis.get("confidence", 0.5),
            affected_merchants=list(set(s.get("merchant_id", "") for s in signals)),
            merchant_count=len(set(s.get("merchant_id", "") for s in signals)),
            estimated_impact=analysis.get("impact", "medium"),
            status=IssueStatus.DETECTED,
        )
        
        # Store issue
        issues_col = get_issues_collection()
        issue_dict = issue.model_dump(by_alias=True, exclude={"id"})
        result = await issues_col.insert_one(issue_dict)
        issue.id = str(result.inserted_id)
        
        # Audit log
        audit_col = get_audit_logs_collection()
        audit = AuditLog(
            event_type=AuditEventType.ISSUE_DETECTED,
            action="issue_created",
            description=f"Detected issue: {issue.title}",
            issue_id=issue.id,
            details={
                "category": issue.category.value,
                "confidence": issue.confidence,
                "merchant_count": issue.merchant_count,
            },
            reasoning=issue.root_cause,
            confidence=issue.confidence,
        )
        await audit_col.insert_one(audit.model_dump(by_alias=True, exclude={"id"}))
        
        return issue
    
    def _format_signals_for_analysis(self, signals: List[Dict[str, Any]]) -> str:
        """Format signals into a prompt for analysis."""
        formatted = []
        for i, s in enumerate(signals, 1):
            formatted.append(f"""
Signal {i}:
- Type: {s.get('type', 'unknown')}
- Source: {s.get('source', 'unknown')}
- Merchant: {s.get('merchant_id', 'unknown')}
- Severity: {s.get('severity', 'medium')}
- Title: {s.get('title', 'No title')}
- Content: {json.dumps(s.get('content', {}), indent=2)}
- Timestamp: {s.get('timestamp', 'unknown')}
""")
        return "\n".join(formatted)
    
    async def _get_groq_analysis(self, signal_context: str) -> Dict[str, Any]:
        """Get analysis from Groq API using httpx."""
        
        prompt = f"""You are an expert support analyst for an e-commerce platform that is migrating from hosted to headless architecture.

Analyze the following signals and determine:
1. The root cause of the issue
2. The category (migration, platform_bug, documentation_gap, merchant_config, unknown)
3. The confidence level (0-1)
4. Step-by-step reasoning chain

SIGNALS:
{signal_context}

Respond ONLY with a JSON object in this exact format:
{{
    "title": "Brief issue title",
    "summary": "2-3 sentence summary of the issue",
    "category": "migration|platform_bug|documentation_gap|merchant_config|unknown",
    "subcategory": "more specific category if applicable",
    "root_cause": "Detailed explanation of the root cause",
    "reasoning_chain": [
        {{"step_number": 1, "observation": "What was observed", "inference": "What this suggests", "confidence": 0.8}},
        {{"step_number": 2, "observation": "...", "inference": "...", "confidence": 0.7}}
    ],
    "confidence": 0.75,
    "impact": "low|medium|high|critical",
    "suggested_actions": ["action1", "action2"]
}}
"""
        
        if self.api_key:
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        self.api_url,
                        headers={
                            "Authorization": f"Bearer {self.api_key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": self.model,
                            "messages": [
                                {"role": "system", "content": "You are an expert e-commerce support analyst. Always respond with valid JSON only, no markdown formatting."},
                                {"role": "user", "content": prompt}
                            ],
                            "temperature": 0.3,
                            "max_tokens": 2000,
                        }
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        text = data["choices"][0]["message"]["content"]
                        
                        # Extract JSON from markdown code blocks if present
                        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
                        if json_match:
                            text = json_match.group(1)
                        
                        return json.loads(text)
                    else:
                        print(f"Groq API error: {response.status_code} - {response.text}")
                        return self._get_fallback_analysis(signal_context)
                        
            except Exception as e:
                print(f"Groq analysis error: {e}")
                return self._get_fallback_analysis(signal_context)
        else:
            return self._get_fallback_analysis(signal_context)
    
    def _get_fallback_analysis(self, signal_context: str) -> Dict[str, Any]:
        """Fallback analysis when Groq is unavailable."""
        # Simple rule-based analysis
        context_lower = signal_context.lower()
        
        if "checkout" in context_lower or "payment" in context_lower:
            category = "platform_bug"
            title = "Checkout/Payment Issue Detected"
            impact = "high"
        elif "webhook" in context_lower:
            category = "merchant_config"
            title = "Webhook Configuration Issue"
            impact = "medium"
        elif "migration" in context_lower:
            category = "migration"
            title = "Migration-Related Issue"
            impact = "high"
        elif "api" in context_lower or "404" in context_lower or "500" in context_lower:
            category = "platform_bug"
            title = "API Error Detected"
            impact = "medium"
        else:
            category = "unknown"
            title = "Issue Requires Investigation"
            impact = "medium"
        
        return {
            "title": title,
            "summary": "Issue detected from incoming signals. Manual review recommended.",
            "category": category,
            "root_cause": "Automated analysis - please review signals for details",
            "reasoning_chain": [
                {
                    "step_number": 1,
                    "observation": "Multiple signals received",
                    "inference": "Pattern indicates systemic issue",
                    "confidence": 0.6
                }
            ],
            "confidence": 0.6,
            "impact": impact,
            "suggested_actions": ["Review signals manually", "Check merchant configuration"]
        }


# Global reasoner instance
reasoner = Reasoner()
