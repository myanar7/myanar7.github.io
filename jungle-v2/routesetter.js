// Database Service Import
import { routeServiceV2, systemServiceV2 } from './services/database-v2.js';

// DOM Elements
const addRouteForm = document.getElementById('add-route-form');
const submitBtn = document.getElementById('submit-btn');
const successMessage = document.getElementById('success-message');
const errorMessage = document.getElementById('error-message');
const routesList = document.getElementById('routes-list');
const confirmationOverlay = document.getElementById('confirmation-overlay');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const cancelDeleteBtn = document.getElementById('cancel-delete');
const confirmationMessage = document.getElementById('confirmation-message');

// Global variables
let routes = [];
let routeToDelete = null;
let currentWeek = '';
let currentMonth = '';
let originalWeek = '';
let originalMonth = '';

// Initialize the routesetter page
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏔️ Routesetter sayfası yüklendi');
    updatePeriodInfo();
    setupFormHandlers();
    setupRealtimeListeners();
    setupDeleteHandlers();
    setupPeriodHandlers();
});

// Hafta ve ay bilgilerini güncelle
async function updatePeriodInfo() {
    try {
        // Database service'ten period bilgilerini al
        const periodData = await systemServiceV2.getSystemInfo();
        
        currentWeek = periodData.week || getDefaultWeek();
        currentMonth = periodData.month || getDefaultMonth();
        console.log('📅 Database service\'ten period bilgileri alındı:', { currentWeek, currentMonth });
        
        // UI'yi güncelle
        const weekInput = document.getElementById('current-week-input');
        const monthInput = document.getElementById('current-month-input');
        
        if (weekInput) {
            weekInput.value = currentWeek;
        }
        
        if (monthInput) {
            monthInput.value = currentMonth;
        }
        
        console.log('📅 Hafta ve ay bilgileri güncellendi:', { currentWeek, currentMonth });
    } catch (error) {
        console.error('❌ Period bilgileri alınırken hata:', error);
        // Hata durumunda varsayılan değerleri kullan
        currentWeek = getDefaultWeek();
        currentMonth = getDefaultMonth();
        
        const weekInput = document.getElementById('current-week-input');
        const monthInput = document.getElementById('current-month-input');
        
        if (weekInput) weekInput.value = currentWeek;
        if (monthInput) monthInput.value = currentMonth;
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

// Google Drive paylaşım URL'lerini görüntülenebilir direkt linke çevir

// Hafta ve ay düzenleme event handler'ları
function setupPeriodHandlers() {
    // Hafta düzenleme
    const editWeekBtn = document.getElementById('edit-week-btn');
    const saveWeekBtn = document.getElementById('save-week-btn');
    const cancelWeekBtn = document.getElementById('cancel-week-btn');
    const weekInput = document.getElementById('current-week-input');
    
    // Ay düzenleme
    const editMonthBtn = document.getElementById('edit-month-btn');
    const saveMonthBtn = document.getElementById('save-month-btn');
    const cancelMonthBtn = document.getElementById('cancel-month-btn');
    const monthInput = document.getElementById('current-month-input');
    
    // Hafta düzenleme
    editWeekBtn.addEventListener('click', () => {
        originalWeek = weekInput.value;
        weekInput.readOnly = false;
        weekInput.focus();
        editWeekBtn.style.display = 'none';
        saveWeekBtn.style.display = 'inline-block';
        cancelWeekBtn.style.display = 'inline-block';
    });
    
    saveWeekBtn.addEventListener('click', async () => {
        const newWeek = weekInput.value.trim();
        if (newWeek && newWeek !== originalWeek) {
            await updatePeriodInDatabase('week', newWeek);
            currentWeek = newWeek;
            weekInput.readOnly = true;
            editWeekBtn.style.display = 'inline-block';
            saveWeekBtn.style.display = 'none';
            cancelWeekBtn.style.display = 'none';
        }
    });
    
    cancelWeekBtn.addEventListener('click', () => {
        weekInput.value = originalWeek;
        weekInput.readOnly = true;
        editWeekBtn.style.display = 'inline-block';
        saveWeekBtn.style.display = 'none';
        cancelWeekBtn.style.display = 'none';
    });
    
    // Ay düzenleme
    editMonthBtn.addEventListener('click', () => {
        originalMonth = monthInput.value;
        monthInput.readOnly = false;
        monthInput.focus();
        editMonthBtn.style.display = 'none';
        saveMonthBtn.style.display = 'inline-block';
        cancelMonthBtn.style.display = 'inline-block';
    });
    
    saveMonthBtn.addEventListener('click', async () => {
        const newMonth = monthInput.value.trim();
        if (newMonth && newMonth !== originalMonth) {
            await updatePeriodInDatabase('month', newMonth);
            currentMonth = newMonth;
            monthInput.readOnly = true;
            editMonthBtn.style.display = 'inline-block';
            saveMonthBtn.style.display = 'none';
            cancelMonthBtn.style.display = 'none';
        }
    });
    
    cancelMonthBtn.addEventListener('click', () => {
        monthInput.value = originalMonth;
        monthInput.readOnly = true;
        editMonthBtn.style.display = 'inline-block';
        saveMonthBtn.style.display = 'none';
        cancelMonthBtn.style.display = 'none';
    });
    
    // Aylık puanları sıfırlama butonu
    const resetMonthlyScoresBtn = document.getElementById('reset-monthly-scores-btn');
    if (resetMonthlyScoresBtn) {
        resetMonthlyScoresBtn.addEventListener('click', async () => {
            if (confirm('⚠️ Tüm kullanıcıların aylık puanları sıfırlanacak ve geçmişe kaydedilecek. Emin misiniz?')) {
                await resetMonthlyScores();
            }
        });
    }
}

// Aylık puanları sıfırla
async function resetMonthlyScores() {
    try {
        console.log('🔄 Aylık puanlar sıfırlanıyor (backend)...');
        const resetBtn = document.getElementById('reset-monthly-scores-btn');
        const originalText = resetBtn.textContent;
        resetBtn.textContent = '⏳ Sıfırlanıyor...';
        resetBtn.disabled = true;

        const adminKey = getCookie('adminKey') || (document.getElementById('admin-key') ? document.getElementById('admin-key').value : null);
        await systemServiceV2.resetMonthlyScores(adminKey);

        alert('✅ Aylık puanlar başarıyla sıfırlandı!');
    } catch (error) {
        console.error('❌ Aylık puanlar sıfırlanırken hata:', error);
        alert('❌ Aylık puanlar sıfırlanırken bir hata oluştu: ' + (error.message || error));
    } finally {
        const resetBtn = document.getElementById('reset-monthly-scores-btn');
        resetBtn.textContent = '🔄 Aylık Puanları Sıfırla';
        resetBtn.disabled = false;
    }
}

// Veritabanında hafta/ay bilgisini güncelle
async function updatePeriodInDatabase(type, value) {
    try {
        console.log(`📅 ${type} bilgisi güncelleniyor:`, value);
        
        // Database service kullanarak güncelle
        const adminKey = getCookie('adminKey') || (document.getElementById('admin-key') ? document.getElementById('admin-key').value : null);
        await systemServiceV2.updatePeriod(type, value, adminKey);
        
        console.log(`✅ ${type} bilgisi başarıyla güncellendi`);
    } catch (error) {
        console.error(`❌ ${type} bilgisi güncellenirken hata:`, error);
        showErrorMessage(`${type} bilgisi güncellenirken hata oluştu`);
    }
}

// Setup form event handlers
function setupFormHandlers() {
    addRouteForm.addEventListener('submit', handleAddRoute);
    console.log('📝 Form event handler kuruldu');
}

// Handle add route form submission
async function handleAddRoute(event) {
    event.preventDefault();
    console.log('🏔️ Rota ekleme işlemi başlatıldı');
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Ekleniyor...';
    hideMessages();
    
    try {
        // Get form data
        const formData = new FormData(addRouteForm);
        const rawImageUrl = formData.get('imageUrl');
        const imageUrl = routeServiceV2.normalizeImageUrl(rawImageUrl);
        const routeData = {
            grade: formData.get('grade'),
            color: formData.get('color'),
            sector: formData.get('sector'),
            imageUrl: imageUrl || null,
            boulderOfWeek: formData.get('boulderOfWeek') === 'on',
            week: currentWeek,
            month: currentMonth,
            createdAt: new Date().toISOString()
        };
        
        const adminKeyInput = document.getElementById('admin-key');
        const adminKey = adminKeyInput ? adminKeyInput.value : null;
        
        console.log('📊 Rota verisi:', routeData);
        
        // Validate form data
        if (!routeData.grade || !routeData.color || !routeData.sector) {
            throw new Error('Lütfen tüm alanları doldurun');
        }
        
        // Add route using database service
        const createdId = await routeServiceV2.createRoute(routeData, adminKey);
        console.log('✅ Rota başarıyla eklendi:', createdId);
        
        // Optimistic UI: yeni rotayı listeye ekle
        const optimisticRoute = {
            id: createdId || Math.random().toString(36).slice(2),
            grade: Number(routeData.grade),
            color: routeData.color,
            sector: routeData.sector,
            week: routeData.week,
            boulderOfWeek: !!routeData.boulderOfWeek,
            imageUrl: routeData.imageUrl,
            isActive: true,
            createdAt: new Date().toISOString()
        };
        routes = [optimisticRoute, ...routes];
        displayRoutes();
        
        // Show success message
        showSuccessMessage();
        
        // Reset form
        addRouteForm.reset();
        
    } catch (error) {
        console.error('❌ Rota ekleme hatası:', error);
        showErrorMessage(error.message || 'Bilinmeyen bir hata oluştu');
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        submitBtn.textContent = '🏔️ Rota Ekle';
    }
}

// Show success message
function showSuccessMessage() {
    successMessage.style.display = 'block';
    errorMessage.style.display = 'none';
    console.log('✅ Başarı mesajı gösterildi');
}

// Show error message
function showErrorMessage(message) {
    errorMessage.textContent = `❌ ${message}`;
    errorMessage.style.display = 'block';
    successMessage.style.display = 'none';
    console.log('❌ Hata mesajı gösterildi:', message);
}

// Hide all messages
function hideMessages() {
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';
}

// Handle form validation
function validateForm() {
    const grade = document.getElementById('grade').value;
    const color = document.getElementById('color').value.trim();
    const sector = document.getElementById('sector').value;
    
    if (!grade || !color || !sector) {
        showErrorMessage('Lütfen tüm alanları doldurun');
        return false;
    }
    
    if (color.length < 2) {
        showErrorMessage('Renk adı en az 2 karakter olmalıdır');
        return false;
    }
    
    return true;
}

// Add real-time form validation
document.addEventListener('DOMContentLoaded', function() {
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('blur', validateForm);
        input.addEventListener('input', hideMessages);
    });

    // Admin key cookie'den yükle ve kaydet butonunu bağla
    const adminKeyInput = document.getElementById('admin-key');
    const saveAdminKeyBtn = document.getElementById('save-admin-key');
    if (adminKeyInput) {
        const savedKey = getCookie('adminKey');
        if (savedKey) {
            adminKeyInput.value = savedKey;
        }
    }
    if (saveAdminKeyBtn) {
        saveAdminKeyBtn.addEventListener('click', () => {
            const key = adminKeyInput ? adminKeyInput.value : '';
            if (!key) {
                alert('Lütfen admin anahtarını girin');
                return;
            }
            setCookie('adminKey', key, 180);
            alert('✅ Admin anahtarı kaydedildi');
        });
    }
});

