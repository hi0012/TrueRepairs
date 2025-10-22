import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function AIScanModal({ open, onClose, userEmail }) {
  const [laborRate, setLaborRate] = useState(110);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => { if (open) loadHistory(); }, [open]);

  const loadHistory = async () => {
    if (!userEmail) return;
    const r = await fetch(`${API}/api/estimates?email=${encodeURIComponent(userEmail)}`);
    const j = await r.json();
    setHistory(j.items || []);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!file || !userEmail) return;
    setSubmitting(true);
    setResult(null);
    const fd = new FormData();
    fd.append("email", userEmail);
    fd.append("laborRate", String(laborRate));
    fd.append("file", file);
    const r = await fetch(`${API}/api/estimate`, { method: "POST", body: fd });
    const j = await r.json();
    setResult(j);
    setSubmitting(false);
    loadHistory();
  };

  if (!open) return null;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.42)",display:"grid",placeItems:"center",zIndex:1000}}>
      <div style={{width:"min(980px,96vw)",maxHeight:"92vh",overflow:"auto",background:"#fff",borderRadius:16,boxShadow:"0 10px 40px rgba(0,0,0,.25)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:"1px solid #eee"}}>
          <div style={{fontSize:20,fontWeight:700}}>AI Scan</div>
          <button onClick={onClose} style={{border:"0",background:"#f3f4f6",padding:"8px 12px",borderRadius:8,cursor:"pointer"}}>Close</button>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1.2fr",gap:20,padding:20}}>
          <div style={{border:"1px solid #eee",padding:16,borderRadius:12}}>
            <form onSubmit={onSubmit} style={{display:"grid",gap:12}}>
              <div style={{fontSize:14,color:"#374151"}}>{userEmail}</div>
              <input type="number" value={laborRate} onChange={e=>setLaborRate(Number(e.target.value))} placeholder="Labor rate" />
              <input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)} />
              <button disabled={submitting} style={{background:"#2563eb",color:"#fff",border:"0",padding:"10px 14px",borderRadius:8,cursor:"pointer"}}>
                {submitting ? "Estimating..." : "Upload & Estimate"}
              </button>
            </form>

            {result && (
              <div style={{marginTop:14,borderTop:"1px solid #eee",paddingTop:12}}>
                {"imageUrl" in result ? (
                  <div style={{display:"grid",gap:10}}>
                    <img src={result.thumbUrl || result.imageUrl} alt="" style={{maxWidth:"100%",borderRadius:8}} />
                    <div style={{fontWeight:600}}>{result.selection?.part} • {result.selection?.operation}</div>
                    <div style={{fontSize:18}}>${result.totalEstimated}</div>
                  </div>
                ) : (
                  <pre style={{whiteSpace:"pre-wrap"}}>{JSON.stringify(result,null,2)}</pre>
                )}
              </div>
            )}
          </div>

          <div style={{border:"1px solid #eee",padding:16,borderRadius:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontWeight:700}}>History</div>
              <button onClick={loadHistory} style={{border:"1px solid #e5e7eb",background:"#fff",padding:"6px 10px",borderRadius:8,cursor:"pointer"}}>Refresh</button>
            </div>
            <div style={{display:"grid",gap:10}}>
              {history.map(it=>(
                <div key={it._id} style={{display:"grid",gridTemplateColumns:"100px 1fr auto",gap:12,alignItems:"center",border:"1px solid #f3f4f6",padding:10,borderRadius:10}}>
                  <img src={it.thumbUrl || it.imageUrl} alt="" style={{width:100,height:82,objectFit:"cover",borderRadius:8}} />
                  <div>
                    <div style={{fontWeight:600}}>{it.selection?.part} • {it.selection?.operation}</div>
                    <div>${it.totalEstimated}</div>
                    <div style={{fontSize:12,color:"#6b7280"}}>{new Date(it.createdAt).toLocaleString()}</div>
                  </div>
                  <a href={it.imageUrl} target="_blank" rel="noreferrer" style={{textDecoration:"none",color:"#2563eb"}}>Open</a>
                </div>
              ))}
              {history.length===0 && <div style={{color:"#6b7280"}}>No saved estimates yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
