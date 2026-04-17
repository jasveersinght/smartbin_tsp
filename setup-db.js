const mysql = require('mysql2/promise');

async function setupDatabase() {
    // Create connection without specifying a database first
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'shashwat18@#'
    });

    try {
        console.log('Creating database...');
        await connection.query('CREATE DATABASE IF NOT EXISTS smart_waste_db');
        await connection.query('USE smart_waste_db');
        
        console.log('Creating tables...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS bins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                location_lat FLOAT NOT NULL,
                location_lng FLOAT NOT NULL,
                fill_level INT NOT NULL DEFAULT 0,
                area VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )`);

        console.log('Adding sample data...');
        await connection.query(`
            INSERT INTO bins (location_lat, location_lng, area, fill_level) VALUES
            (13.0423, 80.2337, 'T. Nagar', 35),
            (13.0338, 80.2667, 'Mylapore', 82),
            (13.0007, 80.2550, 'Adyar', 91),
            (13.0878, 80.2120, 'Anna Nagar', 68),
            (13.0560, 80.2496, 'Nungambakkam', 54),
            (12.9801, 80.2192, 'Velachery', 77),
            (12.9983, 80.2707, 'Besant Nagar', 63),
            (13.0102, 80.2209, 'Saidapet', 48),
            (12.9240, 80.1275, 'Tambaram', 72),
            (13.1143, 80.1548, 'Ambattur', 58)
            ON DUPLICATE KEY UPDATE id=id`);

        console.log('✅ Database setup completed successfully!');
    } catch (error) {
        console.error('❌ Error setting up database:', error);
    } finally {
        await connection.end();
        process.exit();
    }
}

setupDatabase();
