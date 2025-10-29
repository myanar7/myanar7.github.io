// Database Service Import
import { userServiceV2, userStatsService, routeServiceV2, systemServiceV2 } from './services/database-v2.js';

// Global değişkenler
let users = [];
let routes = [];

// DOM elementleri
const maleLeaderboard = document.getElementById('male-leaderboard');
const femaleLeaderboard = document.getElementById('female-leaderboard');
const totalParticipants = document.getElementById('total-participants');
const totalAttempts = document.getElementById('total-attempts');
const currentMonth = document.getElementById('current-month');

// Geçmiş aylar elementleri
const viewHistoryBtn = document.getElementById('view-history-btn');
const historyOverlay = document.getElementById('history-overlay');
const closeHistoryBtn = document.getElementById('close-history-btn');
const historyList = document.getElementById('history-list');

// Sayfa yüklendiğinde çalışacak fonksiyonlar
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🏆 Puan tablosu yükleniyor...');
    console.log('🔧 Database bağlantısı kontrol ediliyor...');
    
    setupRealtimeListeners();
    await updateCurrentMonth();
    setupHistoryListeners();
});

// Real-time dinleyicileri ayarla
function setupRealtimeListeners() {
    console.log('🔊 Real-time dinleyiciler başlatılıyor...');
    
    // Kullanıcıları dinle - database service kullanarak
    userStatsService.listenToUserStats('all', (snapshot) => {
        console.log('👥 Kullanıcılar güncellendi:', snapshot.size);
        console.log('📊 Snapshot metadata:', snapshot.metadata);
        users = [];
        snapshot.forEach(doc => {
            const userData = {
                id: doc.id,
                ...doc.data()
            };
            console.log('👤 Kullanıcı verisi:', userData);
            console.log('🏆 Kullanıcı puanları:', {
                totalScore: userData.totalScore,
                monthlyScore: userData.monthlyScore,
                name: userData.name,
                gender: userData.gender
            });
            users.push(userData);
        });
        console.log('👥 Toplam kullanıcı sayısı:', users.length);
        updateLeaderboard();
        updateStats();
    });
    
    // Rotaları dinle - database service kullanarak
    routeServiceV2.listenToRoutes((routesData) => {
        console.log('🏔️ Rotalar güncellendi:', routesData.length);
        routes = routesData;
        updateStats();
    });
}

// Puan tablosunu güncelle
async function updateLeaderboard() {
    console.log('🏆 Puan tablosu güncelleniyor...');
    console.log('👥 Toplam user stats sayısı:', users.length);
    
    // Leaderboard stats endpointi zaten isim içeriyor; ekstra user çağrısı yapma
    const enrichedUsers = users.map(u => ({
        ...u,
        // name zaten backend'den geliyor; yine de fallback olarak boş string kullan
        name: u.name || '',
        // gender yoksa undefined kalsın; filtrede zaten ele alınacak
        gender: u.gender
    }));
    
    console.log('👥 Zenginleştirilmiş kullanıcılar:', enrichedUsers.length);
    
    // Erkekleri sırala
    const maleUsers = enrichedUsers
        .filter(user => user.gender === 'erkek')
        .sort((a, b) => (b.monthlyScore || 0) - (a.monthlyScore || 0));
    
    // Kadınları sırala
    const femaleUsers = enrichedUsers
        .filter(user => user.gender === 'kadın')
        .sort((a, b) => (b.monthlyScore || 0) - (a.monthlyScore || 0));
    
    // Debug: Kullanıcı puanlarını kontrol et
    console.log('🔍 Erkek kullanıcı puanları:');
    maleUsers.forEach(user => {
        console.log(`👨 ${user.name}: totalScore=${user.totalScore}, monthlyScore=${user.monthlyScore}`);
    });
    
    console.log('🔍 Kadın kullanıcı puanları:');
    femaleUsers.forEach(user => {
        console.log(`👩 ${user.name}: totalScore=${user.totalScore}, monthlyScore=${user.monthlyScore}`);
    });
    
    console.log('👨 Erkek kullanıcılar:', maleUsers.length);
    console.log('👩 Kadın kullanıcılar:', femaleUsers.length);
    
    // Erkek kullanıcıları detaylı log
    maleUsers.forEach((user, index) => {
        console.log(`👨 ${index + 1}. ${user.name}: ${user.monthlyScore || 0} puan`);
    });
    
    // Kadın kullanıcıları detaylı log
    femaleUsers.forEach((user, index) => {
        console.log(`👩 ${index + 1}. ${user.name}: ${user.monthlyScore || 0} puan`);
    });
    
    // Erkekler tablosunu güncelle
    updateLeaderboardSection(maleLeaderboard, maleUsers);
    
    // Kadınlar tablosunu güncelle
    updateLeaderboardSection(femaleLeaderboard, femaleUsers);
}

