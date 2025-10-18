// Firebase Konfigürasyonu
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, updateDoc, doc, orderBy, query, serverTimestamp, arrayUnion, arrayRemove, deleteField, getDocs, where, getDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
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
let currentUser = null;
let routes = [];
let climbers = [];
let currentWeek = '';
let currentMonth = '';

// DOM elementleri
const loginScreen = document.getElementById('login-screen');
const mainContent = document.getElementById('main-content');
const loginForm = document.getElementById('login-form');
const createUserBtn = document.getElementById('create-user-btn');
const logoutBtn = document.getElementById('logout-btn');
const currentUsername = document.getElementById('current-username');
const routesList = document.getElementById('routes-list');
const routesHeader = document.getElementById('routes-header');

// Register popup elementleri
const registerOverlay = document.getElementById('register-overlay');
const registerForm = document.getElementById('register-form');
const closeRegisterBtn = document.getElementById('close-register-btn');
const cancelRegisterBtn = document.getElementById('cancel-register');
const registerError = document.getElementById('register-error');
const registerSuccess = document.getElementById('register-success');

// Modal elementleri (artık kullanılmıyor ama hata vermemesi için)
const addClimberModal = document.getElementById('add-climber-modal') || null;
const addClimberBtn = document.getElementById('add-climber-btn') || null;
const addClimberForm = document.getElementById('add-climber-form') || null;

// Sayfa yüklendiğinde çalışacak fonksiyonlar
document.addEventListener('DOMContentLoaded', function() {
    initializeJungleLog();
});

// Uygulamayı başlat
function initializeJungleLog() {
    console.log('🌲 Jungle Log uygulaması başlatılıyor...');
    console.log('🔍 Sayfa yüklendi, cookie kontrolü yapılacak...');
    
    // Event listener'ları ekle
    setupEventListeners();
    
    // Modal kapatma event'lerini ayarla
    setupModalCloseListeners();
    
    // Cookie'den kullanıcı bilgilerini kontrol et
    checkSavedUser();
}

// Event listener'ları ayarla
function setupEventListeners() {
    // Login formu
    loginForm.addEventListener('submit', handleLogin);
    
    // Yeni kullanıcı oluştur butonu
    createUserBtn.addEventListener('click', showRegisterPopup);
    
    // Çıkış yap butonu
    logoutBtn.addEventListener('click', handleLogout);
    
    // Register popup event listeners
    registerForm.addEventListener('submit', handleRegister);
    closeRegisterBtn.addEventListener('click', hideRegisterPopup);
    cancelRegisterBtn.addEventListener('click', hideRegisterPopup);
    registerOverlay.addEventListener('click', (e) => {
        if (e.target === registerOverlay) {
            hideRegisterPopup();
        }
    });
    
    // Tırmanıcı ekleme formu (eğer varsa)
    if (addClimberForm) {
        addClimberForm.addEventListener('submit', handleAddClimber);
    }
    
    // Rota checkbox'ları için event delegation (eğer varsa)
    if (routesList) {
        // Event listener'ı sadece bir kez ekle
        if (!routesList.hasAttribute('data-listener-added')) {
            routesList.addEventListener('change', handleRouteCheckboxChange);
            routesList.setAttribute('data-listener-added', 'true');
            console.log('✅ Rota checkbox event listener eklendi');
        }
    }
    
    // Modal butonları (eğer varsa)
    if (addClimberBtn) {
        addClimberBtn.addEventListener('click', () => openModal(addClimberModal));
    }
}

// Cookie'den kullanıcı bilgilerini kontrol et
function checkSavedUser() {
    console.log('🔍 Cookie kontrolü başlatılıyor...');
    console.log('🍪 Tüm cookie\'ler:', document.cookie);
    
    const savedUsername = getCookie('jungle_username');
    const savedPassword = getCookie('jungle_password');
    
    console.log('🍪 Kayıtlı kullanıcı adı:', savedUsername);
    console.log('🍪 Kayıtlı şifre:', savedPassword ? '***' : 'Yok');

    
    if (savedUsername && savedPassword) {
        console.log('✅ Kayıtlı kullanıcı bulundu:', savedUsername);
        
        // Form alanlarını doldur
        document.getElementById('username').value = savedUsername;
        document.getElementById('password').value = savedPassword;
        
        // "Beni Hatırla" checkbox'ını işaretle
        document.getElementById('remember-me').checked = true;
        
        console.log('🔄 Otomatik giriş başlatılıyor...');
        // Otomatik giriş yap
        autoLogin(savedUsername, savedPassword);
    } else {
        console.log('❌ Kayıtlı kullanıcı bulunamadı');
        showLoginScreen();
    }
}

