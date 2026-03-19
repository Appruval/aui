import { useState, useRef, useCallback, useEffect } from "react";

// ─── Component Catalog ───────────────────────────────────────────────
const COMPONENT_CATALOG = {
  Box: {
    props: ["padding","margin","background","borderRadius","border","width","height","display","flexDirection","alignItems","justifyContent","gap","overflow","boxShadow","position","top","left","right","bottom","opacity","cursor","flex","minWidth","maxWidth","minHeight","maxHeight","flexWrap","children"],
    container: true,
  },
  Text: {
    props: ["content","fontSize","fontWeight","color","textAlign","lineHeight","letterSpacing","textTransform","fontFamily","textDecoration","whiteSpace","overflow","textOverflow","margin"],
    container: false,
  },
  Button: {
    props: ["label","variant","size","background","color","borderRadius","border","padding","fontSize","fontWeight","cursor","width","onClick","disabled","boxShadow","margin"],
    container: false,
  },
  Image: {
    props: ["src","alt","width","height","borderRadius","objectFit","border","boxShadow","opacity"],
    container: false,
  },
  Input: {
    props: ["placeholder","type","value","bindPath","background","border","borderRadius","padding","fontSize","color","width","outline"],
    container: false,
  },
  Heading: {
    props: ["content","level","fontSize","fontWeight","color","textAlign","lineHeight","letterSpacing","fontFamily","textTransform","margin"],
    container: false,
  },
  Divider: {
    props: ["color","thickness","margin","width","style"],
    container: false,
  },
  Spacer: {
    props: ["height","width"],
    container: false,
  },
  Icon: {
    props: ["name","size","color"],
    container: false,
  },
  Badge: {
    props: ["label","background","color","borderRadius","padding","fontSize","fontWeight"],
    container: false,
  },
  List: {
    props: ["direction","gap","padding","wrap","alignItems","justifyContent","children"],
    container: true,
  },
  Card: {
    props: ["padding","background","borderRadius","border","boxShadow","width","maxWidth","overflow","cursor","children"],
    container: true,
  },
  Avatar: {
    props: ["src","alt","size","borderRadius","border"],
    container: false,
  },
  Progress: {
    props: ["value","max","height","background","fillColor","borderRadius","width"],
    container: false,
  },
  Toggle: {
    props: ["checked","bindPath","background","activeBackground","size"],
    container: false,
  },
  TextArea: {
    props: ["placeholder","value","bindPath","rows","background","border","borderRadius","padding","fontSize","color","width","resize"],
    container: false,
  },
  Select: {
    props: ["options","value","bindPath","placeholder","background","border","borderRadius","padding","fontSize","color","width"],
    container: false,
  },
  Grid: {
    props: ["columns","rows","gap","padding","alignItems","justifyItems","width","height","children"],
    container: true,
  },
};

const CATALOG_NAMES = Object.keys(COMPONENT_CATALOG);
const CONTAINER_TYPES = CATALOG_NAMES.filter(n => COMPONENT_CATALOG[n].container);

// ─── System prompt ───────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a UI generation engine. You output ONLY flat JSONL — one JSON object per line, NO markdown, NO code fences, NO explanation text.

MESSAGE TYPES:

1. beginRendering — Start a surface
   {"beginRendering":{"surfaceId":"<id>","root":"<rootComponentId>"}}

2. surfaceUpdate — Add/update components on a surface
   {"surfaceUpdate":{"surfaceId":"<id>","components":[...]}}
   Each component: {"id":"<unique>","component":{"<Type>":{...props}}}

3. dataModelUpdate — Set state values
   {"dataModelUpdate":{"surfaceId":"<id>","contents":[{"key":"k","valueString":"v"}]}}

4. deleteSurface — Remove a surface
   {"deleteSurface":{"surfaceId":"<id>"}}

AVAILABLE COMPONENTS:
${CATALOG_NAMES.map(name => {
  const c = COMPONENT_CATALOG[name];
  return `• ${name}${c.container ? " [CONTAINER]" : ""}: ${c.props.filter(p => p !== "children").join(", ")}`;
}).join("\n")}

CRITICAL RULES FOR PARENT-CHILD RELATIONSHIPS:
- Container components (${CONTAINER_TYPES.join(", ")}) MUST use a "children" prop — an array of child component IDs.
- Every child ID referenced in "children" MUST be defined as its own component in the same or another surfaceUpdate.
- Non-container components NEVER have "children".

