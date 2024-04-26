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

// API endpoint to retrieve related products and their details with pagination
app.get('/api/related-products', async (req, res) => {
    const { sku, pageNumber, pageSize } = req.query; // pageNumber and pageSize are used for pagination
    const page = pageNumber || 1; // Default to page 1 if not provided
    const size = pageSize || 20; // Default to 20 rows per page if not provided
    const offset = (page - 1) * size; // Calculate the offset

    try {
        const pool = await sql.connect(dbConfig);
        const relatedProductsQuery = `
        WITH OrderedProducts AS (
            SELECT 
                ROW_NUMBER() OVER (ORDER BY SUM(CAST(ISNULL(sl.数量, 0) AS INT)) DESC) as RowNum,
                sl.sku, 
                p.名称, 
                p.p_cup, 
                p.p_size, 
                SUM(CAST(ISNULL(sl.数量, 0) AS INT)) as weight,
                CAST(p.BKStorage AS INT) AS BKStorage,
                CAST(p.Brooklyn AS INT) AS Brooklyn,
                CAST(p.Chinatown AS INT) AS Chinatown,
                CAST(p.Flushing AS INT) AS Flushing,
                CAST(p.BK59ST AS INT) AS BK59ST,
                CAST(p.CA AS INT) AS CA
            FROM 
                sell_list sl
            INNER JOIN 
                products p ON sl.sku = p.sku
            WHERE 
                sl.sell_id IN (SELECT sell_id FROM sell_list WHERE sku = @sku)
                AND sl.sku != @sku
            GROUP BY 
                sl.sku, p.名称, p.p_cup, p.p_size, p.BKStorage, p.Brooklyn, p.Chinatown, p.Flushing, p.BK59ST, p.CA
        )
        SELECT * FROM OrderedProducts WHERE RowNum BETWEEN @offset AND @offset + @size
    `;
    

        const result = await pool.request()
            .input('sku', sql.NVarChar, sku)
            .input('offset', sql.Int, offset)
            .input('size', sql.Int, size)
            .query(relatedProductsQuery);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).send({ message: "Error while querying database for related products", error: err });
    }
});



// Start the server on port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
