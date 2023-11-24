const mysql = require('mysql');
require('dotenv').config();

// Create a MySQL connection pool using environment variables
const pool = mysql.createPool({
  connectionLimit: 10, // Adjust this based on your needs
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

async function updateClientCredit(userID, amount) {
    // Ensure userID is treated as a string.
    userID = String(userID);
    
    return new Promise((resolve, reject) => {
        pool.getConnection(async (err, connection) => {
            if (err) {
                console.error('Error getting connection from pool:', err);
                reject(err);
                return;
            }

            try {
                // SQL Query for inserting a new user or updating the amount if the user exists
                const updateQuery = `
                  INSERT INTO clients (userID, credit)
                  VALUES (?, ?)
                  ON DUPLICATE KEY UPDATE credit = credit + ?;
                `;
                
                await new Promise((innerResolve, innerReject) => {
                    connection.query(updateQuery, [userID, amount, amount], (err, results) => {
                        if (err) innerReject(err);
                        else innerResolve(results);
                    });
                });

                // SQL Query to fetch the credit for the given userID
                const fetchQuery = 'SELECT credit FROM clients WHERE userID = ?';

                let creditValue;
                await new Promise((innerResolve, innerReject) => {
                    connection.query(fetchQuery, [userID], (err, results) => {
                        if (err) innerReject(err);
                        else {
                            creditValue = results[0]?.credit;
                            innerResolve();
                        }
                    });
                });

                resolve(creditValue);
            } catch (error) {
                console.error("Error executing query:", error);
                reject(error);
            } finally {
                // Release the connection back to the pool
                connection.release();
            }
        });
    });
}

async function getClientCredit(userID) {
    // Ensure userID is treated as a string.
    userID = String(userID);

    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) {
                
                console.error('Error getting connection from pool:', err);
                reject(err);
                return;
            }

            // SQL Query to fetch the credit for the given userID
            const fetchQuery = 'SELECT credit FROM clients WHERE userID = ?';

            connection.query(fetchQuery, [userID], (err, results) => {
                connection.release(); // Release the connection back to the pool
                
                if (err) {
                    console.error('Error executing query:', err);
                    reject(err);
                } else {
                    // If there's a result, resolve with the credit value. Else, resolve with 0 or null.
                    const creditValue = results[0]?.credit || 0; 
                    resolve(creditValue);
                }
            });
        });
    });
}

module.exports = { 
    updateClientCredit, 
    getClientCredit 
};
