export const user = { name: "Priya Sharma", initials: "PS" };

export const stats = [
  { id: "docs", value: 124, label: "Regulatory Documents", note: "12 this month", tone: "green", icon: "file" },
  { id: "updates", value: 5, label: "New Updates", note: "2 require attention", tone: "red", icon: "bell" },
  { id: "rules", value: 248, label: "Regulatory Rules", note: "3 new rules", tone: "blue", icon: "rules" },
  { id: "impacts", value: 12, label: "Potential Trade Impacts", note: "4 high priority", tone: "orange", icon: "activity" },
];

export const popularSearches = ["Trade reporting", "EMIR margin requirements", "MiFID II RTS 22", "UTI generation", "FCA algorithmic trading"];

export const documentActions = [
  { id: "upload", title: "Upload Document", sub: "PDF / HTML / TXT", icon: "upload", tone: "green", to: "/library" },
  { id: "browse", title: "Browse Documents", sub: "by Regulator", icon: "file", tone: "blue", to: "/library" },
  { id: "history", title: "Version History", sub: "& Comparison", icon: "clock", tone: "purple", to: "/updates" },
  { id: "rules", title: "Manage Rules", sub: "JSON Configuration", icon: "settings", tone: "orange", to: "/rule-engine" },
];

export const assistantPrompts = [
  "What are the reporting fields for interest rate swaps under EMIR?",
  "Summarise latest MiFID II updates",
  "Show rules related to UTI",
  "What are the changes in RTS 22?",
];

export const impactMatrix = [
  { tradeId: "TDR001", product: "Interest Rate Swap", regulator: "EMIR", rule: "Rule 4.2", impact: "High", reason: "Price field missing" },
  { tradeId: "TDR002", product: "Equity Option", regulator: "MiFID II", rule: "RTS 22.5", impact: "Medium", reason: "Invalid counterparty type" },
  { tradeId: "TDR003", product: "Credit Default Swap", regulator: "Dodd-Frank", rule: "Section 723", impact: "High", reason: "UTI not generated" },
  { tradeId: "TDR004", product: "FX Forward", regulator: "FCA", rule: "Guidance 3.1", impact: "Low", reason: "Reporting within threshold" },
  { tradeId: "TDR005", product: "Interest Rate Swap", regulator: "EMIR", rule: "Rule 4.3", impact: "Medium", reason: "Missing notional currency" },
];

export const coverage = [
  { regulator: "MiFID II", docs: 42 },
  { regulator: "EMIR", docs: 36 },
  { regulator: "Dodd-Frank", docs: 28 },
  { regulator: "FCA", docs: 18 },
];

export const searchResults = [
  { id: 1, title: "EMIR Reporting Requirements for Interest Rate Swaps", regulator: "EMIR", clause: "Article 9", date: "10 Jan 2025",
    snippet: "Counterparties must report the details of any derivative contract to a trade repository no later than the working day following conclusion.",
    citation: "EMIR Regulation (EU) No 648/2012, Article 9 – Reporting obligation." },
  { id: 2, title: "RTS 22 – Transaction Reporting Field Requirements", regulator: "MiFID II", clause: "Annex I, Table 2", date: "12 Jan 2025",
    snippet: "Investment firms shall report complete and accurate details of transactions in financial instruments to the competent authority.",
    citation: "Commission Delegated Regulation (EU) 2017/590, Annex I." },
  { id: 3, title: "Swap Data Reporting – UTI Generation", regulator: "Dodd-Frank", clause: "Section 45.5", date: "05 Jan 2025",
    snippet: "A unique transaction identifier must be created for each swap and shared with the counterparty at execution.",
    citation: "CFTC Part 45, Section 45.5 – Unique swap identifiers." },
];

export const rules = [
  { id: "R-4.2", regulator: "EMIR", name: "Price field mandatory", severity: "High", active: true },
  { id: "R-22.5", regulator: "MiFID II", name: "Valid counterparty type", severity: "Medium", active: true },
  { id: "R-723", regulator: "Dodd-Frank", name: "UTI must be generated", severity: "High", active: true },
  { id: "R-3.1", regulator: "FCA", name: "Reporting within threshold", severity: "Low", active: false },
];

export const alerts = [
  { id: 1, level: "High", title: "RTS 22 field change affects 4 trades", regulator: "MiFID II", date: "12 Jan 2025", read: false },
  { id: 2, level: "High", title: "UTI not generated for TDR003", regulator: "Dodd-Frank", date: "11 Jan 2025", read: false },
  { id: 3, level: "Medium", title: "New clearing threshold effective Q2", regulator: "EMIR", date: "10 Jan 2025", read: false },
  { id: 4, level: "Low", title: "FCA guidance published", regulator: "FCA", date: "08 Jan 2025", read: true },
  { id: 5, level: "Medium", title: "Missing notional currency on TDR005", regulator: "EMIR", date: "07 Jan 2025", read: true },
];

export const reports = [
  { id: "impact", title: "Impact Matrix Report", desc: "Trade-to-rule impact for all trades." },
  { id: "coverage", title: "Regulatory Coverage Report", desc: "Document count by regulator." },
  { id: "rules", title: "Rules Status Report", desc: "All rules with severity and active state." },
  { id: "alerts", title: "Alerts Summary Report", desc: "All alerts with level and status." },
];

export const productTypes = ["Interest Rate Swap", "Equity Option", "Credit Default Swap", "FX Forward"];
export const regulators = ["EMIR", "MiFID II", "SEC", "FCA", "Dodd-Frank", "CFTC", "ESMA"];
export const counterpartyTypes = ["Financial", "Non-Financial", "Corporate", "Fund"];

export const sampleTrades = [
  { tradeId: "TDR001", product: "Interest Rate Swap", regulator: "EMIR", rule: "Rule 4.2", price: "", notionalCurrency: "EUR", counterparty: "Financial", uti: "UTI001" },
  { tradeId: "TDR002", product: "Equity Option", regulator: "MiFID II", rule: "RTS 22.5", price: "12.5", notionalCurrency: "EUR", counterparty: "Unknown", uti: "UTI002" },
  { tradeId: "TDR003", product: "Credit Default Swap", regulator: "Dodd-Frank", rule: "Section 723", price: "98.1", notionalCurrency: "USD", counterparty: "Fund", uti: "" },
  { tradeId: "TDR004", product: "FX Forward", regulator: "FCA", rule: "Guidance 3.1", price: "1.09", notionalCurrency: "GBP", counterparty: "Corporate", uti: "UTI004" },
  { tradeId: "TDR005", product: "Interest Rate Swap", regulator: "EMIR", rule: "Rule 4.3", price: "101.2", notionalCurrency: "", counterparty: "Financial", uti: "UTI005" },
];
