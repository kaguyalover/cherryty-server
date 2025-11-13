const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'data', 'rating.json');

// УСКОРЕННАЯ ЗАГРУЗКА ДАННЫХ
let globalRating = [];

function loadRatingData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            const parsed = JSON.parse(data);
            console.log(`📊 Загружено ${parsed.length} игроков из хранилища`);
            return parsed;
        }
    } catch (error) {
        console.log('❌ Ошибка загрузки данных:', error);
    }
    console.log('📝 Создано новое хранилище рейтинга');
    return [];
}

function saveRatingData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        console.log(`💾 Данные рейтинга сохранены (${data.length} игроков)`);
        return true;
    } catch (error) {
        console.log('❌ Ошибка сохранения данных:', error);
        return false;
    }
}

// МГНОВЕННАЯ ЗАГРУЗКА ПРИ СТАРТЕ
globalRating = loadRatingData();

// АВТО-СОХРАНЕНИЕ КАЖДЫЕ 30 СЕКУНД
setInterval(() => {
    if (globalRating.length > 0) {
        saveRatingData(globalRating);
    }
}, 30 * 1000);

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
        
        console.log(`🔄 Обновление: ${playerData.playerNickname} ур.${playerData.level}`);
        
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

// Статус сервера
app.get('/', (req, res) => {
    res.json({ 
        status: 'Cherryty Rating Server on Railway!',
        players: globalRating.length,
        version: '3.0',
        hosting: 'Railway',
        responseTime: 'instant'
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Cherryty Rating Server v3.0 running on Railway (port ${PORT})`);
    console.log(`📊 Загружено игроков: ${globalRating.length}`);
});