// Otomatik giriş
async function autoLogin(username, password) {
    try {
        console.log('🔄 Otomatik giriş yapılıyor...');
        
        // Firestore'dan kullanıcıyı sorgula
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            console.log('❌ Kayıtlı kullanıcı bulunamadı');
            showLoginScreen();
            return;
        }
        
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        
        if (userData.password !== password) {
            console.log('❌ Şifre hatalı');
            showLoginScreen();
            return;
        }
        
        // Login başarılı
        currentUser = {
            id: userDoc.id,
            username: userData.username,
            name: userData.name,
            gender: userData.gender,
            completedRoutes: userData.completedRoutes || [],
            totalScore: userData.totalScore || 0,
            monthlyScore: userData.monthlyScore || 0
        };
        
        console.log('✅ Otomatik giriş başarılı:', currentUser);
        
        // Ana içeriği göster
        showMainContent();
        currentUsername.textContent = currentUser.name;
        setupRealtimeListeners();
        
    } catch (error) {
        console.error('❌ Otomatik giriş hatası:', error);
        showLoginScreen();
    }
}

// Login ekranını göster
function showLoginScreen() {
    loginScreen.style.display = 'flex';
    mainContent.style.display = 'none';
    console.log('🔐 Login ekranı gösteriliyor');
}

// Ana içeriği göster
function showMainContent() {
    loginScreen.style.display = 'none';
    mainContent.style.display = 'block';
    console.log('🏠 Ana içerik gösteriliyor');
}

// Cookie yardımcı fonksiyonları
function setCookie(name, value, days = 30) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    const cookieString = `${name}=${value};expires=${expires.toUTCString()};path=/`;
    document.cookie = cookieString;
    console.log(`🍪 Cookie kaydedildi: ${name}=${value}`);
    console.log(`🍪 Cookie string: ${cookieString}`);
    console.log(`🍪 Tüm cookie'ler: ${document.cookie}`);
}

function getCookie(name) {
    console.log(`🔍 Cookie aranıyor: ${name}`);
    console.log(`🍪 Mevcut cookie'ler: ${document.cookie}`);
    
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    console.log(`🍪 Cookie array:`, ca);
    
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        console.log(`🔍 Kontrol edilen cookie: "${c}"`);
        if (c.indexOf(nameEQ) === 0) {
            const value = c.substring(nameEQ.length, c.length);
            console.log(`✅ Cookie bulundu: ${name}=${value}`);
            return value;
        }
    }
    console.log(`❌ Cookie bulunamadı: ${name}`);
    return null;
}

function deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
    console.log(`🍪 Cookie silindi: ${name}`);
    console.log(`🍪 Güncel cookie'ler: ${document.cookie}`);
}

// Login işlemi
async function handleLogin(event) {
    event.preventDefault();
    console.log('🔐 Login işlemi başlatıldı');
    
    const formData = new FormData(loginForm);
    const username = formData.get('username').trim();
    const password = formData.get('password').trim();
    
    if (!username || !password) {
        showLoginError('Lütfen tüm alanları doldurun');
        return;
    }
    
    try {
        // Firestore'dan kullanıcıyı sorgula
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            showLoginError('Kullanıcı bulunamadı');
            return;
        }
        
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        
        if (userData.password !== password) {
            showLoginError('Şifre hatalı');
            return;
        }
        
        // Login başarılı
        currentUser = {
            id: userDoc.id,
            username: userData.username,
            name: userData.name,
            gender: userData.gender,
            completedRoutes: userData.completedRoutes || [],
            totalScore: userData.totalScore || 0,
            monthlyScore: userData.monthlyScore || 0
        };
        
        console.log('✅ Login başarılı:', currentUser);
        
        // "Beni Hatırla" checkbox'ını kontrol et
        const rememberMe = document.getElementById('remember-me').checked;
        console.log('🔍 "Beni Hatırla" durumu:', rememberMe);
        
        if (rememberMe) {
            // Kullanıcı bilgilerini cookie'ye kaydet
            console.log('🍪 Cookie kaydediliyor...');
            setCookie('jungle_username', username);
            setCookie('jungle_password', password);
            console.log('✅ Kullanıcı bilgileri cookie\'ye kaydedildi');
        } else {
            // Cookie'leri sil
            console.log('🍪 Cookie\'ler siliniyor...');
            deleteCookie('jungle_username');
            deleteCookie('jungle_password');
            console.log('✅ Cookie\'ler silindi');
        }
        
        showLoginSuccess();
        
        // Ana içeriği göster ve rotaları yükle
        showMainContent();
        currentUsername.textContent = currentUser.name;
        updateUserScoreDisplay();
        setupRealtimeListeners();
        
    } catch (error) {
        console.error('❌ Login hatası:', error);
        showLoginError('Giriş yapılırken hata oluştu');
    }
}

