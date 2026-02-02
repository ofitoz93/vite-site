import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xvgdxasuekjtatecxzso.supabase.co';
const supabaseKey = 'sb_publishable_jNQDV7LMw5MHY-WiABHSAw_WhWUbeAE';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
const [session, setSession] = useState<any>(null);
const [loading, setLoading] = useState(false);
const [documents, setDocuments] = useState<any[]>([]);
const [facilities, setFacilities] = useState<any[]>([]);
const [docTypes, setDocTypes] = useState<any[]>([]);
const [previewUrl, setPreviewUrl] = useState<string | null>(null);
const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

// Form State
const [selectedFacility, setSelectedFacility] = useState('');
const [selectedDocType, setSelectedDocType] = useState('');
const [issueDate, setIssueDate] = useState('');
const [expiryDate, setExpiryDate] = useState('');
const [file, setFile] = useState<File | null>(null);
const [newTypeName, setNewTypeName] = useState('');
const [newFacilityName, setNewFacilityName] = useState('');

const EMAILJS_SERVICE_ID = 'service_y6fmk9j';
const EMAILJS_TEMPLATE_ID = 'template_1eioeg9';
const EMAILJS_PUBLIC_KEY = 'R658yIytRxTRwzmKJ';

useEffect(() => {
const script = document.createElement("script");
script.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js";
script.async = true;
script.onload = () => (window as any).emailjs?.init(EMAILJS_PUBLIC_KEY);
document.head.appendChild(script);

    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));

}, []);

useEffect(() => {
if (session) fetchData();
}, [session]);

const fetchData = async () => {
const { data: docs } = await supabase.from('documents').select('_').order('created_at', { ascending: false });
setDocuments(docs || []);
const { data: facs } = await supabase.from('facilities').select('_').order('name');
setFacilities(facs || []);
const { data: types } = await supabase.from('document_types').select('\*').order('name');
setDocTypes(types || []);
};

const handleAddDocType = async () => {
if (!newTypeName) return;
const { error } = await supabase.from('document_types').insert([{ name: newTypeName, user_id: session.user.id }]);
if (!error) { await fetchData(); setSelectedDocType(newTypeName); setNewTypeName(''); }
};

const handleAddFacility = async () => {
if (!newFacilityName) return;
const { error } = await supabase.from('facilities').insert([{ name: newFacilityName, user_id: session.user.id }]);
if (!error) { await fetchData(); setSelectedFacility(newFacilityName); setNewFacilityName(''); }
};

const handleSave = async () => {
if (!selectedFacility || !selectedDocType || !file) return alert("Eksik alanları doldurun!");
setLoading(true);
try {
const path = `${session.user.id}/${Date.now()}_${file.name}`;
await supabase.storage.from('belgeler').upload(path, file);
const fileUrl = supabase.storage.from('belgeler').getPublicUrl(path).data.publicUrl;

      const { error } = await supabase.from('documents').insert([{
        user_id: session.user.id,
        facility_name: selectedFacility,
        process_name: selectedDocType,
        issue_date: issueDate,
        expiry_date: expiryDate,
        file_url: fileUrl
      }]);

      if (!error) {
        alert("Belge kaydedildi!");
        fetchData();
        setFile(null); setIssueDate(''); setExpiryDate('');
      }
    } catch (err) { alert("Yükleme hatası!"); }
    finally { setLoading(false); }

};

const handleDeleteDoc = async (id: string) => {
if (confirm("Bu belgeyi kalıcı olarak silmek istediğinize emin misiniz?")) {
const { error } = await supabase.from('documents').delete().eq('id', id);
if (!error) fetchData();
}
};

const groupedDocs = documents.reduce((acc: any, doc: any) => {
const key = `${doc.facility_name}|${doc.process_name}`;
if (!acc[key]) acc[key] = [];
acc[key].push(doc);
return acc;
}, {});

// Dosya uzantısına göre resim mi PDF mi kontrol etme
const isImage = (url: string) => /\.(jpg|jpeg|png|webp|avif|gif)$/i.test(url);

