// Database Service v2 - Backend API Integration
// Backend API base URL
const API_BASE_URL = 'https://boulder-championship-api.onrender.com/api/v1';

// Authentication token management
let authToken = null;

// Set authentication token
export const setAuthToken = (token) => {
    authToken = token;
    console.log('🔐 Auth token set:', token ? 'Token received' : 'Token cleared');
};

// Get authentication token
export const getAuthToken = () => {
    return authToken;
};

// API request helper
const apiRequest = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        }
    };
    
    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
    
    try {
        const response = await fetch(url, finalOptions);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        console.log(`✅ API Response: ${options.method || 'GET'} ${url}`, data);
        return data;
    } catch (error) {
        console.error(`❌ API Error: ${options.method || 'GET'} ${url}`, error);
        throw error;
    }
};

// Error handling wrapper
const handleAPIError = (operation, error) => {
    console.error(`❌ API ${operation} hatası:`, error);
    
    // Internet bağlantısı kontrolü
    if (!navigator.onLine) {
        throw new Error('Internet bağlantısı yok. Lütfen bağlantınızı kontrol edin.');
    }
    
    // API bağlantı hatası
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Backend servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.');
    }
    
    throw new Error(`API ${operation} işlemi başarısız: ${error.message}`);
};

// Cache management
const cache = {
    user: new Map(),
    stats: new Map(),
    routes: new Map(),
    lastUpdated: new Map()
};

// Cache TTL (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// Cache helper functions
const isCacheValid = (key) => {
    const lastUpdate = cache.lastUpdated.get(key);
    return lastUpdate && (Date.now() - lastUpdate) < CACHE_TTL;
};

const setCache = (key, data) => {
    const cacheType = key.split('_')[0];
    if (cache[cacheType]) {
        cache[cacheType].set(key, data);
        cache.lastUpdated.set(key, Date.now());
    }
};

const getCache = (key) => {
    if (isCacheValid(key)) {
        const cacheType = key.split('_')[0];
        if (cache[cacheType]) {
            return cache[cacheType].get(key);
        }
    }
    return null;
};

// Users Service (Backend API)
export const userServiceV2 = {
    // Kullanıcı oluştur
    async createUser(userData) {
        try {
            console.log('📝 createUser çağrıldı, userData:', userData);
            
            // Validation
            if (!userData.username || !userData.password || !userData.name || !userData.gender) {
                throw new Error('Tüm alanlar doldurulmalıdır');
            }
            
            const response = await apiRequest('/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    username: userData.username,
                    password: userData.password,
                    name: userData.name,
                    gender: userData.gender
                })
            });
            
            console.log('✅ Kullanıcı oluşturuldu:', response.data);
            return response.data.user_id || response.data.id;
        } catch (error) {
            handleAPIError('createUser', error);
        }
    },

    // Kullanıcı güncelle
    async updateUser(userId, updateData) {
        try {
            const response = await apiRequest('/user', {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });
            
            console.log('✅ Kullanıcı güncellendi:', userId);
            return response.data;
        } catch (error) {
            handleAPIError('updateUser', error);
        }
    },

    // Kullanıcı bilgilerini al (cached)
    async getUser(userId) {
        try {
            const cached = getCache(`user_${userId}`);
            if (cached) return cached;
            
            const response = await apiRequest('/user');
            const userData = response.data;
            
            setCache(`user_${userId}`, userData);
            return userData;
        } catch (error) {
            handleAPIError('getUser', error);
        }
    },

    // Kullanıcıyı username ile bul (login için)
    async getUserByUsername(username) {
        try {
            console.log('🔍 getUserByUsername çağrıldı, username:', username);
            
            // Backend'de username ile arama endpoint'i yok, login endpoint'ini kullanacağız
            // Bu fonksiyon genellikle login sırasında kullanılır
            throw new Error('getUserByUsername backend API\'de mevcut değil. Login endpoint\'ini kullanın.');
        } catch (error) {
            console.error('❌ getUserByUsername hatası:', error);
            handleAPIError('getUserByUsername', error);
        }
    },

    // Login işlemi
    async login(username, password) {
        try {
            console.log('🔐 Login çağrıldı, username:', username);
            
            const response = await apiRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });
            
            // Token'ı kaydet
            if (response.data.token) {
                setAuthToken(response.data.token);
            }
            
            console.log('✅ Login başarılı:', response.data);
            return response.data;
        } catch (error) {
            handleAPIError('login', error);
        }
    },

    // Real-time listener simulation (polling)
    listenToUser(userId, callback) {
        console.log('🔄 listenToUser başlatıldı (polling mode)');
        
        const pollInterval = setInterval(async () => {
            try {
                const userData = await this.getUser(userId);
                callback({ data: () => ({ id: userId, ...userData }) });
            } catch (error) {
                console.error('❌ User polling hatası:', error);
            }
        }, 5000); // 5 saniyede bir güncelle
        
        // Cleanup function
        return () => {
            clearInterval(pollInterval);
            console.log('🔄 listenToUser durduruldu');
        };
    }
};

