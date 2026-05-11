const mongoose = require('mongoose');
const User = require('./models/users');

require('dotenv').config();

async function main() {
	try {
		await mongoose.connect(process.env.mongo_url);
		console.log('MongoDB接続成功');

		// 全ユーザーのuniqueIDを表示
		const users = await User.find({}, { username: 1, email: 1, id: 1, uniqueId: 1 });
		
		console.log('\n=== 全ユーザーのuniqueID一覧 ===');
		users.forEach(user => {
			console.log(`ユーザー名: ${user.username || 'N/A'}`);
			console.log(`メール: ${user.email || 'N/A'}`);
			console.log(`Discord ID: ${user.id || 'N/A'}`);
			console.log(`UniqueID: ${user.uniqueId || 'N/A'}`);
			console.log('---');
		});

		console.log(`\n総ユーザー数: ${users.length}`);
		console.log('\n管理者に設定したいユーザーのuniqueIDを.envファイルの admin_unique_ids に設定してください');

		process.exit(0);

	} catch (error) {
		console.error('エラー:', error);
		process.exit(1);
	}
}

main();