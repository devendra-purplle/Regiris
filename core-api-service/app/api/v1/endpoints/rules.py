"""Read-only endpoints for browsing regulators and their rules."""
from fastapi import APIRouter, HTTPException

from app.schemas.internal import RuleSet, ServiceError
from app.schemas.rule import RegulatorInfo, RegulatorListResponse, RuleInfo
from app.services.rules.rule_loader import list_regulators, load_regulators

router = APIRouter(tags=["Rules & Regulators"])


def _to_info(rs: RuleSet) -> RegulatorInfo:
    return RegulatorInfo(
        id=rs.id,
        name=rs.name,
        jurisdiction=rs.jurisdiction,
        rule_count=len(rs.rules),
        rules=[RuleInfo(id=r.id, description=r.description, impact=r.impact) for r in rs.rules],
    )


@router.get("", response_model=RegulatorListResponse, summary="List Regulators and Rules")
def get_regulators():
    """Returns all available regulators and their corresponding validation rules."""
    return RegulatorListResponse(regulators=[_to_info(rs) for rs in list_regulators()])


@router.get("/{regulator_id}", response_model=RegulatorInfo, summary="Get Regulator Details")
def get_regulator(regulator_id: str):
    """Retrieve details and rules for a specific regulator (case-insensitive ID)."""
    try:
        results = load_regulators([regulator_id])
        if not results:
            raise HTTPException(status_code=404, detail=f"Regulator {regulator_id} not found")
        return _to_info(results[0])
    except ServiceError as exc:
        status_code = 404 if exc.status_code == 422 else exc.status_code
        raise HTTPException(status_code=status_code, detail=exc.message)