// User Statistics Service (Backend API)
export const userStatsService = {
    // Cache invalidation for user stats
    invalidateStatsCache(userId) {
        const key = `stats_${userId}`;
        if (cache.stats) {
            cache.stats.delete(key);
        }
        cache.lastUpdated.delete(key);
        console.log('🧹 Stats cache invalidated for', userId);
    },

    // Tüm kullanıcı istatistiklerini al (leaderboard - public)
    async getAllUserStats() {
        try {
            const response = await apiRequest('/leaderboard/stats');
            const list = response.data || [];
            return list.map(s => ({
                id: s.id,
                userId: s.user_id,
                name: s.name,
                gender: s.gender,
                totalScore: s.total_score || 0,
                monthlyScore: s.monthly_score || 0,
                totalRoutesCompleted: s.total_routes_completed || 0,
                currentWeekCompleted: s.current_week_completed || 0,
                lastUpdated: s.last_updated
            }));
        } catch (error) {
            handleAPIError('getAllUserStats', error);
        }
    },
    // Kullanıcı istatistiklerini al
    async getUserStats(userId) {
        try {
            const cached = getCache(`stats_${userId}`);
            if (cached) return cached;
            
            const response = await apiRequest('/user/stats');
            const backendStats = response.data;
            
            // Backend formatını frontend formatına çevir
            const statsData = {
                id: backendStats.id,
                userId: backendStats.user_id,
                totalScore: backendStats.total_score || 0,
                monthlyScore: backendStats.monthly_score || 0,
                totalRoutesCompleted: backendStats.total_routes_completed || 0,
                currentWeekCompleted: backendStats.current_week_completed || 0,
                lastUpdated: backendStats.last_updated
            };
            
            setCache(`stats_${userId}`, statsData);
            return statsData;
        } catch (error) {
            handleAPIError('getUserStats', error);
        }
    },

    // İstatistikleri güncelle (backend'de otomatik güncelleniyor)
    async updateUserStats(userId, statsUpdate) {
        try {
            console.log('📊 User stats backend tarafından otomatik güncelleniyor');
            // Backend'de user stats otomatik güncelleniyor, manuel güncelleme gerekmiyor
            return true;
        } catch (error) {
            handleAPIError('updateUserStats', error);
        }
    },

    // İstatistikleri dinle (manuel güncelleme)
    listenToUserStats(userId, callback) {
        console.log('🔄 listenToUserStats başlatıldı (manuel mode)');
        
        // İlk veri yükleme
        if (userId === 'all') {
            // Leaderboard için tüm kullanıcılar
            this.refreshAllUserStats(callback);
        } else {
            this.refreshUserStats(userId, callback);
        }
        
        // Cleanup function (artık polling yok)
        return () => {
            console.log('🔄 listenToUserStats durduruldu');
        };
    },

    // User stats'ı manuel olarak yenile
    async refreshUserStats(userId, callback) {
        try {
            const statsData = await this.getUserStats(userId);
            
            // Snapshot benzeri obje oluştur
            const snapshot = {
                docs: [{
                    id: userId,
                    data: () => statsData
                }],
                size: 1,
                empty: false,
                metadata: { fromCache: false }
            };
            
            callback(snapshot);
        } catch (error) {
            console.error('❌ User stats refresh hatası:', error);
        }
    }
    ,

    // Tüm kullanıcı istatistiklerini manuel yenile (leaderboard)
    async refreshAllUserStats(callback) {
        try {
            const statsList = await this.getAllUserStats();
            const docs = statsList.map(s => ({ id: s.id, data: () => s }));
            const snapshot = {
                docs,
                size: docs.length,
                empty: docs.length === 0,
                metadata: { fromCache: false },
                forEach: (fn) => { docs.forEach(doc => fn(doc)); }
            };
            callback(snapshot);
        } catch (error) {
            console.error('❌ All user stats refresh hatası:', error);
        }
    }
};

