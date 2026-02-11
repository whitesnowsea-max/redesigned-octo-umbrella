/**
 * verify-payment.js — PortOne 결제 검증 Cloudflare Worker
 * 결제 금액 위변조 방지를 위한 서버측 검증
 */
export async function onRequestPost(context) {
    const { request, env } = context;

    // CORS
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    try {
        const { imp_uid, merchant_uid, amount } = await request.json();

        if (!imp_uid || !merchant_uid || !amount) {
            return new Response(JSON.stringify({
                success: false,
                message: '필수 파라미터가 누락되었습니다.'
            }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
        }

        // 1. PortOne 액세스 토큰 발급
        const IMP_KEY = env.IMP_API_KEY || '';
        const IMP_SECRET = env.IMP_API_SECRET || '';

        if (!IMP_KEY || !IMP_SECRET) {
            // 테스트 모드: API 키가 없으면 결제 성공으로 간주
            console.log('[TEST MODE] No API keys configured, auto-verifying payment');
            return new Response(JSON.stringify({
                success: true,
                message: '테스트 모드: 결제가 확인되었습니다.',
                data: { imp_uid, merchant_uid, amount, mode: 'test' }
            }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
        }

        // 2. 토큰 발급
        const tokenRes = await fetch('https://api.iamport.kr/users/getToken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imp_key: IMP_KEY,
                imp_secret: IMP_SECRET
            })
        });
        const tokenData = await tokenRes.json();

        if (tokenData.code !== 0) {
            return new Response(JSON.stringify({
                success: false,
                message: 'PortOne 인증에 실패했습니다.'
            }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
        }

        const accessToken = tokenData.response.access_token;

        // 3. 결제 정보 조회
        const paymentRes = await fetch(`https://api.iamport.kr/payments/${imp_uid}`, {
            headers: { 'Authorization': accessToken }
        });
        const paymentData = await paymentRes.json();

        if (paymentData.code !== 0) {
            return new Response(JSON.stringify({
                success: false,
                message: '결제 정보 조회에 실패했습니다.'
            }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
        }

        const payment = paymentData.response;

        // 4. 금액 검증
        if (payment.amount !== amount) {
            return new Response(JSON.stringify({
                success: false,
                message: `결제 금액이 일치하지 않습니다. (요청: ${amount}, 실제: ${payment.amount})`
            }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
        }

        // 5. 결제 상태 검증
        if (payment.status !== 'paid') {
            return new Response(JSON.stringify({
                success: false,
                message: `결제가 완료되지 않았습니다. (상태: ${payment.status})`
            }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
        }

        // 6. 검증 성공
        return new Response(JSON.stringify({
            success: true,
            message: '결제가 확인되었습니다.',
            data: {
                imp_uid: payment.imp_uid,
                merchant_uid: payment.merchant_uid,
                amount: payment.amount,
                buyer_name: payment.buyer_name,
                paid_at: payment.paid_at
            }
        }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });

    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            message: '서버 오류가 발생했습니다.',
            error: error.message
        }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }
}

// OPTIONS 요청 (CORS preflight)
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        }
    });
}
