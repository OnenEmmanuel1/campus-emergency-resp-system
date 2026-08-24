const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function resetDatabase() {
  const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    multipleStatements: true
  };

  console.log(`Connecting to MySQL at ${dbConfig.host}:${dbConfig.port} as user '${dbConfig.user}'...`);

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to MySQL server successfully.');

    // Find MySQL datadir
    const [rows] = await connection.query("SHOW VARIABLES LIKE 'datadir'");
    const datadir = rows[0]?.Value;
    console.log('MySQL Data Directory:', datadir);

    // Disable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

    // Try dropping tables in campus_alert first if db exists
    try {
      const [tables] = await connection.query("SHOW TABLES FROM campus_alert");
      for (const row of tables) {
        const tableName = Object.values(row)[0];
        try {
          console.log(`Dropping table campus_alert.${tableName}...`);
          await connection.query(`DROP TABLE IF EXISTS campus_alert.\`${tableName}\``);
        } catch (e) {
          console.warn(`Could not drop table ${tableName}: ${e.message}`);
        }
      }
    } catch (e) {
      console.log('No existing tables or database accessible directly:', e.message);
    }

    // Try dropping database
    try {
      console.log('Dropping database campus_alert...');
      await connection.query('DROP DATABASE IF EXISTS campus_alert');
      console.log('Database dropped via SQL.');
    } catch (dropErr) {
      console.warn('SQL DROP DATABASE gave error:', dropErr.message);

      // If directory is not empty or corrupted, clean the directory in datadir
      if (datadir) {
        const dbFolder = path.join(datadir, 'campus_alert');
        if (fs.existsSync(dbFolder)) {
          console.log(`Cleaning leftover folder in MySQL datadir: ${dbFolder}`);
          try {
            fs.rmSync(dbFolder, { recursive: true, force: true });
            console.log('Removed campus_alert folder from MySQL datadir.');
            // Retry drop database in MySQL
            await connection.query('DROP DATABASE IF EXISTS campus_alert');
          } catch (fsErr) {
            console.warn('Could not remove folder directly:', fsErr.message);
          }
        }
      }
    }

    console.log('Creating database campus_alert...');
    await connection.query('CREATE DATABASE IF NOT EXISTS campus_alert DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
    console.log('Database created.');

    await connection.query('USE campus_alert;');

    console.log('Reading schema.sql...');
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing schema.sql...');
    await connection.query(schemaSql);
    console.log('Schema created successfully.');

    console.log('Reading seed.sql...');
    const seedPath = path.join(__dirname, '..', 'seed.sql');
    if (fs.existsSync(seedPath)) {
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      console.log('Executing seed.sql...');
      await connection.query(seedSql);
      console.log('Seed data inserted successfully.');
    }

    // Re-enable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('\n======================================================');
    console.log(' [SUCCESS] Database campus_alert reset and seeded!');
    console.log('======================================================\n');
  } catch (error) {
    console.error('\n[ERROR] Failed to reset database:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

resetDatabase();
