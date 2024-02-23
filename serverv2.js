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


//TESTITAULU
app.get('/' + process.env.APICALL_DATA, async (req, res) => {
    const sqlClause = 'SELECT id, nimi FROM ' + process.env.TABLENAME_DATA;

    const connection = await mysql2.createConnection(dbConfig);
    const [product] = await connection.execute(sqlClause);

    await connection.end();
    console.log(product);
    res.json(product);
});




/* GET all products */
app.get('/' + process.env.TEST_PRODUCT_API, async (req, res) => {

    console.log(' ** GET all products ** ');

    const sqlClause = `SELECT id, name, description FROM ${process.env.TEST_PRODUCT};`;
    const connection = await mysql2.createConnection(dbConfig);
    const [product] = await connection.execute(sqlClause);

    await connection.end();
    res.json(product);

});

/*** GET all shoppinglists by USERID ***/
app.get('/' + process.env.TEST_SHOPPINGLISTS_API + '/:id', validateNumber, async (req, res) => {

    console.log(' ** GET all shoppinglists by USERID ** ');
    const { id } = req.params;

    const sqlClause = `SELECT id, shoppinglist_id, name FROM ${process.env.TEST_SHOPPINGLISTS} WHERE user_id = ${id};`;

    const connection = await mysql2.createConnection(dbConfig);
    const [product] = await connection.execute(sqlClause);

    await connection.end();
    console.log(product);
    res.json(product);
});


/*** GET shoppinglist products by shoppinglistID ***/
app.get('/' + process.env.TEST_SHOPPINGLISTPRODUCTS_API + '/:id', validateNumber, async (req, res) => {

    console.log(' ** GET all shoppinglists by USERID ** ');
    const { id } = req.params;

    const sqlClause = `SELECT id, shoppinglist_id, product_id, is_checked FROM ${process.env.TEST_SHOPPINGLISTPRODUCTS} WHERE shoppinglist_id = ${id};`;

    const connection = await mysql2.createConnection(dbConfig);
    const [products] = await connection.execute(sqlClause);

    await connection.end();
    console.log(products);
    res.json(products);
});



/* ADD NEW PRODUCT */
async function insertProduct2(data) {
    const connection = await mysql2.createConnection(dbConfig);

    const [rows] = await connection.execute(
        'INSERT INTO ' + process.env.TEST_PRODUCT + ' (name, description ) VALUES (?, ?)',
        [data.name, data.description]
    );
    await connection.end();
    return rows;
}

app.post('/' + process.env.APICALL_PRODUCTS, async (req, res) => {
    try {
        const result = await insertProduct2(req.body);
        res.status(201).send({ message: 'Data inserted successfully', result });
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).send({ message: 'Error inserting data into database' });
    }
});

/*** VALIDATE id ***/
function validateNumber(req, res, next) {

    console.log('ValidateNumber, yes');

    const id = req.params.id;

    console.log(req.query);
    console.log(req.params);
    console.log('Id: ' + id);

    if (!id || isNaN(Number(id))) {
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
