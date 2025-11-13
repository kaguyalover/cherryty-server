const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'data', 'rating.json');

// Создаем папку data если нет
if (!fs.existsSync(path.dirname(DATA_FILE))) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

// Загрузка данных из файла
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

// Сохранение данных в файл
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

let globalRating = loadRatingData();

// Авто-сохранение каждые 2 минуты
setInterval(() => {
    if (globalRating.length > 0) {
        saveRatingData(globalRating);
    }
}, 2 * 60 * 1000);

// Получить топ-100 игроков
app.get('/api/rating', (req, res) => {
  try {
    const sorted = globalRating
      .filter(player => player && player.playerNickname && player.level > 0)
      .sort((a, b) => {
        if (b.level !== a.level) return b.level - a.level;
        return b.experience - a.experience;
      })
      .slice(0, 100);
    
    console.log(`📊 Отдаем рейтинг: ${sorted.length} игроков`);
    res.json(sorted);
  } catch (error) {
    console.log('❌ Ошибка получения рейтинга:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Обновить рейтинг игрока
app.post('/api/update-rating', (req, res) => {
  try {
    const playerData = req.body;
    
    if (!playerData.userId || !playerData.playerNickname) {
      return res.status(400).json({ error: 'Invalid player data' });
    }
    
    console.log(`🔄 Обновление рейтинга для: ${playerData.playerNickname} (ур. ${playerData.level})`);
    
    const existingIndex = globalRating.findIndex(p => p.userId === playerData.userId);
    if (existingIndex !== -1) {
      globalRating[existingIndex] = playerData;
    } else {
      globalRating.push(playerData);
    }
    
    // Сохраняем после каждого обновления
    saveRatingData(globalRating);
    
    // Ограничиваем размер (оставляем топ-200 для буфера)
    if (globalRating.length > 200) {
      globalRating = globalRating
        .sort((a, b) => {
          if (b.level !== a.level) return b.level - a.level;
          return b.experience - a.experience;
        })
        .slice(0, 200);
    }
    
    const sorted = globalRating
      .sort((a, b) => {
        if (b.level !== a.level) return b.level - a.level;
        return b.experience - a.experience;
      })
      .slice(0, 100);
    
    console.log(`✅ Рейтинг обновлен. Всего игроков: ${globalRating.length}`);
    res.json(sorted);
    
  } catch (error) {
    console.log('❌ Ошибка обновления рейтинга:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Очистка старых данных (опционально)
app.delete('/api/cleanup', (req, res) => {
  try {
    const oldData = globalRating.length;
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 дней
    
    globalRating = globalRating.filter(player => {
      return new Date(player.lastUpdated) > cutoffDate;
    });
    
    saveRatingData(globalRating);
    
    console.log(`🧹 Очистка: было ${oldData}, стало ${globalRating.length}`);
    res.json({ cleaned: oldData - globalRating.length, remaining: globalRating.length });
  } catch (error) {
    console.log('❌ Ошибка очистки:', error);
    res.status(500).json({ error: 'Cleanup error' });
  }
});

// Статус сервера
app.get('/', (req, res) => {
  res.json({ 
    status: 'Cherryty Rating Server is running!',
    players: globalRating.length,
    version: '2.0',
    lastUpdate: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎯 Cherryty rating server v2.0 running on port ${PORT}`);
  console.log(`💾 Хранилище: ${DATA_FILE}`);
});
