// Firebase Konfigürasyonu
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, updateDoc, doc, orderBy, query, serverTimestamp, arrayUnion, arrayRemove, deleteField } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyARyz3oNgzvIEIp33nmG9JvzTvy8uVhaH8",
    authDomain: "jungle-log.firebaseapp.com",
    databaseURL: "https://jungle-log-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "jungle-log",
    storageBucket: "jungle-log.firebasestorage.app",
    messagingSenderId: "358753101681",
    appId: "1:358753101681:web:e6d7e5aec2caa123b578d0",
    measurementId: "G-009VFHVTSC"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Global değişkenler
let currentClimber = null;
let routes = [];
let climbers = [];

// DOM elementleri
const addRouteForm = document.getElementById('add-route-form');
const addClimberForm = document.getElementById('add-climber-form');
const climbersList = document.getElementById('climbers-list');
const routesList = document.getElementById('routes-list');
const routesHeader = document.getElementById('routes-header');

// Modal elementleri
const addClimberModal = document.getElementById('add-climber-modal');
const addRouteModal = document.getElementById('add-route-modal');
const addClimberBtn = document.getElementById('add-climber-btn');
const addRouteBtn = document.getElementById('add-route-btn');

// Sayfa yüklendiğinde çalışacak fonksiyonlar
document.addEventListener('DOMContentLoaded', function() {
    initializeJungleLog();
});

// Uygulamayı başlat
function initializeJungleLog() {
    console.log('Jungle Log uygulaması başlatılıyor...');
    
    // Event listener'ları ekle
    setupEventListeners();
    
    // Real-time dinleyicileri başlat
    setupRealtimeListeners();
    
    // URL query parametresini kontrol et
    checkUrlParameters();
}

// Event listener'ları ayarla
function setupEventListeners() {
    // Rota ekleme formu
    addRouteForm.addEventListener('submit', handleAddRoute);
    
    // Tırmanıcı ekleme formu
    addClimberForm.addEventListener('submit', handleAddClimber);
    
    // Rota checkbox'ları için event delegation
    routesList.addEventListener('change', handleRouteCheckboxChange);
    
    // Modal butonları
    addClimberBtn.addEventListener('click', () => openModal(addClimberModal));
    addRouteBtn.addEventListener('click', () => openModal(addRouteModal));
    
    // Modal kapatma
    setupModalCloseListeners();
}

// Real-time dinleyicileri ayarla
function setupRealtimeListeners() {
    console.log('🔊 Real-time dinleyiciler başlatılıyor...');
    
    // Rotaları dinle - güncelden eskiye sırala
    const routesQuery = query(collection(db, 'routes'), orderBy('createdAt', 'desc'));
    console.log('📡 Rotalar dinleyicisi başlatıldı (güncelden eskiye sıralı)');
    
    onSnapshot(routesQuery, (snapshot) => {
        console.log('🔄 Rotalar güncellendi:', snapshot.size, 'rota');
        console.log('📊 Snapshot metadata:', {
            fromCache: snapshot.metadata.fromCache,
            hasPendingWrites: snapshot.metadata.hasPendingWrites
        });
        
        routes = [];
        snapshot.forEach(doc => {
            const routeData = {
                id: doc.id,
                ...doc.data()
            };
            console.log('📝 Rota verisi:', routeData);
            routes.push(routeData);
        });
        
        console.log('📋 Toplam rotalar:', routes.length);
        displayRoutes();
    }, (error) => {
        console.error('❌ Rotalar dinlenirken hata:', error);
        console.error('🔍 Hata detayları:', {
            code: error.code,
            message: error.message
        });
        showError('Rotalar yüklenirken bir hata oluştu.');
    });

    // Tırmanıcıları dinle
    console.log('📡 Tırmanıcılar dinleyicisi başlatıldı');
    
    onSnapshot(collection(db, 'climbers'), (snapshot) => {
        console.log('🔄 Tırmanıcılar güncellendi:', snapshot.size, 'tırmanıcı');
        console.log('📊 Snapshot metadata:', {
            fromCache: snapshot.metadata.fromCache,
            hasPendingWrites: snapshot.metadata.hasPendingWrites
        });
        
        climbers = [];
        snapshot.forEach(doc => {
            const climberData = {
                id: doc.id,
                ...doc.data()
            };
            console.log('📝 Tırmanıcı verisi:', climberData);
            climbers.push(climberData);
        });
        
        console.log('📋 Toplam tırmanıcılar:', climbers.length);
        displayClimbers();
    }, (error) => {
        console.error('❌ Tırmanıcılar dinlenirken hata:', error);
        console.error('🔍 Hata detayları:', {
            code: error.code,
            message: error.message
        });
        showError('Tırmanıcılar yüklenirken bir hata oluştu.');
    });
}