// Cookie helpers
function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + (days*24*60*60*1000));
    const expires = "expires=" + d.toUTCString();
    document.cookie = name + "=" + encodeURIComponent(value) + ";" + expires + ";path=/";
}

function getCookie(name) {
    const cname = name + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1);
        if (c.indexOf(cname) === 0) return c.substring(cname.length, c.length);
    }
    return "";
}

// Setup real-time listeners for routes
function setupRealtimeListeners() {
    console.log('🔄 Rota dinleyicileri kuruluyor...');
    
    // Database service kullanarak dinleyici kur
    routeServiceV2.listenToRoutes((routesData) => {
        console.log('📊 Rota verisi güncellendi');
        routes = routesData;
        displayRoutes();
    });
}

// Display routes in the list
function displayRoutes() {
    console.log('📋 Rotalar gösteriliyor:', routes.length);
    
    if (routes.length === 0) {
        document.getElementById('current-week-routes').innerHTML = '<div class="no-routes">Bu haftanın rotası yok</div>';
        document.getElementById('other-routes').innerHTML = '<div class="no-routes">Henüz rota eklenmemiş</div>';
        return;
    }
    
    // Bu haftanın rotaları
    const currentWeekRoutes = routes.filter(route => route.week === currentWeek);
    const otherRoutes = routes.filter(route => route.week !== currentWeek);
    
    // Bu haftanın rotalarını göster
    displayRouteSection('current-week-routes', currentWeekRoutes, 'Bu haftanın rotası yok');
    
    // Diğer rotaları göster
    displayRouteSection('other-routes', otherRoutes, 'Henüz rota eklenmemiş');
}

