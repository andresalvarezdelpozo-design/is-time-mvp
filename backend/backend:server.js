const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Actualizar tiempo antes de cada consulta
async function updateUserTime(userId) {
    await pool.query(
        `UPDATE users 
         SET time_balance_ms = GREATEST(0, time_balance_ms - EXTRACT(EPOCH FROM (NOW() - last_updated)) * 1000),
             last_updated = NOW(),
             is_frozen = CASE WHEN time_balance_ms <= 0 THEN TRUE ELSE is_frozen END
         WHERE id = $1`,
        [userId]
    );
}

// Registro
app.post('/api/register', async (req, res) => {
    const { username } = req.body;
    if (!username || username.length < 2 || username.length > 12) {
        return res.status(400).json({ error: 'Username inválido' });
    }
    
    try {
        const result = await pool.query(
            'INSERT INTO users (username) VALUES ($1) RETURNING id, username, time_balance_ms',
            [username]
        );
        res.json({ 
            user: result.rows[0],
            initialTime: 72 * 60 * 60 * 1000 // 72h en ms
        });
    } catch (err) {
        res.status(400).json({ error: 'Username ya existe' });
    }
});

// Obtener tiempo actual (con anti-cheat server-side)
app.get('/api/time/:userId', async (req, res) => {
    const { userId } = req.params;
    await updateUserTime(userId);
    
    const result = await pool.query(
        'SELECT time_balance_ms, is_frozen, username FROM users WHERE id = $1',
        [userId]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    res.json({
        timeMs: parseInt(result.rows[0].time_balance_ms),
        isFrozen: result.rows[0].is_frozen,
        username: result.rows[0].username
    });
});

// Generar QR temporal para Make Friend
app.post('/api/qr/generate', async (req, res) => {
    const { userId } = req.body;
    const qrToken = require('crypto').randomUUID();
    const expiresAt = new Date(Date.now() + 10000); // 10 segundos
    
    // Guardar en memoria temporal (Redis en producción)
    global.qrCodes = global.qrCodes || {};
    global.qrCodes[qrToken] = { userId, expiresAt };
    
    res.json({ qrToken, expiresAt });
});

// Escanear QR y crear amistad
app.post('/api/friend/scan', async (req, res) => {
    const { scannerId, qrToken } = req.body;
    
    const qrData = global.qrCodes?.[qrToken];
    if (!qrData || new Date() > qrData.expiresAt) {
        return res.status(400).json({ error: 'QR expirado' });
    }
    
    const friendId = qrData.userId;
    if (scannerId === friendId) return res.status(400).json({ error: 'No puedes ser tu propio amigo' });
    
    // Verificar límite diario de amigos
    const today = new Date().toISOString().split('T')[0];
    const dailyCheck = await pool.query(
        'SELECT friends_made FROM daily_actions WHERE user_id = $1 AND date = $2',
        [scannerId, today]
    );
    
    const friendsMade = dailyCheck.rows[0]?.friends_made || 0;
    if (friendsMade >= 1) {
        return res.status(400).json({ error: 'Ya hiciste un amigo hoy' });
    }
    
    // Verificar si ya son amigos
    const existing = await pool.query(
        'SELECT * FROM friendships WHERE (user_id_1 = $1 AND user_id_2 = $2) OR (user_id_1 = $2 AND user_id_2 = $1)',
        [scannerId, friendId]
    );
    
    if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Ya son amigos' });
    }
    
    // Determinar recompensa según orden del día
    const rewardTier = Math.min(friendsMade + 1, 4); // 1,2,3,4
    const rewards = { 1: 24*60*60*1000, 2: 12*60*60*1000, 3: 4*60*60*1000, 4: 0 };
    const rewardMs = rewards[rewardTier];
    
    // Crear amistad y dar recompensa
    await pool.query('BEGIN');
    
    await pool.query(
        'INSERT INTO friendships (user_id_1, user_id_2, reward_tier) VALUES ($1, $2, $3)',
        [scannerId, friendId, rewardTier]
    );
    
    // Actualizar o crear registro diario
    await pool.query(
        `INSERT INTO daily_actions (user_id, date, friends_made) 
         VALUES ($1, $2, 1) 
         ON CONFLICT (user_id, date) 
         DO UPDATE SET friends_made = daily_actions.friends_made + 1`,
        [scannerId, today]
    );
    
    // Dar tiempo si aplica
    if (rewardMs > 0) {
        await pool.query(
            'UPDATE users SET time_balance_ms = time_balance_ms + $1 WHERE id = $2',
            [rewardMs, scannerId]
        );
        
        await pool.query(
            'INSERT INTO time_transfers (from_user, to_user, amount_ms, type) VALUES ($1, $2, $3, $4)',
            [null, scannerId, rewardMs, 'friend_reward']
        );
    }
    
    await pool.query('COMMIT');
    
    // Notificar al otro usuario (WebSocket en versión futura)
    
    res.json({ 
        success: true, 
        rewardMs,
        rewardTier,
        message: rewardTier === 1 ? '¡Primer amigo! +24 horas' : 
                 rewardTier === 2 ? '¡Segundo amigo! +12 horas' :
                 rewardTier === 3 ? '¡Tercer amigo! +4 horas' : 'Amigo añadido (sin recompensa)'
    });
});

