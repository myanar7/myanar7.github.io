// Basit uçak ve yol ayrımı oyunu
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const messageDiv = document.getElementById('message');
const retryBtn = document.getElementById('retry-btn');
const finalScreen = document.getElementById('final-screen');

// Responsive canvas
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Oyun durumu
let stage = 0; // 0-3: yol ayrımları, 4: final
let isWrong = false;
let plane = { x: canvas.width/2, y: canvas.height-120, size: 100 };
const planeImg = new Image();
planeImg.src = 'assets/plane.png';
let animating = false;

// Yol ayrımı verisi: Soru, şıklar ve doğru yön
const pathData = [
  {
    question: "Yüzüklerin Efendisi serisinde Tek Yüzük'ü yok etmekle görevlendirilen ana karakter kimdir?",
    left: "Frodo Baggins",
    right: "Aragorn",
    correct: 'left'
  },
  {
    question: 'Buz ve Ateşin Şarkısı (Game of Thrones) serisinde "Kış Geliyor" (Winter is Coming) sözü hangi hanedana aittir?',
    left: 'Lannister Hanedanı',
    right: 'Stark Hanedanı',
    correct: 'right'
  },
  {
    question: 'Yüzüklerin Efendisi\'nde, Moria Madenleri\'ndeki savaştan sonra "Ak Büyücü" olarak geri dönen karakter hangisidir?',
    left: 'Gandalf',
    right: 'Saruman',
    correct: 'left'
  },
  {
    question: 'Buz ve Ateşin Şarkısı evreninde üç ejderhası olduğu için "Ejderhaların Annesi" unvanıyla bilinen karakter kimdir?',
    left: 'Cersei Lannister',
    right: 'Daenerys Targaryen',
    correct: 'right'
  }
];

function drawPlane(x, y, direction = 'up') {
  ctx.save();
  ctx.translate(x, y);
  // Uçağı yönüne göre döndür
  let angle = 0;
  if (direction === 'left') angle = -Math.PI/6;
  if (direction === 'right') angle = Math.PI/6;
  ctx.rotate(angle);
  ctx.drawImage(planeImg, -plane.size/2, -plane.size/2, plane.size, plane.size);
  ctx.restore();
}

function drawFork(stage) {
  // Responsive oranlar
  const isMobile = window.innerWidth < 700;
  const forkY = isMobile ? canvas.height * 0.48 : canvas.height/2;
  const forkLeftX = isMobile ? canvas.width/2 - canvas.width*0.32 : canvas.width/2-250;
  const forkRightX = isMobile ? canvas.width/2 + canvas.width*0.32 : canvas.width/2+250;
  const forkBranchY = isMobile ? forkY - canvas.height*0.18 : canvas.height/2-150;
  // Arka plan
  ctx.fillStyle = '#e0e0e0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Yol gövdesi
  ctx.save();
  ctx.strokeStyle = '#4d4d4d';
  ctx.lineWidth = isMobile ? 44 : 80;
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  ctx.moveTo(canvas.width/2, canvas.height-80);
  ctx.lineTo(canvas.width/2, forkY);
  ctx.lineTo(forkLeftX, forkBranchY);
  ctx.moveTo(canvas.width/2, forkY);
  ctx.lineTo(forkRightX, forkBranchY);
  ctx.stroke();
  ctx.restore();
  // Kenar çizgileri
  ctx.save();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = isMobile ? 3 : 6;
  ctx.setLineDash([isMobile ? 16 : 30, isMobile ? 10 : 20]);
  ctx.beginPath();
  ctx.moveTo(canvas.width/2, canvas.height-80);
  ctx.lineTo(canvas.width/2, forkY);
  ctx.lineTo(forkLeftX, forkBranchY);
  ctx.moveTo(canvas.width/2, forkY);
  ctx.lineTo(forkRightX, forkBranchY);
  ctx.stroke();
  ctx.restore();

  // Soru
  const q = pathData[stage];
  ctx.save();
  ctx.font = isMobile ? 'bold 15px Segoe UI' : 'bold 22px Segoe UI';
  ctx.fillStyle = '#222';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  // Soru kutusu
  const qBoxW = isMobile ? Math.min(canvas.width * 0.92, 340) : Math.min(canvas.width * 0.8, 700);
  const qBoxH = isMobile ? 54 : 80;
  const qBoxX = canvas.width/2 - qBoxW/2;
  const qBoxY = isMobile ? 12 : 40;
  ctx.beginPath();
  ctx.roundRect(qBoxX, qBoxY, qBoxW, qBoxH, isMobile ? 10 : 18);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.strokeStyle = '#1976d2';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#1976d2';
  ctx.font = isMobile ? 'bold 13px Segoe UI' : 'bold 20px Segoe UI';
  ctx.fillText(q.question, canvas.width/2, qBoxY + (isMobile ? 10 : 20), qBoxW-16);
  ctx.restore();

  // Şık kutuları
  const optY = isMobile ? forkY - canvas.height*0.23 : canvas.height/2-170;
  const optPadX = isMobile ? 10 : 28;
  const optPadY = isMobile ? 7 : 16;
  const optFont = isMobile ? 'bold 12px Segoe UI' : 'bold 20px Segoe UI';
  const optBoxH = isMobile ? 32 : 54;
  const options = [
    { label: q.left, x: forkLeftX - (isMobile ? 30 : 10), y: optY },
    { label: q.right, x: forkRightX - (isMobile ? 30 : 10), y: optY }
  ];
  ctx.font = optFont;
  options.forEach(opt => {
    // Kutu boyutları
    const text = opt.label;
    const textWidth = ctx.measureText(text).width;
    const boxW = textWidth + optPadX*2;
    // Kutu
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = isMobile ? 2 : 3;
    ctx.beginPath();
    ctx.roundRect(opt.x, opt.y, boxW, optBoxH, isMobile ? 8 : 12);
    ctx.fill();
    ctx.stroke();
    // Yazı
    ctx.fillStyle = '#1976d2';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = optFont;
    ctx.fillText(text, opt.x + boxW/2, opt.y + optBoxH/2);
    ctx.restore();
  });
}

