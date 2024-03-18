const express = require('express');
const mysql2 = require('mysql2/promise');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const cors = require('cors');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());



/*** REMEMBER ***/
const PORT = process.env.PORT || 3000; //Add PORT in .env file.
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


app.post('/updateprofile', (req, res) => {

    console.log("updateprofile");

    const { name } = req.body;
    const providedToken = req.header('CSRF-Token');

    console.log(providedToken);

    if (!providedToken || csrfTokens.includes(providedToken)) {
        return res.status(403).json({
            message: 'Invalid token.'
        });
    }

    const index = csrfTokens.indexOf(providedToken);
    if (index > -1) {
        csrfTokens.splice(index, 1);
    }

    console.log('Delete: Done');
    console.log(csrfTokens);
    res.json({
        message: 'Profile updated successfully!'
    });
});


const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
};


/*********** HEALTH CHECK *************/
app.get('/healthcheck', async (req, res) => {
    const sqlClause = 'SELECT id FROM ' + process.env.TABLENAME_PRODUCTS + ' LIMIT 1';

    try {
        const connection = await mysql2.createConnection(dbConfig);
        const [product] = await connection.execute(sqlClause);
        await connection.end();

        console.log(product);

        res.json(product);

    } catch (error) {
        console.error('Failed HealthCheck:', error);
        throw error;
    }
});
/*********** HEALTH CHECK *************/




/******** GET PRODUCTS *******/
app.get('/products', async (req, res) => {

    const sqlClause = `SELECT id, productName, shoppingList FROM ${process.env.TABLENAME_PRODUCTS}`;

    try {
        const connection = await mysql2.createConnection(dbConfig);
        const [products] = await connection.execute(sqlClause);
        await connection.end();
        res.json(products);
    }
    catch (error) {
        console.error('Failed to get products:', error);
        throw error;
    }
});
/******** GET PRODUCTS *******/




/****** INSERT *******/
async function insertProduct(data) {
    const defaultShoppingListValue = false;
    const sqlClause = `INSERT INTO ${process.env.TABLENAME_PRODUCTS} 
                        (id, productName, shoppingList) 
                        VALUES ('${data.data.id}', '${data.data.productName}', ${defaultShoppingListValue});`;

    try {
        const connection = await mysql2.createConnection(dbConfig);
        await connection.execute(sqlClause);
        await connection.end();
    }
    catch (error) {
        console.error('Insert error: ', error)
    }
}

app.post('/' + process.env.APICALL_PRODUCTS, async (req, res) => {
    try {
        await insertProduct(req.body);
        res.status(201).send({ message: 'Product inserted successfully!' });
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).send({ message: 'Error inserting data into database!' });
    }
});
/****** INSERT *******/





/****** UPDATE *******/
app.put('/' + process.env.APICALL_PRODUCTS + '/:id', async (req, res) => {
    const { id } = req.params;
    const { productName } = req.body;

    const sqlClause = `UPDATE ${process.env.TABLENAME_PRODUCTS} SET productName = '${productName}' WHERE id = '${id}';`;

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
/****** UPDATE *******/




/*** DELETE ****/
app.delete('/' + process.env.APICALL_PRODUCTS + '/:id', async (req, res) => {
    const { id } = req.params;
    const sqlClause = `DELETE FROM ${process.env.TABLENAME_PRODUCTS} WHERE id = '${id}';`;

    try {
        const connection = await mysql2.createConnection(dbConfig);
        const [result] = await connection.execute(sqlClause);
        await connection.end();

        if (result.affectedRows === 0) {
            res.status(404).send({ message: 'No record found with the given ID' });
        } else {
            res.send({ message: 'Record deleted successfully' });
        }
    } catch (error) {
        console.error('Error deleting data:', error);
        res.status(500).send({ message: 'Error deleting data from the database' });
    }
});
/*** DELETE ****/




// Error handling middleware
app.use((error, req, res, next) => {
    res.status(error.status || 500).json({
        error: {
            message: error.message,
        },
    });
});

// PORT LISTEN
app.listen(PORT, () => {
    console.log(`Server is running in PORT=${PORT}`);
});
