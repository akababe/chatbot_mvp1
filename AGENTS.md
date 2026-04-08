This **Product Requirements Document (PRD)** outlines the "Lean SQL-Gen" MVP. The focus is on a lightweight, browser-based tool that uses a Markdown file as the source of truth for database schema information to generate SQL queries via an LLM.

---

# 📄 PRD: Lean SQL-Gen MVP

## 1. Executive Summary
The **SQL-Gen MVP** is a browser-based utility designed to bridge the gap between business logic and database queries. Unlike complex RAG (Retrieval-Augmented Generation) systems, this tool utilizes a "Schema-in-Prompt" strategy, reading a dedicated Star Schema markdown file and injecting it directly into the LLM context to generate accurate SQL queries.

## 2. Objectives
* **Simplified NL2SQL:** Convert business criteria (e.g., "Show total revenue by store for Q3") into valid SQL.
* **Zero-Infrastructure RAG:** Eliminate the need for ChromaDB or Vector embeddings by leveraging the LLM’s context window.
* **Portability:** Ensure the entire stack can be spun up in seconds using Docker.

---

## 3. Tech Stack & Tools
| Component | Technology | Role |
| :--- | :--- | :--- |
| **Frontend/Backend** | Node.js (Express/EJS) | Handles UI, file reading, and API routing. |
| **LLM Provider** | OpenRouter (e.g., Claude 3.5 or GPT-4o) | The translation engine (Natural Language → SQL). |
| **Reference Data** | `tables.md` | Contains the 5-table Star Schema documentation. |
| **Deployment** | Docker | Containerizes the Node.js environment for consistency. |
| **UI Environment** | Web Browser | User interface for inputting criteria and viewing SQL. |

---

## 4. Functional Requirements

### FR1: Schema Reference Injection
* The system must read a local `tables.md` file on startup or per request.
* This file must contain table names, column names, data types, and primary/foreign key relationships.

### FR2: Natural Language Input
* A text area in the browser for users to type business requirements in plain English.

### FR3: SQL Generation Engine
* The backend must construct a prompt containing:
    1.  The content of `tables.md`.
    2.  The user's business criteria.
    3.  Instructions to output *only* valid SQL (no prose).
* The system sends this to OpenRouter and receives the SQL string.

### FR4: Display & Copy
* The generated SQL must be displayed in a code block with syntax highlighting.
* A "Copy to Clipboard" button for quick usage in a DB client.

---

## 5. System Architecture


1.  **User Interface:** Input box for business criteria.
2.  **Node.js Backend:** Reads the `.md` schema file from the local directory.
3.  **Prompt Builder:** Merges the schema text + user input into a single system message.
4.  **OpenRouter API:** Processes the request and returns the SQL.
5.  **Result View:** Displays the generated SQL query to the user.

---

## 6. Schema Structure (`tables.md` Example)
The MVP expects the MD file to follow this structure to ensure LLM accuracy:
```markdown
## Star Schema Definition
### Fact Table: `sales_fact`
- `sale_id` (INT, PK)
- `product_key` (INT, FK)
- `date_key` (INT, FK)
- `amount` (DECIMAL)

### Dimension Tables:
- `dim_products`: `product_key`, `product_name`, `category`
- `dim_stores`: `store_key`, `store_name`, `region`
... (Total 5 tables)
```

---

## 7. Deployment Plan (Docker)
The `Dockerfile` will package the Node.js app to ensure it runs regardless of the host OS (Mac, Windows, or Linux).

* **Image Base:** `node:20-alpine` (lightweight).
* **Environment Variables:** `OPENROUTER_API_KEY` passed at runtime.
* **Volume Mount:** (Optional) Mount the `tables.md` file so it can be updated without rebuilding the container.

---

## 8. Success Metrics
* **Cold Start Time:** System is up and running in `< 10 seconds` via Docker.
* **Accuracy:** The LLM correctly identifies JOIN keys between the Fact and Dimension tables 90% of the time.
* **Simplicity:** No database connection required for the generator to function.