function animateTo(direction) {
  animating = true;
  // Başlangıç noktası (uçağın mevcut konumu)
  const start = { x: plane.x, y: plane.y };
  // Ortak yolun ayrım noktası
  const fork = { x: canvas.width/2, y: canvas.height/2 };
  // Sol veya sağ yolun hedef noktası
  const leftTarget = { x: canvas.width/2-250, y: canvas.height/2-150 };
  const rightTarget = { x: canvas.width/2+250, y: canvas.height/2-150 };
  const target = direction === 'left' ? leftTarget : rightTarget;

  // 1. aşama: Ortak yolun ortasına git
  const midSteps = 40;
  // 2. aşama: Seçilen yola git
  const endSteps = 40;
  let stepCount = 0;

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function step() {
    if (stepCount < midSteps) {
      // Ortak yolun ortasına doğru ilerle
      const t = (stepCount + 1) / midSteps;
      plane.x = lerp(start.x, fork.x, t);
      plane.y = lerp(start.y, fork.y, t);
      draw('up');
    } else if (stepCount < midSteps + endSteps) {
      // Seçilen yola doğru ilerle
      const t = (stepCount - midSteps + 1) / endSteps;
      plane.x = lerp(fork.x, target.x, t);
      plane.y = lerp(fork.y, target.y, t);
      draw(direction);
    }
    stepCount++;
    if (stepCount < midSteps + endSteps) {
      requestAnimationFrame(step);
    } else {
      stage++;
      if (stage < 4) {
        // Yeni yol ayrımı
        plane.x = canvas.width/2;
        plane.y = canvas.height-120;
        animating = false;
        draw();
      } else {
        // Final ekranı
        canvas.style.display = 'none';
        finalScreen.style.display = 'flex';
        startConfetti();
      }
    }
  }
  step();
}

function draw(direction = 'up') {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (stage < 4) {
    drawFork(stage);
    drawPlane(plane.x, plane.y, direction);
  }
}





