// Database Service v2 - Optimized Structure
import { 
    collection, 
    addDoc, 
    onSnapshot, 
    updateDoc, 
    doc, 
    orderBy, 
    query, 
    serverTimestamp, 
    arrayUnion, 
    arrayRemove, 
    deleteField, 
    getDocs, 
    where, 
    getDoc,
    writeBatch,
    increment,
    startAfter,
    limit
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { db, checkConnection } from '../config/firebase.js';

// Error handling wrapper
const handleDatabaseError = (operation, error) => {
    console.error(`❌ Database ${operation} hatası:`, error);
    
    // Internet bağlantısı kontrolü
    if (!checkConnection()) {
        throw new Error('Internet bağlantısı yok. Lütfen bağlantınızı kontrol edin.');
    }
    
    // Firestore bağlantı hatası
    if (error.code === 'unavailable') {
        throw new Error('Firestore servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.');
    }
    
    throw new Error(`Database ${operation} işlemi başarısız: ${error.message}`);
};

// Cache management
const cache = {
    routes: new Map(),
    userStats: new Map(),
    lastUpdated: new Map()
};

// Cache TTL (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// Retry configuration
const RETRY_CONFIG = {
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    backoffMultiplier: 2
};

// Retry helper function
const retryOperation = async (operation, operationName, retries = RETRY_CONFIG.maxRetries) => {
    try {
        return await operation();
    } catch (error) {
        if (retries > 0 && (error.code === 'unavailable' || error.message.includes('INTERNET_DISCONNECTED'))) {
            console.log(`🔄 ${operationName} başarısız, ${retries} deneme kaldı. ${RETRY_CONFIG.retryDelay}ms sonra tekrar denenecek...`);
            
            await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.retryDelay));
            RETRY_CONFIG.retryDelay *= RETRY_CONFIG.backoffMultiplier;
            
            return retryOperation(operation, operationName, retries - 1);
        }
        throw error;
    }
};

// Retry delay'i sıfırla
const resetRetryDelay = () => {
    RETRY_CONFIG.retryDelay = 1000;
};

// Cache helper functions
const isCacheValid = (key) => {
    const lastUpdate = cache.lastUpdated.get(key);
    return lastUpdate && (Date.now() - lastUpdate) < CACHE_TTL;
};

const setCache = (key, data) => {
    cache.routes.set(key, data);
    cache.lastUpdated.set(key, Date.now());
};

const getCache = (key) => {
    if (isCacheValid(key)) {
        return cache.routes.get(key);
    }
    return null;
};

// Users Collection Operations (Optimized)
export const userServiceV2 = {
    // Kullanıcı oluştur (normalized structure)
    async createUser(userData) {
        try {
            console.log('📝 createUser çağrıldı, userData:', userData);
            
            // Validation
            if (!userData.username || !userData.password || !userData.name || !userData.gender) {
                throw new Error('Tüm alanlar doldurulmalıdır');
            }
            
            const batch = writeBatch(db);
            
            // User document
            const userRef = doc(collection(db, 'users'));
            const userDoc = {
                username: userData.username,
                password: userData.password, // TODO: Hash this
                name: userData.name,
                gender: userData.gender,
                createdAt: serverTimestamp(),
                lastLoginAt: serverTimestamp()
            };
            
            console.log('📝 User document oluşturuluyor:', userDoc);
            batch.set(userRef, userDoc);
            
            await batch.commit();
            console.log('✅ Kullanıcı ve istatistikleri oluşturuldu:', userRef.id);
            return userRef.id;
        } catch (error) {
            handleDatabaseError('createUser', error);
        }
    },

    // Kullanıcı güncelle (sadece temel bilgiler)
    async updateUser(userId, updateData) {
        try {
            await updateDoc(doc(db, 'users', userId), {
                ...updateData,
                lastLoginAt: serverTimestamp()
            });
            console.log('✅ Kullanıcı güncellendi:', userId);
        } catch (error) {
            handleDatabaseError('updateUser', error);
        }
    },

    // Kullanıcı bilgilerini al (cached)
    async getUser(userId) {
        try {
            const cached = getCache(`user_${userId}`);
            if (cached) return cached;
            
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                const userData = { id: userDoc.id, ...userDoc.data() };
                setCache(`user_${userId}`, userData);
                return userData;
            }
            return null;
        } catch (error) {
            handleDatabaseError('getUser', error);
        }
    },

    // Kullanıcıyı username ile bul
    async getUserByUsername(username) {
        try {
            console.log('🔍 getUserByUsername çağrıldı, username:', username);
            
            const q = query(collection(db, 'users'), where('username', '==', username));
            console.log('📊 Query oluşturuldu, Firestore\'a gidiliyor...');
            
            const snapshot = await getDocs(q);
            console.log('📋 Snapshot geldi, document sayısı:', snapshot.docs.length);
            
            if (snapshot.empty) {
                console.log('❌ Kullanıcı bulunamadı');
                return null;
            }
            
            const userDoc = snapshot.docs[0];
            const userData = { id: userDoc.id, ...userDoc.data() };
            console.log('✅ Kullanıcı bulundu:', userData);
            return userData;
        } catch (error) {
            console.error('❌ getUserByUsername hatası:', error);
            handleDatabaseError('getUserByUsername', error);
        }
    },

    // Kullanıcı dinle (optimized)
    listenToUser(userId, callback) {
        return onSnapshot(doc(db, 'users', userId), callback, (error) => {
            handleDatabaseError('listenToUser', error);
        });
    }
};

