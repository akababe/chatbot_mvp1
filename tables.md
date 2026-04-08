## Star Schema Definition

This schema represents a retail sales data warehouse with one fact table and four dimension tables.

---

### Fact Table: `sales_fact`

| Column         | Data Type     | Constraint | Description                          |
|:---------------|:--------------|:-----------|:-------------------------------------|
| `sale_id`      | INT           | PK         | Unique identifier for each sale      |
| `product_key`  | INT           | FK → `dim_products.product_key`  | Links to product dimension |
| `store_key`    | INT           | FK → `dim_stores.store_key`      | Links to store dimension   |
| `date_key`     | INT           | FK → `dim_dates.date_key`        | Links to date dimension    |
| `customer_key` | INT           | FK → `dim_customers.customer_key`| Links to customer dimension|
| `quantity`     | INT           |            | Number of units sold                 |
| `amount`       | DECIMAL(10,2) |            | Total sale amount in USD             |
| `discount`     | DECIMAL(5,2)  |            | Discount percentage applied (0–100)  |

---

### Dimension Table: `dim_products`

| Column         | Data Type    | Constraint | Description                     |
|:---------------|:-------------|:-----------|:--------------------------------|
| `product_key`  | INT          | PK         | Surrogate key for the product   |
| `product_name` | VARCHAR(200) |            | Full product name               |
| `category`     | VARCHAR(100) |            | Product category (e.g., Electronics, Clothing) |
| `brand`        | VARCHAR(100) |            | Brand / manufacturer name       |
| `unit_price`   | DECIMAL(10,2)|            | Standard retail price per unit   |

---

### Dimension Table: `dim_stores`

| Column       | Data Type    | Constraint | Description                        |
|:-------------|:-------------|:-----------|:-----------------------------------|
| `store_key`  | INT          | PK         | Surrogate key for the store        |
| `store_name` | VARCHAR(200) |            | Name of the store                  |
| `region`     | VARCHAR(100) |            | Geographic region (e.g., West, East, Central) |
| `city`       | VARCHAR(100) |            | City where the store is located    |
| `state`      | VARCHAR(50)  |            | State or province                  |

---

### Dimension Table: `dim_dates`

| Column        | Data Type    | Constraint | Description                         |
|:--------------|:-------------|:-----------|:------------------------------------|
| `date_key`    | INT          | PK         | Surrogate key for the date (YYYYMMDD format) |
| `full_date`   | DATE         |            | Full calendar date                  |
| `year`        | INT          |            | Calendar year (e.g., 2024)          |
| `quarter`     | INT          |            | Quarter of the year (1–4)           |
| `month`       | INT          |            | Month number (1–12)                 |
| `day_of_week` | VARCHAR(10)  |            | Day name (e.g., Monday, Tuesday)    |

---

### Dimension Table: `dim_customers`

| Column          | Data Type    | Constraint | Description                       |
|:----------------|:-------------|:-----------|:----------------------------------|
| `customer_key`  | INT          | PK         | Surrogate key for the customer    |
| `customer_name` | VARCHAR(200) |            | Full name of the customer         |
| `segment`       | VARCHAR(50)  |            | Customer segment (e.g., Retail, Wholesale, Corporate) |
| `country`       | VARCHAR(100) |            | Customer's country                |

---

### Relationship Summary

```
sales_fact.product_key  → dim_products.product_key
sales_fact.store_key    → dim_stores.store_key
sales_fact.date_key     → dim_dates.date_key
sales_fact.customer_key → dim_customers.customer_key
```

All JOINs from `sales_fact` to dimension tables use INNER JOIN on the respective key columns.
