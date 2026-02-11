/**
 * /api/credits — 크레딧 조회/차감/충전 Worker
 * 세션 토큰 검증 후 KV에서 크레딧 관리
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
}

// 세션 토큰 검증 (kakao.js와 동일 로직)
async function verifySessionToken(token, env) {
    try {
        const decoded = atob(token);
        const parts = decoded.split(':');
        if (parts.length < 3) return null;
        const userId = parts[0];
        const ts = parts[1];
        const sigHex = parts.slice(2).join(':');
        const age = Date.now() - parseInt(ts);
        if (age > 30 * 24 * 60 * 60 * 1000) return null;
        const secret = env.SESSION_SECRET || 'saju-default-secret-change-me';
        const payload = `${userId}:${ts}`;
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw', encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
        );
        const expected = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
        const expectedHex = [...new Uint8Array(expected)].map(b => b.toString(16).padStart(2, '0')).join('');
        if (sigHex !== expectedHex) return null;
        return userId;
    } catch { return null; }
}

function getToken(request) {
    const auth = request.headers.get('Authorization') || '';
    if (auth.startsWith('Bearer ')) return auth.slice(7);
    return null;
}

// GET /api/credits — 잔액 조회
export async function onRequestGet(context) {
    const { request, env } = context;
    const KV = env.SAJU_USERS;
    if (!KV) return jsonResponse({ success: false, message: 'KV 미설정' }, 500);

    const token = getToken(request);
    if (!token) return jsonResponse({ success: false, message: '인증이 필요합니다.' }, 401);

    const userId = await verifySessionToken(token, env);
    if (!userId) return jsonResponse({ success: false, message: '세션이 만료되었습니다.' }, 401);

    const data = await KV.get(`user:${userId}`);
    if (!data) return jsonResponse({ success: false, message: '사용자를 찾을 수 없습니다.' }, 404);

    const user = JSON.parse(data);
    return jsonResponse({
        success: true,
        credits: user.credits,
        premiumExpiry: user.premiumExpiry,
        nickname: user.nickname
    });
}

// POST /api/credits — 크레딧 차감 또는 충전
export async function onRequestPost(context) {
    const { request, env } = context;
    const KV = env.SAJU_USERS;
    if (!KV) return jsonResponse({ success: false, message: 'KV 미설정' }, 500);

    const token = getToken(request);
    if (!token) return jsonResponse({ success: false, message: '인증이 필요합니다.' }, 401);

    const userId = await verifySessionToken(token, env);
    if (!userId) return jsonResponse({ success: false, message: '세션이 만료되었습니다.' }, 401);

    const body = await request.json();
    const { action, amount, purchaseId } = body;
    // action: 'use' (차감 1) | 'add' (충전)

    const data = await KV.get(`user:${userId}`);
    if (!data) return jsonResponse({ success: false, message: '사용자를 찾을 수 없습니다.' }, 404);

    const user = JSON.parse(data);

    if (action === 'use') {
        if (user.credits <= 0) {
            return jsonResponse({ success: false, message: '크레딧이 부족합니다.', credits: 0 }, 400);
        }
        user.credits -= 1;
        if (!user.history) user.history = [];
        user.history.push({ type: 'use', amount: -1, at: new Date().toISOString() });
    } else if (action === 'add') {
        const n = parseInt(amount) || 0;
        if (n <= 0) return jsonResponse({ success: false, message: '유효하지 않은 수량' }, 400);
        user.credits += n;
        if (!user.history) user.history = [];
        user.history.push({ type: 'purchase', amount: n, purchaseId, at: new Date().toISOString() });
    } else if (action === 'premium') {
        // 프리미엄 30일권
        user.premiumExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        if (!user.history) user.history = [];
        user.history.push({ type: 'premium', purchaseId, at: new Date().toISOString() });
    } else {
        return jsonResponse({ success: false, message: '알 수 없는 action' }, 400);
    }

    await KV.put(`user:${userId}`, JSON.stringify(user));

    return jsonResponse({
        success: true,
        credits: user.credits,
        premiumExpiry: user.premiumExpiry
    });
}

export async function onRequestOptions() {
    return new Response(null, { headers: corsHeaders });
}