// User Statistics Service
export const userStatsService = {
    // Kullanıcı istatistiklerini al
    async getUserStats(userId) {
        try {
            const batch = writeBatch(db);
            const cached = getCache(`stats_${userId}`);
            if (cached) return cached;
            
            const q = query(collection(db, 'userStats'), where('userId', '==', userId));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                console.log('❌ Kullanıcı istatistikleri bulunamadı, yeni istatistik oluşturuluyor...');
                // İlk kez istatistik oluştur
                const statsRef = doc(db, 'userStats', userId);
                const statsData = {
                    userId: userId,
                    totalScore: 0,
                    monthlyScore: 0,
                    totalRoutesCompleted: 0,
                    currentWeekCompleted: 0,
                    lastUpdated: serverTimestamp()
                };
                batch.set(statsRef, statsData, { merge: true });
                batch.commit();
                setCache(`stats_${userId}`, statsData);
                return statsData;
            }
            
            const statsData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
            setCache(`stats_${userId}`, statsData);
            return statsData;
        } catch (error) {
            handleDatabaseError('getUserStats', error);
        }
    },

    // İstatistikleri güncelle (batch operation)
    async updateUserStats(userId, statsUpdate) {
        try {
            const q = query(collection(db, 'userStats'), where('userId', '==', userId));
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                const statsDoc = snapshot.docs[0];
                await updateDoc(doc(db, 'userStats', statsDoc.id), {
                    ...statsUpdate,
                    lastUpdated: serverTimestamp()
                });
                
                // Cache'i temizle
                cache.userStats.delete(`stats_${userId}`);
                console.log('✅ Kullanıcı istatistikleri güncellendi:', userId);
            }
        } catch (error) {
            handleDatabaseError('updateUserStats', error);
        }
    },

    // İstatistikleri dinle
    listenToUserStats(userId, callback) {
        console.log('🔄 listenToUserStats çağrıldı, userId:', userId);
        const q = query(collection(db, 'userStats'), where('userId', '==', userId));
        
        return onSnapshot(q, (snapshot) => {
            console.log('📊 User stats snapshot geldi:', snapshot);
            console.log('📊 Snapshot docs sayısı:', snapshot.docs.length);
            
            if (!snapshot.empty) {
                const userStats = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
                console.log('📊 User stats data:', userStats);
                callback(snapshot);
            } else {
                console.log('❌ User stats bulunamadı');
                callback(snapshot);
            }
        }, (error) => {
            handleDatabaseError('listenToUserStats', error);
        });
    }
};

