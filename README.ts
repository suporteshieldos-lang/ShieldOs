Review and redesign the existing **Financial.ts** page to create a premium SaaS financial dashboard inspired by Stripe, Notion, and Linear.

Important rules:

* **Do NOT create a new page. Modify the existing Financial.ts file only.**
* Keep all existing financial logic, hooks, and receivables functionality.
* If needed, you may extract small UI components to the existing financial components folder, but the main page must remain **Financial.ts**.
* Do not break existing hooks such as **useReceivablesActions** and **useFinancialFilters**.

Goals:

* modern, clean SaaS UI
* high readability
* strong financial overview
* maintain compatibility with current project structure
* avoid unnecessary re-renders

Page improvements to implement:

1. Header
   Add a clear page header:

Title: **Financeiro**

Right-side actions:

* Novo recebimento
* Nova despesa
* Exportar

Use a modern layout with balanced spacing.

2. Summary cards section

Create a top grid with **4 financial summary cards**:

* Receita do mês
* Recebimentos pendentes
* Contas vencidas
* Fluxo de caixa

Each card should include:

* main value
* small trend indicator (example: +12% vs last month)
* clean typography

Design:

* rounded-xl cards
* subtle border
* light shadow
* hover interaction
* consistent spacing

3. Projected Cashflow (Caixa previsto)

Add a new section showing **projected cashflow for the next 30 days**.

The calculation should use existing receivables and expenses data.

Display:

Saldo atual
Entradas previstas
Saídas previstas
Saldo previsto (30 dias)

Example layout:

Saldo atual
R$ 5.000

Entradas previstas
R$ 2.600

Saídas previstas
R$ 450

Saldo previsto (30 dias)
R$ 7.150

Also include a **small projection chart** showing how the balance evolves over time.

This should be visually simple and easy to understand.

4. Financial chart

Add a main chart showing:

Receitas vs Despesas
Last months

Use the existing chart library already used in the project.

The chart should be clean and readable.

5. Filters

Integrate the existing **useFinancialFilters** hook.

Provide quick filters:

Today
7 days
30 days
This month
Custom range

Ensure custom date normalization still works.

6. Alerts section

Above the receivables table, show alerts like:

"3 pagamentos vencem hoje"
"2 pagamentos estão atrasados"

Use subtle alert styling.

7. Receivables table

Keep and improve the existing receivables table.

Columns:

Cliente
Descrição
Valor
Vencimento
Status
Ações

Status badges:

Paid (green)
Pending (yellow)
Overdue (red)

Actions per row:

Mark as paid
Edit
Delete

Use the logic from **useReceivablesActions**.

Improve readability with better spacing and consistent badge styling.

8. UI style guidelines

Follow modern SaaS dashboard design:

* Tailwind
* rounded-xl cards
* subtle shadows
* clean typography
* neutral colors
* balanced spacing
* responsive grid
* minimal visual noise

The layout should feel similar to Stripe or Linear dashboards.

9. Code quality

If Financial.ts becomes too large:

* extract small reusable components
* keep logic readable
* prevent unnecessary re-renders
* keep TypeScript types clean
* maintain compatibility with existing hooks and state

Focus on:
clarity, usability, premium UI, and financial insight.

Do not remove existing functionality.
