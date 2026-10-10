import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { fetchRegulators, checkTrades } from "../services/ruleEngine.js";

const productTypes = ["Equity", "Bond", "FX", "Derivative", "Commodity"];
const counterpartyTypes = ["Financial", "Non-Financial", "Sovereign", "CCP"];

const empty = {
  tradeId: "",
  product: productTypes[0],
  regulator: "EMIR",
  price: "",
  quantity: "100",
  notionalCurrency: "USD",
  counterparty: "",
  uti: "",
};

export default function TradeValidator() {
  const [trade, setTrade] = useState(empty);
  const [regulators, setRegulators] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchRegulators()
      .then((list) => {
        if (!active) return;
        setRegulators(list);
        if (list.length > 0) {
          setTrade((t) => ({ ...t, regulator: list[0].id }));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const set = (k) => (e) => setTrade((t) => ({ ...t, [k]: e.target.value }));

  const onValidate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Build 1-trade CSV payload for the backend impact engine
      const headers = "Trade_ID,Asset_Class,Price,Quantity,Currency,Counterparty_LEI,Maturity_Date,Underlying_ISIN";
      const row = [
        trade.tradeId.trim() || "TDR001",
        trade.product,
        trade.price.trim(),
        trade.quantity.trim() || "1",
        trade.notionalCurrency.trim() || "USD",
        trade.counterparty.trim(),
        "", // Maturity_Date
        trade.uti.trim(),
      ].map((v) => `"${v}"`).join(",");

      const csvContent = `${headers}\n${row}`;
      const blob = new Blob([csvContent], { type: "text/csv" });
      const file = new File([blob], "validate_trade.csv", { type: "text/csv" });

      const report = await checkTrades(file, [trade.regulator]);
      const violations = report.results?.[0]?.violations || [];

      const issues = violations.map((v) => ({
        level: v.impact && (v.impact.toLowerCase().includes("mandatory") || v.impact.toLowerCase().includes("cannot")) ? "High" : "Medium",
        rule: `${v.regulator} (${v.rule_id})`,
        msg: v.explanation || v.description,
      }));

      setResult(issues);
    } catch (err) {
      setError(err.message || "Validation failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-simple">
      <h1 className="page-title">Trade Validator</h1>
      <p className="muted">Check a trade in real time against backend regulatory rules.</p>

      {error && <p className="error-text">{error}</p>}

      <form className="card form-grid" onSubmit={onValidate}>
        <label>Trade ID<input value={trade.tradeId} onChange={set("tradeId")} placeholder="TDR006" /></label>
        <label>Asset Class / Product Type
          <select className="select" value={trade.product} onChange={set("product")}>
            {productTypes.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label>Regulator
          <select className="select" value={trade.regulator} onChange={set("regulator")}>
            {regulators.length > 0 ? (
              regulators.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.id})</option>)
            ) : (
              <option value="EMIR">EMIR</option>
            )}
          </select>
        </label>
        <label>Price<input value={trade.price} onChange={set("price")} placeholder="e.g. 101.25" /></label>
        <label>Quantity<input value={trade.quantity} onChange={set("quantity")} placeholder="e.g. 100" /></label>
        <label>Currency<input value={trade.notionalCurrency} onChange={set("notionalCurrency")} placeholder="e.g. USD, EUR" /></label>
        <label>Counterparty LEI<input value={trade.counterparty} onChange={set("counterparty")} placeholder="20-character LEI" /></label>
        <label>Underlying ISIN / UTI<input value={trade.uti} onChange={set("uti")} placeholder="12-character ISIN" /></label>
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={() => { setTrade(empty); setResult(null); setError(""); }}>Reset</button>
          <button className="btn" disabled={loading}>{loading ? "Validating..." : "Validate"}</button>
        </div>
      </form>

      {result && (
        <div className="card">
          {result.length === 0 ? (
            <div className="result ok"><CheckCircle2 size={20} /> No issues found. Trade passes all checks.</div>
          ) : (
            <>
              <div className="result bad"><XCircle size={20} /> {result.length} issue{result.length > 1 ? "s" : ""} found</div>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Impact</th><th>Rule</th><th>Reason</th></tr></thead>
                  <tbody>
                    {result.map((i) => (
                      <tr key={i.rule + i.msg}>
                        <td><span className={`impact ${i.level.toLowerCase()}`}>{i.level}</span></td>
                        <td>{i.rule}</td>
                        <td>{i.msg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
