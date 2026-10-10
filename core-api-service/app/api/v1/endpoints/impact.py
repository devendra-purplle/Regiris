"""Impact analysis endpoints: trade compliance evaluation against regulatory rule sets."""
from typing import List
from fastapi import APIRouter, File, Form, HTTPException, Response, UploadFile
from starlette.concurrency import run_in_threadpool

from app.schemas.impact import ImpactReport
from app.schemas.internal import ServiceError
from app.services.impact.csv_exporter import report_to_csv
from app.services.impact.impact_evaluator import build_report
from app.services.impact.trade_loader import parse_trades, read_upload
from app.services.rules.rule_loader import load_regulators

router = APIRouter(tags=["Impact Analysis"])


def _run_check(content: bytes, regulator_ids: list[str]) -> ImpactReport:
    rulesets = load_regulators(regulator_ids)
    parsed = parse_trades(content)
    return build_report(parsed, rulesets)


@router.post("/check", response_model=ImpactReport, summary="Evaluate Trades Against Regulators")
async def check_trades(
    file: UploadFile = File(...),
    regulators: List[str] = Form(...),
):
    """
    Evaluates uploaded trade CSV file against specified regulator rule sets.
    Returns per-trade violations, pass/fail status, and summary statistics.
    """
    ids = [part.strip() for item in regulators for part in item.split(",") if part.strip()]
    if not ids:
        raise HTTPException(status_code=400, detail="At least one regulator ID must be provided")

    try:
        content = await read_upload(file)
        return await run_in_threadpool(_run_check, content, ids)
    except ServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to evaluate impact: {str(exc)}")


@router.post("/export", summary="Export Impact Evaluation Report as CSV")
def export_report(report: ImpactReport):
    """Generates and downloads a CSV export of the provided ImpactReport."""
    try:
        csv_content = report_to_csv(report)
        return Response(
            content=csv_content,
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": 'attachment; filename="compliance_report.csv"'},
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to export report CSV: {str(exc)}")
