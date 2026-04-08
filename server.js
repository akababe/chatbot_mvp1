require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read the tables.md schema file */
function readSchema() {
  const schemaPath = path.join(__dirname, 'tables.md');
  return fs.readFileSync(schemaPath, 'utf-8');
}

/** Build the system prompt with schema injected */
function buildSystemPrompt(schema) {
  return `You are an expert SQL query generator for a retail data warehouse. Below is the complete database schema:

<schema>
${schema}
</schema>

Rules:
1. Output ONLY valid SQL. No explanations, no markdown fences, no comments.
2. Use proper JOIN syntax based on the foreign key relationships defined above.
3. Use meaningful table aliases for readability (e.g., sf for sales_fact, dp for dim_products).
4. If the request is ambiguous, make reasonable assumptions and proceed.
5. Always use INNER JOIN unless the user explicitly asks for LEFT/RIGHT/FULL joins.
6. Format the SQL nicely with line breaks and indentation for readability.`;
}

/** Call OpenRouter API */
async function callOpenRouter(systemPrompt, userMessage) {
  const apiKey = process.env.OPEN_ROUTER_API;
  if (!apiKey) {
    throw new Error('OPEN_ROUTER_API key is not set in .env');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Lean SQL-Gen',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.1,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      `OpenRouter API error (${response.status}): ${err.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  let sql = data.choices?.[0]?.message?.content?.trim() || '';

  // Strip markdown code fences if the model wraps them anyway
  sql = sql.replace(/^```(?:sql)?\n?/i, '').replace(/\n?```$/i, '').trim();

  return sql;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/** Main page */
app.get('/', (_req, res) => {
  res.render('index');
});

/** Schema preview (returns rendered HTML from tables.md) */
app.get('/schema', (_req, res) => {
  try {
    const schema = readSchema();
    const html = marked(schema);
    res.json({ html });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read schema file.' });
  }
});

/** Generate SQL from natural language */
app.post('/generate', async (req, res) => {
  const { query } = req.body;

  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'Please provide a query.' });
  }

  try {
    const schema = readSchema();
    const systemPrompt = buildSystemPrompt(schema);
    const sql = await callOpenRouter(systemPrompt, query.trim());
    res.json({ sql });
  } catch (err) {
    console.error('Generation error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`\n  ⚡ Lean SQL-Gen is running at http://localhost:${PORT}\n`);
});
