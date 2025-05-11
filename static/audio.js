// Глобальные переменные для симуляции
let gravityInterval = null;
let speedMultiplier = 1;
let currentPositions = [];
let trajectories = [];  // Хранение траекторий тел
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let oscillators = [];

// Запуск симуляции гравитации
function startGravity() {
    const bodies = [];
    document.querySelectorAll('.body-input.active').forEach(group => {
        const mass = parseFloat(group.querySelector('.mass').value) || 1;
        const x = parseFloat(group.querySelector('.x').value) || 0;
        const y = parseFloat(group.querySelector('.y').value) || 0;
        const vx = parseFloat(group.querySelector('.vx').value) || 0;
        const vy = parseFloat(group.querySelector('.vy').value) || 0;
        const tone = parseFloat(group.querySelector('.tone').value) || 261.63;
        if (isNaN(x) || isNaN(y) || isNaN(mass)) {
            alert(`Ошибка: параметры тела ${group.querySelector('h2').innerText} некорректны.`);
            return;
        }
        bodies.push({
            mass: mass,
            x: x,
            y: y,
            vx: vx,
            vy: vy,
            tone: tone,
            id: group.querySelector('h2').innerText
        });
    });

    if (bodies.length === 0) return;
    trajectories = bodies.map(() => []);
    fetch('/experiments/gravity/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bodies })
    }).then(res => res.json()).then(data => {
        currentPositions = data.positions;
        initVisualization(currentPositions);
        runSimulation();
    });
}

// Запуск цикла симуляции
function runSimulation() {
    if (gravityInterval) clearInterval(gravityInterval);
    gravityInterval = setInterval(() => {
        fetch(`/experiments/gravity/step?dt=${0.1 * speedMultiplier}`)
            .then(res => res.json())
            .then(data => {
                currentPositions = data.positions;
                updateTrajectories(currentPositions);
                updateVisualization(currentPositions);
                playGravitySound(currentPositions);
            });
    }, 100 / speedMultiplier);
    document.addEventListener('keydown', stopGravity);
}

// Остановка симуляции
function stopGravity(e) {
    if (e.key === 's' && gravityInterval) {
        clearInterval(gravityInterval);
        gravityInterval = null;
        oscillators.forEach(osc => osc.stop());
        oscillators = [];
        document.removeEventListener('keydown', stopGravity);
        alert('Симуляция остановлена');
    }
}

// Изменение скорости симуляции
function setSpeed(multiplier) {
    speedMultiplier = multiplier;
    if (gravityInterval) runSimulation();
}

// Предпрослушивание тона
function previewTone(tone) {
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(tone, audioContext.currentTime);
    oscillator.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
}

// Инициализация визуализации
function initVisualization(positions) {
    const canvas = document.getElementById('gravity-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBodies(ctx, positions);
}

// Обновление визуализации
function updateVisualization(positions) {
    const canvas = document.getElementById('gravity-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTrajectories(ctx);
    drawBodies(ctx, positions);
}

// Отрисовка траекторий
function drawTrajectories(ctx) {
    trajectories.forEach((path, i) => {
        ctx.beginPath();
        ctx.strokeStyle = i % 2 === 0 ? '#0f0' : '#00f';
        ctx.lineWidth = 1;
        path.forEach((point, j) => {
            const x = 400 + point.x;
            const y = 300 - point.y;
            if (j === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
    });
}

// Отрисовка тел
function drawBodies(ctx, positions) {
    positions.forEach((body, i) => {
        const x = 400 + body.x;
        const y = 300 - body.y;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = i % 2 === 0 ? '#0f0' : '#00f';
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText(body.id, x + 10, y);
    });
}

// Обновление траекторий
function updateTrajectories(positions) {
    positions.forEach((body, i) => {
        trajectories[i].push({ x: body.x, y: body.y });
        if (trajectories[i].length > 50) trajectories[i].shift(); // Ограничение длины траектории
    });
}

// Воспроизведение звуков гравитации
function playGravitySound(positions) {
    oscillators.forEach(osc => osc.stop());
    oscillators = [];
    positions.forEach(body => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const stereoPanner = audioContext.createStereoPanner();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(body.tone, audioContext.currentTime);
        stereoPanner.pan.setValueAtTime(Math.max(-1, Math.min(1, body.x / 400)), audioContext.currentTime);
        const distance = Math.sqrt(body.x ** 2 + body.y ** 2);
        gainNode.gain.setValueAtTime(Math.max(0.1, 0.5 / (1 + distance / 200)), audioContext.currentTime);
        oscillator.connect(stereoPanner).connect(gainNode).connect(audioContext.destination);
        oscillator.start();
        oscillators.push(oscillator);
    });
}

// Глобальная переменная для текущей мелодии
let currentPart = null;

// Запуск сонификации изображения
function sonifyImage(imageId) {
    if (currentPart) {
        currentPart.stop();
        Tone.Transport.stop();
    }
    fetch(`/experiments/image/sonify?image_id=${imageId}`)
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById('sonify-container');
            container.innerHTML = `
                <img src="${data.url}" class="sonify-image" alt="Сонифицируемое изображение">
                <div class="scan-line" id="scan-line"></div>
            `;
            const img = container.querySelector('img');
            img.onload = () => {
                Tone.start().then(() => playImageMelody(data.sound_data, container.querySelector('#scan-line')));
            };
            img.onerror = () => console.error('Ошибка загрузки изображения:', data.url);
        });
}

// Воспроизведение мелодии изображения
function playImageMelody(soundData, scanLine) {
    const reverb = new Tone.Reverb({ decay: 2, wet: 0.5 }).toDestination();
    const chorus = new Tone.Chorus({ frequency: 4, delayTime: 2.5, depth: 0.5 }).toDestination();
    const synths = {
        piano: new Tone.FMSynth().connect(reverb).toDestination(),  // Пианино
        strings: new Tone.AMSynth().connect(reverb).toDestination(),  // Струнные
        flute: new Tone.Synth({ oscillator: { type: 'sine' } }).connect(chorus).toDestination(),  // Флейта
        brass: new Tone.MetalSynth().connect(chorus).toDestination()  // Духовые
    };

    let index = 0;
    const totalDuration = soundData.length * 0.1;
    Tone.Transport.cancel();
    Tone.Transport.start();

    currentPart = new Tone.Part((time, event) => {
        synths[event.instrument].triggerAttackRelease(Tone.Midi(event.note).toFrequency(), "8n", time);
        const progress = (index / soundData.length) * 100;
        scanLine.style.left = `${progress}%`;
        index++;
    }, soundData.map((data, i) => ({
        time: i * 0.1,
        note: data.note,
        instrument: data.instrument
    })));

    currentPart.start(0);
    Tone.Transport.scheduleOnce(() => {
        Tone.Transport.stop();
    }, totalDuration);
}