const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

router.get('/', async function (req, res, next) {
	try {
		const name = req.cookies.name;
		res.render('contact', { name: name });
	} catch (error) {
		console.error('Contact page error:', error);
		res.status(500).render('404');
	}
});

router.post('/', async function (req, res, next) {
	try {
		const { name, email, subject, category, message } = req.body;
		
		// 入力検証
		if (!name || !email || !subject || !message) {
			return res.render('contact', { 
				name: req.cookies.name,
				error: '必須項目をすべて入力してください。'
			});
		}

		// メールアドレスの簡易検証
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return res.render('contact', { 
				name: req.cookies.name,
				error: '有効なメールアドレスを入力してください。'
			});
		}

		// お問い合わせ内容をログファイルに保存
		const timestamp = new Date().toISOString();
		const logDir = path.join(__dirname, '..', 'log', 'contact');
		
		// ディレクトリが存在しない場合は作成
		if (!fs.existsSync(logDir)) {
			fs.mkdirSync(logDir, { recursive: true });
		}

		const logEntry = `
========================================
日時: ${timestamp}
名前: ${name}
メール: ${email}
件名: ${subject}
種別: ${category || '未選択'}
内容:
${message}
========================================

`;

		const logFile = path.join(logDir, `contact_${new Date().toISOString().split('T')[0]}.log`);
		fs.appendFileSync(logFile, logEntry, 'utf8');

		console.log('Contact form submitted:', { name, email, subject, category });

		res.render('contact', { 
			name: req.cookies.name,
			success: true
		});

	} catch (error) {
		console.error('Contact form error:', error);
		res.render('contact', { 
			name: req.cookies.name,
			error: 'お問い合わせの送信中にエラーが発生しました。しばらくしてから再度お試しください。'
		});
	}
});

module.exports = router;
