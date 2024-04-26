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

// Simple in-memory cache
let categoryCache = null;
let lastCacheTime = null;
const CACHE_DURATION = 30 * 60 * 1000; // cache duration in milliseconds, e.g., 30 minutes


// Serve static files from the 'public' directory
app.use(express.static('public'));

// API endpoint to retrieve unique categories
app.get('/api/categories', async (req, res) => {
    const now = new Date();
    if (categoryCache && lastCacheTime && (now - lastCacheTime) < CACHE_DURATION) {
        res.json(categoryCache);
        return;
    }

    try {
        const result = await sql.query`SELECT DISTINCT [分类] FROM products ORDER BY [分类]`;
        categoryCache = result.recordset;
        lastCacheTime = new Date();
        res.json(categoryCache);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).send({ message: "Error while querying database for categories", error });
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
// API endpoint to retrieve SKU and 名称 based on handle, and optional cup and size
app.get('/api/product-details', async (req, res) => {
    const { handle, cup, size } = req.query;
    try {
        let query = `SELECT sku, 名称 FROM products WHERE handle = @handle`;
        
        if (cup) query += ` AND p_cup = @cup`;
        if (size) query += ` AND p_size = @size`;

        const pool = await sql.connect(dbConfig);
        const request = pool.request()
            .input('handle', sql.NVarChar, handle);

        if (cup) request.input('cup', sql.NVarChar, cup);
        if (size) request.input('size', sql.NVarChar, size);

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send({ message: "Error while querying database for product details", error: err });
    }
});

// API endpoint to retrieve related products, filtered by category, with pagination
app.get('/api/related-products', async (req, res) => {
    const { sku, category, pageNumber, pageSize } = req.query;
    const page = pageNumber || 1;
    const size = pageSize || 20;
    const offset = (page - 1) * size;

    try {
        const pool = await sql.connect(dbConfig);
        const relatedProductsQuery = `
            WITH RelatedSKUs AS (
                SELECT DISTINCT sl.sku
                FROM sell_list sl
                WHERE sl.sell_id IN (
                    SELECT DISTINCT sl2.sell_id
                    FROM sell_list sl2
                    INNER JOIN products p ON p.sku = sl2.sku
                    WHERE sl2.sku = @sku AND p.[分类] = @category
                )
            ), OrderedProducts AS (
                SELECT 
                    ROW_NUMBER() OVER (ORDER BY p.名称) as RowNum,
                    p.sku, 
                    p.名称,
                    p.p_cup,
                    p.p_size,
                    (SELECT SUM(CAST(sl.数量 AS INT)) FROM sell_list sl WHERE sl.sku = p.sku) as weight,
                    CAST(p.BKStorage AS INT) AS BKStorage,
                    CAST(p.Brooklyn AS INT) AS Brooklyn,
                    CAST(p.Chinatown AS INT) AS Chinatown,
                    CAST(p.Flushing AS INT) AS Flushing,
                    CAST(p.BK59ST AS INT) AS BK59ST,
                    CAST(p.CA AS INT) AS CA
                FROM 
                    products p
                INNER JOIN 
                    RelatedSKUs r ON p.sku = r.sku
                WHERE 
                    p.[分类] = @category
            )
            SELECT * FROM OrderedProducts WHERE RowNum BETWEEN @offset AND @offset + @size;
        `;

        const result = await pool.request()
            .input('sku', sql.NVarChar, sku)
            .input('category', sql.NVarChar, category)
            .input('offset', sql.Int, offset)
            .input('size', sql.Int, size)
            .query(relatedProductsQuery);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Error while querying database for related products", error: err });
    }
});



// Start the server on port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