// Route Completions Service (New Collection)
export const routeCompletionService = {
    // Rota tamamlama kaydet
    async saveRouteCompletion(completionData) {
        try {
            console.log('🔄 saveRouteCompletion çağrıldı:', completionData);
            
            const batch = writeBatch(db);
            
            // Route completion document
            const completionRef = doc(collection(db, 'routeCompletions'));
            const docData = {
                userId: completionData.userId,
                routeId: completionData.routeId,
                completedAt: completionData.completedAt || serverTimestamp(),
                attempts: completionData.attempts,
                score: completionData.score,
                isCurrentWeek: completionData.isCurrentWeek,
                month: completionData.month,
                week: completionData.week,
                isBoulderOfWeek: completionData.isBoulderOfWeek,
                createdAt: serverTimestamp()
            };
            
            console.log('📊 Document data oluşturuldu:', docData);
            batch.set(completionRef, docData);
            
            // User stats güncelle - Mevcut document'ı kontrol et
            const statsRef = doc(db, 'userStats', completionData.userId);
            
            // Mevcut stats'ı al
            const currentStats = await getDoc(statsRef);
            let currentTotalScore = 0;
            let currentMonthlyScore = 0;
            let currentTotalRoutes = 0;
            let currentWeekRoutes = 0;
            
            if (currentStats.exists()) {
                const data = currentStats.data();
                currentTotalScore = data.totalScore || 0;
                currentMonthlyScore = data.monthlyScore || 0;
                currentTotalRoutes = data.totalRoutesCompleted || 0;
                currentWeekRoutes = data.currentWeekCompleted || 0;
            }
            
            const statsUpdate = {
                userId: completionData.userId,
                totalScore: currentTotalScore + completionData.score,
                totalRoutesCompleted: currentTotalRoutes + 1,
                lastUpdated: serverTimestamp()
            };
            
            if (completionData.isCurrentWeek) {
                statsUpdate.monthlyScore = currentMonthlyScore + completionData.score;
                statsUpdate.currentWeekCompleted = currentWeekRoutes + 1;
            }
            
            console.log('📊 Mevcut stats:', { currentTotalScore, currentMonthlyScore, currentTotalRoutes, currentWeekRoutes });
            console.log('📊 Yeni stats:', statsUpdate);
            batch.set(statsRef, statsUpdate, { merge: true });
            
            await batch.commit();
            console.log('✅ Rota tamamlama kaydedildi:', completionRef.id);
            
            // Güncellenmiş user stats'ı kontrol et
            const updatedStats = await getDoc(statsRef);
            if (updatedStats.exists()) {
                console.log('📊 Güncellenmiş user stats:', updatedStats.data());
            }
            
            return completionRef.id;
        } catch (error) {
            handleDatabaseError('saveRouteCompletion', error);
        }
    },

    // Rota tamamlamayı sil
    async deleteRouteCompletion(userId, routeId) {
        try {
            const batch = writeBatch(db);
            
            // Route completion'ı bul ve sil
            const q = query(
                collection(db, 'routeCompletions'),
                where('userId', '==', userId),
                where('routeId', '==', routeId)
            );
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                const completionDoc = snapshot.docs[0];
                const completionData = completionDoc.data();
                
                // Completion'ı sil
                batch.delete(doc(db, 'routeCompletions', completionDoc.id));
                
                // User stats güncelle - Mevcut document'ı kontrol et
                const statsRef = doc(db, 'userStats', userId);
                
                // Mevcut stats'ı al
                const currentStats = await getDoc(statsRef);
                let currentTotalScore = 0;
                let currentMonthlyScore = 0;
                let currentTotalRoutes = 0;
                let currentWeekRoutes = 0;
                
                if (currentStats.exists()) {
                    const data = currentStats.data();
                    currentTotalScore = data.totalScore || 0;
                    currentMonthlyScore = data.monthlyScore || 0;
                    currentTotalRoutes = data.totalRoutesCompleted || 0;
                    currentWeekRoutes = data.currentWeekCompleted || 0;
                }
                
                const statsUpdate = {
                    userId: userId,
                    totalScore: Math.max(0, currentTotalScore - completionData.score),
                    totalRoutesCompleted: Math.max(0, currentTotalRoutes - 1),
                    lastUpdated: serverTimestamp()
                };
                
                if (completionData.isCurrentWeek) {
                    statsUpdate.monthlyScore = Math.max(0, currentMonthlyScore - completionData.score);
                    statsUpdate.currentWeekCompleted = Math.max(0, currentWeekRoutes - 1);
                }
                
                console.log('📊 Mevcut stats:', { currentTotalScore, currentMonthlyScore, currentTotalRoutes, currentWeekRoutes });
                console.log('📊 Geri alınan stats:', statsUpdate);
                batch.set(statsRef, statsUpdate, { merge: true });
                
                await batch.commit();
                console.log('✅ Rota tamamlama silindi:', routeId);
            }
        } catch (error) {
            handleDatabaseError('deleteRouteCompletion', error);
        }
    },

    // Kullanıcının tamamladığı rotaları al
    async getUserCompletions(userId) {
        try {
            const q = query(
                collection(db, 'routeCompletions'),
                where('userId', '==', userId),
                orderBy('completedAt', 'desc')
            );
            const snapshot = await getDocs(q);
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            handleDatabaseError('getUserCompletions', error);
        }
    },

    // Rota tamamlamalarını dinle
    listenToUserCompletions(userId, callback) {
        const q = query(
            collection(db, 'routeCompletions'),
            where('userId', '==', userId),
            orderBy('completedAt', 'desc')
        );
        return onSnapshot(q, callback, (error) => {
            handleDatabaseError('listenToUserCompletions', error);
        });
    }
};

