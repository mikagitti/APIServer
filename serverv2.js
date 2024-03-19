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


//CONFIG
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
};

/* GET all users */
app.get('/' + process.env.TEST_USER_API, async (req, res) => {

    console.log(' ** GET all users ** ');

    const sqlClause = `SELECT id, username FROM ${process.env.TEST_USER}`;    
    const connection = await mysql2.createConnection(dbConfig);
    const [product] = await connection.execute(sqlClause);
    await connection.end();

    res.json(product);

});

/* GET all products */
app.get('/' + process.env.TEST_PRODUCT_API, async (req, res) => {

    console.log(' ** GET all products ** ');

    const sqlClause = `SELECT id, name, description FROM ${process.env.TEST_PRODUCT}`;
    const connection = await mysql2.createConnection(dbConfig);
    const [product] = await connection.execute(sqlClause);
    await connection.end();

    res.json(product);
});


/*** ADD new product ***/
async function insertNewProduct(data) {

    const { productName, description } = data;
    const sqlClause = `INSERT ${process.env.TEST_PRODUCT} (name, description) VALUES ('${productName}', '${description}')`;
    const connection = await mysql2.createConnection(dbConfig);
    const [rows] = await connection.execute(sqlClause);
    await connection.end();

    return rows;
}

app.post('/' + process.env.TEST_PRODUCT_API, async (req, res) => {

    console.log(' ** Add new product ** ');

    try {
        const result = await insertNewProduct(req.body);
        res.status(201).send({ message: 'Data inserted successfully', result });
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).send({ message: 'Error inserting data into database' });
    }
});


/*** Delete product ****/
app.delete('/' + process.env.TEST_PRODUCT_API + '/:id', async (req, res) => {

    console.log(' ** DELETE product ** ');

    const id = req.params.id;
    const sqlClauseShoppingListProducts = `DELETE FROM ${process.env.TEST_SHOPPINGLISTPRODUCTS} WHERE product_id = ${id}`;
    const sqlClauseProducts = `DELETE FROM ${process.env.TEST_PRODUCT} WHERE id = ${id}`;

    try {
        const connection = await mysql2.createConnection(dbConfig);

        // Start transaction
        await connection.beginTransaction();

        // Delete product from shopping lists
        await connection.execute(sqlClauseShoppingListProducts);

        // Delete the product
        const [deleteProductResult] = await connection.execute(sqlClauseProducts);

        if (deleteProductResult.affectedRows === 0) {
            // Rollback transaction 
            await connection.rollback();
            res.status(404).send('Product not found');
        } else {
            // Commit transaction if everything is fine
            await connection.commit();
            res.send('Product deleted and product removed from shopping lists successfully');
        }

    } catch (error) {
        console.error('Failed to delete product:', error);
        try {
            await connection.rollback();
        } catch (rollbackError) {
            console.error('Rollback failed:', rollbackError);
        }
        res.status(500).send('Failed to delete product');
    }
});


/*** ADD new shopping list for user ***/
app.post('/' + process.env.TEST_SHOPPINGLISTS_API, async (req, res) => {

    console.log(' ** Add new shopping list for user ** ');
    
    const { name, userid } = req.body;
    const sqlClause = `INSERT ${process.env.TEST_SHOPPINGLISTS} (name, user_id) VALUES ('${name}', ${userid})`;
    const connection = await mysql2.createConnection(dbConfig);

    try {
        const result = await connection.execute(sqlClause);
        res.status(200).send({ message: 'Shopping list inserted successfully', result });
    } catch (error) {
        console.error('Error inserting shopping list:', error);
        res.status(500).send({ message: 'Error inserting shopping list into database' });
    } finally {
        await connection.end();
    }
});


/*** UPDATE shopping list name ***/
app.put('/' + process.env.TEST_SHOPPINGLISTS_API + '/:id', async (req, res) => {

    console.log(' ** UPDATE shopping list name ** ');

    const { id } = req.params;
    const { name } = req.body;
    const sqlClause = `UPDATE ${process.env.TEST_SHOPPINGLISTS} SET name = '${name}' WHERE id = ${id}`;    
    const connection = await mysql2.createConnection(dbConfig);

    try {
        const [result] = await connection.execute(sqlClause);

        if (result.affectedRows === 0) {
            res.status(404).send({ message: 'No shopping list found with the given ID or no change made.' });
        } else {
            res.send({ message: 'Shopping list name is updated!' });
        }
    } catch (error) {
        console.error('Error updating shopping list name:', error);
        res.status(500).send({ message: 'Error updating shopping list name in the database' });
    } finally {
        await connection.end();
    }
});


/*** DELETE user shopping list ****/
app.delete('/' + process.env.TEST_SHOPPINGLISTS_API + '/:id', async (req, res) => {
    
    console.log(' ** DELETE users shopping list ** ');

    const id = req.params.id;
    const sqlClause = `DELETE FROM ${process.env.TEST_SHOPPINGLISTS} WHERE id = ${id}`;
    const connection = await mysql2.createConnection(dbConfig);

    try {
        await connection.execute(sqlClause);
        res.status(200).send({ message: 'Shopping list inserted successfully', result });
    } catch (error) {
        console.error('Error removing users shopping list:', error);
        res.status(500).send({ message: 'Error removing users shopping list' });
    } finally {
        await connection.end();
    }
});


/*** GET shoppinglist by ID ***/
app.get('/' + process.env.TEST_SHOPPINGLISTS_API + '/id/:id', validateNumber, async (req, res) => {

    console.log(' ** GET shopping list by ID ** ');

    let returnResult;
    const { id } = req.params;
    const sqlClause = `SELECT id, name, user_id FROM ${process.env.TEST_SHOPPINGLISTS} WHERE id = ${id}`;  
    const connection = await mysql2.createConnection(dbConfig);

    try {
        const [result] = await connection.execute(sqlClause);
        returnResult = result;
    } catch (error) {
        console.error('Error executing query:', error);
        returnResult = { error: 'Failed to execute query.' };
        res.status(500);
    } finally {
        await connection.end();
    }
    res.json(returnResult);
});

