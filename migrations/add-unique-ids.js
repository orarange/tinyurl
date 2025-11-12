const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../models/users');

require('dotenv').config();

async function main() {
	try {
		await mongoose.connect(process.env.mongo_url);
		console.log('MongoDB接続成功');

		// uniqueIdが設定されていないユーザーを検索
		const usersWithoutUniqueId = await User.find({
			$or: [
				{ uniqueId: { $exists: false } },
				{ uniqueId: null },
				{ uniqueId: '' }
			]
		});

		console.log(`uniqueIdが未設定のユーザー: ${usersWithoutUniqueId.length}人`);

		// 各ユーザーにuniqueIdを設定
		for (const user of usersWithoutUniqueId) {
			let uniqueId;
			let isUnique = false;
			
			// ユニークなIDが生成されるまでループ
			while (!isUnique) {
				uniqueId = Date.now().toString(36) + crypto.randomBytes(8).toString('hex');
				const existingUser = await User.findOne({ uniqueId: uniqueId });
				if (!existingUser) {
					isUnique = true;
				}
			}

			// ユーザーのuniqueIdを更新
			await User.updateOne(
				{ _id: user._id },
				{ $set: { uniqueId: uniqueId } }
			);

			console.log(`ユーザー ${user.username || user.email || user.id} にuniqueId: ${uniqueId} を設定`);
		}

		console.log('マイグレーション完了');
		process.exit(0);

	} catch (error) {
		console.error('マイグレーションエラー:', error);
		process.exit(1);
	}
}

main();