// Register popup'ı göster
function showRegisterPopup() {
    registerOverlay.style.display = 'flex';
    hideRegisterMessages();
    console.log('👤 Register popup gösteriliyor');
}

// Register popup'ı gizle
function hideRegisterPopup() {
    registerOverlay.style.display = 'none';
    registerForm.reset();
    hideRegisterMessages();
    console.log('❌ Register popup gizleniyor');
}

// Register mesajlarını gizle
function hideRegisterMessages() {
    registerError.style.display = 'none';
    registerSuccess.style.display = 'none';
}

// Yeni kullanıcı kayıt
async function handleRegister(event) {
    event.preventDefault();
    console.log('👤 Kullanıcı kayıt işlemi başlatıldı');
    
    const formData = new FormData(registerForm);
    const username = formData.get('username').trim();
    const password = formData.get('password').trim();
    const name = formData.get('name').trim();
    const gender = formData.get('gender');
    
    if (!username || !password || !name || !gender) {
        showRegisterError('Lütfen tüm alanları doldurun');
        return;
    }
    
    try {
        // Kullanıcı adı kontrolü
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            showRegisterError('Bu kullanıcı adı zaten kullanılıyor');
            return;
        }
        
        // Yeni kullanıcı oluştur
        const userData = {
            username: username,
            password: password,
            name: name,
            gender: gender,
            completedRoutes: [],
            createdAt: serverTimestamp()
        };
        
        await addDoc(usersRef, userData);
        console.log('✅ Yeni kullanıcı oluşturuldu:', username);
        showRegisterSuccess();
        
        // 2 saniye sonra popup'ı kapat
        setTimeout(() => {
            hideRegisterPopup();
        }, 2000);
        
    } catch (error) {
        console.error('❌ Kullanıcı oluşturma hatası:', error);
        showRegisterError('Kullanıcı oluşturulurken hata oluştu');
    }
}

// Register hata mesajı
function showRegisterError(message) {
    registerError.textContent = `❌ ${message}`;
    registerError.style.display = 'block';
    registerSuccess.style.display = 'none';
}

// Register başarı mesajı
function showRegisterSuccess() {
    registerSuccess.style.display = 'block';
    registerError.style.display = 'none';
}

// Cookie test fonksiyonu kaldırıldı - artık gerekli değil

// Çıkış yap
function handleLogout() {
    currentUser = null;
    routes = [];
    
    // Cookie'leri sil
    deleteCookie('jungle_username');
    deleteCookie('jungle_password');
    
    // Form alanlarını temizle
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    
    showLoginScreen();
    console.log('🚪 Çıkış yapıldı ve cookie\'ler silindi');
}

// Login hata mesajı
function showLoginError(message) {
    const errorDiv = document.getElementById('login-error');
    const successDiv = document.getElementById('login-success');
    
    errorDiv.textContent = `❌ ${message}`;
    errorDiv.style.display = 'block';
    successDiv.style.display = 'none';
}

// Login başarı mesajı
function showLoginSuccess() {
    const errorDiv = document.getElementById('login-error');
    const successDiv = document.getElementById('login-success');
    
    successDiv.style.display = 'block';
    errorDiv.style.display = 'none';
    
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 2000);
}

