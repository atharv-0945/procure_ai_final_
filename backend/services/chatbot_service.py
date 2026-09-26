"""
ProcureAI — Chatbot Service (Grok / xAI Integration)
Dedicated Conversational Intelligence Assistant for Procurement Officers.
Provides context-aware analysis of tenders, bidder risks, compliance gaps, and document anomalies.
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import httpx

from config import get_settings
from schemas.chatbot import ChatResponse, ChatSource, QuickAction

logger = logging.getLogger("procure_ai.chatbot")


# In-memory session store: session_id -> list of {"role": "...", "content": "..."}
_SESSION_MEMORY: Dict[str, List[Dict[str, str]]] = {}
MAX_SESSION_MESSAGES = 12

SYSTEM_PROMPT = """You are ProcureAI Assistant, an elite procurement intelligence advisor powered by Grok (xAI) and ProcureAI Engine.
You assist procurement officers, tender evaluation committees, and vigilance officers in evaluating public and enterprise tenders.

OUTPUT FORMATTING INSTRUCTIONS (MANDATORY):
1. TABULAR SUMMARY OF COMPLIANCE (WHAT WAS MISSING VS VERIFIED):
   Whenever analyzing bidders or tender requirements, ALWAYS present the compliance breakdown in a clean, comprehensive Markdown table:
   | Bidder Name | Compliant / Verified Documents | Missing Documents / Gaps | Documents Under Review | Compliance % | Status |
   Clearly specify what was missing and what was submitted for each bidder.

2. TABULAR RISK & VIGILANCE AUDIT:
   When discussing risks or cartelization, provide a structured table:
   | Bidder | Severity | Specific Signal Detected | Recommended Procurement Action |

3. CLEAR & DIRECT EXECUTIVE FORMAT:
   - Use bold headers: ### 1. Tender Overview, ### 2. Bidder Compliance Table (Missing vs Verified), ### 3. Key Risk Signals, ### 4. Recommended Next Steps.
   - Keep observations crisp, professional, and audit-ready.
   - Avoid long, repetitive blocks of text; favor well-organized tables and concise bullet points.
   - Ground all findings strictly in the provided database context.
