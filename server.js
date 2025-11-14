const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// ФАЙЛЫ ДАННЫХ
const RATING_FILE = path.join(__dirname, 'data', 'rating.json');
const PROGRESS_FILE = path.join(__dirname, 'data', 'progress.json');

// УСКОРЕННАЯ ЗАГРУЗКА ДАННЫХ
let globalRating = [];
let playerProgress = new Map(); // Для быстрого доступа по userId

function loadRatingData() {
    try {
        if (fs.existsSync(RATING_FILE)) {
            const data = fs.readFileSync(RATING_FILE, 'utf8');
            const parsed = JSON.parse(data);
            console.log(`📊 Загружено ${parsed.length} игроков из рейтинга`);
            return parsed;
        }
    } catch (error) {
        console.log('❌ Ошибка загрузки рейтинга:', error);
    }
    console.log('📝 Создано новое хранилище рейтинга');
    return [];
}

function loadProgressData() {
    try {
        if (fs.existsSync(PROGRESS_FILE)) {
            const data = fs.readFileSync(PROGRESS_FILE, 'utf8');
            const parsed = JSON.parse(data);
            console.log(`🎮 Загружено прогрессов: ${parsed.length}`);
            
            // Конвертируем в Map для быстрого поиска
            const progressMap = new Map();
            parsed.forEach(item => {
                if (item.userId && item.gameState) {
                    progressMap.set(item.userId, item);
                }
            });
            return progressMap;
        }
    } catch (error) {
        console.log('❌ Ошибка загрузки прогресса:', error);
    }
    console.log('🎮 Создано новое хранилище прогресса');
    return new Map();
}

function saveRatingData(data) {
    try {
        // Создаем папку data если её нет
        const dataDir = path.dirname(RATING_FILE);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        fs.writeFileSync(RATING_FILE, JSON.stringify(data, null, 2));
        console.log(`💾 Рейтинг сохранен (${data.length} игроков)`);
        return true;
    } catch (error) {
        console.log('❌ Ошибка сохранения рейтинга:', error);
        return false;
    }
}

function saveProgressData(progressMap) {
    try {
        // Конвертируем Map в массив для сохранения
        const progressArray = Array.from(progressMap.values());
        
        // Создаем папку data если её нет
        const dataDir = path.dirname(PROGRESS_FILE);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progressArray, null, 2));
        console.log(`💾 Прогресс сохранен (${progressArray.length} игроков)`);
        return true;
    } catch (error) {
        console.log('❌ Ошибка сохранения прогресса:', error);
        return false;
    }
}

// МГНОВЕННАЯ ЗАГРУЗКА ПРИ СТАРТЕ
globalRating = loadRatingData();
playerProgress = loadProgressData();

// АВТО-СОХРАНЕНИЕ КАЖДЫЕ 30 СЕКУНД
setInterval(() => {
    if (globalRating.length > 0) {
        saveRatingData(globalRating);
    }
    if (playerProgress.size > 0) {
        saveProgressData(playerProgress);
    }
}, 30 * 1000);

// === СУЩЕСТВУЮЩИЕ ENDPOINTS (БЕЗ ИЗМЕНЕНИЙ) ===

// УСКОРЕННЫЙ ПОЛУЧЕНИЕ РЕЙТИНГА
app.get('/api/rating', (req, res) => {
    try {
        const sorted = globalRating
            .filter(player => player && player.playerNickname && player.level > 0)
            .sort((a, b) => {
                if (b.level !== a.level) return b.level - a.level;
                return b.experience - a.experience;
            })
            .slice(0, 100);
        
        res.json(sorted);
    } catch (error) {
        console.log('❌ Ошибка получения рейтинга:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// СУПЕР-БЫСТРОЕ ОБНОВЛЕНИЕ РЕЙТИНГА
app.post('/api/update-rating', (req, res) => {
    try {
        const playerData = req.body;
        
        if (!playerData.userId || !playerData.playerNickname) {
            return res.status(400).json({ error: 'Invalid player data' });
        }
        
        console.log(`🔄 Обновление рейтинга: ${playerData.playerNickname} ур.${playerData.level}`);
        
        const existingIndex = globalRating.findIndex(p => p.userId === playerData.userId);
        
        if (existingIndex !== -1) {
            globalRating[existingIndex] = playerData;
        } else {
            globalRating.push(playerData);
        }
        
        // СОХРАНЕНИЕ В ФОНЕ - НЕ ЖДЕМ ОТВЕТА
        setTimeout(() => {
            saveRatingData(globalRating);
        }, 0);
        
        // МГНОВЕННЫЙ ОТВЕТ КЛИЕНТУ
        const sorted = globalRating
            .sort((a, b) => {
                if (b.level !== a.level) return b.level - a.level;
                return b.experience - a.experience;
            })
            .slice(0, 100);
        
        res.json(sorted);
        
    } catch (error) {
        console.log('❌ Ошибка обновления рейтинга:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// === НОВЫЕ ENDPOINTS ДЛЯ ПРОГРЕССА ===

// СОХРАНЕНИЕ ПРОГРЕССА ИГРЫ
app.post('/api/save-progress', (req, res) => {
    try {
        const { userId, gameState } = req.body;
        
        if (!userId || !gameState) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        console.log(`💾 Сохранение прогресса: ${userId}`);

        // Валидация и очистка данных
        const cleanGameState = {
            money: Math.max(0, Number(gameState.money) || 0),
            unlockedBeds: Math.max(6, Math.min(64, Number(gameState.unlockedBeds) || 6)),
            toolsLevel: Math.max(1, Math.min(16, Number(gameState.toolsLevel) || 1)),
            toolsUnlocked: gameState.toolsUnlocked || {1: true},
            selectedPlant: gameState.selectedPlant || "pink_cherry",
            farmMap: Array.isArray(gameState.farmMap) ? gameState.farmMap : [],
            totalEarned: Math.max(0, Number(gameState.totalEarned) || 0),
            level: Math.max(1, Number(gameState.level) || 1),
            experience: Math.max(0, Number(gameState.experience) || 0)
        };

        // Сохраняем в память
        playerProgress.set(userId, {
            userId: userId,
            gameState: cleanGameState,
            lastUpdated: new Date().toISOString()
        });

        // Фоновое сохранение на диск
        setTimeout(() => {
            saveProgressData(playerProgress);
        }, 0);

        res.json({ success: true, message: 'Progress saved' });
        
    } catch (error) {
        console.log('❌ Ошибка сохранения прогресса:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ЗАГРУЗКА ПРОГРЕССА ИГРЫ
app.get('/api/load-progress', (req, res) => {
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ error: 'Missing userId' });
        }

        console.log(`📂 Загрузка прогресса: ${userId}`);

        const progress = playerProgress.get(userId);
        
        if (progress && progress.gameState) {
            res.json(progress.gameState);
        } else {
            res.json(null); // Нет сохранения
        }
        
    } catch (error) {
        console.log('❌ Ошибка загрузки прогресса:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Статус сервера
app.get('/', (req, res) => {
    res.json({ 
        status: 'Cherryty Game Server on Railway!',
        ratingPlayers: globalRating.length,
        progressPlayers: playerProgress.size,
        version: '4.0',
        hosting: 'Railway',
        features: ['rating', 'progress-save']
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Cherryty Game Server v4.0 running on Railway (port ${PORT})`);
    console.log(`📊 Рейтинг: ${globalRating.length} игроков`);
    console.log(`🎮 Прогресс: ${playerProgress.size} сохранений`);
    console.log(`💾 Файлы: rating.json, progress.json`);
});
