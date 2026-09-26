"""
ProcureAI — Chatbot Context Retrieval Service
Pulls real-time procurement data from SQLite to ground Grok responses with verifiable facts.
"""
from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from models.tender import Tender
from models.requirement import Requirement
from models.bidder import Bidder
from models.document import Document
from models.extracted_field import ExtractedField
from models.compliance_result import ComplianceResult
from models.risk_signal import RiskSignal
from models.procurement_history import ProcurementHistory
from schemas.chatbot import ChatSource
from services.compliance_engine import get_compliance_summary


def gather_procurement_context(
    db: Session,
    message: str,
    tender_id: Optional[int] = None,
    bidder_id: Optional[int] = None
) -> Tuple[str, List[ChatSource]]:
    """
    Collect comprehensive database context based on the user's active view and query intent.
    Returns: (context_text, list_of_sources)
    """
    sources: List[ChatSource] = []
    sections: List[str] = []

    # 1. Resolve Bidder if explicitly given or mentioned by name
    target_bidder = None
    if bidder_id:
        target_bidder = db.query(Bidder).filter(Bidder.id == bidder_id).first()
    else:
        # Check if user mentioned any bidder's name
        bidders = db.query(Bidder).all()
        for b in bidders:
            if b.company_name.lower() in message.lower():
                target_bidder = b
                break

    # 2. Resolve Tender if explicitly given, derived from bidder, or mentioned
    target_tender = None
    if tender_id:
        target_tender = db.query(Tender).filter(Tender.id == tender_id).first()
    elif target_bidder:
        target_tender = db.query(Tender).filter(Tender.id == target_bidder.tender_id).first()
    else:
        # Check if user mentioned tender ID or title
        tenders = db.query(Tender).all()
        for t in tenders:
            if (t.tender_id and t.tender_id.lower() in message.lower()) or (t.title and t.title.lower() in message.lower()):
                target_tender = t
                break

    # ── Section A: Active Tender Context ─────────────────────────────────────
    if target_tender:
        sources.append(ChatSource(
            type="tender",
            id=target_tender.id,
            label=f"Tender: {target_tender.title} ({target_tender.tender_id})",
            snippet=f"Deadline: {target_tender.submission_deadline}, Status: {target_tender.status}"
        ))

        reqs = db.query(Requirement).filter(Requirement.tender_id == target_tender.id).all()
        tender_bidders = db.query(Bidder).filter(Bidder.tender_id == target_tender.id).all()

        t_text = [
            f"=== ACTIVE TENDER ===",
            f"ID: {target_tender.id} | Tender Ref: {target_tender.tender_id}",
            f"Title: {target_tender.title}",
            f"Category: {target_tender.category} | Status: {target_tender.status}",
            f"Deadline: {target_tender.submission_deadline}",
            f"Description: {target_tender.description}",
            f"\nRequirements ({len(reqs)} total):"
        ]
        for r in reqs:
            t_text.append(f"- [REQ-{r.id}] {r.name} (Mandatory: {r.mandatory}, Type: {r.expected_document_type})")

        t_text.append(f"\nParticipating Bidders & Compliance Breakdown ({len(tender_bidders)} total):")
        for b in tender_bidders:
            summary = get_compliance_summary(b.id, db)
            signals = db.query(RiskSignal).filter(RiskSignal.bidder_id == b.id).all()
            high_risks = sum(1 for s in signals if s.severity == "HIGH")
            med_risks = sum(1 for s in signals if s.severity == "MEDIUM")
            
            b_comp_results = db.query(ComplianceResult).filter(ComplianceResult.bidder_id == b.id).all()
            verified_list = []
            missing_list = []
            review_list = []
            for cr in b_comp_results:
                r_obj = db.query(Requirement).filter(Requirement.id == cr.requirement_id).first()
                r_label = r_obj.name if r_obj else f"Req #{cr.requirement_id}"
                if cr.status == "VERIFIED":
                    verified_list.append(r_label)
                elif cr.status == "MISSING":
                    missing_list.append(r_label)
                elif cr.status in ["REVIEW", "NEEDS_REVIEW"]:
                    review_list.append(f"{r_label} ({cr.reason or 'Needs review'})")
            
            t_text.append(
                f"- [Bidder #{b.id}] {b.company_name} | Score: {summary.get('compliance_score', 0)}% "
                f"| Verified: [{', '.join(verified_list) if verified_list else 'None'}] "
                f"| Missing: [{', '.join(missing_list) if missing_list else 'None'}] "
                f"| Review: [{', '.join(review_list) if review_list else 'None'}] "
                f"| Risks: {high_risks} HIGH, {med_risks} MEDIUM"
            )
        sections.append("\n".join(t_text))

    # ── Section B: Specific Bidder Deep-Dive ─────────────────────────────────
    if target_bidder:
        sources.append(ChatSource(
            type="bidder",
            id=target_bidder.id,
            label=f"Bidder: {target_bidder.company_name}",
            snippet=f"GSTIN: {target_bidder.gstin}, PAN: {target_bidder.pan}, CIN: {target_bidder.cin}"
        ))

        b_docs = db.query(Document).filter(Document.bidder_id == target_bidder.id).all()
        b_comp = db.query(ComplianceResult).filter(ComplianceResult.bidder_id == target_bidder.id).all()
        b_risk = db.query(RiskSignal).filter(RiskSignal.bidder_id == target_bidder.id).all()
        b_hist = db.query(ProcurementHistory).filter(ProcurementHistory.bidder_id == target_bidder.id).all()

        b_text = [
            f"=== BIDDER DOSSIER: {target_bidder.company_name} (ID: {target_bidder.id}) ===",
            f"CIN: {target_bidder.cin} | GSTIN: {target_bidder.gstin} | PAN: {target_bidder.pan}",
            f"Udyam/MSME: {target_bidder.udyam_number} | Incorporated: {target_bidder.incorporation_date}",
            f"Registered Address: {target_bidder.registered_address}",
            f"\nUploaded Documents ({len(b_docs)}):"
        ]
        for d in b_docs:
            fields = db.query(ExtractedField).filter(ExtractedField.document_id == d.id).all()
            field_details = []
            invalid_or_flagged = []
            for f in fields:
                f_str = f"{f.field_name}: '{f.field_value}' [{f.validation_status or 'EXTRACTED'}]"
                if f.validation_message:
                    f_str += f" ({f.validation_message})"
                field_details.append(f_str)
                if f.validation_status in ["INVALID", "EXPIRED", "NEEDS_REVIEW"]:
                    invalid_or_flagged.append(f"{f.field_name}={f.field_value} ({f.validation_message or f.validation_status})")

            snippet_text = f"Status: {d.status}, Confidence: {d.classification_confidence}"
            if invalid_or_flagged:
                snippet_text += f" | Issues: {'; '.join(invalid_or_flagged)}"

            sources.append(ChatSource(
                type="document",
                id=d.id,
                label=f"Doc: {d.file_name} ({d.document_type})",
                snippet=snippet_text
            ))
            b_text.append(
                f"- Doc #{d.id}: {d.file_name} -> Type: {d.document_type}, Status: {d.status}, OCR Used: {d.ocr_used}\n"
                f"  Extracted Fields: {', '.join(field_details) if field_details else 'None'}"
            )

        b_text.append(f"\nCompliance Evaluations ({len(b_comp)}):")
        for c in b_comp:
            req = db.query(Requirement).filter(Requirement.id == c.requirement_id).first()
            req_name = req.name if req else f"Req #{c.requirement_id}"
            b_text.append(f"- Requirement '{req_name}': STATUS = {c.status} | Reason: {c.reason}")

        b_text.append(f"\nRisk Signals ({len(b_risk)}):")
        for r in b_risk:
            sources.append(ChatSource(
                type="risk",
                id=r.id,
                label=f"Risk: {r.risk_type} [{r.severity}]",
                snippet=r.description
            ))
            b_text.append(f"- [{r.severity}] {r.risk_type}: {r.description} (Evidence: {r.evidence})")

        if b_hist:
            b_text.append(f"\nPast Procurement History ({len(b_hist)} contracts):")
            for h in b_hist:
                b_text.append(f"- Tender '{h.tender_title}' ({h.tender_year}): Status={h.contract_status}, Performance={h.performance_rating}/5")

        sections.append("\n".join(b_text))

    # ── Section C: Global Platform Overview (if no specific context) ────────
    if not target_tender and not target_bidder:
        all_tenders = db.query(Tender).all()
        all_bidders = db.query(Bidder).all()
        all_risks = db.query(RiskSignal).all()

        overview = [
            f"=== GLOBAL PROCUREMENT OVERVIEW ===",
            f"Total Active Tenders: {len(all_tenders)}",
            f"Total Registered Bidders: {len(all_bidders)}",
            f"Total System Risk Signals: {len(all_risks)}",
            "\nAvailable Tenders:"
        ]
        for t in all_tenders:
            b_count = db.query(Bidder).filter(Bidder.tender_id == t.id).count()
            overview.append(f"- ID {t.id} ({t.tender_id}): '{t.title}' | Status: {t.status} | Bidders: {b_count}")

        sections.append("\n".join(overview))

    context_str = "\n\n".join(sections)
    return context_str, sources
