import { useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { askAssistant, suggestedPrompts } from "../services/api.js";

export default function AssistantPanel() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (question) => {
    const q = (typeof question === "string" ? question : text).trim();
    if (!q || busy) return;
    setText("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text: q }]);
    try {
      const answer = await askAssistant(q);
      if (answer && answer !== "undefined") {
        setMessages((m) => [...m, { role: "bot", text: answer }]);
      }
    } catch (err) {
      setMessages((m) => [...m, { role: "bot", text: `Assistant query failed: ${err.message}` }]);
    } finally {
      setBusy(false);
    }
  };

  const validMessages = messages.filter((m) => m && m.text && m.text !== "undefined");

  return (
    <section className="card assistant">
      <div className="card-title"><Sparkles size={18} className="accent" /><h2>Ask Reg IRIS (AI Assistant)</h2></div>

      <div className="chat">
        {validMessages.length === 0 ? (
          <>
            <p className="muted">How can I help you today? Try asking:</p>
            <div className="chip-col">
              {suggestedPrompts.map((p) => (
                <button key={p} className="chip" onClick={() => send(p)}>{p}</button>
              ))}
            </div>
          </>
        ) : (
          validMessages.map((m, i) => <div key={i} className={`bubble ${m.role || "bot"}`}>{m.text}</div>)
        )}
        {busy && <div className="bubble bot">Thinking…</div>}
      </div>

      <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your question..." />
        <button className="btn icon-only" aria-label="Send"><ArrowRight size={18} /></button>
      </form>
    </section>
  );
}
