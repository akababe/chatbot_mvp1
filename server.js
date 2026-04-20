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

/** Resolve OpenRouter key from supported env names */
function getOpenRouterApiKey() {
  const raw = process.env.OPEN_ROUTER_API || process.env.OPENROUTER_API_KEY || '';
  return raw.trim().replace(/^['\"]|['\"]$/g, '');
}

/** Parse a positive integer env var with fallback */
function readPositiveIntEnv(name, fallback) {
  const value = Number.parseInt((process.env[name] || '').trim(), 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

/** Extract affordable max token count from OpenRouter 402 message */
function parseAffordableMaxTokens(message) {
  const match = message.match(/can only afford\s+(\d+)/i);
  if (!match) return null;

  const affordable = Number.parseInt(match[1], 10);
  return Number.isInteger(affordable) && affordable > 0 ? affordable : null;
}

/** Perform one OpenRouter completion call */
async function requestCompletion({ apiKey, systemPrompt, userMessage, maxTokens }) {
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
      max_tokens: maxTokens,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

/** Call OpenRouter API */
async function callOpenRouter(systemPrompt, userMessage) {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error('OpenRouter API key is missing. Set OPEN_ROUTER_API or OPENROUTER_API_KEY in .env/runtime env.');
  }

  const configuredMaxTokens = readPositiveIntEnv('OPENROUTER_MAX_TOKENS', 1024);
  let { response, payload } = await requestCompletion({
    apiKey,
    systemPrompt,
    userMessage,
    maxTokens: configuredMaxTokens,
  });

  // If credits are tight, retry once with the affordable cap from OpenRouter's message.
  if (!response.ok && response.status === 402) {
    const message = payload?.error?.message || '';
    const affordableMaxTokens = parseAffordableMaxTokens(message);

    if (affordableMaxTokens && affordableMaxTokens < configuredMaxTokens) {
      ({ response, payload } = await requestCompletion({
        apiKey,
        systemPrompt,
        userMessage,
        maxTokens: affordableMaxTokens,
      }));
    }
  }

  if (!response.ok) {
    throw new Error(
      `OpenRouter API error (${response.status}): ${payload.error?.message || response.statusText}`
    );
  }

  const data = payload;
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
