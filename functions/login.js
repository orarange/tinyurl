const mongoose = require('mongoose');
const User = require('../models/users');

async function verifyLogin(email, password) {
	if (!email || !password) {
		return { success: false, message: 'メールアドレスとパスワードを入力してください' };
	}

	try {
		const user = await User.findOne({ email: email });
		
		if (!user) {
			return { success: false, message: 'メールアドレスまたはパスワードが正しくありません' };
		}

		// パスワードの照合（プレーンテキスト比較）
		// 注: 本番環境ではbcryptなどでハッシュ化すべき
		if (user.password === password) {
			return { 
				success: true, 
				user: {
					id: user._id,
					username: user.username,
					email: user.email
				}
			};
		} else {
			return { success: false, message: 'メールアドレスまたはパスワードが正しくありません' };
		}
	} catch (err) {
		console.error('Login error:', err);
		return { success: false, message: 'ログイン処理中にエラーが発生しました' };
	}
}

module.exports = {
	verifyLogin
};
