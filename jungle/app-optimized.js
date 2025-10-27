// Optimized App.js - Database v2 ile
import { userServiceV2, userStatsService, routeCompletionService, routeServiceV2, systemServiceV2 } from './services/database-v2.js';
import { uiService } from './services/ui.js';
import { EventManager } from './services/eventManager.js';
import { checkConnection } from './config/firebase.js';

// Şifre hash'leme fonksiyonu
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Hash fonksiyonunu test et (geliştirme amaçlı)
async function testHashFunction() {
    try {
        const testPassword = 'test123';
        const hash1 = await hashPassword(testPassword);
        const hash2 = await hashPassword(testPassword);
        
        console.log('🔐 Hash test sonuçları:');
        console.log('Test şifre:', testPassword);
        console.log('Hash 1:', hash1);
        console.log('Hash 2:', hash2);
        console.log('Hash\'ler eşit mi?', hash1 === hash2);
        
        // Farklı şifre ile test
        const differentPassword = 'test124';
        const hash3 = await hashPassword(differentPassword);
        console.log('Farklı şifre hash:', hash3);
        console.log('Farklı hash eşit mi?', hash1 === hash3);
        
    } catch (error) {
        console.error('❌ Hash test hatası:', error);
    }
}

// Global state
const appState = {
    currentUser: null,
    userStats: null,
    routes: [],
    routeCompletions: [],
    currentWeek: '',
    currentMonth: ''
};

// Event Manager
const eventManager = new EventManager();

// Ana uygulama sınıfı - Optimized
class JungleLogAppOptimized {
    constructor() {
        this.initializeApp();
    }

    // Uygulamayı başlat
    async initializeApp() {
        try {
            console.log('🚀 Jungle Log uygulaması başlatılıyor (Optimized)...');
            
            // Hash fonksiyonunu test et
            await testHashFunction();
            
            // UI elementlerini başlat
            uiService.initializeElements();
            
            // Event listener'ları kur
            this.setupEventListeners();
            
            // Sistem bilgilerini yükle
            await this.loadSystemInfo();
            
            // Kayıtlı kullanıcıyı kontrol et
            this.checkSavedUser();
            
            console.log('✅ Optimized uygulama başarıyla başlatıldı');
        } catch (error) {
            console.error('❌ Uygulama başlatma hatası:', error);
            uiService.showError('Uygulama başlatılamadı. Lütfen sayfayı yenileyin.');
        }
    }

    // Event listener'ları kur
    setupEventListeners() {
        // Login form
        if (uiService.elements.loginForm) {
            eventManager.addListener(uiService.elements.loginForm, 'submit', (e) => this.handleLogin(e));
        }

        // Create user button
        if (uiService.elements.createUserBtn) {
            eventManager.addListener(uiService.elements.createUserBtn, 'click', () => this.showRegisterPopup());
        }

        // Logout button
        if (uiService.elements.logoutBtn) {
            eventManager.addListener(uiService.elements.logoutBtn, 'click', () => this.handleLogout());
        }

        // Register form
        if (uiService.elements.registerForm) {
            eventManager.addListener(uiService.elements.registerForm, 'submit', (e) => this.handleRegister(e));
        }

        // Routes list - delegated event listener
        if (uiService.elements.routesList) {
            eventManager.addDelegatedListener(
                uiService.elements.routesList, 
                '.route-checkbox', 
                'change', 
                (e) => this.handleRouteCheckboxChange(e)
            );
        }

        // Modal close buttons
        this.setupModalCloseListeners();
    }

    // Modal close listener'ları
    setupModalCloseListeners() {
        // Register modal
        const closeRegisterBtn = document.getElementById('close-register-btn');
        const cancelRegisterBtn = document.getElementById('cancel-register');
        
        if (closeRegisterBtn) {
            eventManager.addListener(closeRegisterBtn, 'click', () => this.hideRegisterPopup());
        }
        if (cancelRegisterBtn) {
            eventManager.addListener(cancelRegisterBtn, 'click', () => this.hideRegisterPopup());
        }

        // Attempts modal
        const closeAttemptsBtn = document.getElementById('close-attempts-btn');
        const cancelAttemptsBtn = document.getElementById('cancel-attempts');
        
        if (closeAttemptsBtn) {
            eventManager.addListener(closeAttemptsBtn, 'click', () => this.hideAttemptsPopup());
        }
        if (cancelAttemptsBtn) {
            eventManager.addListener(cancelAttemptsBtn, 'click', () => this.hideAttemptsPopup());
        }
    }

