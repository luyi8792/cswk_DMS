const mongoose = require('mongoose');
const Archive = require('../models/Archive');

// 数据库连接配置
const DB_URI = 'mongodb://root:zhsbkczj@mongodb-mongodb.ns-5a3vu6yx.svc:27017';
const DB_OPTIONS = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    dbName: 'dms'
};

// 查询所有档案
async function queryArchives() {
    try {
        // 连接数据库
        console.log('正在连接数据库...');
        console.log('连接地址:', DB_URI);
        console.log('数据库名:', DB_OPTIONS.dbName);
        
        await mongoose.connect(DB_URI, DB_OPTIONS);
        console.log('数据库连接成功');

        // 获取数据库信息
        const db = mongoose.connection.db;
        console.log('\n=== 数据库信息 ===');
        const collections = await db.listCollections().toArray();
        console.log('集合列表:', collections.map(c => c.name));
        
        // 检查 archives 集合
        const archivesCollection = collections.find(c => c.name === 'archives');
        if (!archivesCollection) {
            console.log('警告: archives 集合不存在！');
            return;
        }

        // 获取集合中的文档数量
        const count = await db.collection('archives').countDocuments();
        console.log('\n集合信息:');
        console.log('- 文档数量:', count);

        // 尝试直接从集合查询
        console.log('\n尝试直接从集合查询...');
        const rawArchives = await db.collection('archives').find().toArray();
        if (rawArchives.length > 0) {
            console.log('查询到', rawArchives.length, '条记录');
            console.log('\n第一条记录:', JSON.stringify(rawArchives[0], null, 2));
            
            // 检查数据结构
            const firstRecord = rawArchives[0];
            console.log('\n数据结构分析:');
            console.log('- 字段列表:', Object.keys(firstRecord));
            console.log('- source 字段:', firstRecord.source);
            console.log('- element 字段:', firstRecord.element);
            console.log('- tags 字段:', firstRecord.tags);
            console.log('- rawCustomData 字段:', firstRecord.rawCustomData);
            console.log('- createdAt 字段:', firstRecord.createdAt);
            console.log('- createdBy 字段:', firstRecord.createdBy);
        } else {
            console.log('集合为空');
        }

        // 使用 Mongoose 模型查询
        console.log('\n使用 Mongoose 模型查询...');
        const archives = await Archive.find().sort({ createdAt: -1 });
        console.log('Mongoose 查询结果数量:', archives.length);
        
        if (archives.length > 0) {
            console.log('\n=== 档案列表（通过 Mongoose）===');
            archives.forEach((archive, index) => {
                console.log(`\n档案 ${index + 1}:`);
                console.log('ID:', archive._id);
                console.log('来源:', archive.source);
                console.log('要素:', archive.element);
                console.log('标签:', archive.tags || []);
                console.log('自定义数据:', archive.rawCustomData || '无');
                console.log('创建者:', archive.createdBy);
                console.log('创建时间:', archive.createdAt);
                console.log('客户端IP:', archive.clientIP || '无');
                console.log('------------------------');
            });
        }
    } catch (error) {
        console.error('操作失败:', error);
        if (error.name === 'MongooseError') {
            console.error('数据库连接失败，请检查：');
            console.error('1. MongoDB 服务是否正在运行');
            console.error('2. 数据库连接字符串是否正确');
            console.error('3. 数据库端口是否正确（27017）');
            console.error('4. 用户名和密码是否正确');
        }
        console.error('错误详情:', error);
    } finally {
        // 确保无论如何都关闭连接
        try {
            await mongoose.connection.close();
            console.log('\n数据库连接已关闭');
        } catch (err) {
            console.error('关闭数据库连接时出错:', err);
        }
        // 强制退出程序
        process.exit(0);
    }
}

// 执行查询
console.log('开始查询档案...');
queryArchives(); 