// Yeni rota ekleme
function handleAddRoute(event) {
    event.preventDefault();
    
    console.log('🚀 Rota ekleme işlemi başlatıldı');
    
    const formData = new FormData(event.target);
    const routeData = {
        grade: formData.get('grade').trim(),
        color: formData.get('color').trim(),
        sector: formData.get('sector').trim(),
        createdAt: new Date().toISOString() // Manuel timestamp - Firestore kuralları için
    };
    
    console.log('📝 Form verileri:', routeData);
    
    // Form verilerini doğrula
    if (!routeData.grade || !routeData.color || !routeData.sector) {
        console.log('❌ Form validasyon hatası');
        showError('Lütfen tüm alanları doldurun.');
        return;
    }
    
    console.log('🔥 Firestore\'a rota ekleniyor...');
    
    // Firestore'a rota ekle
    addDoc(collection(db, 'routes'), routeData)
        .then((docRef) => {
            console.log('✅ Rota başarıyla eklendi! ID:', docRef.id);
            console.log('📊 Eklenen veri:', routeData);
            showSuccess('Rota başarıyla eklendi!');
            
            // Formu temizle ve modal'ı kapat
            event.target.reset();
            closeModal(addRouteModal);
        })
        .catch((error) => {
            console.error('❌ Rota eklenirken hata:', error);
            console.error('🔍 Hata detayları:', {
                code: error.code,
                message: error.message,
                stack: error.stack
            });
            showError('Rota eklenirken bir hata oluştu.');
        });
}

// Yeni tırmanıcı ekleme
function handleAddClimber(event) {
    event.preventDefault();
    
    console.log('🧗‍♂️ Tırmanıcı ekleme işlemi başlatıldı');
    
    const formData = new FormData(event.target);
    const climberName = formData.get('climberName').trim();
    const climberPrivacy = formData.get('climberPrivacy');
    
    console.log('📝 Tırmanıcı adı:', climberName);
    console.log('🔒 Gizlilik:', climberPrivacy);
    
    // Form verilerini doğrula
    if (!climberName) {
        console.log('❌ Tırmanıcı adı boş');
        showError('Lütfen tırmanıcı adını girin.');
        return;
    }
    
    // Aynı isimde tırmanıcı var mı kontrol et
    const existingClimber = climbers.find(climber => 
        climber.name.toLowerCase() === climberName.toLowerCase()
    );
    
    if (existingClimber) {
        console.log('❌ Aynı isimde tırmanıcı mevcut:', existingClimber);
        showError('Bu isimde bir tırmanıcı zaten mevcut.');
        return;
    }
    
    const climberData = {
        name: climberName,
        privacy: climberPrivacy,
        completedRoutes: []
    };
    
    console.log('📊 Tırmanıcı verisi:', climberData);
    console.log('🔥 Firestore\'a tırmanıcı ekleniyor...');
    
    // Firestore'a tırmanıcı ekle
    addDoc(collection(db, 'climbers'), climberData)
        .then((docRef) => {
            console.log('✅ Tırmanıcı başarıyla eklendi! ID:', docRef.id);
            console.log('📊 Eklenen veri:', climberData);
            showSuccess(`${climberName} başarıyla eklendi!`);
            
            // Formu temizle ve modal'ı kapat
            event.target.reset();
            closeModal(addClimberModal);
        })
        .catch((error) => {
            console.error('❌ Tırmanıcı eklenirken hata:', error);
            console.error('🔍 Hata detayları:', {
                code: error.code,
                message: error.message,
                stack: error.stack
            });
            showError('Tırmanıcı eklenirken bir hata oluştu.');
        });
}

// Tırmanıcıları göster
function displayClimbers() {
    if (climbers.length === 0) {
        climbersList.innerHTML = '<div class="loading">Henüz tırmanıcı bulunmuyor.</div>';
        return;
    }
    
    // URL parametresini kontrol et
    const urlParams = new URLSearchParams(window.location.search);
    const hasClimberParam = urlParams.has('climber');
    
    // Görüntülenecek tırmanıcıları filtrele
    const visibleClimbers = climbers.filter(climber => {
        // URL parametresi varsa tüm tırmanıcıları göster
        if (hasClimberParam) {
            return true;
        }
        // URL parametresi yoksa sadece açık tırmanıcıları göster
        return climber.privacy === 'public' || !climber.privacy;
    });
    
    if (visibleClimbers.length === 0) {
        climbersList.innerHTML = '<div class="loading">Görüntülenecek tırmanıcı bulunmuyor.</div>';
        return;
    }
    
    climbersList.innerHTML = '';
    
    visibleClimbers.forEach(climber => {
        const climberBtn = document.createElement('button');
        climberBtn.className = 'climber-btn';
        climberBtn.textContent = climber.name;
        climberBtn.dataset.climberId = climber.id;
        
        // Gizli tırmanıcılar için özel işaretleme
        if (climber.privacy === 'private') {
            climberBtn.title = 'Gizli tırmanıcı - Sadece link ile erişilebilir';
            climberBtn.style.opacity = '0.8';
        }
        
        // Aktif tırmanıcıyı işaretle
        if (currentClimber && currentClimber.id === climber.id) {
            climberBtn.classList.add('active');
        }
        
        // Tırmanıcı seçme event'i
        climberBtn.addEventListener('click', () => selectClimber(climber));
        
        climbersList.appendChild(climberBtn);
    });
}

