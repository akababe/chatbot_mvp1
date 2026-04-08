// ==========================================================================
//  Lean SQL-Gen — Client-Side Application Logic
// ==========================================================================

(function () {
  'use strict';

  // ---- DOM References ----
  const queryInput = document.getElementById('query-input');
  const generateBtn = document.getElementById('generate-btn');
  const copyBtn = document.getElementById('copy-btn');
  const copyBtnText = document.getElementById('copy-btn-text');
  const outputEmpty = document.getElementById('output-empty');
  const outputCode = document.getElementById('output-code');
  const sqlOutput = document.getElementById('sql-output');
  const outputError = document.getElementById('output-error');
  const errorMessage = document.getElementById('error-message');
  const schemaToggle = document.getElementById('schema-toggle');
  const schemaSidebar = document.getElementById('schema-sidebar');
  const schemaClose = document.getElementById('schema-close');
  const schemaContent = document.getElementById('schema-content');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  let rawSQL = '';
  let schemaLoaded = false;

  // ---- SQL Syntax Highlighting ----

  const SQL_KEYWORDS = [
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN',
    'FULL JOIN', 'OUTER JOIN', 'CROSS JOIN', 'ON', 'AND', 'OR', 'NOT', 'IN',
    'EXISTS', 'BETWEEN', 'LIKE', 'IS', 'NULL', 'AS', 'ORDER BY', 'GROUP BY',
    'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'ALL', 'DISTINCT', 'INSERT', 'INTO',
    'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP',
    'INDEX', 'VIEW', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'ASC', 'DESC',
    'WITH', 'RECURSIVE', 'OVER', 'PARTITION BY', 'ROWS', 'RANGE', 'UNBOUNDED',
    'PRECEDING', 'FOLLOWING', 'CURRENT ROW',
  ];

  const SQL_FUNCTIONS = [
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'IFNULL', 'NULLIF',
    'CAST', 'CONVERT', 'ROUND', 'FLOOR', 'CEIL', 'CEILING', 'ABS',
    'UPPER', 'LOWER', 'TRIM', 'LTRIM', 'RTRIM', 'LENGTH', 'LEN',
    'SUBSTRING', 'SUBSTR', 'CONCAT', 'REPLACE', 'LEFT', 'RIGHT',
    'DATE', 'YEAR', 'MONTH', 'DAY', 'DATEADD', 'DATEDIFF', 'GETDATE',
    'NOW', 'CURRENT_DATE', 'CURRENT_TIMESTAMP', 'EXTRACT',
    'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE', 'LAG', 'LEAD',
    'FIRST_VALUE', 'LAST_VALUE',
  ];

  function highlightSQL(sql) {
    // Escape HTML entities
    let highlighted = sql
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Comments (-- single line)
    highlighted = highlighted.replace(
      /(--.*$)/gm,
      '<span class="sql-comment">$1</span>'
    );

    // Strings (single-quoted)
    highlighted = highlighted.replace(
      /('(?:[^'\\]|\\.)*')/g,
      '<span class="sql-string">$1</span>'
    );

    // Numbers
    highlighted = highlighted.replace(
      /\b(\d+(?:\.\d+)?)\b/g,
      '<span class="sql-number">$1</span>'
    );

    // Functions (before keywords, so LEFT/RIGHT are handled correctly)
    const fnPattern = new RegExp(
      '\\b(' + SQL_FUNCTIONS.join('|') + ')\\s*(?=\\()',
      'gi'
    );
    highlighted = highlighted.replace(
      fnPattern,
      (m) => `<span class="sql-function">${m}</span>`
    );

    // Multi-word keywords first (ORDER BY, GROUP BY, etc.)
    const multiWordKW = SQL_KEYWORDS
      .filter((k) => k.includes(' '))
      .sort((a, b) => b.length - a.length);

    for (const kw of multiWordKW) {
      const regex = new RegExp('\\b' + kw.replace(/ /g, '\\s+') + '\\b', 'gi');
      highlighted = highlighted.replace(
        regex,
        (m) => `<span class="sql-keyword">${m}</span>`
      );
    }

    // Single-word keywords
    const singleKW = SQL_KEYWORDS.filter((k) => !k.includes(' '));
    const kwPattern = new RegExp('\\b(' + singleKW.join('|') + ')\\b', 'gi');
    highlighted = highlighted.replace(kwPattern, (m) => {
      // Avoid double-wrapping (already inside a span)
      return `<span class="sql-keyword">${m}</span>`;
    });

    // Operators highlight removed to prevent HTML tag corruption

    return highlighted;
  }

  // ---- UI State Helpers ----

  function showState(state, data) {
    outputEmpty.style.display = state === 'empty' ? '' : 'none';
    outputCode.style.display = state === 'result' ? '' : 'none';
    outputError.style.display = state === 'error' ? '' : 'none';
    copyBtn.style.display = state === 'result' ? '' : 'none';

    if (state === 'result') {
      rawSQL = data;
      sqlOutput.innerHTML = highlightSQL(data);
    } else if (state === 'error') {
      errorMessage.textContent = data;
    }
  }

  function setLoading(isLoading) {
    if (isLoading) {
      generateBtn.classList.add('is-loading');
      generateBtn.disabled = true;
      queryInput.disabled = true;
    } else {
      generateBtn.classList.remove('is-loading');
      generateBtn.disabled = false;
      queryInput.disabled = false;
    }
  }

  // ---- Generate SQL ----

  async function generateSQL() {
    const query = queryInput.value.trim();
    if (!query) {
      queryInput.focus();
      return;
    }

    setLoading(true);
    showState('empty');

    try {
      const res = await fetch('/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong.');
      }

      showState('result', data.sql);
    } catch (err) {
      showState('error', err.message);
    } finally {
      setLoading(false);
    }
  }

  // ---- Copy to Clipboard ----

  async function copySQL() {
    if (!rawSQL) return;

    try {
      await navigator.clipboard.writeText(rawSQL);
      copyBtn.classList.add('is-copied');
      copyBtnText.textContent = 'Copied!';

      setTimeout(() => {
        copyBtn.classList.remove('is-copied');
        copyBtnText.textContent = 'Copy';
      }, 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = rawSQL;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);

      copyBtnText.textContent = 'Copied!';
      setTimeout(() => { copyBtnText.textContent = 'Copy'; }, 2000);
    }
  }

  // ---- Schema Sidebar ----

  async function loadSchema() {
    if (schemaLoaded) return;

    try {
      const res = await fetch('/schema');
      const data = await res.json();
      schemaContent.innerHTML = data.html;
      schemaLoaded = true;
    } catch {
      schemaContent.innerHTML =
        '<p style="color:var(--error)">Failed to load schema.</p>';
    }
  }

  function openSidebar() {
    loadSchema();
    schemaSidebar.classList.add('is-open');
    sidebarOverlay.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    schemaSidebar.classList.remove('is-open');
    sidebarOverlay.classList.remove('is-visible');
    document.body.style.overflow = '';
  }

  // ---- Event Listeners ----

  generateBtn.addEventListener('click', generateSQL);

  queryInput.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      generateSQL();
    }
  });

  copyBtn.addEventListener('click', copySQL);

  schemaToggle.addEventListener('click', openSidebar);
  schemaClose.addEventListener('click', closeSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });

  // Focus the input on load
  queryInput.focus();
})();