// Routes Service (Optimized)
export const routeServiceV2 = {
    // Rota oluştur
    async createRoute(routeData) {
        try {
            const docRef = await addDoc(collection(db, 'routes'), {
                ...routeData,
                isActive: true,
                createdAt: serverTimestamp()
            });
            console.log('✅ Rota oluşturuldu:', docRef.id);
            return docRef.id;
        } catch (error) {
            handleDatabaseError('createRoute', error);
        }
    },

    // Aktif rotaları al (paginated)
    async getActiveRoutes(week = null, limitCount = 50, startAfterDoc = null) {
        try {
            let q = query(
                collection(db, 'routes'),
                where('isActive', '==', true),
                orderBy('createdAt', 'desc'),
                limit(limitCount)
            );
            
            if (week) {
                q = query(q, where('week', '==', week));
            }
            
            if (startAfterDoc) {
                q = query(q, startAfter(startAfterDoc));
            }
            
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            handleDatabaseError('getActiveRoutes', error);
        }
    },

    // Rotaları dinle (optimized)
    listenToRoutes(callback, week = null) {
        try {
            // routesetter.js ile aynı mantık - tüm rotaları getir
            let q = query(
                collection(db, 'routes'),
                orderBy('createdAt', 'desc')
            );
            
            if (week) {
                q = query(q, where('week', '==', week));
            }
            
            return onSnapshot(q, (snapshot) => {
                console.log('📋 listenToRoutes snapshot geldi:', snapshot);
                console.log('📋 Snapshot docs sayısı:', snapshot.docs.length);
                
                const routes = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                console.log('📋 Routes array oluşturuldu:', routes);
                callback(routes);
            }, (error) => {
                handleDatabaseError('listenToRoutes', error);
            });
        } catch (error) {
            handleDatabaseError('listenToRoutes', error);
        }
    },

    // Rota sil (soft delete)
    async deleteRoute(routeId) {
        try {
            await updateDoc(doc(db, 'routes', routeId), {
                isActive: false,
                deletedAt: serverTimestamp()
            });
            console.log('✅ Rota silindi (soft delete):', routeId);
        } catch (error) {
            handleDatabaseError('deleteRoute', error);
        }
    }
};

