const express = require('express');
const mysql = require('mysql');
const mysql2 = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());



/*** REMEMBER ***/
const PORT = process.env.PORT || 3000; //Add PORT in .env file.
const ALLOWEDORIGINGS = process.env.ALLOWED_ORIGINS; //Add ALLOWED_ORIGINS to .env file.
/*** REMEMBER ***/


app.use(cors({
    origin: function (origin, callback) {

        console.log(origin);

        if (!origin) return callback(null, true);

        if (ALLOWEDORIGINGS.indexOf(origin) === -1) {
            var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }

        return callback(null, true);
    }
}));

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
};

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('***** Connected to the database *****');
});

//DATA
app.get('/' + process.env.APICALL_DATA, async (req, res) => {
    const sql = 'SELECT id, nimi FROM ' + process.env.TABLENAME_DATA;

    await db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('SQL select - Server Error')
        }
        res.json(results);
    });
});

//PRODUCTS
app.get('/' + process.env.APICALL_PRODUCTS, async (req, res) => {
    const sql = 'SELECT id, productName, shoppingList FROM ' + process.env.TABLENAME_PRODUCTS;

    await db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('SQL select - Server Error')
        }
        res.json(results);
    });
});


/*********** HEALTH CHECK *************/
app.get('/healthcheck', async (req, res) => {
    const sql = 'SELECT id FROM ' + process.env.TABLENAME_PRODUCTS + ' LIMIT 1';

    await db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('SQL select - Server Error')
        }
        res.json(results);
    });
});



/****** INSERT *******/
async function insertProduct(data) {
    const connection = await mysql2.createConnection(dbConfig);
    const defaultShoppingListValue = false;

    const [rows] = await connection.execute(
        'INSERT INTO ' + process.env.TABLENAME_PRODUCTS + ' (id, productName, shoppingList) VALUES (?, ?, ?)',
        [data.id, data.productName, defaultShoppingListValue]
    );
    await connection.end();
    return rows;
}

app.post('/' + process.env.APICALL_PRODUCTS, async (req, res) => {
    try {
        const result = await insertProduct(req.body);
        res.status(201).send({ message: 'Data inserted successfully', result });
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).send({ message: 'Error inserting data into database' });
    }
});



/****** UPDATE *******/
app.put('/' + process.env.APICALL_PRODUCTS + '/:id', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    try {
        const connection = await mysql2.createConnection(dbConfig);
        const [result] = await connection.execute(
            'UPDATE ' + process.env.TABLENAME_PRODUCTS + ' SET productName = ? WHERE id = ?',
            [name, id]
        );
        await connection.end();

        if (result.affectedRows === 0) {
            res.status(404).send({ message: 'No record found with the given ID or no change made.' });
        } else {
            res.send({ message: 'Record updated successfully' });
        }
    } catch (error) {
        console.error('Error updating data:', error);
        res.status(500).send({ message: 'Error updating data in the database' });
    }
});




/*** DELETE ****/
app.delete('/' + process.env.APICALL_PRODUCTS + '/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const connection = await mysql2.createConnection(dbConfig);
        const [result] = await connection.execute('DELETE FROM ' + process.env.TABLENAME_PRODUCTS + ' WHERE id = ?', [id]);
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




// Error handling middleware
app.use((error, req, res, next) => {
    res.status(error.status || 500).json({
        error: {
            message: error.message,
        },
    });
});

app.listen(PORT, () => {
    console.log(`Server is running in PORT=${PORT}`);
});
