import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xvgdxasuekjtatecxzso.supabase.co';
const supabaseKey = 'sb_publishable_jNQDV7LMw5MHY-WiABHSAw_WhWUbeAE';
const supabase = createClient(supabaseUrl, supabaseKey);
const ADMIN_EMAIL = 'admin@asd.com';

export default function App() {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState({
    role: 'normal',
    premium_until: null,
  });
  const [editingDoc, setEditingDoc] = useState(null); // Düzenlenen belgenin tüm verisi
  const [editFile, setEditFile] = useState(null); // Güncelleme sırasında seçilen yeni dosya
  const [historyModal, setHistoryModal] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isContractAccepted, setIsContractAccepted] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  
  // Veri Listeleri
  const [previewUrl, setPreviewUrl] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  // Form State (Yeni Tarihler Dahil)
  const [selectedFacility, setSelectedFacility] = useState('');
  const [selectedDocType, setSelectedDocType] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [lastApplyDate, setLastApplyDate] = useState('');
  const [isPermanent, setIsPermanent] = useState(false);
  const [reminderDays, setReminderDays] = useState('');
  const [file, setFile] = useState(null);

  // Kütüphane & Filtreleme
  const [newFacilityName, setNewFacilityName] = useState('');
  const [newDocTypeName, setNewDocTypeName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFacility, setFilterFacility] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [adminSelectedDate, setAdminSelectedDate] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const handleUpdateDocument = async () => {
    if (!editingDoc) return;
    setLoading(true);

    try {
      let finalFileUrl = editingDoc.file_url;

      // 1. Yeni dosya seçildiyse yükle
      if (editFile) {
        const path = `${session.user.id}/updated_${Date.now()}_${
          editFile.name
        }`;
        const { error: uploadError } = await supabase.storage
          .from('belgeler')
          .upload(path, editFile);
        if (uploadError) throw uploadError;

        finalFileUrl = supabase.storage.from('belgeler').getPublicUrl(path)
          .data.publicUrl;
      }
      const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return alert('Lütfen bir dosya seçin!');
      
        // --- KISITLAMA BAŞLANGICI ---
        // 1. Dosya Boyutu Kontrolü (1 MB = 1.048.576 Byte)
        if (userProfile.role === 'normal' && file.size > 1048576) {
          return alert('Ücretsiz kullanıcılar maksimum 1 MB dosya yükleyebilir. Mevcut dosya: ' + (file.size / 1024 / 1024).toFixed(2) + ' MB. Lütfen Premium pakete geçin!');
        }
      
        // 2. Aynı belgeden sadece 1 adet yükleme kontrolü
        if (userProfile.role === 'normal') {
          const isDuplicate = documents.some(doc => 
            doc.facility_name === facility && 
            doc.process_name === process && 
            !doc.is_archived
          );
          if (isDuplicate) {
            return alert('Ücretsiz planda aynı tesise aynı belgeyi 2. kez yükleyemezsiniz (Arşivleme yapılamaz). Lütfen Premium pakete geçin!');
          }
        }
        // --- KISITLAMA BİTİŞİ ---
      
        setLoading(true);
        // ... (Geri kalan yükleme kodları)
      };
      // 2. Veritabanını güncelle
      const { error } = await supabase
        .from('documents')
        .update({
          issue_date: editingDoc.issue_date,
          expiry_date: editingDoc.expiry_date,
          deadline_date: editingDoc.deadline_date,
          reminder_days: parseInt(editingDoc.reminder_days) || 7,
          file_url: finalFileUrl,
          is_archived: editingDoc.is_archived, // Arşiv durumunu buradan da değiştirebiliriz
        })
        .eq('id', editingDoc.id);

      if (error) throw error;

      alert('Belge başarıyla güncellendi.');
      setEditingDoc(null);
      setEditFile(null);

      // Listeleri yenile (Hem ana listeyi hem de açıksa geçmiş modalını)
      fetchData(userProfile.role, session.user.id);
      if (historyModal)
        fetchDocHistory(historyModal.facility_name, historyModal.process_name);
    } catch (err) {
      alert('Güncelleme hatası: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user);
      else {
        setDocuments([]);
        setUserProfile({ role: 'normal', premium_until: null });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        alert("Şifre sıfırlama bağlantısı gönderildi!");
        setIsForgotPassword(false);
      } else if (isSignUp) {
        if (password !== confirmPassword) throw new Error("Şifreler eşleşmiyor!");
        if (!isContractAccepted) throw new Error("Sözleşmeyi onaylamalısınız!");
        
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length !== 10 || !cleanPhone.startsWith('5')) {
          throw new Error("Geçerli bir telefon giriniz (5xx xxx xx xx)");
        }

        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            role: 'normal',
            phone: cleanPhone,
            contract_accepted: true
          });
        }
        alert('Kayıt başarılı! E-posta onayından sonra giriş yapabilirsiniz.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async (user) => {
    try {
      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (!profile) {
        const newProfile = {
          id: user.id,
          email: user.email,
          role: user.email === ADMIN_EMAIL ? 'admin' : 'normal',
        };
        await supabase.from('profiles').insert([newProfile]);
        profile = newProfile;
      }
      const currentRole = user.email === ADMIN_EMAIL ? 'admin' : profile.role;
      setUserProfile({ ...profile, role: currentRole });
      fetchData(currentRole, user.id);
      if (currentRole === 'admin') fetchAdminUsers();
    } catch (err) {
      console.error('Profil hatası:', err);
    }
  };

  const fetchData = async (role, uid) => {
    try {
      // Önce genel sorguyu oluşturuyoruz
      let docQuery = supabase.from('documents').select('*');

      // BURASI KRİTİK: Eğer kullanıcı admin DEĞİLSE sorguya 'sadece benimkileri getir' kuralı ekle
      // Eğer kullanıcı admın ise bu if bloğuna girmez ve tüm tabloyu çeker
      if (role !== 'admin') {
        docQuery = docQuery.eq('user_id', uid);
      }

      const [docs, facs, types] = await Promise.all([
        docQuery.order('expiry_date', { ascending: true }), // Belgeleri çek
        supabase
          .from('facilities')
          .select('*')
          .eq('user_id', uid)
          .order('name'), // Kendi tesislerini çek
        supabase
          .from('document_types')
          .select('*')
          .eq('user_id', uid)
          .order('name'), // Kendi türlerini çek
      ]);

      setDocuments(docs.data || []);
      setFacilities(facs.data || []);
      setDocTypes(types.data || []);
    } catch (err) {
      console.error('Veri çekme hatası:', err);
    }
  };

  const fetchAdminUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('email');
    setAllUsers(data || []);
  };
  const fetchDocHistory = async (facilityName, processName) => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('facility_name', facilityName)
        .eq('process_name', processName)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistoryModal({
        facility_name: facilityName,
        process_name: processName,
        data: data || [],
      });
    } catch (err) {
      alert('Geçmiş getirilirken hata: ' + err.message);
    } finally {
      setHistoryLoading(false);
    }
  };
  const handleAdminSetPremium = async (userId) => {
    if (!adminSelectedDate) return alert('Lütfen tarih seçin!');
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'premium', premium_until: adminSelectedDate })
      .eq('id', userId);
    if (error) alert(error.message);
    else {
      alert('Güncellendi.');
      fetchAdminUsers();
    }
    setLoading(false);
  };

  const handleSaveDocument = async () => {
    if (!selectedFacility || (!isPermanent && !expiryDate))
      return alert('Tesis ve Bitiş Tarihi zorunludur!');

    setLoading(true);
    try {
      // Bu değişken kullanıcının rolüne göre mail gün sayısını belirler
      const finalReminderDays =
        userProfile.role === 'admin' || userProfile.role === 'premium'
          ? parseInt(reminderDays) || 7
          : 0;
      // 1. ÖNCE: Aynı tesis ve türdeki eski belgeleri otomatik arşivle
      await supabase
        .from('documents')
        .update({ is_archived: true })
        .eq('facility_name', selectedFacility)
        .eq('process_name', selectedDocType)
        .eq('user_id', session.user.id)
        .eq('is_archived', false);

      // 2. SONRA: Varsa dosyayı yükle
      let fileUrl = '';
      if (file) {
        const path = `${session.user.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('belgeler')
          .upload(path, file);
        if (uploadError) throw uploadError;

        fileUrl = supabase.storage.from('belgeler').getPublicUrl(path)
          .data.publicUrl;
      }

      // 3. SON: Yeni belgeyi veritabanına ekle
      // 3. SON: Yeni belgeyi veritabanına ekle
      const { error: insertError } = await supabase.from('documents').insert([
        {
          facility_name: selectedFacility,
          process_name: selectedDocType,
          issue_date: isPermanent ? null : issueDate,
          expiry_date: isPermanent ? null : expiryDate,
          deadline_date: isPermanent ? null : lastApplyDate,
          reminder_days: isPermanent ? 0 : finalReminderDays,
          file_url: fileUrl,
          user_id: session.user.id,
          user_email: session.user.email,
          is_archived: false,
          // is_permanent satırını sildik çünkü veritabanında karşılığı yok.
        },
      ]);

      if (insertError) throw insertError;

      alert(
        'Belge başarıyla kaydedildi. Eski belgeler otomatik olarak arşivlendi.'
      );

      // Formu temizle
      setIssueDate('');
      setExpiryDate('');
      setLastApplyDate('');
      setReminderDays('');
      setFile(null);

      // Listeyi yenile
      fetchData(userProfile.role, session.user.id);
    } catch (err) {
      console.error('Detaylı hata:', err);
      alert('İşlem sırasında hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLibrary = async (type) => {
    const table = type === 'fac' ? 'facilities' : 'document_types';
    const name = type === 'fac' ? newFacilityName : newDocTypeName;
    if (!name) return;
    await supabase.from(table).insert([{ name, user_id: session.user.id }]);
    type === 'fac' ? setNewFacilityName('') : setNewDocTypeName('');
    fetchData(userProfile.role, session.user.id);
  };

  const toggleArchive = async (id, status) => {
    await supabase
      .from('documents')
      .update({ is_archived: !status })
      .eq('id', id);
    fetchData(userProfile.role, session.user.id);
  };

  const deleteDoc = async (id) => {
    if (window.confirm('Silmek istiyor musunuz?')) {
      await supabase.from('documents').delete().eq('id', id);
      fetchData(userProfile.role, session.user.id);
    }
  };

  const getStatusColor = (doc) => {
    if (doc.is_permanent) return '#c7d2fe';
    if (!doc.expiry_date) return '#e2e8f0';
    const diff =
      (new Date(doc.expiry_date) - new Date()) / (1000 * 60 * 60 * 24);
    return diff < 0 ? '#fecaca' : diff <= 7 ? '#fef08a' : '#bbf7d0';
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.process_name
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesFacility = filterFacility
      ? doc.facility_name === filterFacility
      : true;
    const matchesUser = filterUser ? doc.user_email === filterUser : true;
    const matchesArchive = (doc.is_archived || false) === showArchived;
    return matchesSearch && matchesFacility && matchesUser && matchesArchive;
  });

  const packages = [
    { title: '1 Aylık', price: '₺99' },
    { title: '3 Aylık', price: '₺249' },
    { title: '6 Aylık', price: '₺449' },
    { title: 'Yıllık', price: '₺799' },
  ];

  if (!session)
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginBox}>
          <h2 style={{ textAlign: 'center', color: '#1e293b', marginBottom: '20px' }}>
            {isForgotPassword ? 'Şifremi Unuttum' : isSignUp ? 'Yeni Hesap Oluştur' : '📋 Belge Yönetimi'}
          </h2>
          
          <input
            type="email"
            placeholder="E-posta Adresiniz"
            style={styles.input}
            onChange={(e) => setEmail(e.target.value)}
          />

          {!isForgotPassword && (
            <>
              {isSignUp && (
                <input
                  type="tel"
                  placeholder="Telefon (5xx xxx xx xx)"
                  style={{ ...styles.input, marginTop: '10px' }}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                />
              )}
              <input
                type="password"
                placeholder="Şifre"
                style={{ ...styles.input, marginTop: '10px' }}
                onChange={(e) => setPassword(e.target.value)}
              />
              {isSignUp && (
                <input
                  type="password"
                  placeholder="Şifre Tekrar"
                  style={{ ...styles.input, marginTop: '10px' }}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              )}
            </>
          )}

          {isSignUp && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '15px 0', fontSize: '13px', textAlign: 'left' }}>
              <input 
                type="checkbox" 
                id="contract" 
                checked={isContractAccepted} 
                onChange={(e) => setIsContractAccepted(e.target.checked)} 
              />
              <label htmlFor="contract" style={{ color: '#64748b', cursor: 'pointer' }}>
                Kullanım sözleşmesini onaylıyorum.
              </label>
            </div>
          )}

          <button
            onClick={handleAuth}
            style={{ ...styles.mainButton, marginTop: '10px' }}
            disabled={loading}
          >
            {loading ? 'İşlem yapılıyor...' : isForgotPassword ? 'Sıfırlama Linki Gönder' : isSignUp ? 'Kayıt Ol' : 'Giriş Yap'}
          </button>

          <div style={{ marginTop: '20px', fontSize: '14px' }}>
            {!isForgotPassword && (
              <p style={styles.toggleAuth} onClick={() => setIsSignUp(!isSignUp)}>
                {isSignUp ? 'Zaten hesabım var' : 'Yeni hesap oluştur'}
              </p>
            )}
            <p 
              style={{ ...styles.toggleAuth, marginTop: '10px', color: '#64748b', fontSize: '12px' }} 
              onClick={() => {
                setIsForgotPassword(!isForgotPassword);
                setIsSignUp(false);
              }}
            >
              {isForgotPassword ? 'Giriş ekranına dön' : 'Şifremi Unuttum'}
            </p>
          </div>
        </div>
      </div>
    );

  return (
    
    <div style={styles.container}>
      
      {showPremiumModal && (
  <div style={styles.modalOverlay}>
    <div style={{ ...styles.modal, maxWidth: '900px', width: '95%', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
      {/* KAPATMA BUTONU */}
      <button 
        onClick={() => setShowPremiumModal(false)}
        style={{ position: 'absolute', top: '15px', right: '15px', border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' }}
      >✕</button>

      <h2 style={{ color: '#1e293b', marginBottom: '8px' }}>🚀 Planınızı Seçin</h2>
      <div style={styles.packageGrid}>
        {/* Ücretsiz Plan (Mevcut) */}
        <div style={styles.planCard}>
          <h4 style={styles.planTitle}>Ücretsiz</h4>
          <p style={styles.price}>0 ₺</p>
          <ul style={styles.planFeatures}>
            <li>✅ 1 MB Dosya Sınırı</li>
            <li>❌ Mail Bildirimi</li>
            <li>❌ Arşivleme</li>
          </ul>
          <button style={styles.disabledBtn} disabled>Mevcut Plan</button>
        </div>
        {/* 1 AYLIK */}
        <div style={styles.planCard}>
          <h4 style={styles.planTitle}>1 Aylık</h4>
          <p style={styles.price}>99 ₺ <span style={styles.priceSub}>/ ay</span></p>
          <ul style={styles.planFeatures}>
            <li>✅ Sınırsız Belge</li>
            <li>✅ Mail Bildirimi</li>
            <li>✅ Arşivleme</li>
          </ul>
          <button style={styles.actionBtn} onClick={() => alert('99 TL ödeme sayfasına gidiliyor...')}>Seç</button>
        </div>

        {/* 3 AYLIK */}
        <div style={styles.planCard}>
          <h4 style={styles.planTitle}>3 Aylık</h4>
          <p style={styles.price}>250 ₺</p>
          <div style={styles.averagePrice}>83.3 ₺ / ay</div>
          <ul style={styles.planFeatures}>
            <li>✅ Sınırsız Belge</li>
            <li>✅ Mail Bildirimi</li>
            <li>✅ Arşivleme</li>
          </ul>
          <button style={styles.actionBtn} onClick={() => alert('250 TL ödeme sayfasına gidiliyor...')}>Seç</button>
        </div>

        {/* 6 AYLIK - VURGULU */}
        <div style={{ ...styles.planCard, borderColor: '#2563eb', transform: 'scale(1.05)', boxShadow: '0 15px 30px rgba(37,99,235,0.1)' }}>
          <div style={styles.planBadge}>EN ÇOK TERCİH EDİLEN</div>
          <h4 style={styles.planTitle}>6 Aylık</h4>
          <p style={styles.price}>450 ₺</p>
          <div style={styles.averagePrice}>75 ₺ / ay</div>
          <ul style={styles.planFeatures}>
            <li>✅ Sınırsız Belge</li>
            <li>✅ Mail Bildirimi</li>
            <li>✅ Arşivleme</li>
          </ul>
          <button style={{ ...styles.actionBtn, backgroundColor: '#2563eb' }} onClick={() => alert('450 TL ödeme sayfasına gidiliyor...')}>Hemen Başla</button>
        </div>

        {/* 1 YILLIK */}
        <div style={{ ...styles.planCard, backgroundColor: '#f8fafc' }}>
          <div style={{ ...styles.planBadge, backgroundColor: '#10b981' }}>EN AVANTAJLI</div>
          <h4 style={styles.planTitle}>1 Yıllık</h4>
          <p style={styles.price}>750 ₺</p>
          <div style={styles.averagePrice}>62.5 ₺ / ay</div>
          <ul style={styles.planFeatures}>
            <li>✅ Sınırsız Belge</li>
            <li>✅ Mail Bildirimi</li>
            <li>✅ Arşivleme</li>
          </ul>
          <button style={{ ...styles.actionBtn, backgroundColor: '#1e293b' }} onClick={() => alert('750 TL ödeme sayfasına gidiliyor...')}>Yıllık Al</button>
        </div>
      </div>
      
      <button 
        onClick={() => setShowPremiumModal(false)} 
        style={{ marginTop: '30px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '14px', textDecoration: 'underline' }}
      >
        Vazgeç ve Kapat
      </button>
      
    </div>
    
  </div>
)}
      {previewUrl && (
        <div style={styles.modalOverlay} onClick={() => setPreviewUrl(null)}>
          <div style={styles.previewModal} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'right' }}>
              <button
                onClick={() => setPreviewUrl(null)}
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                  fontSize: '20px',
                }}
              >
                ✕
              </button>
            </div>
            <iframe
              src={previewUrl}
              style={{
                width: '100%',
                height: '80vh',
                borderRadius: '10px',
                border: 'none',
              }}
              title="Belge Önizleme"
            />
          </div>
        </div>
      )}
      <header style={styles.header}>
        <div>
          <h3 style={{ margin: 0, color: '#2563eb' }}>{session.user.email}</h3>
          <span
            style={{
              ...styles.badge,
              backgroundColor:
                userProfile.role === 'admin' ? '#ef4444' : '#f59e0b',
            }}
          >
            {userProfile.role.toUpperCase()}{' '}
            {userProfile.premium_until && `| ${userProfile.premium_until}`}
          </span>
          {userProfile.role !== 'admin' && (
            <button
              onClick={() => setShowPremiumModal(true)}
              style={{
                ...styles.premiumActionBtn,
                backgroundColor: '#f59e0b',
                color: '#fff',
              }}
            >
              ⭐ Premium'a Geç
            </button>
          )}
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          style={styles.logoutBtn}
        >
          Çıkış
        </button>
      </header>

      {userProfile.role === 'admin' && (
        <section style={{ ...styles.card, borderLeft: '5px solid #ef4444' }}>
          <h4>🛡️ Admin: Kullanıcı Yetkilendirme</h4>
          <input
            type="date"
            style={{ ...styles.input, width: '200px', marginBottom: '10px' }}
            onChange={(e) => setAdminSelectedDate(e.target.value)}
          />
          <div style={styles.adminScroll}>
            <table
              style={{
                width: '100%',
                fontSize: '12px',
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr
                  style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}
                >
                  <th>E-posta</th>
                  <th>Rol</th>
                  <th>Bitiş</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>{u.premium_until || '-'}</td>
                    <td>
                      <button
                        onClick={() => handleAdminSetPremium(u.id)}
                        style={styles.smallBtn}
                      >
                        Yetki Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {/* 1. DASHBOARD BURAYA GELECEK */}
      <div style={styles.dashboardGrid}>
          <div style={styles.dashCard}>
            <span>📁</span>
            <div><h4 style={styles.dashTitle}>Toplam</h4><p style={styles.dashValue}>{documents.length}</p></div>
          </div>
          <div style={styles.dashCard}>
            <span>⚠️</span>
            <div><h4 style={styles.dashTitle}>Kritik</h4><p style={{...styles.dashValue, color: '#e11d48'}}>
              {documents.filter(d => (new Date(d.expiry_date) - new Date()) / 86400000 <= 30).length}
            </p></div>
          </div>
          <div style={styles.dashCard}>
            <span>⭐</span>
            <div><h4 style={styles.dashTitle}>Statü</h4><p style={styles.dashValue}>{userProfile.role.toUpperCase()}</p></div>
          </div>
        </div>
      <section style={styles.card}>
        <h4>🏗️ Kütüphane Ayarları</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <small style={{ color: '#64748b' }}>Yeni Tesis Tanımla</small>
            <div style={styles.flexRow}>
              <input
                placeholder="Örn: Fabrika A"
                style={styles.input}
                value={newFacilityName}
                onChange={(e) => setNewFacilityName(e.target.value)}
              />
              <button
                onClick={() => handleAddLibrary('fac')}
                style={styles.addBtn}
              >
                +
              </button>
            </div>
          </div>

          <div>
            <small style={{ color: '#64748b' }}>Yeni Belge Türü Tanımla</small>
            <div style={styles.flexRow}>
              <input
                placeholder="Örn: Yangın Sertifikası"
                style={styles.input}
                value={newDocTypeName}
                onChange={(e) => setNewDocTypeName(e.target.value)}
              />
              <button
                onClick={() => handleAddLibrary('type')}
                style={styles.addBtn}
              >
                +
              </button>
            </div>
          </div>
        </div>
      </section>
      <div style={styles.mainGrid}>
        <section style={styles.card}>
          <h4>📤 Belge Yükle</h4>
          <div style={styles.flexRow}>
            <select
              style={styles.input}
              value={selectedFacility}
              onChange={(e) => setSelectedFacility(e.target.value)}
            >
              <option value="">Tesis Seç...</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>
            <select
              style={styles.input}
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
            >
              <option value="">Tür Seç...</option>
              {docTypes.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginTop: '10px' }}>
            <label>
              <input
                type="checkbox"
                checked={isPermanent}
                onChange={(e) => setIsPermanent(e.target.checked)}
              />{' '}
              Süresiz Belge
            </label>
          </div>
          {!isPermanent && (
            <div style={{ ...styles.dateGrid, marginTop: '10px' }}>
              <div>
                <small>Alınma Tarihi</small>
                <input
                  type="date"
                  style={styles.input}
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>
              <div>
                <small>Bitiş Tarihi</small>
                <input
                  type="date"
                  style={styles.input}
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
              <div>
                <small>Son Başvuru Tarihi</small>
                <input
                  type="date"
                  style={styles.input}
                  value={lastApplyDate}
                  onChange={(e) => setLastApplyDate(e.target.value)}
                />
              </div>

              {/* Sadece Admin ve Premium kullanıcılar bu alanı görebilir */}
              {userProfile.role === 'admin' ||
              userProfile.role === 'premium' ? (
                <div>
                  <small>Kaç Gün Kala Mail Gitsin? (Premium Özellik)</small>
                  <input
                    type="number"
                    placeholder="Örn: 10"
                    min="1"
                    style={styles.input}
                    value={reminderDays}
                    onChange={(e) => setReminderDays(e.target.value)}
                  />
                </div>
              ) : (
                <div
                  style={{
                    padding: '10px',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '10px',
                    border: '1px dashed #cbd5e1',
                  }}
                >
                  <small style={{ color: '#64748b', display: 'block' }}>
                    📧 Mail Hatırlatıcı
                  </small>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#2563eb',
                      fontWeight: 'bold',
                    }}
                  >
                    💎 Sadece Premium üyeler mail bildirimi alabilir.
                  </span>
                </div>
              )}
            </div>
          )}
          <input
  type="file"
  onChange={(e) => {
    const selectedFile = e.target.files[0];
    if (userProfile.role === 'normal' && selectedFile && selectedFile.size > 1048576) {
      alert('Seçtiğiniz dosya 1 MB sınırını aşıyor! Lütfen daha küçük bir dosya seçin veya Premium hesaba geçin.');
      e.target.value = ""; // Seçimi temizle
      setFile(null);
    } else {
      setFile(selectedFile);
    }
    
  }}
  style={styles.input}
/>
          <button
            onClick={handleSaveDocument}
            style={{ ...styles.mainButton, marginTop: '15px' }}
          >
            KAYDET
          </button>
        </section>

        <section style={styles.card}>
          <h4>🔍 Filtreleme</h4>
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            {/* Kelime ile Arama */}
            <input
              placeholder="Belge adı ile ara..."
              style={styles.input}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            {/* TESİS / FİRMA FİLTRESİ (YENİ) */}
            <select
              style={styles.input}
              value={filterFacility}
              onChange={(e) => setFilterFacility(e.target.value)}
            >
              <option value="">Tüm Tesisler / Firmalar</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>

            {/* Admin ise Kullanıcı Filtresi */}
            {userProfile.role === 'admin' && (
              <select
                style={styles.input}
                onChange={(e) => setFilterUser(e.target.value)}
              >
                <option value="">Tüm Kullanıcılar</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={u.email}>
                    {u.email}
                  </option>
                ))}
              </select>
            )}

            <div style={{ marginTop: '5px' }}>
              <label style={{ cursor: 'pointer', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                />{' '}
                Arşivi Göster
              </label>
            </div>
          </div>
        </section>
      </div>

      <section style={{ marginTop: '20px' }}>
        <h4>📂 Belgeler ({filteredDocs.length})</h4>
        <div style={styles.docGrid}>
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              style={{
                ...styles.docCard,
                borderTop: `6px solid ${getStatusColor(doc)}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <small style={{ color: '#64748b' }}>{doc.user_email}</small>
                <div>
                  <button
                    onClick={() =>
                      fetchDocHistory(doc.facility_name, doc.process_name)
                    }
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '18px',
                      padding: '5px',
                    }}
                    title="Belge Geçmişini Gör"
                  >
                    📦
                  </button>

                  <button
                    onClick={() => setEditingDoc(doc)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '18px',
                      padding: '5px',
                    }}
                    title="Düzenle"
                  >
                    ✏️
                  </button>

                  <button
                    onClick={() => deleteDoc(doc.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '5px',
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <strong style={{ display: 'block', marginTop: '5px' }}>
                {doc.facility_name}
              </strong>
              <div style={{ fontSize: '13px' }}>{doc.process_name}</div>
              <div style={styles.docDates}>
                {doc.is_permanent ? (
                  <div style={{ color: '#6366f1', fontWeight: 'bold' }}>
                    SÜRESİZ
                  </div>
                ) : (
                  <>
                    {doc.issue_date && <div>Alınma: {doc.issue_date}</div>}
                    {doc.expiry_date && (
                      <div style={{ color: '#e11d48', fontWeight: 'bold' }}>
                        Bitiş: {doc.expiry_date}
                      </div>
                    )}
                  </>
                )}
              </div>
              {doc.file_url && (
                <button
                  onClick={() => setPreviewUrl(doc.file_url)}
                  style={styles.linkButton}
                >
                  👁️ Önizle
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
      {/* GEÇMİŞ PENCERESİ BAŞLANGIÇ */}
      {historyModal && (
        <div style={styles.modalOverlay} onClick={() => setHistoryModal(null)}>
          <div
            style={{ ...styles.modal, textAlign: 'left', maxWidth: '500px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '15px',
                borderBottom: '1px solid #eee',
                paddingBottom: '10px',
              }}
            >
              <h4 style={{ margin: 0 }}>📜 Belge Geçmişi</h4>
              <button
                onClick={() => setHistoryModal(null)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                }}
              >
                ✕
              </button>
            </div>
            <p
              style={{
                fontSize: '12px',
                color: '#64748b',
                marginBottom: '10px',
              }}
            >
              <strong>{historyModal.facility_name}</strong> <br />{' '}
              {historyModal.process_name}
            </p>

            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '13px',
                }}
              >
                <thead>
                  <tr
                    style={{
                      textAlign: 'left',
                      color: '#64748b',
                      borderBottom: '2px solid #eee',
                    }}
                  >
                    <th style={{ padding: '10px 5px' }}>Bitiş Tarihi</th>
                    <th style={{ padding: '10px 5px' }}>Durum</th>
                    <th style={{ padding: '10px 5px', textAlign: 'center' }}>
                      Dosya
                    </th>
                    <th style={{ padding: '10px 5px', textAlign: 'center' }}>
                      İşlem
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {historyModal.data.map((h) => (
                    <tr
                      key={h.id}
                      style={{ borderBottom: '1px solid #f1f5f9' }}
                    >
                      <td style={{ padding: '10px 5px' }}>
                        {h.expiry_date || 'Süresiz'}
                      </td>
                      <td style={{ padding: '10px 5px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            backgroundColor: h.is_archived
                              ? '#f1f5f9'
                              : '#dcfce7',
                            color: h.is_archived ? '#64748b' : '#166534',
                          }}
                        >
                          {h.is_archived ? 'Arşiv' : 'Aktif'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 5px', textAlign: 'center' }}>
                        {h.file_url ? (
                          <button
                            onClick={() => setPreviewUrl(h.file_url)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            👁️
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={{ padding: '10px 5px', textAlign: 'center' }}>
                        <div
                          style={{
                            display: 'flex',
                            gap: '10px',
                            justifyContent: 'center',
                          }}
                        >
                          <button
                            onClick={() => setEditingDoc(h)}
                            style={{
                              border: 'none',
                              background: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteDoc(h.id)}
                            style={{
                              border: 'none',
                              background: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* GEÇMİŞ PENCERESİ BİTİŞ */}
      {/* DÜZENLEME MODALI - BU KISIM EKSİKTİ */}
      {editingDoc && (
        <div style={styles.modalOverlay}>
          <div
            style={{ ...styles.modal, textAlign: 'left', maxWidth: '500px' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '15px',
              }}
            >
              <h4 style={{ margin: 0 }}>✏️ Belgeyi Güncelle</h4>
              <button
                onClick={() => setEditingDoc(null)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <small>Alınma Tarihi</small>
              <input
                type="date"
                style={styles.input}
                value={editingDoc.issue_date || ''}
                onChange={(e) =>
                  setEditingDoc({ ...editingDoc, issue_date: e.target.value })
                }
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <small>Bitiş Tarihi</small>
              <input
                type="date"
                style={styles.input}
                value={editingDoc.expiry_date || ''}
                onChange={(e) =>
                  setEditingDoc({ ...editingDoc, expiry_date: e.target.value })
                }
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <small>Hatırlatma (Gün)</small>
              <input
                type="number"
                style={styles.input}
                value={editingDoc.reminder_days || ''}
                onChange={(e) =>
                  setEditingDoc({
                    ...editingDoc,
                    reminder_days: e.target.value,
                  })
                }
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <small>Yeni Dosya (Opsiyonel)</small>
              <input
                type="file"
                style={styles.input}
                onChange={(e) => setEditFile(e.target.files[0])}
              />
            </div>

            <button
              onClick={handleUpdateDocument}
              style={styles.mainButton}
              disabled={loading}
            >
              {loading ? 'Güncelleniyor...' : 'DEĞİŞİKLİKLERİ KAYDET'}
            </button>
          </div>
        </div>
      )}
      
    </div>
    
  );
}

const styles = {
  dashboardGrid: { 
    display: 'flex', 
    gap: '15px', 
    marginBottom: '20px', 
    marginTop: '10px' 
  },
  dashCard: { 
    flex: 1, 
    backgroundColor: '#fff', 
    padding: '15px', 
    borderRadius: '12px', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '12px', 
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0'
  },
  dashTitle: { margin: 0, fontSize: '12px', color: '#64748b' },
  dashValue: { margin: 0, fontSize: '18px', fontWeight: 'bold' },
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: 'sans-serif',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px',
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '15px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  card: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '15px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '20px',
  },
  mainGrid: { display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' },
  input: {
    padding: '10px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    width: '100%',
    boxSizing: 'border-box',
    fontSize: '14px',
  },
  dateGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  flexRow: { display: 'flex', gap: '10px', alignItems: 'flex-end' },
  mainButton: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '12px',
    borderRadius: '12px',
    width: '100%',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  badge: {
    color: '#fff',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '10px',
    fontWeight: 'bold',
  },
  premiumActionBtn: {
    marginLeft: '10px',
    backgroundColor: '#fef3c7',
    color: '#d97706',
    border: '1px solid #f59e0b',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  docGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '20px',
  },
  docCard: {
    backgroundColor: '#fff',
    padding: '15px',
    borderRadius: '15px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
  },
  docDates: {
    marginTop: '10px',
    padding: '8px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    fontSize: '11px',
  },
  logoutBtn: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    padding: '8px 15px',
    borderRadius: '10px',
    cursor: 'pointer',
  },
  // BURASI YENİ: Önizleme Butonu Stili
  linkButton: {
    color: '#2563eb',
    fontSize: '12px',
    marginTop: '10px',
    display: 'block',
    textAlign: 'center',
    border: '1px solid #2563eb',
    borderRadius: '8px',
    padding: '6px',
    width: '100%',
    backgroundColor: 'transparent',
    cursor: 'pointer',
  },
  loginContainer: {
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  loginBox: {
    backgroundColor: '#fff',
    padding: '40px',
    borderRadius: '25px',
    width: '350px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
  },
  toggleAuth: {
    textAlign: 'center',
    color: '#2563eb',
    cursor: 'pointer',
    marginTop: '15px',
    fontSize: '13px',
  },
  adminScroll: { maxHeight: '300px', overflowY: 'auto', marginTop: '10px' },
  smallBtn: {
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '11px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    padding: '30px',
    borderRadius: '20px',
    width: '90%',
    maxWidth: '600px',
    textAlign: 'center',
  },
  // BURASI YENİ: Önizleme Penceresi Stili
  previewModal: {
    backgroundColor: '#fff',
    padding: '15px',
    borderRadius: '20px',
    width: '95%',
    maxWidth: '900px',
  },
  packageGrid: {
    display: 'flex',
    gap: '15px',
    marginTop: '25px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  planCard: {
    flex: '1 1 180px',
    padding: '25px 15px',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    textAlign: 'center',
    position: 'relative',
    backgroundColor: '#fff',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '380px',
    maxWidth: '220px',
  },
  planTitle: {
    margin: 0,
    fontSize: '18px',
    color: '#64748b',
    fontWeight: '600',
  },
  price: {
    fontSize: '26px',
    fontWeight: 'bold',
    margin: '15px 0 5px 0',
    color: '#1e293b',
  },
  priceSub: { fontSize: '14px', fontWeight: 'normal', color: '#94a3b8' },
  averagePrice: {
    fontSize: '12px',
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    padding: '4px 10px',
    borderRadius: '20px',
    display: 'inline-block',
    fontWeight: 'bold',
    marginBottom: '15px',
  },
  planFeatures: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 20px 0',
    textAlign: 'left',
    fontSize: '12px',
    lineHeight: '2',
    color: '#475569',
  },
  planBadge: {
    position: 'absolute',
    top: '-12px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#2563eb',
    color: '#fff',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '10px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
    zIndex: 10,
  },
  actionBtn: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#64748b',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  buyBtn: {
    marginTop: '10px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '8px 20px',
    borderRadius: '10px',
    cursor: 'pointer',
  },
  closeBtn: {
    marginTop: '20px',
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  
};