// Route Completions Service (Backend API)
export const routeCompletionService = {
    // Rota tamamlama kaydet
    async saveRouteCompletion(completionData) {
        try {
            console.log('🔄 saveRouteCompletion çağrıldı:', completionData);
            
            const response = await apiRequest('/routes/complete', {
                method: 'POST',
                body: JSON.stringify({
                    route_id: completionData.routeId,
                    attempts: completionData.attempts,
                    is_boulder_of_week: completionData.isBoulderOfWeek,
                    is_current_week: completionData.isCurrentWeek,
                    month: completionData.month,
                    week: completionData.week
                })
            });
            
            console.log('✅ Rota tamamlama kaydedildi, güncel stats:', response.data.user_stats);
            
            // Backend'den gelen güncel stats bilgisini döndür
            return {
                completion: response.data.completion,
                userStats: response.data.user_stats
            };
        } catch (error) {
            handleAPIError('saveRouteCompletion', error);
        }
    },

    // Rota tamamlamayı sil
    async deleteRouteCompletion(userId, routeId) {
        try {
            const response = await apiRequest(`/routes/${routeId}/complete`, {
                method: 'DELETE'
            });
            
            console.log('✅ Rota tamamlama silindi:', routeId);
            return response.data;
        } catch (error) {
            handleAPIError('deleteRouteCompletion', error);
        }
    },

    // Kullanıcının tamamladığı rotaları al
    async getUserCompletions(userId) {
        try {
            const response = await apiRequest('/routes/completions');
            const backendCompletions = response.data;
            
            // Backend formatını frontend formatına çevir
            const frontendCompletions = backendCompletions.map(completion => ({
                id: completion.id,
                userId: completion.user_id,
                routeId: completion.route_id,
                completedAt: completion.completed_at,
                attempts: completion.attempts,
                score: completion.score,
                isCurrentWeek: completion.is_current_week,
                month: completion.month,
                week: completion.week,
                isBoulderOfWeek: completion.is_boulder_of_week,
                createdAt: completion.created_at
            }));
            
            return frontendCompletions;
        } catch (error) {
            handleAPIError('getUserCompletions', error);
        }
    },

    // Rota tamamlamalarını dinle (manuel güncelleme)
    listenToUserCompletions(userId, callback) {
        console.log('🔄 listenToUserCompletions başlatıldı (manuel mode)');
        
        // İlk veri yükleme
        this.refreshUserCompletions(userId, callback);
        
        // Cleanup function (artık polling yok)
        return () => {
            console.log('🔄 listenToUserCompletions durduruldu');
        };
    },

    // Rota tamamlamalarını manuel olarak yenile
    async refreshUserCompletions(userId, callback) {
        try {
            const completions = await this.getUserCompletions(userId);
            
            // Snapshot benzeri obje oluştur
            const snapshot = {
                docs: completions.map(completion => ({
                    id: completion.id,
                    data: () => completion
                })),
                size: completions.length,
                empty: completions.length === 0,
                metadata: { fromCache: false }
            };
            
            callback(snapshot);
        } catch (error) {
            console.error('❌ Route completions refresh hatası:', error);
        }
    }
};

