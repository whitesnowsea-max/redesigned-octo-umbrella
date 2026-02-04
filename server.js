require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// API Key from environment variable
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY가 .env 파일에 설정되지 않았습니다.');
    process.exit(1);
}

// Model fallback list
const MODELS = [
    "gemini-2.0-flash",
    "gemini-flash-latest",
    "gemini-2.5-flash-preview-05-20",
    "gemini-1.5-pro"
];

/**
 * Proxy endpoint for Gemini API
 * POST /api/chat
 * Body: { messages: [...] }
 */
app.post('/api/chat', async (req, res) => {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'messages 배열이 필요합니다.' });
    }

    let lastError = null;

    for (const modelName of MODELS) {
        for (let retry = 0; retry < 3; retry++) {
            if (retry > 0) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retry) * 1000));
            }

            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: messages.map(m => ({
                            role: m.role === 'ai' ? 'model' : m.role,
                            parts: m.parts
                        }))
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

                    if (text) {
                        return res.json({ text, model: modelName });
                    }
                    throw new Error('AI 응답에 텍스트가 없습니다.');
                }

                const errorData = await response.json().catch(() => ({}));
                const status = response.status;
                const message = errorData.error?.message || response.statusText;

                if (status === 429) {
                    lastError = new Error(`할당량 초과 (${modelName}): ${message}`);
                    continue;
                } else if (status === 404) {
                    break; // Try next model
                } else {
                    throw new Error(`API 오류 (${status}): ${message}`);
                }

            } catch (err) {
                console.warn(`${modelName} 시도 중 에러:`, err.message);
                lastError = err;
                if (!err.message.includes('429')) break;
            }
        }
    }

    res.status(500).json({
        error: lastError?.message || '모든 AI 모델 연결에 실패했습니다.'
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', apiKeyConfigured: !!GEMINI_API_KEY });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🔮 DJ 명리 - AI 사주 마스터                              ║
║                                                           ║
║   서버가 시작되었습니다!                                   ║
║   http://localhost:${PORT}                                  ║
║                                                           ║
║   API 키: ${GEMINI_API_KEY.substring(0, 10)}... (안전하게 보관됨)   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
});