// Rota bölümünü göster
function displayRouteSection(containerId, routes, emptyMessage) {
    const container = document.getElementById(containerId);
    
    if (routes.length === 0) {
        container.innerHTML = `<div class="no-routes">${emptyMessage}</div>`;
        return;
    }
    
    container.innerHTML = routes.map(route => {
        let createdAt = 'Bilinmiyor';
        
        if (route.createdAt) {
            console.log('📅 Rota createdAt:', route.createdAt, 'Type:', typeof route.createdAt);
            
            // Firestore Timestamp objesi kontrolü
            if (route.createdAt.seconds) {
                // Firestore Timestamp objesi
                createdAt = new Date(route.createdAt.seconds * 1000).toLocaleDateString('tr-TR');
                console.log('✅ Firestore Timestamp (seconds):', createdAt);
            } else if (typeof route.createdAt === 'string') {
                // String timestamp
                createdAt = new Date(route.createdAt).toLocaleDateString('tr-TR');
                console.log('✅ String timestamp:', createdAt);
            } else if (route.createdAt.toDate) {
                // Firestore Timestamp objesi (toDate metodu ile)
                createdAt = route.createdAt.toDate().toLocaleDateString('tr-TR');
                console.log('✅ Firestore Timestamp (toDate):', createdAt);
            } else {
                console.log('❌ Bilinmeyen timestamp formatı:', route.createdAt);
            }
        }
            
        const boulderOfWeekBadge = route.boulderOfWeek ? 
            '<div class="boulder-of-week-badge">⭐ Boulder of the Week</div>' : '';
        
        const imageSection = route.imageUrl ? 
            `<div class="route-image">
                <img src="${route.imageUrl}" alt="Rota resmi" onerror="this.style.display='none'">
            </div>` : '';
            
        return `
            <div class="route-item ${route.boulderOfWeek ? 'boulder-of-week' : ''}" data-route-id="${route.id}">
                ${boulderOfWeekBadge}
                <div class="route-header">
                    <div class="route-grade">Seviye ${route.grade}</div>
                    <button class="delete-btn" onclick="showDeleteConfirmation('${route.id}', '${route.color}', '${route.sector}')">
                        🗑️ Sil
                    </button>
                </div>
                <div class="route-details">
                    <div class="route-detail">
                        <span class="route-detail-icon">🎨</span>
                        <span>${route.color}</span>
                    </div>
                    <div class="route-detail">
                        <span class="route-detail-icon">📍</span>
                        <span>${route.sector}</span>
                    </div>
                </div>
                <div class="route-date">
                    📅 Eklenme: ${createdAt}
                </div>
                <div class="route-week">
                    📅 Hafta: ${route.week || 'Bilinmiyor'}
                </div>
                ${imageSection}
            </div>
        `;
    }).join('');
}

