const express = require('express');
const mysql2 = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

/*** REMEMBER ***/
const PORT = process.env.PORT_V2 || 3000; //Add PORT in .env file.
const ALLOWEDORIGINGS = process.env.ALLOWED_ORIGINS; //Add ALLOWED_ORIGINS to .env file.

//CORS
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (ALLOWEDORIGINGS.indexOf(origin) === -1) {
            var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }

        return callback(null, true);
    }
}));



const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
};


/* GET all products */
app.get('/' + process.env.TEST_PRODUCT_API, async (req, res) => {

    console.log(' ** GET all products ** ');

    const sqlClause = `SELECT id, name, description FROM ${process.env.TEST_PRODUCT};`;

    const connection = await mysql2.createConnection(dbConfig);
    const [product] = await connection.execute(sqlClause);

    console.log(product);

    await connection.end();
    res.json(product);

});


/*** ADD new product ***/
async function insertNewProduct(data) {

    const { productName } = data;

    const sqlClause = `INSERT ${process.env.TEST_PRODUCT} (name) VALUES ('${productName}')`;

    const connection = await mysql2.createConnection(dbConfig);
    const [rows] = await connection.execute(sqlClause);
    await connection.end();
    return rows;
}

app.post('/' + process.env.TEST_PRODUCT_API, async (req, res) => {

    console.log(' ** ADD new product ** ');

    try {
        const result = await insertNewProduct(req.body);
        res.status(201).send({ message: 'Data inserted successfully', result });
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).send({ message: 'Error inserting data into database' });
    }
});


/*** GET all shoppinglists by USERID ***/
app.get('/' + process.env.TEST_SHOPPINGLISTS_API + '/:id', validateNumber, async (req, res) => {

    console.log(' ** GET all shoppinglists by USERID ** ');

    const { id } = req.params;

    const sqlClause = `SELECT id, name FROM ${process.env.TEST_SHOPPINGLISTS} WHERE user_id = ${id};`;

    const connection = await mysql2.createConnection(dbConfig);
    const [result] = await connection.execute(sqlClause);

    await connection.end();
    console.log(result);
    res.json(result);
});


/*** GET shoppinglist products by shoppinglistID ***/
app.get('/' + process.env.TEST_SHOPPINGLISTPRODUCTS_API + '/:id', validateNumber, async (req, res) => {

    console.log(' ** GET all products in shoppinglist ** ');

    const { id } = req.params;

    const sqlClause = `SELECT SLP.id, SLP.shoppinglist_id, SLP.product_id, P.name, SLP.is_checked 
                        FROM ${process.env.TEST_SHOPPINGLISTPRODUCTS} SLP
                        LEFT JOIN ${process.env.TEST_PRODUCT} P ON SLP.product_id = P.id
                        WHERE shoppinglist_id = ${id};`;

    const connection = await mysql2.createConnection(dbConfig);
    const [products] = await connection.execute(sqlClause);

    await connection.end();
    console.log(products);
    res.json(products);
});


/*** UPDATE product name by productId ***/
app.put('/' + process.env.TEST_PRODUCT_API + '/:id', async (req, res) => {

    console.log(' ** UPDATE product name by productId ** ');

    const { id } = req.params;
    const { name } = req.body;

    const sqlClause = `UPDATE ${process.env.TEST_PRODUCT} SET name = '${name}' WHERE id = '${id}';`;

    try {
        const connection = await mysql2.createConnection(dbConfig);
        const [result] = await connection.execute(sqlClause);
        await connection.end();

        if (result.affectedRows === 0) {
            res.status(404).send({ message: 'No product found with the given ID or no change made.' });
        } else {
            res.send({ message: 'Product is updated!' });
        }
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).send({ message: 'Error updating product in the database' });
    }
});


/*** UPDATE shoppinglist checked ***/
app.put('/' + process.env.TEST_SHOPPINGLISTPRODUCTS_API + '/:id', async (req, res) => {

    console.log(' ** UPDATE shoppinglist checked ** ');

    const { id } = req.params;
    const { productId, checked } = req.body;

    const sqlClause = `UPDATE ${process.env.TEST_SHOPPINGLISTPRODUCTS} SET is_checked = ${!checked} WHERE shoppinglist_id = ${id} AND product_id = ${productId};`;    

    try {
        const connection = await mysql2.createConnection(dbConfig);
        const [result] = await connection.execute(sqlClause);
        await connection.end();

        if (result.affectedRows === 0) {
            res.status(404).send({ message: 'No product found with the given ID or no change made.' });
        } else {
            res.send({ message: 'Product is updated!' });
        }
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).send({ message: 'Error updating product in the database' });
    }
});



/*** ADD product to shoppinglist ***/
async function insertProductToShoppingList(data) {

    const { shoppinglist_id, product_id } = data;

    const sqlClause = `INSERT ${process.env.TEST_SHOPPINGLISTPRODUCTS} (shoppinglist_id, product_id) VALUES (${shoppinglist_id}, ${product_id})`;
    
    const connection = await mysql2.createConnection(dbConfig);
    const [rows] = await connection.execute(sqlClause);
    await connection.end();
    return rows;
}

app.post('/' + process.env.TEST_SHOPPINGLISTPRODUCTS_API, async (req, res) => {

    console.log(' ** INSERT product to shoppinglist ** ');

    try {
        const result = await insertProductToShoppingList(req.body);
        res.status(201).send({ message: 'Data inserted successfully', result });
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).send({ message: 'Error inserting data into database' });
    }
});


/*** Remove product from shoppinglist ****/
app.delete('/' + process.env.TEST_SHOPPINGLISTPRODUCTS_API + '/:id', async (req, res) => {

    console.log(' ** Remove product from shoppinglist ** ');

    const { id } = req.params;
    const sqlClause = `DELETE FROM ${process.env.TEST_SHOPPINGLISTPRODUCTS} WHERE id = '${id}';`;    

    try {
        const connection = await mysql2.createConnection(dbConfig);
        const [result] = await connection.execute(sqlClause);
        await connection.end();

        if (result.affectedRows === 0) {
            res.status(404).send({ message: 'No record found with the given ID' });
        } else {
            res.send({ message: 'Product removed successfully' });
        }
    } catch (error) {
        console.error('Error removing product:', error);
        res.status(500).send({ message: 'Error removing product from shoppinglist' });
    }
});

/*** VALIDATE id ***/
function validateNumber(req, res, next) {
    const id = req.params.id;    

    if (!id || isNaN(Number(id))) {
        console.log(`*!* Validation is not good! *!*`);
        return res.status(400).send({ error: 'parameter must be a valid number' });
    }
    next();
}












// Error handling middleware
app.use((error, req, res, next) => {
    res.status(error.status || 500).json({
        error: {
            message: error.message,
        },
    });
});

// PORT LISTENING
app.listen(PORT, () => {
    console.log(`Server is running in PORT=${PORT}`);
});
