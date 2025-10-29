// Event Manager - Event listener yönetimi
export class EventManager {
    constructor() {
        this.listeners = new Map();
    }

    // Event listener ekle
    addListener(element, event, handler, options = {}) {
        if (!element) {
            console.warn('⚠️ Element bulunamadı:', element);
            return;
        }

        const key = `${element.id || element.className}_${event}`;
        
        // Önceki listener'ı temizle
        this.removeListener(key);
        
        // Yeni listener ekle
        element.addEventListener(event, handler, options);
        this.listeners.set(key, { element, event, handler, options });
        
        console.log(`✅ Event listener eklendi: ${key}`);
    }

    // Event listener kaldır
    removeListener(key) {
        const listener = this.listeners.get(key);
        if (listener) {
            listener.element.removeEventListener(listener.event, listener.handler, listener.options);
            this.listeners.delete(key);
            console.log(`🗑️ Event listener kaldırıldı: ${key}`);
        }
    }

    // Tüm listener'ları temizle
    clearAll() {
        this.listeners.forEach((listener, key) => {
            this.removeListener(key);
        });
        console.log('🧹 Tüm event listener\'lar temizlendi');
    }

    // Delegated event listener ekle
    addDelegatedListener(parent, selector, event, handler) {
        if (!parent) {
            console.warn('⚠️ Parent element bulunamadı:', parent);
            return;
        }

        const key = `${parent.id}_delegated_${event}`;
        
        const delegatedHandler = (e) => {
            if (e.target.matches(selector)) {
                handler(e);
            }
        };
        
        this.addListener(parent, event, delegatedHandler);
    }
}
