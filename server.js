if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}


const express = require('express');
const app = express();
const sql = require('mssql');

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    server: process.env.DB_SERVER,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: true, // for azure
        trustServerCertificate: false // change to true for local dev / self-signed certs
    }
};

// Attempt to connect and execute queries if connection goes through
sql.connect(dbConfig).then(pool => {
    if (pool.connecting) {
        console.log('Connecting to the database...');
    }

    if (pool.connected) {
        console.log('Connected to the database.');
    }

    return pool;
}).catch(err => {
    console.error('Database connection failed!', err);
});


// Serve static files from the 'public' directory
app.use(express.static('public'));


app.get('/api/handles', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .query('SELECT DISTINCT handle FROM products'); // Adjust the query to match your actual data structure.
        res.json(result.recordset); // Send the results back to the frontend.
    } catch (err) {
        res.status(500).send({ message: "Error while querying database" });
        console.error(err);
    }
});


app.get('/api/sizes/:handle', async (req, res) => {
    const handle = req.params.handle;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('handle', sql.VarChar, handle)
            .query('SELECT DISTINCT p_size FROM products WHERE handle = @handle ORDER BY p_size');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send({ message: "Error while querying database for sizes" });
        console.error(err);
    }
});

app.get('/api/cups/:handle/:size', async (req, res) => {
    const handle = req.params.handle;
    const size = req.params.size;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('handle', sql.VarChar, handle)
            .input('size', sql.VarChar, size)
            .query('SELECT DISTINCT p_cup FROM products WHERE handle = @handle AND p_size = @size ORDER BY p_cup');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send({ message: "Error while querying database for cups" });
        console.error(err);
    }
});


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});