const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

let globalRating = [];

// Получить топ-100 игроков
app.get('/api/rating', (req, res) => {
  try {
    const sorted = globalRating
      .filter(player => player && player.playerNickname)
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
    
    console.log(`🔄 Обновление рейтинга для: ${playerData.playerNickname}`);
    
    if (!playerData.userId || !playerData.playerNickname) {
      return res.status(400).json({ error: 'Invalid player data' });
    }
    
    const existingIndex = globalRating.findIndex(p => p.userId === playerData.userId);
    if (existingIndex !== -1) {
      globalRating[existingIndex] = playerData;
    } else {
      globalRating.push(playerData);
    }
    
    if (globalRating.length > 1000) {
      globalRating = globalRating.slice(0, 1000);
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

// Статус сервера
app.get('/', (req, res) => {
  res.json({ 
    status: 'Cherryty Rating Server is running!',
    players: globalRating.length,
    version: '1.0'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎯 Cherryty rating server running on port ${PORT}`);
});
