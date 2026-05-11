const bcrypt = require('bcryptjs');
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

		let passwordMatch = false;
		const isHashed = user.password && user.password.startsWith('$2');

		if (isHashed) {
			passwordMatch = await bcrypt.compare(password, user.password);
		} else {
			// 既存平文パスワードの移行: 一致したらその場でハッシュ化して保存
			passwordMatch = user.password === password;
			if (passwordMatch) {
				user.password = await bcrypt.hash(password, 12);
				await user.save();
			}
		}

		if (passwordMatch) {
			return {
				success: true,
				user: {
					id: user._id,
					uniqueId: user.uniqueId,
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