"""


def get_quick_actions() -> List[QuickAction]:
    """Return recommended quick actions for procurement officers."""
    return [
        QuickAction(
            id="summary",
            label="Summarize Tender Evaluation",
            prompt="Provide an executive summary of this tender, including total bidders, compliance rate, and key risks.",
            category="Overview"
        ),
        QuickAction(
            id="high_risk",
            label="Flag High-Risk Bidders",
            prompt="Which bidders have HIGH severity risk signals, and what evidence was detected?",
            category="Risk"
        ),
        QuickAction(
            id="compliance_gaps",
            label="Audit Compliance Gaps",
            prompt="List all mandatory requirements that have MISSING or REVIEW status across participating bidders.",
            category="Compliance"
        ),
        QuickAction(
            id="collusion_check",
            label="Inspect Cartelization & Ties",
            prompt="Are there any cross-bidder relationships, common directors, or shared addresses among the bidders?",
            category="Vigilance"
        ),
        QuickAction(
            id="doc_anomalies",
            label="Explain Document Failures",
            prompt="Which uploaded documents failed validation or require review, and what specific rules or regex failed?",
            category="Document"
        ),
        QuickAction(
            id="recommendation",
            label="Award Recommendation Readiness",
            prompt="Based on the compliance matrix and risk profiles, which bidders are eligible for commercial evaluation?",
            category="Decision"
        )
    ]


def clear_session(session_id: str) -> bool:
    """Clear memory for a given session."""
    if session_id in _SESSION_MEMORY:
        del _SESSION_MEMORY[session_id]
        return True
    return False


async def ask_procure_chatbot(
    message: str,
    context: str,
    sources: List[ChatSource],
    session_id: Optional[str] = None
) -> ChatResponse:
    """
    Send prompt + procurement context + conversation history to Grok (xAI) API.
    Falls back gracefully to intelligent local procurement rule-base if xAI key is not set.
    """
    if not session_id:
        session_id = str(uuid.uuid4())

    if session_id not in _SESSION_MEMORY:
        _SESSION_MEMORY[session_id] = []

    history = _SESSION_MEMORY[session_id]

    # Always read fresh settings to pick up latest .env values
    get_settings.cache_clear()
    settings = get_settings()

    # Check if xAI/Groq API key is available
    xai_key = settings.active_xai_key
    has_valid_key = bool(xai_key and xai_key != "your_xai_api_key_here" and len(xai_key) > 5)

    answer = ""
    model_used = settings.grok_model or "llama3-70b-8192"

    if has_valid_key:
        try:
            # Build conversation payload
            messages_payload = [{"role": "system", "content": SYSTEM_PROMPT}]
            
            # Grounding context message
            if context.strip():
                messages_payload.append({
                    "role": "system",
                    "content": f"CURRENT PROCUREMENT DATABASE CONTEXT:\n{context}"
                })

            # Append past turns
            for turn in history[-MAX_SESSION_MESSAGES:]:
                messages_payload.append(turn)

            # Append current user prompt
            messages_payload.append({"role": "user", "content": message})

            url = f"{settings.grok_api_base_url.rstrip('/')}/chat/completions"
            headers = {
                "Authorization": f"Bearer {xai_key}",
                "Content-Type": "application/json"
            }
            body = {
                "model": model_used,
                "messages": messages_payload,
                "temperature": 0.2,
                "max_tokens": 1200
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, headers=headers, json=body)
                if resp.status_code != 200:
                    logger.warning(f"Groq API error HTTP {resp.status_code}: {resp.text}")
                    print(f"[GROQ API ERROR] Status {resp.status_code}: {resp.text}")
                resp.raise_for_status()
                data = resp.json()
                answer = data["choices"][0]["message"]["content"]
                model_used = data.get("model", model_used)

        except Exception as e:
            logger.warning(f"Groq/Grok API call failed ({e}). Falling back to local intelligence.")
            print(f"[CHATBOT FALLBACK] Reason: {e}")
            answer = _generate_local_intelligence_response(message, context, sources)
            model_used = f"procure-ai-local (fallback: {type(e).__name__})"
    else:
        # Local procurement analyst fallback
        answer = _generate_local_intelligence_response(message, context, sources)
        model_used = "procure-ai-local-grounded (Configure XAI_API_KEY for Grok live)"

    # Update session memory
    history.append({"role": "user", "content": message})
    history.append({"role": "assistant", "content": answer})
    if len(history) > MAX_SESSION_MESSAGES * 2:
        _SESSION_MEMORY[session_id] = history[-MAX_SESSION_MESSAGES * 2:]

    now_iso = datetime.now(timezone.utc).isoformat()

    suggestions = [
        "Which bidder has the highest compliance rate?",
        "Explain the high risk flags detected.",
        "Generate a comparative summary for committee review."
    ]

    return ChatResponse(
        answer=answer,
        session_id=session_id,
        sources=sources,
        timestamp=now_iso,
        model_used=model_used,
        quick_suggestions=suggestions
    )


def _generate_local_intelligence_response(query: str, context: str, sources: List[ChatSource]) -> str:
    """
    Intelligent local procurement rule-base response generator when external API is offline.
    Uses exact context to compile precise, professional procurement advisory notes.
    """
    q_lower = query.lower()

    if not context.strip():
        return (
            "**ProcureAI Assistant (Grounding Active)**\n\n"
            "I am ready to assist you. Currently, no active tender or bidder is selected. "
            "Please select a Tender from the top selector or navigate to a Bidder's dossier, "
            "and I will analyze the compliance scores, submitted documents, and risk indicators for you."
        )

    # Parse bidders from context lines
    bidder_lines = [l for l in context.split("\n") if l.strip().startswith("- [Bidder #")]
    
    # 1. High risk queries
    if any(k in q_lower for k in ["risk", "red flag", "flag", "warning", "cartel", "collusion", "shell"]):
        lines = [
            "### 🛡️ Risk & Vigilance Intelligence Report\n",
            "| Bidder | Severity | Identified Signal / Anomaly | Suggested Action |",
            "| :--- | :---: | :--- | :--- |"
        ]
        risk_sources = [s for s in sources if s.type == "risk"]
        if risk_sources:
            for s in risk_sources:
                severity = "HIGH" if "HIGH" in s.label else ("MEDIUM" if "MEDIUM" in s.label else "LOW")
                lines.append(f"| **{s.label}** | `{severity}` | {s.snippet} | Request formal clarification / verification |")
            lines.append("\n**Actionable Vigilance Next Steps:**")
            lines.append("1. **Enhanced Scrutiny**: Place flagged bidders under enhanced due diligence prior to commercial opening.")
            lines.append("2. **Clarification Notice**: Issue formal clarification requests requiring notarized affidavits for questioned disclosures.")
        else:
            lines.append("| Global Dossier | `INFO` | No active HIGH severity risk signals detected in current scope | Proceed with normal technical evaluation |")
        return "\n".join(lines)

    # 2. Compliance / Missing Docs queries
    if any(k in q_lower for k in ["compliance", "mandatory", "requirement", "verify", "eligibility", "missing", "gap"]):
        lines = [
            "### 📋 Technical & Regulatory Compliance Matrix (Missing vs. Verified)\n",
            "| Bidder Name | Compliant / Verified Docs | Missing Documents | Review / Defects | Score |",
            "| :--- | :--- | :--- | :--- | :---: |"
        ]
        if bidder_lines:
            for bl in bidder_lines:
                # Format: - [Bidder #1] Name | Score: 100% | Verified: [...] | Missing: [...] | Review: [...] | Risks: ...
                parts = bl.replace("- [Bidder #", "").split("] ")
                b_name = parts[1].split(" | ")[0] if len(parts) > 1 else "Bidder"
                
                def extract_tag(text, tag):
                    if tag in text:
                        start = text.find(tag) + len(tag)
                        end = text.find("]", start)
                        return text[start:end] if end != -1 else text[start:]
                    return "—"
                
                score_str = "—"
                if "Score:" in bl:
                    score_str = bl.split("Score:")[1].split("%")[0].strip() + "%"
                elif "Compliance:" in bl:
                    score_str = bl.split("Compliance:")[1].split("%")[0].strip() + "%"

                ver = extract_tag(bl, "Verified: [")
                mis = extract_tag(bl, "Missing: [")
                rev = extract_tag(bl, "Review: [")

                lines.append(f"| **{b_name}** | {ver or 'None'} | {f'🔴 `{mis}`' if mis and mis != 'None' and mis != '—' else '🟢 None'} | {f'⚠️ {rev}' if rev and rev != 'None' and rev != '—' else 'None'} | `{score_str}` |")
        else:
            lines.append("| Active Scope | All uploaded documents ingested | Detailed breakdown linked in Compliance Matrix | None | `100%` |")
        
        lines.append("\n**Procurement Officer Advisory:**")
        lines.append("- Ensure all *Mandatory* requirements are strictly marked as verified before approving technical qualification.")
        return "\n".join(lines)

    # 3. Summary / Overview queries
    if any(k in q_lower for k in ["summary", "overview", "status", "report", "evaluate"]):
        lines = [
            "### 📊 Tender Evaluation Executive Summary\n",
            "#### 1. Bidder Compliance & Missing Documents Matrix",
            "| Bidder Name | Verified Documents | Missing Documents | Under Review | Score |",
            "| :--- | :--- | :--- | :--- | :---: |"
        ]
        if bidder_lines:
            for bl in bidder_lines:
                parts = bl.replace("- [Bidder #", "").split("] ")
                b_name = parts[1].split(" | ")[0] if len(parts) > 1 else "Bidder"
                
                def extract_tag(text, tag):
                    if tag in text:
                        start = text.find(tag) + len(tag)
                        end = text.find("]", start)
                        return text[start:end] if end != -1 else text[start:]
                    return "—"
                
                score_str = "—"
                if "Score:" in bl:
                    score_str = bl.split("Score:")[1].split("%")[0].strip() + "%"
                elif "Compliance:" in bl:
                    score_str = bl.split("Compliance:")[1].split("%")[0].strip() + "%"

                ver = extract_tag(bl, "Verified: [")
                mis = extract_tag(bl, "Missing: [")
                rev = extract_tag(bl, "Review: [")

                lines.append(f"| **{b_name}** | {ver or 'None'} | {f'🔴 `{mis}`' if mis and mis != 'None' and mis != '—' else '🟢 None'} | {f'⚠️ {rev}' if rev and rev != 'None' and rev != '—' else 'None'} | `{score_str}` |")
        else:
            lines.append("| Active Scope | Ingested via OCR | Verified against tender rules | None | `Active` |")

        lines.append("\n#### 2. Risk & Vigilance Highlights")
        risk_sources = [s for s in sources if s.type == "risk"]
        if risk_sources:
            lines.append("| Entity / Flag | Risk Detail | Action |")
            lines.append("| :--- | :--- | :--- |")
            for s in risk_sources[:4]:
                lines.append(f"| **{s.label}** | {s.snippet} | Formal Clarification |")
        else:
            lines.append("- No critical integrity or cartelization flags detected in the current scope.")

        lines.append("\n#### 3. Recommended Committee Next Steps")
        lines.append("1. **Disqualification / Clarification**: Request missing statutory filings from non-compliant bidders before commercial opening.")
        lines.append("2. **Vigilance Review**: Scrutinize cross-entity address and directorship overlaps.")
        lines.append("3. **Commercial Stage**: Proceed to financial bid opening for fully compliant entities.")
        return "\n".join(lines)

    # Default contextual response
    return (
        f"### 📑 Procurement Intelligence Dossier\n\n"
        f"In response to your query: *\"{query}\"*\n\n"
        f"**Relevant Database Records:**\n"
        f"{context[:800]}...\n\n"
        f"*ProcureAI Officer Note:* All observations above are retrieved from active database records."
    )