// Puan tablosu bölümünü güncelle
function updateLeaderboardSection(container, users) {
    console.log('📊 Leaderboard bölümü güncelleniyor:', users.length, 'kullanıcı');
    
    if (users.length === 0) {
        console.log('⚠️ Kullanıcı verisi yok');
        container.innerHTML = `
            <li class="empty-state">
                <h3>📝 Henüz katılımcı yok</h3>
                <p>İlk rotaları çıkararak başlayın!</p>
            </li>
        `;
        return;
    }
    
    // Her kullanıcı için detaylı log
    users.forEach((user, index) => {
        console.log(`👤 ${index + 1}. ${user.name}:`, {
            monthlyScore: user.monthlyScore,
            totalScore: user.totalScore,
            gender: user.gender,
            id: user.id
        });
    });
    
    container.innerHTML = users.map((user, index) => {
        const rank = index + 1;
        const score = user.monthlyScore || 0;
        
        let rankClass = '';
        if (rank === 1) rankClass = 'first';
        else if (rank === 2) rankClass = 'second';
        else if (rank === 3) rankClass = 'third';
        
        console.log(`🏆 ${rank}. ${user.name}: ${score} puan`);
        console.log(`🏆 ${rank}. ${user.name}: ${score.toFixed(1)} puan (formatlanmış)`);
        console.log(`🔍 ${user.name} puan detayları:`, {
            monthlyScore: user.monthlyScore,
            totalScore: user.totalScore,
            score: score,
            isUndefined: user.monthlyScore === undefined
        });
        
        return `
            <li class="leaderboard-item">
                <div class="rank ${rankClass}">${rank}</div>
                <div class="user-info">
                    <div class="user-name">${user.name}</div>
                    <div class="user-score">Bu ay: ${score.toFixed(1)} puan</div>
                </div>
                <div class="score-badge">${score.toFixed(1)}</div>
            </li>
        `;
    }).join('');
}

// İstatistikleri güncelle
function updateStats() {
    console.log('📊 İstatistikler güncelleniyor...');
    console.log('👥 Kullanıcılar:', users.length);
    console.log('🏔️ Rotalar:', routes.length);
    
    // Toplam katılımcı
    totalParticipants.textContent = users.length;
    console.log('👥 Toplam katılımcı:', users.length);
    
    console.log('✅ İstatistikler güncellendi');
}

// Mevcut ayı güncelle
async function updateCurrentMonth() {
    try {
        console.log('📅 Mevcut ay veritabanından yükleniyor...');
        
        // Database service kullanarak system bilgilerini al
        const systemInfo = await systemServiceV2.getSystemInfo();
        const monthText = systemInfo.month || 'Bilinmeyen Ay';
        
        currentMonth.textContent = monthText;
        console.log('✅ Ay bilgisi güncellendi:', monthText);
        
    } catch (error) {
        console.error('❌ Ay bilgisi yüklenirken hata:', error);
        // Hata durumunda fallback
        const now = new Date();
        const monthNames = [
            'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
        ];
        const currentMonthName = monthNames[now.getMonth()];
        const currentYear = now.getFullYear();
        currentMonth.textContent = `${currentMonthName} ${currentYear}`;
    }
}






// Geçmiş aylar event listener'ları
function setupHistoryListeners() {
    if (viewHistoryBtn) {
        viewHistoryBtn.addEventListener('click', showHistoryPopup);
    }
    
    if (closeHistoryBtn) {
        closeHistoryBtn.addEventListener('click', hideHistoryPopup);
    }
    
    if (historyOverlay) {
        historyOverlay.addEventListener('click', (e) => {
            if (e.target === historyOverlay) {
                hideHistoryPopup();
            }
        });
    }
}

// Geçmiş aylar popup'ını göster
async function showHistoryPopup() {
    console.log('📅 Geçmiş aylar popup\'ı açılıyor...');
    historyOverlay.style.display = 'flex';
    
    try {
        await loadMonthlyHistory();
    } catch (error) {
        console.error('❌ Geçmiş aylar yüklenirken hata:', error);
        historyList.innerHTML = '<div class="error">❌ Geçmiş aylar yüklenemedi</div>';
    }
}

// Geçmiş aylar popup'ını gizle
function hideHistoryPopup() {
    historyOverlay.style.display = 'none';
}