EXAMPLE — A card with a heading, text, and a button row:
{"beginRendering":{"surfaceId":"s1","root":"card1"}}
{"surfaceUpdate":{"surfaceId":"s1","components":[{"id":"card1","component":{"Card":{"padding":"24px","background":"#ffffff","borderRadius":"16px","boxShadow":"0 4px 24px rgba(0,0,0,0.08)","width":"400px","children":["heading1","desc1","btnRow"]}}},{"id":"heading1","component":{"Heading":{"content":"Welcome","level":2,"fontSize":"22px","fontWeight":"700","color":"#1a1a2e"}}},{"id":"desc1","component":{"Text":{"content":"This is a sample card","fontSize":"14px","color":"#6b7280","lineHeight":"1.6"}}},{"id":"btnRow","component":{"Box":{"display":"flex","gap":"8px","children":["btn1","btn2"]}}},{"id":"btn1","component":{"Button":{"label":"Accept","background":"#3b82f6","color":"#fff","borderRadius":"8px","padding":"10px 20px"}}},{"id":"btn2","component":{"Button":{"label":"Decline","background":"transparent","color":"#6b7280","border":"1px solid #e5e7eb","borderRadius":"8px","padding":"10px 20px"}}}]}}

EXAMPLE — Grid layout:
{"beginRendering":{"surfaceId":"s2","root":"grid1"}}
{"surfaceUpdate":{"surfaceId":"s2","components":[{"id":"grid1","component":{"Grid":{"columns":"repeat(3, 1fr)","gap":"16px","padding":"24px","children":["c1","c2","c3"]}}},{"id":"c1","component":{"Card":{"padding":"16px","background":"#f0fdf4","borderRadius":"12px","children":["t1"]}}},{"id":"t1","component":{"Text":{"content":"Cell 1","fontSize":"14px","color":"#166534"}}},{"id":"c2","component":{"Card":{"padding":"16px","background":"#eff6ff","borderRadius":"12px","children":["t2"]}}},{"id":"t2","component":{"Text":{"content":"Cell 2","fontSize":"14px","color":"#1e40af"}}},{"id":"c3","component":{"Card":{"padding":"16px","background":"#fef3c7","borderRadius":"12px","children":["t3"]}}},{"id":"t3","component":{"Text":{"content":"Cell 3","fontSize":"14px","color":"#92400e"}}}]}}

DESIGN GUIDELINES:
- Use realistic content — real names, real descriptions, plausible data.
- Use good visual design: proper spacing (padding/gap), soft shadows, rounded corners, cohesive color palette.
- For images use https://picsum.photos/WIDTH/HEIGHT (e.g. https://picsum.photos/400/300).
- For avatars use https://i.pravatar.cc/SIZE (e.g. https://i.pravatar.cc/80).
- Build complex layouts by nesting Box/Card/List/Grid containers with explicit children arrays.
- You can split components across multiple surfaceUpdate messages for the same surfaceId.

