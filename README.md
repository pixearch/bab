# BAB

Phase 1 contains the Prisma/PostgreSQL database foundation for the prediction market core ledger.

## Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Set `DATABASE_URL` to a PostgreSQL database connection string.

## Prisma Commands

Format the schema:

```bash
npm run prisma:format
```

Validate the schema:

```bash
npm run prisma:validate
```

Generate the Prisma client:

```bash
npm run prisma:generate
```

Create an initial migration for review:

```bash
npm run prisma:migrate -- --name init_core_ledger
```
