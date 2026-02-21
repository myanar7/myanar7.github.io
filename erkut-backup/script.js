document.addEventListener('DOMContentLoaded', () => {
    // --- ÖNEMLİ AYAR ---
    // Arkadaşınızın 'Çalışma Günü' olarak sayılacak İLK günü buraya yazın.
    // Bu tarih bir çalışma günü olmalı.
    // Format: 'YIL-AY-GÜN' (Örn: '2025-10-13' -> 13 Ekim 2025)
    const baslangicTarihi = new Date('2025-10-13'); 
    baslangicTarihi.setHours(0, 0, 0, 0); // Saat farklarından etkilenmemek için

    const monthYearElement = document.getElementById('month-year');
    const calendarGrid = document.getElementById('calendar-grid');
    const prevMonthButton = document.getElementById('prev-month');
    const nextMonthButton = document.getElementById('next-month');
    const safakCounterElement = document.getElementById('safak-counter');

    let currentDate = new Date();

    function getWorkStatus(date) {
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        // Başlangıç tarihi ile hedef tarih arasındaki gün farkını bul
        const diffTime = targetDate - baslangicTarihi;
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        // 2 günlük döngü (1 gün iş, 1 gün izin)
        // Gün farkı 2'ye tam bölünüyorsa (0, 2, 4, -2 gibi) o gün başlangıç günüyle aynıdır, yani çalışma günüdür.
        if (diffDays % 2 === 0) {
            return 'work-day'; // Çalışma Günü
        } else {
            return 'off-day';  // İzin Günü
        }
    }

    function renderCalendar() {
        calendarGrid.innerHTML = '';
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
        monthYearElement.textContent = `${monthNames[month]} ${year}`;

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const dayOffset = (firstDayOfMonth === 0) ? 6 : firstDayOfMonth - 1;

        for (let i = 0; i < dayOffset; i++) {
            const emptyCell = document.createElement('div');
            calendarGrid.appendChild(emptyCell);
        }

        const today = new Date();
        today.setHours(0,0,0,0);

        for (let i = 1; i <= daysInMonth; i++) {
            const dayCell = document.createElement('div');
            dayCell.textContent = i;
            dayCell.classList.add('day');

            const currentDayDate = new Date(year, month, i);
            const statusClass = getWorkStatus(currentDayDate);
            dayCell.classList.add(statusClass);

            if (currentDayDate.getTime() === today.getTime()) {
                dayCell.classList.add('today');
            }

            calendarGrid.appendChild(dayCell);
        }
    }

    function updateSafakCounter() {
        const targetDate = new Date(2026, 7, 25);
        const today = new Date();

        const utcTarget = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

        const diffDays = Math.floor((utcTarget - utcToday) / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
            safakCounterElement.textContent = `${diffDays} gün kaldı`;
            return;
        }

        if (diffDays === 0) {
            safakCounterElement.textContent = 'Bugün son gün!';
            return;
        }

        safakCounterElement.textContent = 'Tarih geçti, şafak bitti 🎉';
    }

    prevMonthButton.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    nextMonthButton.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    renderCalendar();
    updateSafakCounter();
});