// Tırmanıcı seç
function selectClimber(climber) {
    console.log('Tırmanıcı seçildi:', climber.name);
    currentClimber = climber;
    
    // Tüm tırmanıcı butonlarından active class'ını kaldır
    document.querySelectorAll('.climber-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Seçilen tırmanıcının butonuna active class'ı ekle
    const selectedBtn = document.querySelector(`[data-climber-id="${climber.id}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    // Rota başlığını güncelle
    routesHeader.textContent = `${climber.name} - Tamamlanan Rotalar`;
    
    // URL'yi güncelle (query parametresi ekle)
    const newUrl = `${window.location.pathname}?climber=${encodeURIComponent(climber.name)}`;
    window.history.pushState({}, document.title, newUrl);
    
    // Rotaları yeniden göster
    displayRoutes();
}

// Rotaları göster
function displayRoutes() {
    if (routes.length === 0) {
        routesList.innerHTML = '<div class="loading">Henüz rota bulunmuyor.</div>';
        return;
    }
    
    // Eğer tırmanıcı seçilmemişse
    if (!currentClimber) {
        routesList.innerHTML = '<div class="no-climber-selected">Lütfen bir tırmanıcı seçin</div>';
        return;
    }
    
    // Tamamlanmamış rotaları önce göster
    console.log('🔄 Sıralama yapılıyor - Tırmanıcı:', currentClimber.name);
    console.log('📊 Tamamlanan rotalar:', currentClimber.completedRoutes);
    
    const sortedRoutes = [...routes].sort((a, b) => {
        const aCompleted = currentClimber.completedRoutes && currentClimber.completedRoutes.includes(a.id);
        const bCompleted = currentClimber.completedRoutes && currentClimber.completedRoutes.includes(b.id);
        
        console.log(`🔍 ${a.grade} (${a.id}): ${aCompleted ? 'Tamamlandı' : 'Tamamlanmadı'}`);
        console.log(`🔍 ${b.grade} (${b.id}): ${bCompleted ? 'Tamamlandı' : 'Tamamlanmadı'}`);
        
        // Tamamlanmamış rotalar önce (false < true)
        if (aCompleted !== bCompleted) {
            const result = aCompleted ? 1 : -1;
            console.log(`📈 Sıralama: ${aCompleted ? 'B önce' : 'A önce'}`);
            return result;
        }
        
        // Aynı durumda oluşturulma tarihine göre sırala (güncelden eskiye)
        const dateResult = new Date(b.createdAt) - new Date(a.createdAt);
        console.log(`📅 Tarih sıralaması: ${dateResult > 0 ? 'B önce' : 'A önce'}`);
        return dateResult;
    });
    
    routesList.innerHTML = '';
    
    sortedRoutes.forEach(route => {
        const routeItem = document.createElement('li');
        routeItem.className = 'route-item';
        
        // Checkbox oluştur
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'route-checkbox';
        checkbox.dataset.routeId = route.id;
        
        // Tırmanıcının bu rotayı tamamlayıp tamamlamadığını kontrol et
        const isCompleted = currentClimber.completedRoutes && 
                           currentClimber.completedRoutes.includes(route.id);
        checkbox.checked = isCompleted;
        
        // Rota bilgileri
        const routeInfo = document.createElement('div');
        routeInfo.className = 'route-info';
        
        // Tamamlanma tarihini kontrol et
        const completedAt = currentClimber[`completedAt_${route.id}`];
        const completionDate = completedAt ? new Date(completedAt).toLocaleDateString('tr-TR') : '';
        
        // Oluşturulma tarihini formatla
        const creationDate = route.createdAt ? new Date(route.createdAt).toLocaleDateString('tr-TR') : '';
        
        routeInfo.innerHTML = `
            <div class="route-grade">${route.grade}</div>
            <div class="route-color">${route.color}</div>
            <div class="route-sector">${route.sector}</div>
            <div class="route-dates">
                <div class="route-creation">Oluşturuldu: ${creationDate}</div>
                <div class="route-completion">${completionDate ? `Tamamlandı: ${completionDate}` : ''}</div>
            </div>
        `;
        
        routeItem.appendChild(checkbox);
        routeItem.appendChild(routeInfo);
        routesList.appendChild(routeItem);
    });
}

// Rota checkbox değişikliği
function handleRouteCheckboxChange(event) {
    if (event.target.type !== 'checkbox' || !currentClimber) {
        return;
    }
    
    const routeId = event.target.dataset.routeId;
    const isChecked = event.target.checked;
    
    console.log(`Rota ${routeId} ${isChecked ? 'tamamlandı' : 'tamamlanmadı'}`);
    
    // Firestore'da tırmanıcının completedRoutes dizisini güncelle
    const updateData = {};
    
    if (isChecked) {
        // Rota tamamlandı, diziyi güncelle
        updateData.completedRoutes = arrayUnion(routeId);
        // Tamamlanma tarihini de ekle
        updateData[`completedAt_${routeId}`] = new Date().toISOString();
    } else {
        // Rota tamamlanmadı, diziden çıkar
        updateData.completedRoutes = arrayRemove(routeId);
        // Tamamlanma tarihini de sil
        updateData[`completedAt_${routeId}`] = deleteField();
    }
    
    updateDoc(doc(db, 'climbers', currentClimber.id), updateData)
        .then(() => {
            console.log('Tırmanıcı rotaları güncellendi');
        })
        .catch((error) => {
            console.error('Rota güncellenirken hata:', error);
            showError('Rota güncellenirken bir hata oluştu.');
            
            // Hata durumunda checkbox'ı eski haline döndür
            event.target.checked = !isChecked;
        });
}

// Başarı mesajı göster
function showSuccess(message) {
    // Basit bir toast bildirimi
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 1000;
        font-weight: 600;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // 3 saniye sonra kaldır
    setTimeout(() => {
        document.body.removeChild(toast);
    }, 3000);
}

// Hata mesajı göster
function showError(message) {
    // Basit bir toast bildirimi
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #e74c3c;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 1000;
        font-weight: 600;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // 5 saniye sonra kaldır
    setTimeout(() => {
        document.body.removeChild(toast);
    }, 5000);
}

// Hata yakalama
window.addEventListener('error', function(event) {
    console.error('JavaScript hatası:', event.error);
    showError('Beklenmeyen bir hata oluştu.');
});

// URL parametrelerini kontrol et
function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const climberName = urlParams.get('climber');
    
    if (climberName) {
        console.log('🔍 URL parametresi bulundu - Tırmanıcı:', climberName);
        
        // Tırmanıcılar yüklendikten sonra seç
        const checkClimber = () => {
            if (climbers.length > 0) {
                const foundClimber = climbers.find(climber => 
                    climber.name.toLowerCase() === climberName.toLowerCase()
                );
                
                if (foundClimber) {
                    console.log('✅ Tırmanıcı bulundu ve seçiliyor:', foundClimber.name);
                    selectClimber(foundClimber);
                    
                    // URL'yi temizle (opsiyonel)
                    const newUrl = window.location.pathname;
                    window.history.replaceState({}, document.title, newUrl);
                } else {
                    console.log('❌ Tırmanıcı bulunamadı:', climberName);
                    showError(`"${climberName}" isimli tırmanıcı bulunamadı.`);
                }
            } else {
                // Tırmanıcılar henüz yüklenmemiş, tekrar dene
                setTimeout(checkClimber, 500);
            }
        };
        
        checkClimber();
    }
}

// Modal fonksiyonları
function openModal(modal) {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function setupModalCloseListeners() {
    // Tüm modal'ları kapat
    [addClimberModal, addRouteModal].forEach(modal => {
        // Close butonları
        const closeBtn = modal.querySelector('.close-btn');
        const cancelBtn = modal.querySelector('.btn-cancel');
        
        closeBtn.addEventListener('click', () => closeModal(modal));
        cancelBtn.addEventListener('click', () => closeModal(modal));
        
        // Modal dışına tıklayınca kapat
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal);
            }
        });
    });
}

// Firebase bağlantı durumu kontrolü
console.log('🔥 Firebase bağlantısı başlatıldı');
console.log('📊 Firebase konfigürasyonu:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain
});

// Firebase bağlantı durumunu kontrol et
console.log('🔍 Firestore database referansı:', db);
console.log('📡 Database ID:', db.app.name);

// Firebase hata loglarını azalt (opsiyonel)
if (typeof window !== 'undefined') {
    // Sadece kritik hataları göster
    const originalConsoleWarn = console.warn;
    console.warn = function(...args) {
        if (args[0] && args[0].includes && args[0].includes('WebChannelConnection')) {
            return; // Firebase WebChannel hatalarını gizle
        }
        originalConsoleWarn.apply(console, args);
    };
}