/*** GET all shoppinglists by USERID ***/
app.get('/' + process.env.TEST_SHOPPINGLISTS_API + '/user/:id', validateNumber, async (req, res) => {

    console.log(' ** GET all shoppinglists by USERID ** ');

    let returnResult;
    const { id } = req.params;
    const sqlClause = `SELECT id, name FROM ${process.env.TEST_SHOPPINGLISTS} WHERE user_id = ${id}`;
    const connection = await mysql2.createConnection(dbConfig);

    try {
        const [result] = await connection.execute(sqlClause);
        returnResult = result;
    } catch (error) {
        console.error('Error executing query:', error);
        returnResult = { error: 'Failed to execute query.' };
        res.status(500);
    } finally {
        await connection.end();
    }
    res.json(returnResult);
});


/*** GET shoppinglist products by shoppinglistID ***/
app.get('/' + process.env.TEST_SHOPPINGLISTPRODUCTS_API + '/:id', validateNumber, async (req, res) => {

    console.log(' ** GET all products in shoppinglist ** ');

    const { id } = req.params;
    let returnResult;
    const sqlClause = `SELECT SLP.id, SLP.shoppinglist_id, SLP.product_id, P.name, SLP.is_checked 
                        FROM ${process.env.TEST_SHOPPINGLISTPRODUCTS} SLP
                        LEFT JOIN ${process.env.TEST_PRODUCT} P ON SLP.product_id = P.id
                        WHERE shoppinglist_id = ${id};`;
    const connection = await mysql2.createConnection(dbConfig);

    try {
        const [products] = await connection.execute(sqlClause);
        returnResult = products;
    } catch (error) {
        console.error('Error executing query:', error);
        returnResult = { error: 'Failed to execute query.' };
        res.status(500);
    } finally {
        await connection.end();
    }

    res.json(returnResult);
});


/*** UPDATE shoppinglist checked ***/
app.put('/' + process.env.TEST_SHOPPINGLISTPRODUCTS_API + '/:id', async (req, res) => {

    console.log(' ** UPDATE shoppinglist checked ** ');

    const { id } = req.params;
    const { productId, checked } = req.body;
    const sqlClause = `UPDATE ${process.env.TEST_SHOPPINGLISTPRODUCTS} SET is_checked = ${!checked} WHERE shoppinglist_id = ${id} AND product_id = ${productId}`;
    const connection = await mysql2.createConnection(dbConfig);

    try {

        const [result] = await connection.execute(sqlClause);

        if (result.affectedRows === 0) {
            res.status(404).send({ message: 'No product found with the given ID or no change made.' });
        } else {
            res.send({ message: 'Product is updated!' });
        }
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).send({ message: 'Error updating product in the database' });
    } finally {
        await connection.end();
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

    console.log(' ** ADD product to shoppinglist ** ');

    try {
        const result = await insertProductToShoppingList(req.body);
        res.status(200).send({ message: 'Data inserted successfully', result });
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).send({ message: 'Error inserting data into database' });
    }
});


/*** Remove product from shoppinglist ****/
app.delete('/' + process.env.TEST_SHOPPINGLISTPRODUCTS_API + '/:id', async (req, res) => {

    console.log(' ** Remove product from shoppinglist ** ');

    const { id } = req.params;
    const sqlClauseDeleteProductsInShoppingList = `DELETE FROM ${process.env.TEST_SHOPPINGLISTPRODUCTS} WHERE id = ${id}`;
    const connection = await mysql2.createConnection(dbConfig);

    try {
        await connection.execute(sqlClauseDeleteProductsInShoppingList);
        console.log('Operation completed successfully');
        res.status(200).send({ message: 'Operation completed successfully' });

    } catch (error) {
        console.error('Error removing product from shopping list or deleting shopping list:', error);
        res.status(500).send({ error: 'Error removing product from shopping list or deleting shopping list' });
    } finally {
        await connection.end();
    }
});

/*** Remove shoppinglist ****/
app.delete('/' + process.env.TEST_SHOPPINGLISTPRODUCTS_API + '/all/:id', async (req, res) => {

    console.log(' ** Remove shoppinglist ** ');

    const { id } = req.params;
    const sqlClauseDeleteShoppingList = `DELETE FROM ${process.env.TEST_SHOPPINGLISTS} WHERE id = ${id}`;
    const sqlClauseDeleteProductsInShoppingList = `DELETE FROM ${process.env.TEST_SHOPPINGLISTPRODUCTS} WHERE shoppinglist_id = ${id}`;
    const connection = await mysql2.createConnection(dbConfig);

    try {
        await connection.beginTransaction();

        await connection.execute(sqlClauseDeleteProductsInShoppingList);
        await connection.execute(sqlClauseDeleteShoppingList);

        await connection.commit();
        console.log('Operation completed successfully');

        res.status(200).send({ message: 'Operation completed successfully' });

    } catch (error) {
        await connection.rollback();
        console.error('Error removing product from shopping list or deleting shopping list:', error);
        res.status(500).send({ error: 'Error removing product from shopping list or deleting shopping list' });
    } finally {
        await connection.end();
    }
});



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


/*** VALIDATE id ***/
function validateNumber(req, res, next) {
    const id = req.params.id;

    if (!id || isNaN(Number(id))) {
        console.log(`Validation is not good!`);
        return res.status(400).send({ error: 'parameter must be a valid number' });
    }
    next();
}