    // Sistem bilgilerini yükle
    async loadSystemInfo() {
        try {
            console.log('🔄 Sistem bilgileri yükleniyor...');
            const systemInfo = await systemServiceV2.getSystemInfo();
            appState.currentWeek = systemInfo.week;
            appState.currentMonth = systemInfo.month;
            
            console.log('📅 Sistem bilgileri yüklendi:', systemInfo);
            console.log('📅 currentWeek:', appState.currentWeek);
            console.log('📅 currentMonth:', appState.currentMonth);
        } catch (error) {
            console.error('❌ Sistem bilgileri yüklenemedi:', error);
            // Varsayılan değerler
            appState.currentWeek = this.getDefaultWeek();
            appState.currentMonth = this.getDefaultMonth();
            console.log('📅 Varsayılan değerler kullanılıyor:', appState.currentWeek, appState.currentMonth);
        }
    }

    // Login işlemi - Optimized
    async handleLogin(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const username = formData.get('username');
        const password = formData.get('password');
        const rememberMe = formData.get('remember-me') === 'on';
        
        console.log('🔐 Login denemesi:', { username, password: '***', rememberMe });
        
        try {
            uiService.showLoading(uiService.elements.loginForm, 'Giriş yapılıyor...');
            
            console.log('🔍 Kullanıcı aranıyor:', username);
            // Kullanıcıyı bul - Optimized query
            const user = await userServiceV2.getUserByUsername(username);
            console.log('👤 Bulunan kullanıcı:', user);
            
            if (!user) {
                console.log('❌ Kullanıcı bulunamadı');
                throw new Error('Kullanıcı adı veya şifre hatalı');
            }
            
            // Şifreyi hash'le ve karşılaştır
            const hashedPassword = await hashPassword(password);
            if (user.password !== hashedPassword) {
                console.log('❌ Şifre hatalı. Beklenen hash:', user.password, 'Girilen hash:', hashedPassword);
                throw new Error('Kullanıcı adı veya şifre hatalı');
            }
            
            console.log('✅ Kullanıcı doğrulandı');
            
            // Kullanıcı istatistiklerini al
            const userStats = await userStatsService.getUserStats(user.id);
            
            // Kullanıcıyı ayarla
            appState.currentUser = user;
            appState.userStats = userStats;
            
            // Remember me
            if (rememberMe) {
                this.setCookie('rememberedUser', JSON.stringify({ username, password }), 30);
            }
            
            // UI'yi güncelle
            this.showMainContent();
            this.setupRealtimeListeners();
            
            uiService.showSuccess('Giriş başarılı!');
            
        } catch (error) {
            console.error('❌ Login hatası:', error);
            uiService.showError(error.message, uiService.elements.loginForm);
        }
    }

    // Register işlemi - Optimized
    async handleRegister(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const userData = {
            username: formData.get('username'),
            password: formData.get('password'),
            name: formData.get('name'),
            gender: formData.get('gender'),
            kvkk: formData.get('kvkk')
        };
        
        console.log('📝 Register form data:', userData);
        
        // Validation
        if (!userData.username || !userData.password || !userData.name || !userData.gender) {
            this.showRegisterError('Tüm alanlar doldurulmalıdır');
            return;
        }
        
        if (userData.password.length < 4) {
            this.showRegisterError('Şifre en az 4 karakter olmalıdır');
            return;
        }
        
        if (!userData.kvkk) {
            this.showRegisterError('KVKK Aydınlatma Metni\'ni kabul etmelisiniz');
            return;
        }
        try {
            uiService.showLoading(uiService.elements.registerForm, 'Kullanıcı oluşturuluyor...');
            
            // Kullanıcı adı kontrolü
            const existingUser = await userServiceV2.getUserByUsername(userData.username);
            if (existingUser) {
                throw new Error('Bu kullanıcı adı zaten kullanılıyor');
            }
            
            // Şifreyi hash'le
            const hashedPassword = await hashPassword(userData.password);
            userData.password = hashedPassword;
            
            // Kullanıcı oluştur - Batch operation
            const userId = await userServiceV2.createUser(userData);
            
            this.showRegisterSuccess('Kullanıcı başarıyla oluşturuldu!');
            setTimeout(() => {
                this.hideRegisterPopup();
            }, 1500);
            
        } catch (error) {
            console.error('❌ Register hatası:', error);
            this.showRegisterError(error.message);
        }
    }

