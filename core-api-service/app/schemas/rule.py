from typing import Any, Optional
from pydantic import BaseModel, Field


class RuleInfo(BaseModel):
    id: str
    description: str
    impact: str


class RegulatorInfo(BaseModel):
    id: str
    name: str
    jurisdiction: str
    rule_count: int
    rules: list[RuleInfo]


class RegulatorListResponse(BaseModel):
    regulators: list[RegulatorInfo]


# ---- Internal and testing models ----
class RuleFileStatus(BaseModel):
    file: str
    regulator_id: str
    ok: bool
    rule_count: int
    error: Optional[str] = None


class RuleTestRequest(BaseModel):
    logic: Any  # JSON Logic object
    trade: dict[str, Any]  # Key-value trade payload


class RuleTestResult(BaseModel):
    passed: bool
    explanation: Optional[str] = None
    evidence: dict[str, Any] = Field(default_factory=dict)