// Aylık geçmiş verilerini yükle
async function loadMonthlyHistory() {
    console.log('📅 Aylık geçmiş verileri yükleniyor...');
    
    try {
        // Database service kullanarak geçmiş verileri al
        const historyData = await systemServiceV2.getMonthlyHistory();
        
        if (!historyData || historyData.length === 0) {
            historyList.innerHTML = '<div class="no-data">📅 Henüz geçmiş ay verisi bulunmuyor</div>';
            return;
        }
        
        console.log('📊 Geçmiş aylar yüklendi:', historyData.length, 'ay');
        displayHistoryList(historyData);
        
    } catch (error) {
        console.error('❌ Geçmiş aylar yüklenirken hata:', error);
        throw error;
    }
}

// Geçmiş aylar listesini göster
function displayHistoryList(historyData) {
    historyList.innerHTML = '';
    
    historyData.forEach(historyItem => {
        const historyElement = createHistoryElement(historyItem);
        historyList.appendChild(historyElement);
    });
}

// Geçmiş ay elementini oluştur
function createHistoryElement(historyItem) {
    const historyElement = document.createElement('div');
    historyElement.className = 'history-item';
    
    // Ay bilgisi
    const monthElement = document.createElement('div');
    monthElement.className = 'history-month';
    monthElement.textContent = `📅 ${historyItem.month}`;
    
    // İstatistikler
    const statsElement = document.createElement('div');
    statsElement.className = 'history-stats';
    
    const userStats = historyItem.userStats || {};
    const totalUsers = Object.keys(userStats).length;
    const totalMonthlyScore = Object.values(userStats).reduce((sum, user) => sum + (user.monthlyScore || 0), 0);
    
    statsElement.innerHTML = `
        <div class="history-stat">
            <div class="history-stat-value">${totalUsers}</div>
            <div class="history-stat-label">Katılımcı</div>
        </div>
        <div class="history-stat">
            <div class="history-stat-value">${totalMonthlyScore.toFixed(1)}</div>
            <div class="history-stat-label">Toplam Puan</div>
        </div>
    `;
    
    historyElement.appendChild(monthElement);
    historyElement.appendChild(statsElement);
    
    // Tıklama olayı - detayları göster
    historyElement.addEventListener('click', () => {
        showHistoryDetails(historyItem);
    });
    
    return historyElement;
}

// Geçmiş ay detaylarını göster
function showHistoryDetails(historyItem) {
    console.log('📊 Geçmiş ay detayları gösteriliyor:', historyItem.month);
    
    // Kullanıcıları cinsiyete göre ayır
    const userStats = historyItem.userStats || {};
    const allUsers = Object.entries(userStats)
        .map(([userId, stats]) => ({ userId, ...stats }));
    
    // Erkek ve kadınları ayır
    const maleUsers = allUsers.filter(user => user.gender === 'erkek' || user.gender === 'male' || !user.gender);
    const femaleUsers = allUsers.filter(user => user.gender === 'kadın' || user.gender === 'female');
    
    // Her grubu puanlarına göre sırala
    const sortedMaleUsers = maleUsers.sort((a, b) => (b.monthlyScore || 0) - (a.monthlyScore || 0));
    const sortedFemaleUsers = femaleUsers.sort((a, b) => (b.monthlyScore || 0) - (a.monthlyScore || 0));
    
    // Detay popup'ı oluştur
    const detailPopup = document.createElement('div');
    detailPopup.className = 'overlay';
    detailPopup.style.display = 'flex';
    detailPopup.innerHTML = `
        <div class="history-popup">
            <div class="popup-header">
                <h2>📅 ${historyItem.month} - Detaylar</h2>
                <button class="close-btn" onclick="this.parentElement.parentElement.parentElement.remove()">✕</button>
            </div>
            <div class="history-content">
                <div class="leaderboard-container">
                    <div class="leaderboard-section">
                        <h3 class="section-title male">👨 Erkekler</h3>
                        <ul class="leaderboard-list">
                            ${sortedMaleUsers.map((user, index) => `
                                <li class="leaderboard-item">
                                    <div class="rank">${index + 1}</div>
                                    <div class="user-info">
                                        <div class="name">${user.name || 'Bilinmeyen'}</div>
                                        <div class="score">${(user.monthlyScore || 0).toFixed(1)} puan</div>
                                    </div>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    
                    <div class="leaderboard-section">
                        <h3 class="section-title female">👩 Kadınlar</h3>
                        <ul class="leaderboard-list">
                            ${sortedFemaleUsers.map((user, index) => `
                                <li class="leaderboard-item">
                                    <div class="rank">${index + 1}</div>
                                    <div class="user-info">
                                        <div class="name">${user.name || 'Bilinmeyen'}</div>
                                        <div class="score">${(user.monthlyScore || 0).toFixed(1)} puan</div>
                                    </div>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(detailPopup);
    
    // Overlay tıklama olayı
    detailPopup.addEventListener('click', (e) => {
        if (e.target === detailPopup) {
            detailPopup.remove();
        }
    });
}