// Real-time dinleyicileri ayarla
function setupRealtimeListeners() {
    console.log('🔊 Real-time dinleyiciler başlatılıyor...');
    
    // Period bilgilerini al
    loadPeriodInfo();
    
    // Tüm rotaları dinle (kullanıcı hangi rotaları çıkardığını işaretleyebilsin)
    const routesQuery = query(
        collection(db, 'routes'), 
        orderBy('createdAt', 'desc')
    );
    console.log('📡 Kullanıcı rotaları dinleyicisi başlatıldı:', currentUser.id);
    
    onSnapshot(routesQuery, (snapshot) => {
        console.log('🔄 Kullanıcı rotaları güncellendi:', snapshot.size, 'rota');
        
        routes = [];
        snapshot.forEach(doc => {
            const routeData = {
                id: doc.id,
                ...doc.data()
            };
            console.log('📝 Rota verisi:', routeData);
            routes.push(routeData);
        });
        
        console.log('📋 Kullanıcı rotaları:', routes.length);
        displayRoutes();
    }, (error) => {
        console.error('❌ Kullanıcı rotaları dinlenirken hata:', error);
        showError('Rotalar yüklenirken bir hata oluştu.');
    });

    // Kullanıcı verilerini dinle (completedRoutes güncellemeleri için)
    console.log('📡 Kullanıcı verileri dinleyicisi başlatıldı');
    
    onSnapshot(doc(db, 'users', currentUser.id), (snapshot) => {
        if (snapshot.exists()) {
            const userData = snapshot.data();
            currentUser = {
                id: snapshot.id,
                username: userData.username,
                name: userData.name,
                completedRoutes: userData.completedRoutes || [],
                totalScore: userData.totalScore || 0,
                monthlyScore: userData.monthlyScore || 0,
                ...userData
            };
            console.log('🔄 Kullanıcı verileri güncellendi:', currentUser);
            console.log('🏆 Güncel puanlar:', { 
                totalScore: currentUser.totalScore, 
                monthlyScore: currentUser.monthlyScore 
            });
            console.log('🔍 Güncel completedRoutes:', currentUser.completedRoutes);
            
            // Puan gösterimini güncelle
            updateUserScoreDisplay();
            
            // Checkbox durumlarını güncelle (yeniden render etme)
            updateCheckboxStates();
        }
    }, (error) => {
        console.error('❌ Kullanıcı verileri dinlenirken hata:', error);
        showError('Kullanıcı verileri yüklenirken bir hata oluştu.');
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
// displayClimbers fonksiyonu kaldırıldı - artık climbers listesi yok

// selectClimber fonksiyonu kaldırıldı - artık climbers seçimi yok

// Rotaları göster
function displayRoutes() {
    console.log('🔄 displayRoutes çağrıldı - Rotalar yeniden render ediliyor');
    
    if (routes.length === 0) {
        routesList.innerHTML = '<div class="loading">Henüz rota bulunmuyor.</div>';
        return;
    }
    
    // Rotaları bu hafta ve diğer rotalar olarak ayır
    const currentWeekRoutes = routes.filter(route => route.week === currentWeek);
    const otherRoutes = routes.filter(route => route.week !== currentWeek);
    
    console.log('📊 Rota kategorileri:', {
        currentWeek: currentWeek,
        currentWeekRoutes: currentWeekRoutes.length,
        otherRoutes: otherRoutes.length
    });
    
    // Her iki kategoriyi de oluşturulma tarihine göre sırala (güncelden eskiye)
    const sortedCurrentWeekRoutes = [...currentWeekRoutes].sort((a, b) => {
        const dateResult = new Date(b.createdAt) - new Date(a.createdAt);
        return dateResult;
    });
    
    const sortedOtherRoutes = [...otherRoutes].sort((a, b) => {
        const dateResult = new Date(b.createdAt) - new Date(a.createdAt);
        return dateResult;
    });
    
    routesList.innerHTML = '';
    
    // Bu haftanın rotaları bölümü
    if (sortedCurrentWeekRoutes.length > 0) {
        const currentWeekSection = createRouteSection('Bu Haftanın Rotaları', sortedCurrentWeekRoutes);
        routesList.appendChild(currentWeekSection);
    }
    
    // Diğer rotalar bölümü
    if (sortedOtherRoutes.length > 0) {
        const otherRoutesSection = createRouteSection('Diğer Rotalar', sortedOtherRoutes);
        routesList.appendChild(otherRoutesSection);
    }
}

// Rota bölümü oluştur
function createRouteSection(title, routes) {
    const section = document.createElement('div');
    section.className = 'route-section';
    
    const sectionTitle = document.createElement('h3');
    sectionTitle.className = 'route-section-title';
    sectionTitle.textContent = title;
    
    const routesContainer = document.createElement('ul');
    routesContainer.className = 'routes-container';
    
    routes.forEach(route => {
        const routeItem = document.createElement('li');
        routeItem.className = 'route-item';
        
        // Checkbox oluştur
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'route-checkbox';
        checkbox.dataset.routeId = route.id;
        
        // Kullanıcının bu rotayı çıkardığını kontrol et
        const isCompleted = currentUser.completedRoutes && currentUser.completedRoutes.includes(route.id);
        checkbox.checked = isCompleted;
        
        console.log(`🔍 Rota checkbox oluşturuldu:`, {
            routeId: route.id,
            isCompleted: isCompleted,
            checkbox: checkbox
        });
        
        // Rota bilgileri
        const routeInfo = document.createElement('div');
        routeInfo.className = 'route-info';
        
        // Tamamlanma tarihini kontrol et
        const completedAt = currentUser[`completedAt_${route.id}`];
        const completionDate = completedAt ? new Date(completedAt).toLocaleDateString('tr-TR') : '';
        
        // Oluşturulma tarihini formatla
        let creationDate = '';
        
        if (route.createdAt) {
            // Firestore Timestamp objesi kontrolü
            if (route.createdAt.seconds) {
                // Firestore Timestamp objesi
                creationDate = new Date(route.createdAt.seconds * 1000).toLocaleDateString('tr-TR');
            } else if (typeof route.createdAt === 'string') {
                // String timestamp
                creationDate = new Date(route.createdAt).toLocaleDateString('tr-TR');
            } else if (route.createdAt.toDate) {
                // Firestore Timestamp objesi (toDate metodu ile)
                creationDate = route.createdAt.toDate().toLocaleDateString('tr-TR');
            }
        }
        
        const boulderOfWeekBadge = route.boulderOfWeek ? 
            '<div class="boulder-of-week-badge">⭐ Boulder of the Week</div>' : '';
        
        const imageSection = route.imageUrl ? 
            `<div class="route-image">
                <img src="${route.imageUrl}" alt="Rota resmi" onerror="this.style.display='none'">
            </div>` : '';
            
        // Status yazısı
        const statusText = isCompleted ? 'Çıktım' : 'Çıkmadım';
        const statusClass = isCompleted ? 'route-status completed' : 'route-status';
        
        routeInfo.innerHTML = `
            ${boulderOfWeekBadge}
            <div class="route-grade">Seviye ${route.grade}</div>
            <div class="route-color">🎨 ${route.color}</div>
            <div class="route-sector">📍 ${route.sector}</div>
            <div class="route-status ${statusClass}">${statusText}</div>
            <div class="route-dates">
                <div class="route-creation">📅 Oluşturuldu: ${creationDate}</div>
                <div class="route-completion">${completionDate ? `✅ Çıktı: ${completionDate}` : '❌ Henüz çıkmadı'}</div>
            </div>
            ${imageSection}
        `;
        
        routeItem.appendChild(checkbox);
        routeItem.appendChild(routeInfo);
        routesContainer.appendChild(routeItem);
    });
    
    section.appendChild(sectionTitle);
    section.appendChild(routesContainer);
    
    return section;
}

// Rota checkbox değişikliği
function handleRouteCheckboxChange(event) {
    if (event.target.type !== 'checkbox' || !currentUser) {
        return;
    }
    
    const routeId = event.target.dataset.routeId;
    const isChecked = event.target.checked;
    
    console.log(`🔍 Rota checkbox değişikliği:`, {
        routeId: routeId,
        isChecked: isChecked,
        target: event.target,
        allCheckboxes: document.querySelectorAll('.route-checkbox'),
        currentUserCompletedRoutes: currentUser?.completedRoutes
    });
    
    // Sadece bu checkbox'ın event'ini işle
    if (event.target.classList.contains('route-checkbox')) {
        console.log(`✅ Rota ${routeId} ${isChecked ? 'çıkardı' : 'çıkmadı'}`);
        
        // Yazıyı hemen güncelle (anlık görünüm için)
        updateRouteStatusText(routeId, isChecked);
        
        if (isChecked) {
            // Rota çıkardı - deneme sayısını sor
            showAttemptDialog(routeId);
        } else {
            // Rota çıkmadı - normal işlem
            updateRouteCompletion(routeId, false);
        }
    }
}

// Deneme sayısı dialog'u
function showAttemptDialog(routeId) {
    console.log('🎯 Deneme sayısı popup\'ı gösteriliyor:', routeId);
    showAttemptsPopup(routeId);
}

// Rota tamamlama güncellemesi
async function updateRouteCompletion(routeId, isCompleted, attempts = null, score = 0) {
    const updateData = {};
    
    // Rota bilgilerini al
    const route = routes.find(r => r.id === routeId);
    if (!route) {
        console.error('❌ Rota bulunamadı:', routeId);
        return;
    }
    
    // Bu haftanın rotası mı kontrol et
    const isCurrentWeekRoute = route.week === currentWeek;
    console.log('🔍 Rota hafta kontrolü:', {
        routeWeek: route.week,
        currentWeek: currentWeek,
        isCurrentWeekRoute: isCurrentWeekRoute
    });
    
    if (isCompleted) {
        // Rota çıkardı
        console.log('🔍 Rota çıkardı - updateData hazırlanıyor:', {
            routeId: routeId,
            currentCompletedRoutes: currentUser.completedRoutes,
            willAdd: routeId
        });
        
        updateData.completedRoutes = arrayUnion(routeId);
        updateData[`completedAt_${routeId}`] = new Date().toISOString();
        updateData[`attempts_${routeId}`] = attempts;
        updateData[`score_${routeId}`] = score;
        
        // Puan hesaplama - Bu haftanın rotaları hem total hem monthly'ye eklenir
        const currentTotalScore = currentUser.totalScore || 0;
        const currentMonthlyScore = currentUser.monthlyScore || 0;
        const newTotalScore = currentTotalScore + score;
        
        // Total puana her zaman ekle
        updateData.totalScore = newTotalScore;
        
        if (isCurrentWeekRoute) {
            // Bu haftanın rotası - Hem total hem monthly'ye ekle
            const newMonthlyScore = currentMonthlyScore + score;
            updateData.monthlyScore = newMonthlyScore;
            
            console.log('🏆 Bu haftanın rotası - Total ve Monthly puana eklendi:', { 
                currentTotalScore, 
                currentMonthlyScore,
                addedScore: score,
                newTotalScore, 
                newMonthlyScore 
            });
        } else {
            // Bu haftanın rotası değil - Sadece total puana ekle
            updateData.monthlyScore = currentMonthlyScore; // Monthly'yi değiştirme
            
            console.log('🏆 Bu haftanın rotası değil - Sadece Total puana eklendi:', { 
                currentTotalScore,
                currentMonthlyScore,
                addedScore: score,
                newTotalScore,
                monthlyScore: 'değişmedi'
            });
        }
    } else {
        // Rota çıkmadı
        console.log('🔍 Rota çıkmadı - updateData hazırlanıyor:', {
            routeId: routeId,
            currentCompletedRoutes: currentUser.completedRoutes,
            willRemove: routeId
        });
        
        updateData.completedRoutes = arrayRemove(routeId);
        updateData[`completedAt_${routeId}`] = deleteField();
        updateData[`attempts_${routeId}`] = deleteField();
        
        // Puan geri alma - Bu haftanın rotaları hem total hem monthly'den çıkarılır
        const oldScore = currentUser[`score_${routeId}`] || 0;
        const newTotalScore = Math.max(0, (currentUser.totalScore || 0) - oldScore);
        
        // Total puandan her zaman çıkar
        updateData.totalScore = newTotalScore;
        updateData[`score_${routeId}`] = deleteField();
        
        if (isCurrentWeekRoute) {
            // Bu haftanın rotası - Hem total hem monthly'den çıkar
            const newMonthlyScore = Math.max(0, (currentUser.monthlyScore || 0) - oldScore);
            updateData.monthlyScore = newMonthlyScore;
            
            console.log('🏆 Bu haftanın rotası - Total ve Monthly puandan çıkarıldı:', { 
                oldScore, 
                newTotalScore, 
                newMonthlyScore 
            });
        } else {
            // Bu haftanın rotası değil - Sadece total puandan çıkar
            updateData.monthlyScore = currentUser.monthlyScore || 0; // Monthly'yi değiştirme
            
            console.log('🏆 Bu haftanın rotası değil - Sadece Total puandan çıkarıldı:', { 
                oldScore, 
                newTotalScore,
                monthlyScore: 'değişmedi'
            });
        }
    }
    
    try {
        await updateDoc(doc(db, 'users', currentUser.id), updateData);
        console.log('✅ Kullanıcı rotaları güncellendi');
        
        // Route attempt kaydı oluştur (sadece bu haftanın rotaları için)
        if (isCompleted && isCurrentWeekRoute) {
            await saveRouteAttempt(routeId, attempts, score);
        }
        
        // Checkbox'ları manuel olarak güncelle (yeniden render etme)
        updateCheckboxStates();
        
        // Yazıyı da güncelle
        updateRouteStatusText(routeId, isCompleted);
        
    } catch (error) {
        console.error('❌ Rota güncellenirken hata:', error);
        showError('Rota güncellenirken bir hata oluştu.');
        
        // Hata durumunda checkbox'ı eski haline döndür
        const checkbox = document.querySelector(`[data-route-id="${routeId}"]`);
        if (checkbox) checkbox.checked = !isCompleted;
    }
}

// Route attempt kaydı
async function saveRouteAttempt(routeId, attempts, score) {
    try {
        const route = routes.find(r => r.id === routeId);
        if (!route) return;
        
        const attemptData = {
            userId: currentUser.id,
            routeId: routeId,
            attempts: attempts,
            completedAt: new Date().toISOString(),
            score: score,
            isBoulderOfWeek: route.boulderOfWeek || false,
            month: new Date().toISOString().substring(0, 7), // YYYY-MM format
            createdAt: serverTimestamp()
        };
        
        await addDoc(collection(db, 'routeAttempts'), attemptData);
        console.log('📊 Route attempt kaydedildi:', attemptData);
        
    } catch (error) {
        console.error('❌ Route attempt kaydedilemedi:', error);
    }
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
    // Tüm modal'ları kapat (sadece mevcut olanları)
    const modals = [addClimberModal].filter(modal => modal !== null);
    
    modals.forEach(modal => {
        // Close butonları
        const closeBtn = modal.querySelector('.close-btn');
        const cancelBtn = modal.querySelector('.btn-cancel');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => closeModal(modal));
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => closeModal(modal));
        }
        
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

// Puan hesaplama sistemi
function calculateScore(grade, attempts, isBoulderOfWeek = false) {
    console.log('🏆 Puan hesaplanıyor:', { grade, attempts, isBoulderOfWeek });
    
    let multiplier = 1.0;
    
    // Deneme sayısına göre çarpan
    if (attempts === 1) {
        multiplier = 1.3; // İlk denemede çıkma
    } else if (attempts === 2) {
        multiplier = 1.2; // İkinci denemede çıkma
    } else if (attempts === 3) {
        multiplier = 1.1; // Üçüncü denemede çıkma
    } else {
        multiplier = 1.0; // Daha fazla deneme
    }
    
    // Boulder of the Week bonusu
    if (isBoulderOfWeek) {
        multiplier += 0.2; // +0.2 bonus
    }
    
    const score = grade * multiplier;
    console.log('✅ Hesaplanan puan:', score);
    
    return Math.round(score * 10) / 10; // 1 ondalık basamak
}

// Kullanıcı puan gösterimini güncelle
function updateUserScoreDisplay() {
    if (!currentUser) return;
    
    const totalScoreElement = document.getElementById('user-total-score');
    const monthlyScoreElement = document.getElementById('user-monthly-score');
    
    if (totalScoreElement) {
        totalScoreElement.textContent = (currentUser.totalScore || 0).toFixed(1);
    }
    
    if (monthlyScoreElement) {
        monthlyScoreElement.textContent = (currentUser.monthlyScore || 0).toFixed(1);
    }
    
    console.log('🏆 Puan gösterimi güncellendi:', {
        totalScore: currentUser.totalScore || 0,
        monthlyScore: currentUser.monthlyScore || 0
    });
}

// Period bilgilerini yükle
async function loadPeriodInfo() {
    try {
        const periodRef = doc(db, 'system', 'period');
        const periodDoc = await getDoc(periodRef);
        
        if (periodDoc.exists()) {
            const periodData = periodDoc.data();
            currentWeek = periodData.week || getDefaultWeek();
            currentMonth = periodData.month || getDefaultMonth();
            console.log('📅 Firestore\'dan period bilgileri alındı:', { currentWeek, currentMonth });
        } else {
            currentWeek = getDefaultWeek();
            currentMonth = getDefaultMonth();
            console.log('📅 Varsayılan period bilgileri kullanıldı:', { currentWeek, currentMonth });
        }
    } catch (error) {
        console.error('❌ Period bilgileri alınırken hata:', error);
        currentWeek = getDefaultWeek();
        currentMonth = getDefaultMonth();
    }
}

// Varsayılan hafta bilgisini al
function getDefaultWeek() {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Pazartesi
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Pazar
    
    return `${weekStart.getDate()}/${weekStart.getMonth() + 1} - ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`;
}

// Varsayılan ay bilgisini al
function getDefaultMonth() {
    const now = new Date();
    const monthNames = [
        'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    return `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
}

// Checkbox durumlarını güncelle
function updateCheckboxStates() {
    console.log('🔍 Checkbox durumları güncelleniyor...');
    console.log('👤 Current user completedRoutes:', currentUser?.completedRoutes);
    
    const checkboxes = document.querySelectorAll('.route-checkbox');
    console.log(`🔍 Toplam ${checkboxes.length} checkbox bulundu`);
    
    checkboxes.forEach((checkbox, index) => {
        const routeId = checkbox.dataset.routeId;
        const isCompleted = currentUser.completedRoutes && currentUser.completedRoutes.includes(routeId);
        
        console.log(`🔍 Checkbox ${index + 1}:`, {
            routeId: routeId,
            isCompleted: isCompleted,
            currentChecked: checkbox.checked,
            needsUpdate: checkbox.checked !== isCompleted,
            completedRoutesArray: currentUser.completedRoutes
        });
        
        // Sadece durum değiştiyse güncelle
        if (checkbox.checked !== isCompleted) {
            checkbox.checked = isCompleted;
            console.log(`✅ Checkbox güncellendi: ${routeId} -> ${isCompleted}`);
            
            // Yazıyı da güncelle
            updateRouteStatusText(routeId, isCompleted);
        } else {
            console.log(`⏭️ Checkbox değişmedi: ${routeId} -> ${isCompleted}`);
        }
    });
}

// Rota durum yazısını güncelle
function updateRouteStatusText(routeId, isCompleted) {
    console.log('📝 Rota durum yazısı güncelleniyor:', { routeId, isCompleted });
    
    // Rota item'ını bul
    const checkbox = document.querySelector(`[data-route-id="${routeId}"]`);
    if (!checkbox) {
        console.log('❌ Checkbox bulunamadı:', routeId);
        return;
    }
    
    const routeItem = checkbox.closest('.route-item');
    if (!routeItem) {
        console.log('❌ Rota item bulunamadı:', routeId);
        return;
    }
    
    // Status yazısını bul
    const statusText = routeItem.querySelector('.route-status');
    if (!statusText) {
        console.log('❌ Status yazısı bulunamadı:', routeId);
        console.log('🔍 Rota item HTML:', routeItem.innerHTML);
        return;
    }
    
    // Yazıyı güncelle
    if (isCompleted) {
        statusText.textContent = 'Çıktım';
        statusText.className = 'route-status completed';
        console.log('✅ Yazı "Çıktım" olarak güncellendi:', routeId);
    } else {
        statusText.textContent = 'Çıkmadım';
        statusText.className = 'route-status';
        console.log('✅ Yazı "Çıkmadım" olarak güncellendi:', routeId);
    }
}

// Deneme sayısı popup'ını göster
function showAttemptsPopup(routeId) {
    const attemptsOverlay = document.getElementById('attempts-overlay');
    if (!attemptsOverlay) return;
    
    attemptsOverlay.style.display = 'flex';
    
    // Popup'ı kapatma event listener'ları (sadece bir kez ekle)
    const closeBtn = document.getElementById('close-attempts-btn');
    const cancelBtn = document.getElementById('cancel-attempts');
    const overlay = attemptsOverlay;
    
    const closePopup = () => {
        attemptsOverlay.style.display = 'none';
        // İptal edildi, checkbox'ı geri çevir
        const checkbox = document.querySelector(`[data-route-id="${routeId}"]`);
        if (checkbox) checkbox.checked = false;
    };
    
    // Önceki event listener'ları temizle
    if (closeBtn) {
        closeBtn.removeEventListener('click', closeBtn.closeHandler);
        closeBtn.closeHandler = closePopup;
        closeBtn.addEventListener('click', closeBtn.closeHandler);
    }
    if (cancelBtn) {
        cancelBtn.removeEventListener('click', cancelBtn.closeHandler);
        cancelBtn.closeHandler = closePopup;
        cancelBtn.addEventListener('click', cancelBtn.closeHandler);
    }
    if (overlay) {
        overlay.removeEventListener('click', overlay.overlayHandler);
        overlay.overlayHandler = (e) => {
            if (e.target === overlay) closePopup();
        };
        overlay.addEventListener('click', overlay.overlayHandler);
    }
    
    // Deneme butonları (sadece bir kez event listener ekle)
    const attemptBtns = document.querySelectorAll('.attempt-btn');
    attemptBtns.forEach(btn => {
        // Önceki event listener'ları temizle
        btn.removeEventListener('click', btn.attemptHandler);
        
        // Yeni event handler oluştur
        btn.attemptHandler = () => {
            const attempts = parseInt(btn.dataset.attempts);
            console.log('🎯 Seçilen deneme sayısı:', attempts);
            
            // Rota bilgilerini al ve puan hesapla
            const route = routes.find(r => r.id === routeId);
            if (!route) {
                console.error('Rota bulunamadı:', routeId);
                closePopup();
                return;
            }
            
            const score = calculateScore(parseInt(route.grade), attempts, route.boulderOfWeek);
            console.log('🏆 Kazanılan puan:', score);
            
            // Başarılı tamamlama, checkbox'ı geri çevirme
            attemptsOverlay.style.display = 'none';
            
            // Checkbox'ı manuel olarak işaretle
            const checkbox = document.querySelector(`[data-route-id="${routeId}"]`);
            if (checkbox) {
                checkbox.checked = true;
                console.log('✅ Checkbox manuel olarak işaretlendi:', routeId);
                
                // Yazıyı da güncelle
                updateRouteStatusText(routeId, true);
            }
            
            updateRouteCompletion(routeId, true, attempts, score);
        };
        
        // Event listener'ı ekle
        btn.addEventListener('click', btn.attemptHandler);
    });
}

// Deneme sayısı popup'ını gizle
function hideAttemptsPopup() {
    const attemptsOverlay = document.getElementById('attempts-overlay');
    if (attemptsOverlay) {
        attemptsOverlay.style.display = 'none';
    }
}