// Enviar tiempo (regalo)
app.post('/api/time/send', async (req, res) => {
    const { fromId, toId, amountMs } = req.body;
    
    // Validar límite diario de regalos
    const today = new Date().toISOString().split('T')[0];
    const dailyCheck = await pool.query(
        'SELECT gifts_sent FROM daily_actions WHERE user_id = $1 AND date = $2',
        [fromId, today]
    );
    
    if (dailyCheck.rows[0]?.gifts_sent >= 1) {
        return res.status(400).json({ error: 'Ya enviaste un regalo hoy' });
    }
    
    // Verificar que son amigos
    const friendship = await pool.query(
        'SELECT * FROM friendships WHERE (user_id_1 = $1 AND user_id_2 = $2) OR (user_id_1 = $2 AND user_id_2 = $1)',
        [fromId, toId]
    );
    
    if (friendship.rows.length === 0) {
        return res.status(400).json({ error: 'Solo amigos pueden enviarse tiempo' });
    }
    
    // Verificar balance
    await updateUserTime(fromId);
    const balanceCheck = await pool.query('SELECT time_balance_ms FROM users WHERE id = $1', [fromId]);
    if (parseInt(balanceCheck.rows[0].time_balance_ms) < amountMs) {
        return res.status(400).json({ error: 'Tiempo insuficiente' });
    }
    
    // Transferir
    await pool.query('BEGIN');
    
    await pool.query('UPDATE users SET time_balance_ms = time_balance_ms - $1 WHERE id = $2', [amountMs, fromId]);
    await pool.query('UPDATE users SET time_balance_ms = time_balance_ms + $1 WHERE id = $2', [amountMs, toId]);
    
    await pool.query(
        'INSERT INTO time_transfers (from_user, to_user, amount_ms, type) VALUES ($1, $2, $3, $4)',
        [fromId, toId, amountMs, 'gift']
    );
    
    await pool.query(
        `INSERT INTO daily_actions (user_id, date, gifts_sent) 
         VALUES ($1, $2, 1) 
         ON CONFLICT (user_id, date) 
         DO UPDATE SET gifts_sent = daily_actions.gifts_sent + 1`,
        [fromId, today]
    );
    
    await pool.query('COMMIT');
    
    res.json({ success: true, amountMs, message: `Enviaste ${Math.floor(amountMs/3600000)}h ${Math.floor((amountMs%3600000)/60000)}m` });
});

// Enviar token
app.post('/api/token/send', async (req, res) => {
    const { senderId, receiverId, messageType } = req.body;
    const affectsTime = messageType === 1; // "¡Pásame un pito de vida!"
    
    // Verificar límite diario (5 tokens)
    const today = new Date().toISOString().split('T')[0];
    const dailyCheck = await pool.query(
        'SELECT tokens_used FROM daily_actions WHERE user_id = $1 AND date = $2',
        [senderId, today]
    );
    
    const tokensUsed = dailyCheck.rows[0]?.tokens_used || 0;
    if (tokensUsed >= 5) {
        return res.status(400).json({ error: 'No te quedan tokens hoy' });
    }
    
    // Guardar token
    await pool.query(
        'INSERT INTO tokens (sender_id, receiver_id, message_type, affects_time) VALUES ($1, $2, $3, $4)',
        [senderId, receiverId, messageType, affectsTime]
    );
    
    // Actualizar contador
    await pool.query(
        `INSERT INTO daily_actions (user_id, date, tokens_used) 
         VALUES ($1, $2, 1) 
         ON CONFLICT (user_id, date) 
         DO UPDATE SET tokens_used = daily_actions.tokens_used + 1`,
        [senderId, today]
    );
    
    // Verificar bonus de 5 tokens
    let bonusMs = 0;
    if (tokensUsed + 1 === 5) {
        // Verificar que fueron a 5 amigos distintos
        const distinctFriends = await pool.query(
            'SELECT COUNT(DISTINCT receiver_id) FROM tokens WHERE sender_id = $1 AND DATE(created_at) = $2',
            [senderId, today]
        );
        
        if (parseInt(distinctFriends.rows[0].count) === 5) {
            bonusMs = 6 * 60 * 60 * 1000; // 6h
            await pool.query('UPDATE users SET time_balance_ms = time_balance_ms + $1 WHERE id = $2', [bonusMs, senderId]);
        }
    }
    
    res.json({ 
        success: true, 
        affectsTime, 
        bonusMs,
        responseEmoji: '😎⏳😂🔥'
    });
});

// Obtener lista de amigos
app.get('/api/friends/:userId', async (req, res) => {
    const { userId } = req.params;
    
    const result = await pool.query(`
        SELECT u.id, u.username, u.time_balance_ms, u.is_frozen, f.reward_tier, f.created_at as friendship_date
        FROM friendships f
        JOIN users u ON (u.id = f.user_id_2 OR u.id = f.user_id_1)
        WHERE (f.user_id_1 = $1 OR f.user_id_2 = $1) AND u.id != $1
        ORDER BY u.time_balance_ms ASC
    `, [userId]);
    
    res.json(result.rows);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`IS TIME backend en puerto ${PORT}`));