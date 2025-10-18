// Database Migration Script - Eski yapıdan yeni yapıya geçiş
import { 
    collection, 
    getDocs, 
    addDoc, 
    updateDoc, 
    doc, 
    writeBatch,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { db } from '../config/firebase.js';

// Migration configuration
const MIGRATION_CONFIG = {
    batchSize: 100, // Her batch'te kaç document işlenecek
    dryRun: false,  // Gerçek migration yapmadan önce test
    backup: true    // Eski verileri backup'la
};

class DatabaseMigration {
    constructor() {
        this.stats = {
            usersProcessed: 0,
            routesProcessed: 0,
            completionsCreated: 0,
            errors: []
        };
    }

    // Ana migration fonksiyonu
    async migrate() {
        console.log('🚀 Database migration başlatılıyor...');
        console.log('📊 Migration config:', MIGRATION_CONFIG);
        
        try {
            // 1. Users migration
            await this.migrateUsers();
            
            // 2. Routes migration
            await this.migrateRoutes();
            
            // 3. Route completions migration
            await this.migrateRouteCompletions();
            
            // 4. User statistics migration
            await this.migrateUserStatistics();
            
            console.log('✅ Migration tamamlandı!');
            console.log('📊 Migration istatistikleri:', this.stats);
            
        } catch (error) {
            console.error('❌ Migration hatası:', error);
            this.stats.errors.push(error.message);
        }
    }

    // Users migration - dynamic fields'ları temizle
    async migrateUsers() {
        console.log('👥 Users migration başlatılıyor...');
        
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const batch = writeBatch(db);
        let batchCount = 0;
        
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            
            // Dynamic fields'ları temizle
            const cleanedUserData = {
                username: userData.username,
                password: userData.password,
                name: userData.name,
                gender: userData.gender,
                createdAt: userData.createdAt,
                lastLoginAt: serverTimestamp()
            };
            
            // Dynamic fields'ları kaldır
            const fieldsToRemove = [];
            for (const [key, value] of Object.entries(userData)) {
                if (key.startsWith('completedAt_') || 
                    key.startsWith('attempts_') || 
                    key.startsWith('score_') ||
                    key === 'completedRoutes' ||
                    key === 'totalScore' ||
                    key === 'monthlyScore') {
                    fieldsToRemove.push(key);
                }
            }
            
            if (fieldsToRemove.length > 0) {
                console.log(`🧹 User ${userDoc.id} temizleniyor:`, fieldsToRemove);
                
                if (!MIGRATION_CONFIG.dryRun) {
                    // Dynamic fields'ları sil
                    const updateData = {};
                    fieldsToRemove.forEach(field => {
                        updateData[field] = deleteField();
                    });
                    
                    batch.update(doc(db, 'users', userDoc.id), updateData);
                }
            }
            
            batchCount++;
            if (batchCount >= MIGRATION_CONFIG.batchSize) {
                if (!MIGRATION_CONFIG.dryRun) {
                    await batch.commit();
                }
                batchCount = 0;
            }
            
            this.stats.usersProcessed++;
        }
        
        if (batchCount > 0 && !MIGRATION_CONFIG.dryRun) {
            await batch.commit();
        }
        
        console.log(`✅ Users migration tamamlandı: ${this.stats.usersProcessed} kullanıcı işlendi`);
    }

    // Routes migration - isActive field ekle
    async migrateRoutes() {
        console.log('🏔️ Routes migration başlatılıyor...');
        
        const routesSnapshot = await getDocs(collection(db, 'routes'));
        const batch = writeBatch(db);
        let batchCount = 0;
        
        for (const routeDoc of routesSnapshot.docs) {
            const routeData = routeDoc.data();
            
            // isActive field ekle
            if (!routeData.hasOwnProperty('isActive')) {
                console.log(`🔄 Route ${routeDoc.id} güncelleniyor: isActive field ekleniyor`);
                
                if (!MIGRATION_CONFIG.dryRun) {
                    batch.update(doc(db, 'routes', routeDoc.id), {
                        isActive: true
                    });
                }
            }
            
            batchCount++;
            if (batchCount >= MIGRATION_CONFIG.batchSize) {
                if (!MIGRATION_CONFIG.dryRun) {
                    await batch.commit();
                }
                batchCount = 0;
            }
            
            this.stats.routesProcessed++;
        }
        
        if (batchCount > 0 && !MIGRATION_CONFIG.dryRun) {
            await batch.commit();
        }
        
        console.log(`✅ Routes migration tamamlandı: ${this.stats.routesProcessed} rota işlendi`);
    }

    // Route completions migration - dynamic fields'dan ayrı collection'a
    async migrateRouteCompletions() {
        console.log('🎯 Route completions migration başlatılıyor...');
        
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const batch = writeBatch(db);
        let batchCount = 0;
        
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;
            
            // Dynamic fields'ları bul
            const completions = [];
            for (const [key, value] of Object.entries(userData)) {
                if (key.startsWith('completedAt_')) {
                    const routeId = key.replace('completedAt_', '');
                    const attempts = userData[`attempts_${routeId}`] || 0;
                    const score = userData[`score_${routeId}`] || 0;
                    
                    completions.push({
                        userId: userId,
                        routeId: routeId,
                        completedAt: value,
                        attempts: attempts,
                        score: score,
                        isCurrentWeek: false, // Bu bilgi route'dan alınacak
                        month: new Date(value).toISOString().substring(0, 7),
                        week: '', // Bu bilgi route'dan alınacak
                        isBoulderOfWeek: false, // Bu bilgi route'dan alınacak
                        createdAt: serverTimestamp()
                    });
                }
            }
            
            // Route completions oluştur
            for (const completion of completions) {
                console.log(`📝 Route completion oluşturuluyor: ${completion.routeId} -> ${userId}`);
                
                if (!MIGRATION_CONFIG.dryRun) {
                    const completionRef = doc(collection(db, 'routeCompletions'));
                    batch.set(completionRef, completion);
                }
                
                batchCount++;
                if (batchCount >= MIGRATION_CONFIG.batchSize) {
                    if (!MIGRATION_CONFIG.dryRun) {
                        await batch.commit();
                    }
                    batchCount = 0;
                }
                
                this.stats.completionsCreated++;
            }
        }
        
        if (batchCount > 0 && !MIGRATION_CONFIG.dryRun) {
            await batch.commit();
        }
        
        console.log(`✅ Route completions migration tamamlandı: ${this.stats.completionsCreated} completion oluşturuldu`);
    }

    // User statistics migration
    async migrateUserStatistics() {
        console.log('📊 User statistics migration başlatılıyor...');
        
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const batch = writeBatch(db);
        let batchCount = 0;
        
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;
            
            // Eski istatistikleri hesapla
            const totalScore = userData.totalScore || 0;
            const monthlyScore = userData.monthlyScore || 0;
            const completedRoutes = userData.completedRoutes || [];
            
            console.log(`📊 User statistics oluşturuluyor: ${userId}`);
            
            if (!MIGRATION_CONFIG.dryRun) {
                const statsRef = doc(collection(db, 'userStats'));
                batch.set(statsRef, {
                    userId: userId,
                    totalScore: totalScore,
                    monthlyScore: monthlyScore,
                    totalRoutesCompleted: completedRoutes.length,
                    currentWeekCompleted: 0, // Bu bilgi route completions'dan hesaplanacak
                    lastUpdated: serverTimestamp()
                });
            }
            
            batchCount++;
            if (batchCount >= MIGRATION_CONFIG.batchSize) {
                if (!MIGRATION_CONFIG.dryRun) {
                    await batch.commit();
                }
                batchCount = 0;
            }
        }
        
        if (batchCount > 0 && !MIGRATION_CONFIG.dryRun) {
            await batch.commit();
        }
        
        console.log(`✅ User statistics migration tamamlandı: ${usersSnapshot.docs.length} kullanıcı işlendi`);
    }

    // Migration durumunu kontrol et
    async checkMigrationStatus() {
        console.log('🔍 Migration durumu kontrol ediliyor...');
        
        const usersCount = (await getDocs(collection(db, 'users'))).docs.length;
        const userStatsCount = (await getDocs(collection(db, 'userStats'))).docs.length;
        const routeCompletionsCount = (await getDocs(collection(db, 'routeCompletions'))).docs.length;
        const routesCount = (await getDocs(collection(db, 'routes'))).docs.length;
        
        console.log('📊 Migration durumu:');
        console.log(`- Users: ${usersCount}`);
        console.log(`- User Stats: ${userStatsCount}`);
        console.log(`- Route Completions: ${routeCompletionsCount}`);
        console.log(`- Routes: ${routesCount}`);
        
        return {
            users: usersCount,
            userStats: userStatsCount,
            routeCompletions: routeCompletionsCount,
            routes: routesCount
        };
    }
}

// Migration'ı başlat
const migration = new DatabaseMigration();

// Export for use in other files
export { DatabaseMigration, MIGRATION_CONFIG };

// Eğer bu dosya doğrudan çalıştırılıyorsa migration'ı başlat
if (typeof window !== 'undefined') {
    // Browser'da çalıştır
    window.startMigration = () => migration.migrate();
    window.checkMigrationStatus = () => migration.checkMigrationStatus();
    
    console.log('🚀 Migration script yüklendi!');
    console.log('💡 Kullanım:');
    console.log('- startMigration() - Migration başlat');
    console.log('- checkMigrationStatus() - Durumu kontrol et');
}
