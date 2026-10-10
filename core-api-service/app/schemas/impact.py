from typing import Any, Optional, Literal
from datetime import datetime, date
from pydantic import BaseModel, Field
from app.schemas.common import Status


class TradeReport(BaseModel):
    Trade_ID: str = Field(..., max_length=12, pattern="^[a-zA-Z0-9]+$")
    Asset_Class: Literal["Equity", "Bond", "FX", "Derivative", "Commodity"]
    Timestamp: datetime
    Counterparty_LEI: str = Field(..., pattern="^[0-9A-Z]{20}$")
    Price: float = Field(..., ge=0)
    Quantity: int = Field(..., ge=1)
    Currency: Literal["USD", "EUR", "GBP", "JPY", "CHF"]
    Maturity_Date: Optional[date] = None
    Underlying_ISIN: Optional[str] = Field(None, pattern="^[A-Z0-9]{12}$")


class RuleRef(BaseModel):
    """One rule that was checked: becomes one column of the Impact Matrix."""
    regulator_id: str
    rule_id: str
    description: str


class RuleViolation(BaseModel):
    regulator_id: str
    regulator: str
    rule_id: str
    description: str
    impact: str
    explanation: str
    evidence: dict[str, Any] = Field(default_factory=dict)


class TradeResult(BaseModel):
    row_number: int  # row in the CSV file (header = row 1)
    trade_id: str  # Trade_ID from the CSV, or ROW-<n> if none
    status: Status
    trade: dict[str, Any]  # original trade values
    regulator_status: dict[str, Status]
    violations: list[RuleViolation] = Field(default_factory=list)


class RegulatorSummary(BaseModel):
    regulator_id: str
    name: str
    rules_checked: int
    passed: int
    failed: int


class RuleFailureCount(BaseModel):
    regulator_id: str
    rule_id: str
    description: str
    failures: int


class ReportSummary(BaseModel):
    total_trades: int
    passed: int
    failed: int
    pass_rate: float
    by_regulator: list[RegulatorSummary]
    rule_failures: list[RuleFailureCount]


class ImpactReport(BaseModel):
    summary: ReportSummary
    columns: list[str]
    regulators_checked: list[str]
    rules_checked: list[RuleRef] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    results: list[TradeResult]