OUTPUT ONLY VALID JSONL. NO OTHER TEXT.`;

// ─── Validation ──────────────────────────────────────────────────────
function validateJsonlLine(line) {
  const errors = [];
  let parsed;
  try { parsed = JSON.parse(line); } catch (e) {
    return { valid: false, errors: [`Invalid JSON: ${e.message}`], parsed: null };
  }

  const msgTypes = ["beginRendering","surfaceUpdate","dataModelUpdate","deleteSurface"];
  const foundTypes = msgTypes.filter(t => parsed[t] !== undefined);

  if (foundTypes.length === 0) {
    errors.push(`No recognized message type. Expected: ${msgTypes.join(", ")}`);
    return { valid: false, errors, parsed };
  }
  if (foundTypes.length > 1) {
    errors.push(`Multiple message types: ${foundTypes.join(", ")}`);
  }

  const type = foundTypes[0];
  const data = parsed[type];

  if (type === "beginRendering") {
    if (!data?.surfaceId) errors.push("Missing surfaceId");
    if (!data?.root) errors.push("Missing root component ID");
  }
  if (type === "surfaceUpdate") {
    if (!data?.surfaceId) errors.push("Missing surfaceId");
    if (!Array.isArray(data?.components)) {
      errors.push("components must be an array");
    } else {
      data.components.forEach((comp, i) => {
        if (!comp.id) errors.push(`component[${i}]: missing id`);
        if (!comp.component || typeof comp.component !== "object") {
          errors.push(`component[${i}]: missing component object`);
        } else {
          const types = Object.keys(comp.component);
          if (types.length !== 1) {
            errors.push(`component[${i}]: must have exactly one type, found ${types.length}`);
          } else if (!COMPONENT_CATALOG[types[0]]) {
            errors.push(`component[${i}]: unknown type "${types[0]}"`);
          }
        }
      });
    }
  }
  if (type === "dataModelUpdate") {
    if (!data?.surfaceId) errors.push("Missing surfaceId");
    if (!Array.isArray(data?.contents)) errors.push("contents must be an array");
  }
  if (type === "deleteSurface") {
    if (!data?.surfaceId) errors.push("Missing surfaceId");
  }

  return { valid: errors.length === 0, errors, parsed, type };
}

// ─── Component Renderers ─────────────────────────────────────────────
function RenderComponent({ id, componentsMap, dataModel, setDataModel, depth = 0 }) {
  if (depth > 30) return null;
  const compDef = componentsMap[id];
  if (!compDef) return <div style={{ padding: "4px 8px", background: "#fef2f2", color: "#dc2626", fontSize: "11px", borderRadius: "4px", fontFamily: "monospace" }}>Missing: {id}</div>;

  const [typeName, props] = Object.entries(compDef)[0];
  const childIds = Array.isArray(props.children) ? props.children : [];

  const renderChildren = () =>
    childIds.map(cid => <RenderComponent key={cid} id={cid} componentsMap={componentsMap} dataModel={dataModel} setDataModel={setDataModel} depth={depth + 1} />);

  const icons = { heart:"♥", star:"★", check:"✓", close:"✕", arrow:"→", menu:"☰", search:"⌕", user:"👤", mail:"✉", home:"⌂", settings:"⚙", bell:"🔔", cart:"🛒", plus:"+", minus:"−", edit:"✎", trash:"🗑", download:"⬇", upload:"⬆", lock:"🔒", eye:"👁", clock:"🕐", calendar:"📅", phone:"📞", location:"📍", link:"🔗", image:"🖼", file:"📄", folder:"📁", code:"⟨⟩", globe:"🌐", sun:"☀", moon:"🌙", cloud:"☁", fire:"🔥", gift:"🎁", trophy:"🏆", flag:"🚩" };

  switch (typeName) {
    case "Box":
      return (
        <div style={{ display: props.display || "flex", flexDirection: props.flexDirection || "column", alignItems: props.alignItems, justifyContent: props.justifyContent, gap: props.gap, padding: props.padding, margin: props.margin, background: props.background, borderRadius: props.borderRadius, border: props.border, width: props.width, height: props.height, overflow: props.overflow, boxShadow: props.boxShadow, position: props.position, top: props.top, left: props.left, right: props.right, bottom: props.bottom, opacity: props.opacity, cursor: props.cursor, flex: props.flex, minWidth: props.minWidth, maxWidth: props.maxWidth, minHeight: props.minHeight, maxHeight: props.maxHeight, flexWrap: props.flexWrap }}>
          {renderChildren()}
        </div>
      );
    case "Text":
      return <p style={{ fontSize: props.fontSize || "14px", fontWeight: props.fontWeight, color: props.color || "#374151", textAlign: props.textAlign, lineHeight: props.lineHeight || "1.5", letterSpacing: props.letterSpacing, textTransform: props.textTransform, fontFamily: props.fontFamily, textDecoration: props.textDecoration, whiteSpace: props.whiteSpace, overflow: props.overflow, textOverflow: props.textOverflow, margin: props.margin || "0" }}>{props.content}</p>;
    case "Heading": {
      const Tag = `h${Math.min(Math.max(props.level || 2, 1), 6)}`;
      return <Tag style={{ fontSize: props.fontSize || "24px", fontWeight: props.fontWeight || "700", color: props.color || "#111827", textAlign: props.textAlign, lineHeight: props.lineHeight || "1.3", letterSpacing: props.letterSpacing, fontFamily: props.fontFamily, textTransform: props.textTransform, margin: props.margin || "0" }}>{props.content}</Tag>;
    }
    case "Button":
      return <button style={{ padding: props.padding || "10px 20px", background: props.background || "#3b82f6", color: props.color || "#fff", border: props.border || "none", borderRadius: props.borderRadius || "8px", fontSize: props.fontSize || "14px", fontWeight: props.fontWeight || "600", cursor: "pointer", width: props.width, boxShadow: props.boxShadow, opacity: props.disabled ? 0.5 : 1, margin: props.margin, fontFamily: "inherit", transition: "all 0.15s" }}>{props.label}</button>;
    case "Image":
      return <img src={props.src || "https://picsum.photos/200"} alt={props.alt || ""} style={{ width: props.width || "100%", height: props.height || "auto", borderRadius: props.borderRadius, objectFit: props.objectFit || "cover", border: props.border, boxShadow: props.boxShadow, opacity: props.opacity, display: "block" }} />;
    case "Input":
      return <input type={props.type || "text"} placeholder={props.placeholder} value={props.bindPath ? (dataModel[props.bindPath] || "") : (props.value || "")} onChange={e => { if (props.bindPath) setDataModel(prev => ({ ...prev, [props.bindPath]: e.target.value })); }} style={{ padding: props.padding || "10px 14px", background: props.background || "#f9fafb", border: props.border || "1px solid #d1d5db", borderRadius: props.borderRadius || "8px", fontSize: props.fontSize || "14px", color: props.color || "#111827", width: props.width || "100%", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />;
    case "TextArea":
      return <textarea placeholder={props.placeholder} rows={props.rows || 4} value={props.bindPath ? (dataModel[props.bindPath] || "") : (props.value || "")} onChange={e => { if (props.bindPath) setDataModel(prev => ({ ...prev, [props.bindPath]: e.target.value })); }} style={{ padding: props.padding || "10px 14px", background: props.background || "#f9fafb", border: props.border || "1px solid #d1d5db", borderRadius: props.borderRadius || "8px", fontSize: props.fontSize || "14px", color: props.color || "#111827", width: props.width || "100%", resize: props.resize || "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />;
    case "Select":
      return (
        <select value={props.bindPath ? (dataModel[props.bindPath] || "") : (props.value || "")} onChange={e => { if (props.bindPath) setDataModel(prev => ({ ...prev, [props.bindPath]: e.target.value })); }} style={{ padding: props.padding || "10px 14px", background: props.background || "#f9fafb", border: props.border || "1px solid #d1d5db", borderRadius: props.borderRadius || "8px", fontSize: props.fontSize || "14px", color: props.color || "#111827", width: props.width || "100%", outline: "none", boxSizing: "border-box" }}>
          {props.placeholder && <option value="">{props.placeholder}</option>}
          {(props.options || []).map((opt, i) => <option key={i} value={typeof opt === "string" ? opt : opt.value}>{typeof opt === "string" ? opt : opt.label}</option>)}
        </select>
      );
    case "Divider":
      return <hr style={{ border: "none", borderTop: `${props.thickness || "1px"} ${props.style || "solid"} ${props.color || "#e5e7eb"}`, margin: props.margin || "8px 0", width: props.width || "100%" }} />;
    case "Spacer":
      return <div style={{ height: props.height, width: props.width, flexShrink: 0 }} />;
    case "Icon":
      return <span style={{ fontSize: props.size || "20px", color: props.color, lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{icons[props.name] || props.name || "●"}</span>;
    case "Badge":
      return <span style={{ display: "inline-block", padding: props.padding || "2px 10px", background: props.background || "#e0e7ff", color: props.color || "#4338ca", borderRadius: props.borderRadius || "999px", fontSize: props.fontSize || "12px", fontWeight: props.fontWeight || "600", whiteSpace: "nowrap" }}>{props.label}</span>;
    case "Card":
      return (
        <div style={{ padding: props.padding || "20px", background: props.background || "#ffffff", borderRadius: props.borderRadius || "12px", border: props.border, boxShadow: props.boxShadow || "0 1px 3px rgba(0,0,0,0.08)", width: props.width, maxWidth: props.maxWidth, overflow: props.overflow || "hidden", cursor: props.cursor }}>
          {renderChildren()}
        </div>
      );
    case "Avatar":
      return <img src={props.src || "https://i.pravatar.cc/80"} alt={props.alt || ""} style={{ width: props.size || "40px", height: props.size || "40px", borderRadius: props.borderRadius || "50%", objectFit: "cover", border: props.border, display: "block", flexShrink: 0 }} />;
    case "List":
      return (
        <div style={{ display: "flex", flexDirection: props.direction || "column", gap: props.gap || "8px", padding: props.padding, flexWrap: props.wrap, alignItems: props.alignItems, justifyContent: props.justifyContent }}>
          {renderChildren()}
        </div>
      );
    case "Grid":
      return (
        <div style={{ display: "grid", gridTemplateColumns: props.columns, gridTemplateRows: props.rows, gap: props.gap || "8px", padding: props.padding, alignItems: props.alignItems, justifyItems: props.justifyItems, width: props.width, height: props.height }}>
          {renderChildren()}
        </div>
      );
    case "Progress": {
      const pct = ((props.value || 0) / (props.max || 100)) * 100;
      return (
        <div style={{ width: props.width || "100%", height: props.height || "8px", background: props.background || "#e5e7eb", borderRadius: props.borderRadius || "999px", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: props.fillColor || "#3b82f6", borderRadius: props.borderRadius || "999px", transition: "width 0.4s ease" }} />
        </div>
      );
    }
    case "Toggle": {
      const checked = props.bindPath ? !!dataModel[props.bindPath] : !!props.checked;
      const sz = props.size === "lg" ? 28 : props.size === "sm" ? 18 : 22;
      return (
        <div onClick={() => { if (props.bindPath) setDataModel(prev => ({ ...prev, [props.bindPath]: !prev[props.bindPath] })); }} style={{ width: sz * 1.9, height: sz, borderRadius: sz, background: checked ? (props.activeBackground || "#3b82f6") : (props.background || "#d1d5db"), cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
          <div style={{ width: sz - 4, height: sz - 4, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: checked ? sz * 1.9 - sz + 2 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
        </div>
      );
    }
    default:
      return <div style={{ padding: "4px 8px", background: "#fef2f2", color: "#dc2626", fontSize: "11px", borderRadius: "4px" }}>Unknown: {typeName}</div>;
  }
}

// ─── Surface Preview ─────────────────────────────────────────────────
function SurfacePreview({ surface, dataModel, setDataModel }) {
  const { rootId, componentsMap } = surface;
  if (!rootId || !componentsMap[rootId]) {
    return <div style={{ padding: 40, color: "#9ca3af", textAlign: "center", fontStyle: "italic" }}>No root component found</div>;
  }
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "32px 24px", minHeight: "300px" }}>
      <RenderComponent id={rootId} componentsMap={componentsMap} dataModel={dataModel} setDataModel={setDataModel} />
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────
export default function App() {
  const [prompt, setPrompt] = useState("");
  const [surfaces, setSurfaces] = useState({});
  const [dataModels, setDataModels] = useState({});
  const [jsonlLines, setJsonlLines] = useState([]);
  const [validationResults, setValidationResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [activeTab, setActiveTab] = useState("preview");
  const [history, setHistory] = useState([]);
  const maxRetries = 2;
  const outputRef = useRef(null);

  const processJsonl = useCallback((rawText) => {
    const lines = rawText.split("\n").filter(l => l.trim());
    const results = lines.map(line => ({ line, ...validateJsonlLine(line) }));
    setJsonlLines(lines);
    setValidationResults(results);

    const hasErrors = results.some(r => !r.valid);
    if (hasErrors) return { hasErrors, results };

    const newSurfaces = {};
    const newDataModels = {};

    results.forEach(({ parsed, type }) => {
      if (type === "beginRendering") {
        const d = parsed.beginRendering;
        newSurfaces[d.surfaceId] = { rootId: d.root, componentsMap: {} };
      }
      if (type === "surfaceUpdate") {
        const d = parsed.surfaceUpdate;
        if (!newSurfaces[d.surfaceId]) {
          newSurfaces[d.surfaceId] = { rootId: null, componentsMap: {} };
        }
        const surf = newSurfaces[d.surfaceId];
        d.components.forEach(comp => {
          surf.componentsMap[comp.id] = comp.component;
        });
      }
      if (type === "dataModelUpdate") {
        const d = parsed.dataModelUpdate;
        if (!newDataModels[d.surfaceId]) newDataModels[d.surfaceId] = {};
        d.contents.forEach(entry => {
          if (entry.valueString !== undefined) newDataModels[d.surfaceId][entry.key] = entry.valueString;
          else if (entry.valueNumber !== undefined) newDataModels[d.surfaceId][entry.key] = entry.valueNumber;
          else if (entry.valueBoolean !== undefined) newDataModels[d.surfaceId][entry.key] = entry.valueBoolean;
        });
      }
      if (type === "deleteSurface") {
        delete newSurfaces[parsed.deleteSurface.surfaceId];
        delete newDataModels[parsed.deleteSurface.surfaceId];
      }
    });

    setSurfaces(newSurfaces);
    setDataModels(newDataModels);
    return { hasErrors: false, results };
  }, []);

  const callLLM = useCallback(async (userPrompt, attempt = 0) => {
    setLoading(true);
    setError(null);
    setRetryCount(attempt);

    try {
      const messages = [{ role: "user", content: userPrompt }];
      if (attempt > 0) {
        const failedLines = validationResults.filter(r => !r.valid);
        const errorSummary = failedLines.map(r => `Line: ${r.line}\nErrors: ${r.errors.join(", ")}`).join("\n\n");
        messages.push({ role: "assistant", content: jsonlLines.join("\n") });
        messages.push({ role: "user", content: `Validation errors:\n${errorSummary}\n\nFix and output corrected JSONL only. Available components: ${CATALOG_NAMES.join(", ")}. Containers MUST have "children" array of child IDs.` });
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4096, system: SYSTEM_PROMPT, messages }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      const text = data.content.map(c => c.text || "").filter(Boolean).join("\n");
      const cleaned = text.replace(/```[a-z]*\n?/g, "").replace(/```/g, "").trim();

      const { hasErrors } = processJsonl(cleaned);

      if (hasErrors && attempt < maxRetries) {
        await callLLM(userPrompt, attempt + 1);
      } else if (hasErrors) {
        setError(`Validation failed after ${maxRetries + 1} attempts.`);
        setLoading(false);
      } else {
        setHistory(prev => [...prev, { prompt: userPrompt, jsonl: cleaned }]);
        setLoading(false);
        setActiveTab("preview");
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [processJsonl, validationResults, jsonlLines]);

  const handleSubmit = () => {
    if (!prompt.trim() || loading) return;
    callLLM(prompt.trim());
  };

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [jsonlLines]);

  const surfaceIds = Object.keys(surfaces);
  const validCount = validationResults.filter(r => r.valid).length;
  const errorCount = validationResults.filter(r => !r.valid).length;

  return (
    <div style={{ minHeight: "100vh", background: "#08080c", color: "#e2e8f0", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #252533; border-radius: 3px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        textarea:focus { outline: none; border-color: #6366f1 !important; }
        button { font-family: inherit; }
        .tab-btn { padding: 10px 16px; background: none; border: none; border-bottom: 2px solid transparent; color: #64748b; font-size: 12px; font-weight: 600; cursor: pointer; text-transform: uppercase; letter-spacing: .06em; transition: all .15s; }
        .tab-btn:hover { color: #94a3b8; }
        .tab-btn.active { color: #e2e8f0; border-bottom-color: #6366f1; }
        .jsonl-line { padding: 6px 16px; border-left: 3px solid transparent; transition: background .15s; }
        .jsonl-line:hover { background: rgba(255,255,255,.02); }
        .jsonl-line.valid { border-left-color: #22c55e; }
        .jsonl-line.invalid { border-left-color: #ef4444; background: rgba(239,68,68,.03); }
        .run-btn { padding: 0 24px; border: none; border-radius: 10px; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; transition: all .2s; min-width: 80px; letter-spacing: .02em; }
        .run-btn:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
        .run-btn:disabled { opacity: .4; cursor: not-allowed; }
        .history-item { font-size: 12px; color: #94a3b8; padding: 5px 10px; border-radius: 6px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: background .15s; }
        .history-item:hover { background: #1a1a2a; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ borderBottom: "1px solid #16161f", padding: "14px 20px", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: 32, height: 32, borderRadius: "8px", background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 800, color: "#fff", letterSpacing: "-0.05em" }}>{"{ }"}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.01em" }}>JSONL UI Renderer</div>
          <div style={{ fontSize: "10px", color: "#525266", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: "1px" }}>Declarative Surface Protocol</div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#a78bfa" }}>
              <div style={{ width: 12, height: 12, border: "2px solid #a78bfa", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
              {retryCount > 0 ? `Retry ${retryCount}/${maxRetries}` : "Generating…"}
            </div>
          )}
          <div style={{ fontSize: "10px", color: "#3f3f54", padding: "3px 8px", background: "#12121a", borderRadius: "5px", border: "1px solid #1e1e2e" }}>{CATALOG_NAMES.length} components</div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display: "flex", height: "calc(100vh - 61px)" }}>

        {/* ── Left: Prompt + Output ── */}
        <div style={{ width: "40%", minWidth: 340, borderRight: "1px solid #16161f", display: "flex", flexDirection: "column" }}>
          {/* Prompt */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #16161f" }}>
            <div style={{ fontSize: "10px", color: "#525266", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, marginBottom: "6px" }}>Prompt</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
                placeholder="Design a login form with email, password, and social buttons…"
                rows={3}
                style={{ flex: 1, padding: "10px 12px", background: "#0e0e15", border: "1px solid #1e1e2e", borderRadius: "8px", color: "#e2e8f0", fontSize: "13px", fontFamily: "inherit", resize: "none", lineHeight: 1.5, transition: "border-color .2s" }}
              />
              <button className="run-btn" onClick={handleSubmit} disabled={loading || !prompt.trim()} style={{ background: loading ? "#1e1e2e" : "linear-gradient(135deg, #6366f1, #7c3aed)", alignSelf: "stretch" }}>
                {loading ? "…" : "Run ▸"}
              </button>
            </div>
            <div style={{ fontSize: "10px", color: "#3f3f54", marginTop: "5px" }}>⌘+Enter to send</div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ margin: "8px 16px 0", padding: "8px 12px", background: "#1a0a0a", border: "1px solid #7f1d1d", borderRadius: "8px", color: "#fca5a5", fontSize: "12px" }}>{error}</div>
          )}

          {/* JSONL Output */}
          <div style={{ flex: 1, overflow: "auto", paddingTop: "8px" }} ref={outputRef}>
            <div style={{ padding: "0 16px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: "10px", color: "#525266", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600 }}>
                Output {jsonlLines.length > 0 && `· ${jsonlLines.length} lines`}
              </div>
              {jsonlLines.length > 0 && (
                <div style={{ display: "flex", gap: "8px", fontSize: "10px" }}>
                  {validCount > 0 && <span style={{ color: "#22c55e" }}>✓ {validCount}</span>}
                  {errorCount > 0 && <span style={{ color: "#ef4444" }}>✕ {errorCount}</span>}
                </div>
              )}
            </div>

            {jsonlLines.length === 0 ? (
              <div style={{ padding: "60px 16px", textAlign: "center" }}>
                <div style={{ fontSize: "28px", marginBottom: "10px", opacity: 0.15 }}>{"{ }"}</div>
                <div style={{ fontSize: "13px", color: "#3f3f54" }}>JSONL output appears here</div>
              </div>
            ) : (
              jsonlLines.map((line, i) => {
                const vr = validationResults[i];
                const isValid = vr?.valid;
                let pretty = line;
                try { pretty = JSON.stringify(JSON.parse(line), null, 2); } catch {}
                return (
                  <div key={i} className={`jsonl-line ${isValid ? "valid" : "invalid"}`} style={{ animation: `fadeUp .25s ease ${i * 0.04}s both`, marginBottom: "1px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                      <span style={{ fontSize: "9px", color: "#3f3f54", fontFamily: "'JetBrains Mono', monospace", minWidth: 20 }}>{i + 1}</span>
                      <span style={{ fontSize: "9px", color: isValid ? "#22c55e" : "#ef4444", fontWeight: 700 }}>{isValid ? "VALID" : "ERROR"}</span>
                      {vr?.type && <span style={{ fontSize: "9px", color: "#7c3aed", fontFamily: "'JetBrains Mono', monospace", background: "rgba(124,58,237,.1)", padding: "1px 5px", borderRadius: "3px" }}>{vr.type}</span>}
                    </div>
                    <pre style={{ fontSize: "10.5px", color: "#6b7280", fontFamily: "'JetBrains Mono', monospace", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.5, maxHeight: 100, overflow: "auto" }}>{pretty}</pre>
                    {!isValid && vr?.errors.map((err, j) => (
                      <div key={j} style={{ fontSize: "10px", color: "#f87171", marginTop: "3px", paddingLeft: 26 }}>↳ {err}</div>
                    ))}
                  </div>
                );
              })
            )}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div style={{ borderTop: "1px solid #16161f", padding: "6px 12px", maxHeight: 100, overflow: "auto" }}>
              <div style={{ fontSize: "10px", color: "#525266", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, marginBottom: "4px", padding: "0 4px" }}>History</div>
              {history.map((h, i) => (
                <div key={i} className="history-item" onClick={() => { setPrompt(h.prompt); processJsonl(h.jsonl); setActiveTab("preview"); }}>
                  {h.prompt}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Preview / Data / Catalog ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #16161f", padding: "0 12px" }}>
            {["preview", "data", "catalog"].map(tab => (
              <button key={tab} className={`tab-btn ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>{tab}</button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflow: "auto" }}>

            {/* Preview */}
            {activeTab === "preview" && (
              surfaceIds.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "14px" }}>
                  <div style={{ width: 64, height: 64, borderRadius: "16px", background: "#0e0e15", border: "1px dashed #1e1e2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", opacity: 0.25 }}>◎</div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "14px", color: "#525266", fontWeight: 500 }}>No surfaces rendered</div>
                    <div style={{ fontSize: "12px", color: "#3f3f54", marginTop: "3px" }}>Enter a prompt and run to generate UI</div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "16px" }}>
                  {surfaceIds.map(sid => (
                    <div key={sid} style={{ marginBottom: 16, animation: "fadeUp .35s ease" }}>
                      <div style={{ fontSize: "10px", color: "#6366f1", fontFamily: "'JetBrains Mono', monospace", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                        surface/{sid}
                        <span style={{ color: "#3f3f54" }}>·</span>
                        <span style={{ color: "#3f3f54" }}>{Object.keys(surfaces[sid].componentsMap).length} components</span>
                      </div>
                      <div style={{ background: "#ffffff", borderRadius: "10px", overflow: "auto", border: "1px solid #1e1e2e", minHeight: 200 }}>
                        <SurfacePreview
                          surface={surfaces[sid]}
                          dataModel={dataModels[sid] || {}}
                          setDataModel={updater => setDataModels(prev => ({ ...prev, [sid]: updater(prev[sid] || {}) }))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Data */}
            {activeTab === "data" && (
              <div style={{ padding: "16px" }}>
                <div style={{ fontSize: "10px", color: "#525266", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, marginBottom: "10px" }}>Data Model State</div>
                {Object.keys(dataModels).length === 0 ? (
                  <div style={{ color: "#3f3f54", fontSize: "13px", fontStyle: "italic" }}>No data model entries</div>
                ) : (
                  Object.entries(dataModels).map(([sid, model]) => (
                    <div key={sid} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: "11px", color: "#6366f1", fontFamily: "'JetBrains Mono', monospace", marginBottom: "6px" }}>surface/{sid}</div>
                      <pre style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", background: "#0e0e15", padding: "12px", borderRadius: "8px", border: "1px solid #16161f", whiteSpace: "pre-wrap", margin: 0 }}>{JSON.stringify(model, null, 2)}</pre>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Catalog */}
            {activeTab === "catalog" && (
              <div style={{ padding: "16px" }}>
                <div style={{ fontSize: "10px", color: "#525266", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, marginBottom: "10px" }}>Component Catalog · {CATALOG_NAMES.length} types</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "8px" }}>
                  {CATALOG_NAMES.map(name => {
                    const cat = COMPONENT_CATALOG[name];
                    return (
                      <div key={name} style={{ padding: "10px 12px", background: "#0e0e15", borderRadius: "8px", border: "1px solid #16161f" }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                          {name}
                          {cat.container && <span style={{ fontSize: "8px", background: "rgba(124,58,237,.15)", color: "#a78bfa", padding: "1px 5px", borderRadius: "3px", textTransform: "uppercase", fontWeight: 700, letterSpacing: ".04em" }}>container</span>}
                        </div>
                        <div style={{ fontSize: "10px", color: "#525266", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6, wordBreak: "break-word" }}>
                          {cat.props.filter(p => p !== "children").join(" · ")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