// Setup delete confirmation handlers
function setupDeleteHandlers() {
    confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
    cancelDeleteBtn.addEventListener('click', hideDeleteConfirmation);
    confirmationOverlay.addEventListener('click', (e) => {
        if (e.target === confirmationOverlay) {
            hideDeleteConfirmation();
        }
    });
}

// Show delete confirmation dialog
function showDeleteConfirmation(routeId, color, sector) {
    routeToDelete = routeId;
    confirmationMessage.innerHTML = `
        <strong>${color}</strong> rengindeki <strong>${sector}</strong> sektöründeki rotayı silmek istediğinizden emin misiniz?<br>
        Bu işlem geri alınamaz.
    `;
    confirmationOverlay.style.display = 'flex';
    console.log('⚠️ Silme onayı gösteriliyor:', routeId);
}

// Hide delete confirmation dialog
function hideDeleteConfirmation() {
    confirmationOverlay.style.display = 'none';
    routeToDelete = null;
    console.log('❌ Silme onayı iptal edildi');
}

// Handle confirm delete
async function handleConfirmDelete() {
    if (!routeToDelete) return;
    
    console.log('🗑️ Rota siliniyor:', routeToDelete);
    
    try {
        const adminKeyInput = document.getElementById('admin-key');
        const adminKey = adminKeyInput ? adminKeyInput.value : null;
        await routeServiceV2.deleteRoute(routeToDelete, adminKey);
        console.log('✅ Rota başarıyla silindi');
        
        // Optimistic UI: rotayı listeden çıkar
        routes = routes.filter(r => r.id !== routeToDelete);
        displayRoutes();
        showSuccessMessage('Rota başarıyla silindi!');
        hideDeleteConfirmation();
    } catch (error) {
        console.error('❌ Rota silme hatası:', error);
        showErrorMessage('Rota silinirken hata oluştu');
    }
}

// Make showDeleteConfirmation globally available
window.showDeleteConfirmation = showDeleteConfirmation;

console.log('🚀 Routesetter JavaScript yüklendi');