// System Service (Unchanged)
export const systemServiceV2 = {
    async getSystemInfo() {
        try {
            const docRef = doc(db, 'system', 'period');
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return docSnap.data();
            } else {
                const defaultWeek = getDefaultWeek();
                const defaultMonth = getDefaultMonth();
                
                await updateDoc(docRef, {
                    week: defaultWeek,
                    month: defaultMonth,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
                
                return { week: defaultWeek, month: defaultMonth };
            }
        } catch (error) {
            handleDatabaseError('getSystemInfo', error);
        }
    },

    async updateSystemInfo(updateData) {
        try {
            const docRef = doc(db, 'system', 'period');
            await updateDoc(docRef, {
                ...updateData,
                updatedAt: serverTimestamp()
            });
            console.log('✅ Sistem bilgileri güncellendi');
        } catch (error) {
            handleDatabaseError('updateSystemInfo', error);
        }
    },

    // Aylık puanları sıfırla ve geçmişe kaydet
    async resetMonthlyScores() {
        try {
            console.log('🔄 Aylık puanlar sıfırlanıyor...');
            
            // Tüm userStats'ları al
            const userStatsRef = collection(db, 'userStats');
            const userStatsSnapshot = await getDocs(userStatsRef);
            
            if (userStatsSnapshot.empty) {
                console.log('⚠️ Hiç kullanıcı istatistiği bulunamadı');
                return;
            }
            
            // Tüm users collection'ını çek (sadece name field'ı için)
            console.log('👥 Kullanıcı isimleri yükleniyor...');
            const usersRef = collection(db, 'users');
            const usersSnapshot = await getDocs(usersRef);
            
            // User ID -> Name and Gender mapping oluştur
            const userIdToNameAndGenderMap = {};
            usersSnapshot.docs.forEach(userDoc => {
                const userData = userDoc.data();
                userIdToNameAndGenderMap[userDoc.id] = {
                    name: userData.name || 'Bilinmeyen', 
                    gender: userData.gender || 'erkek'
                };
            });
            
            console.log('📊 User mapping oluşturuldu:', Object.keys(userIdToNameAndGenderMap).length, 'kullanıcı');
            
            const batch = writeBatch(db);
            
            // Sistemdeki ay bilgisini al
            const periodRef = doc(db, 'system', 'period');
            const periodDoc = await getDoc(periodRef);
            const currentMonth = periodDoc.exists() ? periodDoc.data().month : new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
            
            // Geçmiş ay verilerini sakla
            const monthlyHistoryData = {
                month: currentMonth,
                userStats: {},
                resetAt: serverTimestamp(),
                createdAt: serverTimestamp()
            };
            
            // Her kullanıcı için işlem yap
            userStatsSnapshot.docs.forEach(userStatsDoc => {
                const userStatsData = userStatsDoc.data();
                const userId = userStatsDoc.id;

                console.log('📊 User stats data:', userStatsData);
                
                // Geçmiş verileri sakla (name mapping'den al)
                monthlyHistoryData.userStats[userId] = {
                    monthlyScore: userStatsData.monthlyScore || 0,
                    currentWeekCompleted: userStatsData.currentWeekCompleted || 0,
                    name: userIdToNameAndGenderMap[userId]['name'] || 'Bilinmeyen',
                    gender: userIdToNameAndGenderMap[userId]['gender'] || 'erkek'
                };
                
                // Monthly score'u sıfırla
                batch.update(userStatsDoc.ref, {
                    monthlyScore: 0,
                    currentWeekCompleted: 0,
                    lastUpdated: serverTimestamp()
                });
            });
            
            // Geçmiş verileri monthlyHistory collection'ına kaydet
            const historyRef = doc(collection(db, 'monthlyHistory'));
            batch.set(historyRef, monthlyHistoryData);
            
            await batch.commit();
            
            console.log('✅ Aylık puanlar sıfırlandı ve geçmişe kaydedildi');
            console.log('📊 Sıfırlanan kullanıcı sayısı:', userStatsSnapshot.docs.length);
            console.log('📅 Ay:', currentMonth);
            
            return {
                success: true,
                resetCount: userStatsSnapshot.docs.length,
                month: currentMonth
            };
            
        } catch (error) {
            handleDatabaseError('resetMonthlyScores', error);
        }
    },

    // Geçmiş aylık verileri getir
    async getMonthlyHistory() {
        try {
            const historyRef = collection(db, 'monthlyHistory');
            const historySnapshot = await getDocs(query(historyRef, orderBy('resetAt', 'desc')));
            
            const history = historySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log('📊 Geçmiş aylık veriler getirildi:', history.length, 'ay');
            return history;
            
        } catch (error) {
            handleDatabaseError('getMonthlyHistory', error);
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
