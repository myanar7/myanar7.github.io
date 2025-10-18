// UI Service Katmanı
export const uiService = {
    // DOM element referansları
    elements: {
        loginScreen: null,
        mainContent: null,
        loginForm: null,
        createUserBtn: null,
        logoutBtn: null,
        currentUsername: null,
        routesList: null,
        userTotalScore: null,
        userMonthlyScore: null,
        registerOverlay: null,
        registerForm: null,
        attemptsOverlay: null
    },

    // DOM elementlerini başlat
    initializeElements() {
        this.elements = {
            loginScreen: document.getElementById('login-screen'),
            mainContent: document.getElementById('main-content'),
            loginForm: document.getElementById('login-form'),
            createUserBtn: document.getElementById('create-user-btn'),
            logoutBtn: document.getElementById('logout-btn'),
            currentUsername: document.getElementById('current-username'),
            routesList: document.getElementById('routes-list'),
            userTotalScore: document.getElementById('user-total-score'),
            userMonthlyScore: document.getElementById('user-monthly-score'),
            registerOverlay: document.getElementById('register-overlay'),
            registerForm: document.getElementById('register-form'),
            attemptsOverlay: document.getElementById('attempts-overlay')
        };
        
        console.log('✅ UI elementleri başlatıldı');
    },

    // Loading state göster
    showLoading(element, message = 'Yükleniyor...') {
        if (element) {
            element.innerHTML = `<div class="loading">${message}</div>`;
        }
    },

    // Error mesajı göster
    showError(message, element = null) {
        console.error('❌ UI Error:', message);
        
        if (element) {
            element.innerHTML = `<div class="error">${message}</div>`;
        } else {
            // Global error notification
            this.showNotification(message, 'error');
        }
    },

    // Success mesajı göster
    showSuccess(message, element = null) {
        console.log('✅ UI Success:', message);
        
        if (element) {
            element.innerHTML = `<div class="success">${message}</div>`;
        } else {
            this.showNotification(message, 'success');
        }
    },

    // Notification göster
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // 3 saniye sonra kaldır
        setTimeout(() => {
            notification.remove();
        }, 3000);
    },

    // Modal göster
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
        }
    },

    // Modal gizle
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    },

    // Form temizle
    clearForm(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
        }
    },

    // Checkbox durumlarını güncelle
    updateCheckboxStates(completionMap) {
        console.log('🔄 updateCheckboxStates çağrıldı');
        console.log('📊 completionMap:', completionMap);
        
        const checkboxes = document.querySelectorAll('.route-checkbox');
        console.log('📊 Checkboxes bulundu:', checkboxes.length);
        
        checkboxes.forEach(checkbox => {
            const routeId = checkbox.dataset.routeId;
            const completion = completionMap[routeId];
            const isCompleted = !!completion;
            
            console.log(`📊 Route ${routeId}:`, { isCompleted, completion });
            
            if (checkbox.checked !== isCompleted) {
                checkbox.checked = isCompleted;
                this.updateRouteStatusText(routeId, isCompleted, completion);
            }
        });
    },

    // Rota durum yazısını güncelle
    updateRouteStatusText(routeId, isCompleted, completionData = null) {
        console.log('🔄 updateRouteStatusText çağrıldı:', routeId, isCompleted, completionData);
        
        const checkbox = document.querySelector(`[data-route-id="${routeId}"]`);
        console.log('📊 Checkbox bulundu:', checkbox);
        if (!checkbox) {
            console.error('❌ Checkbox bulunamadı:', routeId);
            return;
        }
        
        const routeItem = checkbox.closest('.route-item');
        console.log('📊 Route item bulundu:', routeItem);
        if (!routeItem) {
            console.error('❌ Route item bulunamadı');
            return;
        }
        
        const statusText = routeItem.querySelector('.route-status');
        console.log('📊 Status text bulundu:', statusText);
        if (!statusText) {
            console.error('❌ Status text bulunamadı');
            return;
        }
        
        // Route completion date'i güncelle
        const routeCompletion = routeItem.querySelector('.route-completion');
        if (routeCompletion) {
            if (isCompleted && completionData) {
                const completionDate = this.formatDate(completionData.completedAt);
                routeCompletion.textContent = `✅ Çıktı: ${completionDate}`;
                console.log('✅ Route completion güncellendi:', completionDate);
            } else {
                routeCompletion.textContent = '❌ Henüz çıkmadı';
                console.log('✅ Route completion sıfırlandı');
            }
        }
        
        console.log('📊 Mevcut status text:', statusText.textContent);
        console.log('📊 Mevcut status class:', statusText.className);
        
        if (isCompleted) {
            statusText.textContent = 'Çıktım';
            statusText.className = 'route-status completed';
            console.log('✅ Status text güncellendi: Çıktım');
        } else {
            statusText.textContent = 'Çıkmadım';
            statusText.className = 'route-status';
            console.log('✅ Status text güncellendi: Çıkmadım');
        }
        
        console.log('📊 Yeni status text:', statusText.textContent);
        console.log('📊 Yeni status class:', statusText.className);
    },
    
    // Tarih formatla
    formatDate(timestamp) {
        if (!timestamp) return '';
        
        if (timestamp.seconds) {
            return new Date(timestamp.seconds * 1000).toLocaleDateString('tr-TR');
        } else if (timestamp.toDate) {
            return timestamp.toDate().toLocaleDateString('tr-TR');
        } else if (typeof timestamp === 'string') {
            return new Date(timestamp).toLocaleDateString('tr-TR');
        }
        
        return new Date(timestamp).toLocaleDateString('tr-TR');
    }
};
