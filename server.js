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

// API endpoint to retrieve SKU and 名称 based on handle, cup, and size
app.get('/api/product-details', async (req, res) => {
    const { handle, cup, size } = req.query;

    // Log received parameters for debugging
    console.log('Received parameters:', { handle, cup, size });

    try {
        const pool = await sql.connect(dbConfig);
        const request = pool.request();

        // Add input parameters to the request
        request.input('handle', sql.NVarChar, handle);
        request.input('cup', sql.NVarChar, cup);
        request.input('size', sql.NVarChar, size);

        // Construct and log the SQL query for debugging
        const query = `SELECT sku, 名称 FROM products WHERE handle = @handle AND p_cup = @cup AND p_size = @size`;
        console.log('Executing query:', query);

        // Execute the query
        const result = await request.query(query);

        // Log the result for debugging
        console.log('Query result:', result.recordset);

        // Send the result to the client
        res.json(result.recordset);
    } catch (err) {
        console.error('Error querying database:', err);
        res.status(500).send({ message: "Error while querying database for product details", error: err });
    }
});


// Start the server on port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