// Routes Service (Backend API)
export const routeServiceV2 = {
    // Rota oluştur
    async createRoute(routeData, adminKey = null) {
        try {
            console.log('🏔️ Rota ekleme işlemi başlatıldı');
            console.log('📊 Rota verisi:', routeData);
            
            // Validate form data
            if (!routeData.grade || !routeData.color || !routeData.sector) {
                throw new Error('Lütfen tüm alanları doldurun');
            }
            
            const response = await apiRequest('/routes', {
                method: 'POST',
                headers: { 'X-Admin-Key': adminKey },
                body: JSON.stringify({
                    grade: Number(routeData.grade),
                    color: routeData.color,
                    sector: routeData.sector,
                    image_url: routeData.imageUrl,
                    boulder_of_week: routeData.boulderOfWeek,
                    week: routeData.week
                })
            });
            
            console.log('✅ Rota başarıyla eklendi:', response.data);
            return response.data.route_id || response.data.id;
        } catch (error) {
            handleAPIError('createRoute', error);
        }
    },

    // Image URL normalizasyonu
    normalizeImageUrl(url) {
        if (!url) return null;
        try {
            const trimmed = String(url).trim();
            const patterns = [
                /https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
                /https?:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
                /https?:\/\/drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/,
                /https?:\/\/drive\.google\.com\/uc\?export=download&id=([a-zA-Z0-9_-]+)/
            ];
            for (const regex of patterns) {
                const match = trimmed.match(regex);
                if (match && match[1]) {
                    return `https://lh3.googleusercontent.com/d/${match[1]}`;
                }
            }
            return trimmed;
        } catch (e) {
            return url;
        }
    },

    // Aktif rotaları al
    async getActiveRoutes(week = null, limitCount = 50, startAfterDoc = null) {
        try {
            let endpoint = '/routes';
            if (week) {
                endpoint += `?week=${encodeURIComponent(week)}`;
            }
            
            const response = await apiRequest(endpoint);
            const backendRoutes = response.data;
            
            // Backend formatını frontend formatına çevir
            const frontendRoutes = backendRoutes.map(route => ({
                id: route.id,
                grade: route.grade,
                color: route.color,
                sector: route.sector,
                week: route.week,
                boulderOfWeek: route.boulder_of_week,
                imageUrl: route.image_url,
                isActive: route.is_active,
                createdAt: route.created_at
            }));
            
            return frontendRoutes;
        } catch (error) {
            handleAPIError('getActiveRoutes', error);
        }
    },

    // Rotaları dinle (manuel güncelleme)
    listenToRoutes(callback, week = null) {
        console.log('🔄 listenToRoutes başlatıldı (manuel mode)');
        
        // İlk veri yükleme
        this.refreshRoutes(callback, week);
        
        // Cleanup function (artık polling yok)
        return () => {
            console.log('🔄 listenToRoutes durduruldu');
        };
    },

    // Rotaları manuel olarak yenile
    async refreshRoutes(callback, week = null) {
        try {
            const routes = await this.getActiveRoutes(week);
            
            console.log('📋 Routes refresh:', routes.length, 'routes');
            callback(routes);
        } catch (error) {
            console.error('❌ Routes refresh hatası:', error);
        }
    },

    // Rota sil
    async deleteRoute(routeId, adminKey = null) {
        try {
            console.log('🗑️ Rota siliniyor:', routeId);
            
            const response = await apiRequest(`/routes/${routeId}`, {
                method: 'DELETE',
                headers: { 'X-Admin-Key': adminKey }
            });
            
            console.log('✅ Rota başarıyla silindi');
            return response.data;
        } catch (error) {
            handleAPIError('deleteRoute', error);
        }
    },

    // Rota sil (soft delete - eski versiyon)
    async softDeleteRoute(routeId) {
        try {
            // Backend'de soft delete yok, hard delete kullanıyoruz
            return await this.deleteRoute(routeId);
        } catch (error) {
            handleAPIError('softDeleteRoute', error);
        }
    }
};

// System Service (Backend API)
export const systemServiceV2 = {
    async getSystemInfo() {
        try {
            const response = await apiRequest('/system');
            return response.data;
        } catch (error) {
            handleAPIError('getSystemInfo', error);
        }
    },

    async updateSystemInfo(updateData, adminKey = null) {
        try {
            const response = await apiRequest('/system', {
                method: 'PUT',
                headers: { 'X-Admin-Key': adminKey },
                body: JSON.stringify(updateData)
            });
            
            console.log('✅ Sistem bilgileri güncellendi');
            return response.data;
        } catch (error) {
            handleAPIError('updateSystemInfo', error);
        }
    },

    // Hafta veya ay bilgisini güncelle
    async updatePeriod(type, value, adminKey = null) {
        try {
            const updateData = {};
            updateData[type] = value;
            
            await this.updateSystemInfo(updateData, adminKey);
            console.log(`✅ ${type} bilgisi başarıyla güncellendi`);
        } catch (error) {
            handleAPIError('updatePeriod', error);
        }
    },

    // Aylık puanları sıfırla
    async resetMonthlyScores(adminKey = null) {
        try {
            console.log('🔄 Aylık puanlar sıfırlanıyor...');
            
            const response = await apiRequest('/system/reset-monthly', {
                method: 'POST',
                headers: { 'X-Admin-Key': adminKey }
            });
            
            console.log('✅ Aylık puanlar sıfırlandı');
            return response.data;
        } catch (error) {
            handleAPIError('resetMonthlyScores', error);
        }
    },

    // Geçmiş aylık verileri getir
    async getMonthlyHistory() {
        try {
            const response = await apiRequest('/system/history');
            
            console.log('📊 Geçmiş aylık veriler getirildi:', response.data.length, 'ay');
            return response.data;
        } catch (error) {
            handleAPIError('getMonthlyHistory', error);
        }
    }
};

// Utility Functions
function getDefaultWeek() {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1));
    const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 7));
    
    const startStr = startOfWeek.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
    const endStr = endOfWeek.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
    
    return `${startStr} - ${endStr}`;
}

function getDefaultMonth() {
    const now = new Date();
    return now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
}

// Health check
export const checkAPIHealth = async () => {
    try {
        const response = await fetch(`${API_BASE_URL.replace('/api/v1', '')}/health`);
        const data = await response.json();
        console.log('🏥 API Health check:', data);
        return response.ok;
    } catch (error) {
        console.error('❌ API Health check failed:', error);
        return false;
    }
};

console.log('🚀 Database Service v2 (Backend API) yüklendi');