canvas.addEventListener('click', function(e) {
  if (animating || stage >= 4) return;
  const rect = canvas.getBoundingClientRect();
  const mx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  const my = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

  // Responsive oranlar
  const isMobile = window.innerWidth < 700;
  const forkY = isMobile ? canvas.height * 0.48 : canvas.height/2;
  const forkLeftX = isMobile ? canvas.width/2 - canvas.width*0.32 : canvas.width/2-250;
  const forkRightX = isMobile ? canvas.width/2 + canvas.width*0.32 : canvas.width/2+250;
  const forkBranchY = isMobile ? forkY - canvas.height*0.18 : canvas.height/2-150;
  // Şık kutuları
  const optY = isMobile ? forkY - canvas.height*0.23 : canvas.height/2-170;
  const optPadX = isMobile ? 10 : 28;
  const optPadY = isMobile ? 7 : 16;
  const optFont = isMobile ? 'bold 12px Segoe UI' : 'bold 20px Segoe UI';
  const optBoxH = isMobile ? 32 : 54;
  const q = pathData[stage];
  const options = [
    { key: 'left', label: q.left, x: forkLeftX - (isMobile ? 30 : 10), y: optY },
    { key: 'right', label: q.right, x: forkRightX - (isMobile ? 30 : 10), y: optY }
  ];
  // Şık kutularının gerçek genişliğini ölç
  const ctxFontPrev = ctx.font;
  ctx.font = optFont;
  let chosen = null;
  options.forEach(opt => {
    const textWidth = ctx.measureText(opt.label).width;
    const boxW = textWidth + optPadX*2;
    if (mx >= opt.x && mx <= opt.x + boxW && my >= opt.y && my <= opt.y + optBoxH) {
      chosen = opt.key;
    }
  });
  ctx.font = ctxFontPrev;
  if (!chosen) return;
  if (chosen === pathData[stage].correct) {
    animateTo(chosen);
    messageDiv.style.display = 'none';
    retryBtn.style.display = 'none';
  } else {
    // Yanlış seçimde de animasyonla yanlış yola gitsin
    animating = true;
    const start = { x: plane.x, y: plane.y };
    const fork = { x: canvas.width/2, y: forkY };
    const leftTarget = { x: forkLeftX, y: forkBranchY };
    const rightTarget = { x: forkRightX, y: forkBranchY };
    const target = chosen === 'left' ? leftTarget : rightTarget;
    const midSteps = 40;
    const endSteps = 30;
    let stepCount = 0;
    function lerp(a, b, t) { return a + (b - a) * t; }
    function step() {
      if (stepCount < midSteps) {
        const t = (stepCount + 1) / midSteps;
        plane.x = lerp(start.x, fork.x, t);
        plane.y = lerp(start.y, fork.y, t);
        draw(chosen);
      } else if (stepCount < midSteps + endSteps) {
        const t = (stepCount - midSteps + 1) / endSteps;
        plane.x = lerp(fork.x, target.x, t);
        plane.y = lerp(fork.y, target.y, t);
        draw(chosen);
      }
      stepCount++;
      if (stepCount < midSteps + endSteps) {
        requestAnimationFrame(step);
      } else {
        // Yanlış yol mesajı ve tekrar dene butonu göster
        messageDiv.textContent = 'Yanlış yol! Tekrar dene.';
        messageDiv.style.display = 'block';
        retryBtn.style.display = 'block';
        isWrong = true;
        // Uçağı tekrar başlangıç pozisyonuna al
        plane.x = canvas.width/2;
        plane.y = canvas.height-120;
        animating = false;
        draw();
      }
    }
    step();
  }
});

// Mobilde dokunma desteği
canvas.addEventListener('touchstart', function(e) {
  e.preventDefault();
  const fakeEvent = {
    touches: e.touches,
    clientX: e.touches[0].clientX,
    clientY: e.touches[0].clientY
  };
  canvas.dispatchEvent(new MouseEvent('click', {
    clientX: fakeEvent.clientX,
    clientY: fakeEvent.clientY
  }));
}, { passive: false });

retryBtn.addEventListener('click', function() {
  messageDiv.style.display = 'none';
  retryBtn.style.display = 'none';
  isWrong = false;
  draw();
});

// Uçak görseli yüklenince ilk çizim
planeImg.onload = () => draw();


// Final ekranı için tekrar başlat
finalScreen.addEventListener('click', function() {
  stage = 0;
  plane.x = canvas.width/2;
  plane.y = canvas.height-120;
  canvas.style.display = 'block';
  finalScreen.style.display = 'none';
  stopConfetti();
  draw();
});

// Konfeti efekti
let confettiInterval;
function startConfetti() {
  const confettiCanvas = document.getElementById('confetti-canvas');
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  const ctx = confettiCanvas.getContext('2d');
  let confetti = [];
  for (let i = 0; i < 120; i++) {
    confetti.push({
      x: Math.random() * confettiCanvas.width,
      y: Math.random() * -confettiCanvas.height,
      r: 6 + Math.random() * 8,
      d: Math.random() * 2 * Math.PI,
      color: `hsl(${Math.random()*360},90%,60%)`,
      tilt: Math.random()*20-10,
      tiltAngle: Math.random()*Math.PI*2,
      speed: 2 + Math.random()*2
    });
  }
  function drawConfetti() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confetti.forEach(c => {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.r, c.r/2, c.tilt, 0, Math.PI*2);
      ctx.fillStyle = c.color;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.restore();
    });
  }
  function updateConfetti() {
    confetti.forEach(c => {
      c.y += c.speed;
      c.x += Math.sin(c.d) * 1.5;
      c.tilt += Math.sin(c.tiltAngle) * 0.2;
      c.tiltAngle += 0.1;
      if (c.y > confettiCanvas.height + 20) {
        c.y = -20;
        c.x = Math.random() * confettiCanvas.width;
      }
    });
  }
  function loop() {
    drawConfetti();
    updateConfetti();
    confettiInterval = requestAnimationFrame(loop);
  }
  loop();
  window.addEventListener('resize', resizeConfettiCanvas);
  function resizeConfettiCanvas() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
}
function stopConfetti() {
  const confettiCanvas = document.getElementById('confetti-canvas');
  if (confettiCanvas) {
    const ctx = confettiCanvas.getContext('2d');
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
  cancelAnimationFrame(confettiInterval);
  window.removeEventListener('resize', ()=>{});
}
