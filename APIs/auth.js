const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const apiToken = require('../models/apiToken');
const Users = require('../models/users');

const ORARAN_BASE = process.env.ORARAN_BASE || 'https://oraran.jp';
const ORARAN_API_KEY = process.env.ORARAN_API_KEY || '';

async function checkApiKey(req, res, next) {
    const key = req.headers['x-api-key'];
    if (!key) return res.status(401).json({ ok: false, error: 'X-Api-Key header required' });

    try {
        const tokenDoc = await apiToken.findOne({ token: key, isActive: true });
        if (!tokenDoc) return res.status(403).json({ ok: false, error: 'Invalid API key' });
        req.appToken = tokenDoc;
        next();
    } catch (err) {
        console.error('API key check error:', err);
        res.status(500).json({ ok: false, error: 'Internal Server Error' });
    }
}

// POST /api/auth/send
// このサーバーではメール送信を行わず、oraran.jp の send エンドポイントを呼び出します。
router.post('/send', checkApiKey, async (req, res) => {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ ok: false, error: 'email is required' });

    try {
        const resp = await axios.post(`${ORARAN_BASE}/api/auth/send`, { email }, {
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': ORARAN_API_KEY
            },
            timeout: 5000
        });

        // oraran.jp のレスポンスをそのまま返す
        return res.status(resp.status).json(resp.data);
    } catch (err) {
        console.error('Error proxying /api/auth/send to oraran:', err.message || err);
        if (err.response && err.response.data) {
            return res.status(err.response.status || 500).json(err.response.data);
        }
        return res.status(502).json({ ok: false, error: 'Bad Gateway' });
    }
});

// POST /api/auth/verify
// oraran.jp に検証を委譲し、検証成功時のみローカルでユーザーを作成／識別します。
router.post('/verify', checkApiKey, async (req, res) => {
    const { email, pinCode } = req.body || {};
    if (!email || !pinCode) return res.status(400).json({ ok: false, error: 'email and pinCode are required' });

    try {
        const resp = await axios.post(`${ORARAN_BASE}/api/auth/verify`, { email, pinCode }, {
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': ORARAN_API_KEY
            },
            timeout: 5000
        });

        // oraran の検証結果をそのまま返す（ユーザー作成は登録ルート側で行う）
        return res.status(resp.status).json(resp.data);
    } catch (err) {
        console.error('Error proxying /api/auth/verify to oraran:', err.message || err);
        if (err.response && err.response.data) {
            return res.status(err.response.status || 500).json(err.response.data);
        }
        return res.status(502).json({ ok: false, error: 'Bad Gateway' });
    }
});

module.exports = router;
