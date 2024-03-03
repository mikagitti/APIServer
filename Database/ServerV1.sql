
CREATE TABLE products (
    id CHAR(36) NOT NULL,
    productName VARCHAR(255) NOT NULL,
    shoppingList BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (id)
);