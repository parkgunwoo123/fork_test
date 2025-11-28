/**
 * 보안 강화 데이터베이스 연결 설정
 * - Connection Pooling으로 성능 최적화
 * - Prepared Statements로 SQL Injection 방지
 * - 연결 타임아웃 및 에러 핸들링
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// 데이터베이스 연결 풀 생성
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  
  // 보안 설정
  charset: 'utf8mb4', // 이모지 및 다국어 지원
  timezone: '+00:00', // UTC 타임존 사용
  
  // 연결 풀 설정
  waitForConnections: true,
  connectionLimit: 10, // 최대 연결 수
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  
  // 타임아웃 설정
  connectTimeout: 10000, // 10초
  
  // SQL 모드 설정 (엄격한 모드)
  multipleStatements: false, // SQL Injection 방지를 위해 다중 쿼리 비활성화
  
  // SSL 설정 (프로덕션 환경에서 권장)
  // ssl: {
  //   ca: fs.readFileSync('/path/to/ca.pem'),
  //   key: fs.readFileSync('/path/to/client-key.pem'),
  //   cert: fs.readFileSync('/path/to/client-cert.pem')
  // }
});

// 연결 테스트 및 에러 핸들링
pool.getConnection()
  .then(connection => {
    console.log('✅ MariaDB 연결 성공');
    connection.release();
  })
  .catch(err => {
    console.error('❌ MariaDB 연결 실패:', err.message);
    process.exit(1);
  });

// 연결 풀 에러 핸들링
pool.on('error', (err) => {
  console.error('MariaDB 풀 에러:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('데이터베이스 연결이 끊어졌습니다.');
  }
});

// 쿼리 헬퍼 함수 (Prepared Statement 사용)
const query = async (sql, params = []) => {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('DB Query Error:', error);
    throw error;
  }
};

// 트랜잭션 헬퍼 함수
const transaction = async (callback) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  pool,
  query,
  transaction
};