    // Logout işlemi
    handleLogout() {
        appState.currentUser = null;
        appState.userStats = null;
        this.deleteCookie('rememberedUser');
        this.showLoginScreen();
        eventManager.clearAll();
        console.log('👋 Kullanıcı çıkış yaptı');
    }

    // Ana içeriği göster
    showMainContent() {
        console.log('🔄 showMainContent çağrıldı');
        console.log('👤 currentUser:', appState.currentUser);
        console.log('📅 currentWeek:', appState.currentWeek);
        
        if (uiService.elements.loginScreen) uiService.elements.loginScreen.style.display = 'none';
        if (uiService.elements.mainContent) uiService.elements.mainContent.style.display = 'block';
        
        if (uiService.elements.currentUsername) {
            uiService.elements.currentUsername.textContent = appState.currentUser.name;
        }
        
        this.updateUserScoreDisplay();
    }

    // Login ekranını göster
    showLoginScreen() {
        if (uiService.elements.loginScreen) uiService.elements.loginScreen.style.display = 'block';
        if (uiService.elements.mainContent) uiService.elements.mainContent.style.display = 'none';
    }

    // Register popup'ını göster
    showRegisterPopup() {
        uiService.showModal('register-overlay');
        this.hideRegisterMessages();
    }

    // Register popup'ını gizle
    hideRegisterPopup() {
        uiService.hideModal('register-overlay');
        uiService.clearForm('register-form');
        this.hideRegisterMessages();
    }

    // Register error mesajını göster
    showRegisterError(message) {
        const errorDiv = document.getElementById('register-error');
        const successDiv = document.getElementById('register-success');
        
        if (errorDiv) {
            errorDiv.textContent = `❌ ${message}`;
            errorDiv.style.display = 'block';
        }
        
        if (successDiv) {
            successDiv.style.display = 'none';
        }
    }

