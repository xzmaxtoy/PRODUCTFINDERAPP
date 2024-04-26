if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
// Import required modules
const express = require('express');
const sql = require('mssql');

// Initialize express app
const app = express();

// Set up database configuration
const dbConfig = {
    user: process.env.DB_USER, // Set your DB user
    password: process.env.DB_PASSWORD, // Set your DB password
    database: process.env.DB_NAME, // Set your DB name
    server: process.env.DB_SERVER, // Set your DB server
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: true,
        trustServerCertificate: false
    }
};

// Connect to the database
sql.connect(dbConfig).then(() => {
    console.log('Connected to the database successfully.');
}).catch(err => {
    console.error('Database connection failed:', err);
});

// Serve static files from the 'public' directory
app.use(express.static('public'));

// API endpoint to retrieve unique categories
app.get('/api/categories', async (req, res) => {
    try {
        const result = await sql.query`SELECT DISTINCT [分类] FROM products ORDER BY [分类]`;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send({ message: "Error while querying database for categories", error: err });
    }
});

// API endpoint to retrieve handles filtered by category
app.get('/api/handles', async (req, res) => {
    const { category } = req.query;
    try {
        let query = `SELECT DISTINCT handle FROM products`;
        if (category) {
            query += ` WHERE [分类] = @category`;
        }
        query += ` ORDER BY handle`;

        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('category', sql.NVarChar, category)
            .query(query);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send({ message: "Error while querying database for handles", error: err });
    }
});

// API endpoint to retrieve sizes based on handle
app.get('/api/sizes/:handle', async (req, res) => {
    const { handle } = req.params;
    try {
        const result = await sql.query`SELECT DISTINCT p_size FROM products WHERE handle = ${handle} ORDER BY p_size`;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send({ message: "Error while querying database for sizes", error: err });
    }
});

// API endpoint to retrieve cups based on handle and size
app.get('/api/cups/:handle/:size', async (req, res) => {
    const { handle, size } = req.params;
    try {
        const result = await sql.query`SELECT DISTINCT p_cup FROM products WHERE handle = ${handle} AND p_size = ${size} ORDER BY p_cup`;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send({ message: "Error while querying database for cups", error: err });
    }
});

// Start the server on port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