return (
<div style={styles.container}>
<header style={styles.header}>
<h2 style={{color:'#1e293b'}}>🏛️ Gelişmiş Arşiv Yönetimi</h2>
<button onClick={() => fetchData()} style={styles.refreshBtn}>🔄 Yenile</button>
</header>

      {/* TANIMLAMALAR */}
      <div style={styles.grid}>
        <section style={styles.card}>
          <h4 style={styles.cardTitle}>🏢 Tesis Ekle</h4>
          <div style={{display:'flex', gap:'5px'}}>
            <input placeholder="Yeni Tesis..." style={styles.input} value={newFacilityName} onChange={e => setNewFacilityName(e.target.value)} />
            <button onClick={handleAddFacility} style={styles.smallAddBtn}>+</button>
          </div>
        </section>
        <section style={styles.card}>
          <h4 style={styles.cardTitle}>📄 Belge Türü Ekle</h4>
          <div style={{display:'flex', gap:'5px'}}>
            <input placeholder="Örn: İşletme Belgesi" style={styles.input} value={newTypeName} onChange={e => setNewTypeName(e.target.value)} />
            <button onClick={handleAddDocType} style={styles.smallAddBtn}>+</button>
          </div>
        </section>
      </div>

      {/* YÜKLEME FORMU */}
      <section style={{...styles.card, border: selectedDocType ? '2px solid #2563eb' : '1px solid #e2e8f0'}}>
        <h4 style={{...styles.cardTitle, color: selectedDocType ? '#2563eb' : '#64748b'}}>
          {selectedDocType ? `📝 ${selectedDocType} (Yeni Versiyon)` : '➕ Yeni Belge Kaydı'}
        </h4>
        <div style={styles.grid}>
          <select style={styles.input} value={selectedFacility} onChange={e => setSelectedFacility(e.target.value)}>
            <option value="">Tesis Seç...</option>
            {facilities.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
          </select>
          <select style={styles.input} value={selectedDocType} onChange={e => setSelectedDocType(e.target.value)}>
            <option value="">Tür Seç...</option>
            {docTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        </div>
        <div style={styles.grid}>
          <div style={{flex:1}}><label style={styles.label}>Veriliş</label><input type="date" style={styles.input} value={issueDate} onChange={e => setIssueDate(e.target.value)} /></div>
          <div style={{flex:1}}><label style={styles.label}>Bitiş</label><input type="date" style={styles.input} value={expiryDate} onChange={e => setExpiryDate(e.target.value)} /></div>
        </div>
        <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} style={{marginBottom:'10px', fontSize:'12px'}} />
        <button onClick={handleSave} disabled={loading} style={styles.button}>{loading ? 'Yükleniyor...' : 'Arşive Kaydet'}</button>
      </section>

      {/* ARŞİV LİSTESİ */}
      <div style={{marginTop:'20px'}}>
        {Object.keys(groupedDocs).map(key => {
          const history = groupedDocs[key];
          const latest = history[0];
          const isExpanded = expandedGroups.includes(key);

          return (
            <div key={key} style={styles.groupCard}>
              <div style={styles.groupHeader}>
                <div style={{flex:1, cursor:'pointer'}} onClick={() => setExpandedGroups(p => p.includes(key) ? p.filter(x => x!==key) : [...p, key])}>
                  <span style={styles.tag}>{latest.facility_name}</span>
                  <strong style={{display:'block', marginTop:'5px'}}>{latest.process_name}</strong>
                  <div style={{fontSize:'11px', color:'#ef4444'}}>Son Tarih: {latest.expiry_date || 'Süresiz'}</div>
                </div>
                <div style={{display:'flex', gap:'10px'}}>
                   <button onClick={() => {
                       setSelectedFacility(latest.facility_name);
                       setSelectedDocType(latest.process_name);
                       window.scrollTo({top: 150, behavior: 'smooth'});
                   }} style={styles.revBtn} title="Yenisini Ekle">+</button>
                   <button onClick={() => setExpandedGroups(p => p.includes(key) ? p.filter(x => x!==key) : [...p, key])} style={styles.iconBtn}>
                      {isExpanded ? '▲' : '▼'}
                   </button>
                </div>
              </div>

              {isExpanded && (
                <div style={styles.archiveList}>
                  {history.map((doc: any, index: number) => (
                    <div key={doc.id} style={styles.historyItem}>
                      <span style={{fontWeight: index===0 ? 'bold':'normal'}}>
                        {index === 0 ? '🟢 Güncel' : '⚪ Arşiv'} ({doc.expiry_date})
                      </span>
                      <div style={{display:'flex', gap:'8px'}}>
                        <button onClick={() => setPreviewUrl(doc.file_url)} style={styles.miniBtn}>👁️</button>
                        <button onClick={() => handleDeleteDoc(doc.id)} style={{...styles.miniBtn, color:'red'}}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* GELİŞMİŞ VE KAPATILABİLİR MODAL */}
      {previewUrl && (
        <div style={styles.modalOverlay} onClick={() => setPreviewUrl(null)}>
          <div style={styles.modalContainer} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={{fontWeight:'bold'}}>Belge Önizleme</span>
              <button onClick={() => setPreviewUrl(null)} style={styles.closeBtn}>✕ Kapat</button>
            </div>
            <div style={styles.modalBody}>
              {isImage(previewUrl) ? (
                <img src={previewUrl} style={{maxWidth:'100%', maxHeight:'100%', objectFit:'contain'}} alt="Önizleme" />
              ) : (
                <iframe src={previewUrl} style={{width:'100%', height:'100%', border:'none'}} title="PDF Önizleme" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>

);
}

const styles: any = {
container: { padding: '15px', maxWidth: '750px', margin: '0 auto', fontFamily: 'sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' },
header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
card: { backgroundColor: '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', marginBottom: '10px' },
grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
input: { padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '8px', width: '100%', fontSize:'13px' },
label: { fontSize: '10px', color: '#94a3b8', marginBottom:'2px', display:'block' },
button: { width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
smallAddBtn: { width: '40px', backgroundColor: '#1e293b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' },
groupCard: { backgroundColor: '#fff', borderRadius: '12px', marginBottom: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft:'5px solid #10b981' },
groupHeader: { padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
tag: { fontSize: '9px', backgroundColor: '#eff6ff', color: '#2563eb', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' },
revBtn: { width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: '20px' },
iconBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' },
archiveList: { padding: '10px 15px', backgroundColor: '#f9fafb', borderTop: '1px solid #f1f5f9' },
historyItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '12px' },
miniBtn: { border: '1px solid #e2e8f0', background: '#fff', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' },
// Modal Stilleri
modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
modalContainer: { backgroundColor: '#fff', width: '90%', height: '85%', borderRadius: '12px', display:'flex', flexDirection:'column', overflow:'hidden' },
modalHeader: { padding:'10px 15px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center' },
modalBody: { flex:1, display:'flex', justifyContent:'center', alignItems:'center', backgroundColor:'#333', overflow:'hidden' },
closeBtn: { backgroundColor:'#ef4444', color:'#fff', border:'none', padding:'6px 12px', borderRadius:'6px', cursor:'pointer', fontWeight:'bold' },
cardTitle: { marginTop:0, marginBottom:'10px', fontSize:'13px' },
refreshBtn: { fontSize:'11px', padding:'5px 10px', backgroundColor:'#fff', border:'1px solid #ddd', borderRadius:'6px', cursor:'pointer' }
};