    // Register success mesajını göster
    showRegisterSuccess(message) {
        const errorDiv = document.getElementById('register-error');
        const successDiv = document.getElementById('register-success');
        
        if (successDiv) {
            successDiv.textContent = `✅ ${message}`;
            successDiv.style.display = 'block';
        }
        
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    // Register mesajlarını gizle
    hideRegisterMessages() {
        const errorDiv = document.getElementById('register-error');
        const successDiv = document.getElementById('register-success');
        
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
        
        if (successDiv) {
            successDiv.style.display = 'none';
        }
    }

    // Attempts popup'ını gizle
    hideAttemptsPopup() {
        uiService.hideModal('attempts-overlay');
    }

    // Real-time listener'ları kur - Optimized
    setupRealtimeListeners() {
        console.log('🔄 setupRealtimeListeners çağrıldı');
        console.log('📅 appState.currentWeek:', appState.currentWeek);
        console.log('📅 appState.currentMonth:', appState.currentMonth);
        console.log('👤 appState.currentUser:', appState.currentUser);
        
        // currentWeek boşsa varsayılan değer kullan
        if (!appState.currentWeek) {
            console.log('⚠️ currentWeek boş, varsayılan değer kullanılıyor');
            appState.currentWeek = this.getDefaultWeek();
            console.log('📅 Yeni currentWeek:', appState.currentWeek);
        }
        
        // Rotaları dinle - Tüm rotaları getir (week filtresi olmadan)
        console.log('🔄 Rotalar dinleniyor (tüm rotalar)');
        routeServiceV2.listenToRoutes((routes) => {
            console.log('📋 Rotalar geldi:', routes);
            console.log('📋 Rotalar tipi:', typeof routes);
            console.log('📋 Rotalar array mi:', Array.isArray(routes));
            
            if (Array.isArray(routes)) {
                appState.routes = routes;
                console.log('✅ appState.routes set edildi:', appState.routes.length, 'rota');
                this.displayRoutes();
            } else {
                console.error('❌ Rotalar array değil:', routes);
                appState.routes = [];
                this.displayRoutes();
            }
        }); // week parametresi kaldırıldı

        // Kullanıcı istatistiklerini dinle
        userStatsService.listenToUserStats(appState.currentUser.id, (snapshot) => {
            if (!snapshot.empty) {
                appState.userStats = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
                this.updateUserScoreDisplay();
            }
        });

        // Rota tamamlamalarını dinle
        routeCompletionService.listenToUserCompletions(appState.currentUser.id, (snapshot) => {
            appState.routeCompletions = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            this.updateCheckboxStates();
        });
    }

    // Rotaları göster - Optimized
    displayRoutes() {
        console.log('🎯 displayRoutes çağrıldı');
        console.log('📊 appState.routes:', appState.routes);
        console.log('📊 appState.routes tipi:', typeof appState.routes);
        console.log('📊 appState.routes array mi:', Array.isArray(appState.routes));
        
        // Güvenlik kontrolü
        if (!appState.routes || !Array.isArray(appState.routes)) {
            console.log('⚠️ appState.routes geçersiz, boş array set ediliyor');
            appState.routes = [];
        }
        
        console.log('🎯 Rota sayısı:', appState.routes.length);
        
        if (appState.routes.length === 0) {
            console.log('⚠️ Hiç rota yok, loading gösteriliyor');
            uiService.elements.routesList.innerHTML = '<div class="loading">Henüz rota bulunmuyor.</div>';
            return;
        }

        // Rotaları kategorilere ayır
        const currentWeekRoutes = appState.routes.filter(route => route.week === appState.currentWeek);
        const otherRoutes = appState.routes.filter(route => route.week !== appState.currentWeek);

        uiService.elements.routesList.innerHTML = '';

        // Bu haftanın rotaları
        if (currentWeekRoutes.length > 0) {
            const section = this.createRouteSection('Bu Haftanın Rotaları', currentWeekRoutes);
            uiService.elements.routesList.appendChild(section);
        }

        // Diğer rotalar
        if (otherRoutes.length > 0) {
            const section = this.createRouteSection('Diğer Rotalar', otherRoutes);
            uiService.elements.routesList.appendChild(section);
        }
    }

    // Rota bölümü oluştur
    createRouteSection(title, routes) {
        const section = document.createElement('div');
        section.className = 'route-section';
        
        const sectionTitle = document.createElement('h3');
        sectionTitle.className = 'route-section-title';
        sectionTitle.textContent = title;
        
        const routesContainer = document.createElement('ul');
        routesContainer.className = 'routes-container';
        
        routes.forEach(route => {
            const routeItem = this.createRouteItem(route);
            routesContainer.appendChild(routeItem);
        });
        
        section.appendChild(sectionTitle);
        section.appendChild(routesContainer);
        
        return section;
    }

    // Rota item'ı oluştur - Optimized
    createRouteItem(route) {
        const routeItem = document.createElement('li');
        routeItem.className = 'route-item';
        
        // Checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'route-checkbox';
        checkbox.dataset.routeId = route.id;
        
        // Rota tamamlanma durumunu kontrol et
        const completion = appState.routeCompletions.find(c => c.routeId === route.id);
        const isCompleted = !!completion;
        checkbox.checked = isCompleted;
        
        // Rota bilgileri
        const routeInfo = document.createElement('div');
        routeInfo.className = 'route-info';
        
        const statusText = isCompleted ? 'Çıktım' : 'Çıkmadım';
        const statusClass = isCompleted ? 'route-status completed' : 'route-status';
        console.log('📊 musmafa:', isCompleted);
        const completionDate = isCompleted ? this.formatDate(completion.completedAt) : '❌ Henüz çıkmadı';
        console.log('📊 completionDate:', completionDate);
        routeInfo.innerHTML = `
            ${route.boulderOfWeek ? '<div class="boulder-of-week-badge">⭐ Boulder of the Week</div>' : ''}
            <div class="route-grade">Seviye ${route.grade}</div>
            <div class="route-color">🎨 ${route.color}</div>
            <div class="route-sector">📍 ${route.sector}</div>
            <div class="route-status ${statusClass}">${statusText}</div>
            <div class="route-dates">
                <div class="route-creation">📅 Oluşturuldu: ${this.formatDate(route.createdAt)}</div>
                <div class="route-completion">${completionDate}</div>
            </div>
            ${route.imageUrl ? `<div class="route-image"><img src="${route.imageUrl}" alt="Rota resmi" onerror="this.style.display='none'"></div>` : ''}
        `;
        
        routeItem.appendChild(checkbox);
        routeItem.appendChild(routeInfo);
        
        return routeItem;
    }

    // Rota checkbox değişikliği - Optimized
    handleRouteCheckboxChange(event) {
        console.log('🎯 handleRouteCheckboxChange çağrıldı');
        const routeId = event.target.dataset.routeId;
        const isChecked = event.target.checked;
        
        console.log('📊 Route ID:', routeId);
        console.log('📊 Is Checked:', isChecked);
        
        // Yazıyı hemen güncelle (completion data olmadan)
        console.log('🔄 updateRouteStatusText çağrılıyor:', routeId, isChecked);
        uiService.updateRouteStatusText(routeId, isChecked);
        
        if (isChecked) {
            console.log('✅ Checkbox işaretlendi, popup gösteriliyor');
            this.showAttemptsPopup(routeId);
        } else {
            console.log('❌ Checkbox işareti kaldırıldı, rota tamamlanması geri alınıyor');
            this.updateRouteCompletion(routeId, false);
        }
    }

    // Deneme sayısı popup'ını göster
    showAttemptsPopup(routeId) {
        console.log('🎯 showAttemptsPopup çağrıldı, routeId:', routeId);
        uiService.showModal('attempts-overlay');
        
        // Deneme butonları
        const attemptBtns = document.querySelectorAll('.attempt-btn');
        console.log('📊 Attempt buttons bulundu:', attemptBtns.length);
        
        attemptBtns.forEach((btn, index) => {
            console.log(`📊 Button ${index}:`, btn.dataset.attempts);
            console.log(`📊 Button element:`, btn);
            console.log(`📊 Button clickable:`, btn.offsetParent !== null);
            
            // Önceki event listener'ları temizle
            btn.removeEventListener('click', btn.attemptHandler);
            
            // Yeni event handler oluştur
            btn.attemptHandler = () => {
                const attempts = parseInt(btn.dataset.attempts);
                console.log('🎯 Attempt button tıklandı:', attempts);
                console.log('🎯 Button dataset:', btn.dataset);
                
                const route = appState.routes.find(r => r.id === routeId);
                console.log('📊 Route bulundu:', route);
                
                if (route) {
                    const score = this.calculateScore(parseInt(route.grade), attempts, route.boulderOfWeek);
                    console.log('📊 Score hesaplandı:', score);
                    console.log('🔄 updateRouteCompletion çağrılıyor...');
                    this.updateRouteCompletion(routeId, true, attempts, score);
                } else {
                    console.error('❌ Route bulunamadı:', routeId);
                }
                
                this.hideAttemptsPopup();
            };
            
            // Event listener ekle
            btn.addEventListener('click', btn.attemptHandler);
            console.log(`✅ Event listener eklendi: Button ${index}`);
        });
    }

    // Rota tamamlama güncellemesi - Optimized
    async updateRouteCompletion(routeId, isCompleted, attempts = null, score = 0) {
        try {
            console.log('🔄 updateRouteCompletion çağrıldı:', { routeId, isCompleted, attempts, score });
            
            const route = appState.routes.find(r => r.id === routeId);
            console.log('📊 Route bulundu:', route);
            
            if (!route) {
                console.error('❌ Route bulunamadı:', routeId);
                return;
            }
            
            const isCurrentWeekRoute = route.week === appState.currentWeek;
            console.log('📅 isCurrentWeekRoute:', isCurrentWeekRoute);
            
            if (isCompleted) {
                // Rota tamamlama kaydet
                const completionData = {
                    userId: appState.currentUser.id,
                    routeId: routeId,
                    completedAt: new Date().toISOString(),
                    attempts: attempts,
                    score: score,
                    isCurrentWeek: isCurrentWeekRoute,
                    month: appState.currentMonth,
                    week: appState.currentWeek,
                    isBoulderOfWeek: route.boulderOfWeek || false
                };
                
                console.log('📊 Completion data:', completionData);
                console.log('📊 completedAt timestamp:', completionData.completedAt);
                
                await routeCompletionService.saveRouteCompletion(completionData);
                
                // UI'yi completion data ile güncelle
                uiService.updateRouteStatusText(routeId, true, completionData);
                
                console.log('✅ Rota tamamlama kaydedildi:', routeId);
            } else {
                // Rota tamamlamayı sil
                await routeCompletionService.deleteRouteCompletion(appState.currentUser.id, routeId);
                
                // UI'yi sıfırla
                uiService.updateRouteStatusText(routeId, false);
                
                console.log('✅ Rota tamamlama silindi:', routeId);
            }
            
        } catch (error) {
            console.error('❌ Rota güncelleme hatası:', error);
            uiService.showError('Rota güncellenirken bir hata oluştu.');
        }
    }

    // Checkbox durumlarını güncelle - Optimized
    updateCheckboxStates() {
        console.log('🔄 updateCheckboxStates çağrıldı');
        console.log('📊 appState.routeCompletions:', appState.routeCompletions);
        
        // Completion data'yı routeId ile eşleştir
        const completionMap = {};
        appState.routeCompletions.forEach(completion => {
            completionMap[completion.routeId] = completion;
        });
        
        console.log('📊 Completion map:', completionMap);
        uiService.updateCheckboxStates(completionMap);
    }

    // Puan hesaplama
    calculateScore(grade, attempts, isBoulderOfWeek) {
        let multiplier = 1.0;
        
        if (attempts === 1) {
            multiplier = isBoulderOfWeek ? 1.5 : 1.3;
        } else if (attempts === 2) {
            multiplier = isBoulderOfWeek ? 1.4 : 1.2;
        } else if (attempts === 3) {
            multiplier = isBoulderOfWeek ? 1.3 : 1.1;
        }
        
        return grade * multiplier;
    }

    // Kullanıcı puan gösterimini güncelle - Optimized
    updateUserScoreDisplay() {
        console.log('🔄 updateUserScoreDisplay çağrıldı');
        console.log('📊 appState.userStats:', appState.userStats);
        
        if (appState.userStats) {
            const totalScore = appState.userStats.totalScore || 0;
            const monthlyScore = appState.userStats.monthlyScore || 0;
            
            console.log('📊 Puan detayları:', { 
                totalScore, 
                monthlyScore, 
                score: appState.userStats.score,
                isUndefined: appState.userStats.totalScore === undefined 
            });
            
            if (uiService.elements.userTotalScore) {
                uiService.elements.userTotalScore.textContent = totalScore.toFixed(1);
                console.log('✅ Total score güncellendi:', totalScore.toFixed(1));
            }
            if (uiService.elements.userMonthlyScore) {
                uiService.elements.userMonthlyScore.textContent = monthlyScore.toFixed(1);
                console.log('✅ Monthly score güncellendi:', monthlyScore.toFixed(1));
            }
        } else {
            console.log('❌ appState.userStats yok');
        }
    }

    // Tarih formatla
    formatDate(timestamp) {
        if (!timestamp) return '';
        
        if (timestamp.seconds) {
            return new Date(timestamp.seconds * 1000).toLocaleDateString('tr-TR');
        } else if (typeof timestamp === 'string') {
            return new Date(timestamp).toLocaleDateString('tr-TR');
        } else if (timestamp.toDate) {
            return timestamp.toDate().toLocaleDateString('tr-TR');
        }
        
        return '';
    }

    // Varsayılan hafta
    getDefaultWeek() {
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1));
        const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 7));
        
        const startStr = startOfWeek.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
        const endStr = endOfWeek.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
        
        return `${startStr} - ${endStr}`;
    }

    // Varsayılan ay
    getDefaultMonth() {
        const now = new Date();
        return now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
    }

    // Cookie işlemleri
    setCookie(name, value, days) {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
    }

    getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    deleteCookie(name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
    }

    // Kayıtlı kullanıcıyı kontrol et
    checkSavedUser() {
        const savedUser = this.getCookie('rememberedUser');
        if (savedUser) {
            try {
                const { username, password } = JSON.parse(savedUser);
                this.autoLogin(username, password);
            } catch (error) {
                console.error('❌ Kayıtlı kullanıcı bilgileri okunamadı:', error);
            }
        }
    }

    // Otomatik giriş
    async autoLogin(username, password) {
        try {
            const user = await userServiceV2.getUserByUsername(username);
            
            if (user) {
                // Şifreyi hash'le ve karşılaştır
                const hashedPassword = await hashPassword(password);
                if (user.password === hashedPassword) {
                    const userStats = await userStatsService.getUserStats(user.id);
                    
                    appState.currentUser = user;
                    appState.userStats = userStats;
                    this.showMainContent();
                    this.setupRealtimeListeners();
                    console.log('✅ Otomatik giriş başarılı');
                }
            }
        } catch (error) {
            console.error('❌ Otomatik giriş hatası:', error);
        }
    }
}

// Uygulamayı başlat
document.addEventListener('DOMContentLoaded', () => {
    new JungleLogAppOptimized();
});
