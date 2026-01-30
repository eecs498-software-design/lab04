---
layout: spec
---
EECS 498 APSD: Database Tutorial
===============================

## Introduction

In this lab, you'll learn the fundamentals of working with an SQLite database in a TypeScript project using Kysely, a type-safe SQL query builder. These pragmatics will directly apply to your course projects, especially as the system becomes more complex and needs to manage persistent data.

## Background: What is a Database?

A **database** is a system for storing, organizing, and retrieving structured data. While you could just store and retrieve serialized data with plain old files, it's quite cumbersome. On the other hand, modern database systems are *reliable, highly efficient, and provide clean separation of concerns in an overall system*. Many real-world applications rely on persistent data (e.g., user accounts, game scores, settings, etc.), and databases are ubiquitous in software development.

### Relational Databases

The most common type of database is a **relational database**, which organizes data into **tables** (formally called "relations"). Each table has several **columns** that define what kind of data is stored and **rows** that hold individual records. Loosely, you can think of these like the properties in an interface and the individual objects that have data members following that shape.

### SQLite: A Lightweight Database

At least for now, we'll use **SQLite**, a lightweight relational database that stores everything in a single file (`database.sqlite`). This is quite a bit simpler to set up compared to databases like PostgreSQL or MySQL, which require more complex configuration and need to run as a separate server process. It's great for our purposes, and generally speaking the concepts you learn with SQLite will transfer to other relational databases as well. (SQLite does have a few quirks, though - if you're running into anything weird, it might be worth it to check: [https://sqlite.org/quirks.html](https://sqlite.org/quirks.html).)

### SQL (Structured Query Language)

SQL is the standard language for interacting with relational databases. Here's what basic SQL looks like:

```sql
-- Create a table
CREATE TABLE players (
  player_id VARCHAR(255) PRIMARY KEY,
  display_name VARCHAR(255) NOT NULL
);

-- Insert a row
INSERT INTO players (player_id, display_name) VALUES ('alice123', 'Alice');

-- Query data
SELECT * FROM players WHERE player_id = 'alice123';

-- Update a row
UPDATE players SET display_name = 'Alicia' WHERE player_id = 'alice123';

-- Delete a row
DELETE FROM players WHERE player_id = 'alice123';
```


SQL is actually a great example of a few things we've discussed in class:
- A **declarative language**: You specify *what* you want (not what steps to take to get there). The rest is left to the database.
- A **highly expressive** abstraction built through **composition** of a few simple, orthogonal concepts. The four fundamental insert, select, update, and delete operations, combined with various clauses to filter, sort, and join data, are enough to express nearly any data manipulation task.

However, there are a few reasons we do not want to write raw SQL in our code. Because an SQL query is just a string, we have: 
- **No Compile Checks**: Typos or malformed requests aren't detected until runtime errors occur.
- **Security Concerns**: A query directly mixes data and instructions - a major faux pas for security, and attackers can exploit this (e.g. via "SQL injection") if we slip up even a bit in validation.
- **Boilerplate**: Mapping between SQL and your programmed data types requires repetitive code.

For this reason, we generally add an abstraction layer on top of SQL. For our projects, we'll use Kysely, a modern TypeScript query builder.

### Type-Safe Query Builders

A **query builder** like Kysely lets you write database queries in TypeScript code that is based on the same underlying abstractions as SQL and provides the same expressive power, but lower complexity and much better feedback if we compose something in the wrong way. We'll get type checking, autocompletion, and certain security guarantees for free.

We could also say that Kysely provides a "domain-specific language (DSL)" embedded within TypeScript. Similar to the way testing frameworks use a DSL for expressing expectations and assertions, Kysely provides a DSL for expressing database queries.

Finally - the big win is that tools like Kysely mitigate the structural coupling between our program code and the database schema. Without tooling, this is a high-distance, high-complexity, and potentially high-volatility relationship. As the database evolves, we might rename tables, add or remove columns, change types of data, etc. The same goes for interfaces, types, and names in our program code. Checking these and keeping them in sync manually is error-prone and tedious.

Instead, we'll use an automated process to *generate* TypeScript types based on our database schema. These are imported into our database layer, where the regular type checker verifies that they indeed line up with our application code. Whenever we change the database schema, we just regenerate the types and get compile-time errors in our code if we've broken something. This makes it much safer and easier to evolve both the database and application code over time.

## Background: The Database Layer

The **database layer** is a set of functions or abstractions that encapsulate direct interaction with the database. Take a look at the existing database layer in project 2:

```
packages/database/
├── kysely.config.ts        # Configuration for Kysely CLI tools and migrations
├── .kysely.codegenrc.json  # Configuration for auto-generating types
├── database.sqlite         # The actual database storage file
├── src/
│   ├── database.ts         # Database connection and shared utilities
│   ├── mock_database.ts    # A "mock" in-memory database for testing
│   ├── players.ts          # Database layer functions for players
│   ├── players.test.ts     # Tests for DB player functions
│   ├── schema.d.ts         # Auto-generated types based on database schema (DO NOT EDIT)
│   └── migrations/
│       └── 001_template.ts  # Migration files that evolve the database schema over time
```

Open `players.ts` in the `src` folder to see examples of database layer functions. Notice how each function:
- Has a clear, descriptive name (`getPlayerById`, `insertPlayer`, etc.)
- Uses Kysely to build and execute a query
- Returns structurally typed data that the rest of your application can understand

## Part 1: Understanding Migrations

### What are Migrations?

A **migration** is a script that makes a specific change to your database schema. Migrations are numbered and run in order, allowing you to evolve your database over time.

Why don't we just edit the database schema directly? We essentially want to track changes to the schema much like version control tracks changes to code. Migrations are versioned and reproducible, so we could e.g. try out migrations on a local dev machine and database, then deploy migrations to a production server when we're ready.

Each migration has:

- An **up** function: applies the change (e.g., creates a table)
- A **down** function: reverses the change (e.g., drops the table)

Open `001_template.ts` in the migrations folder in your project 2 repository. Although you may not have worked with Kysely or SQL before, observe that it creates the `players` table with two columns, both of which are required data for an entry. The `player_id` column is the primary key, meaning it uniquely identifies each row.

### Running Migrations

From the `packages/database` directory, you can run migrations with:

```bash
pnpm db:migrate
```

This runs all pending migrations. Kysely tracks which migrations have already been applied in a special `kysely_migration` table, so each migration only runs once.

### Exercise 1.1: Create Your First Migration

Let's add a new table to store our library of Sudoku puzzles. Copy the sudoku_puzzles.txt file from project 1 (it's also included in this lab repository) into the top level of your project 2 repository. Each puzzle has a difficulty level, a starting board (with some cells empty), and a solution board.

As a reminder, each line of this puzzle contains:
- A difficulty level (0 = easy, 1 = medium, 2 = hard, etc.)
- The starting board encoded as 81 characters (row-major order, `.` for empty cells)
- The solution board encoded as 81 characters

For example: `1 5..7...32... 569718432...`

**Step 1:** Create a new file `002_sudoku_puzzles.ts` in the `migrations` folder:

```typescript
import { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("sudoku_puzzles")
    .addColumn("puzzle_id", "integer", (col) => col.notNull().primaryKey().autoIncrement())
    .addColumn("difficulty", "integer", (col) => col.notNull())
    .addColumn("starting_board", "varchar(81)", (col) => col.notNull())
    .addColumn("solution_board", "varchar(81)", (col) => col.notNull())
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .dropTable("sudoku_puzzles")
    .execute()
}
```

**Step 2:** Run the migration (from the top level of the project 2 repository):

```bash
pnpm db:migrate
```

You should see output indicating the migration was applied.

<div class="primer-spec-callout info" markdown="1">
**Note:** Migration files must be numbered sequentially (001, 002, 003, etc.) and each number can only be used once. This is used to determine the ordering of individual migrations.
</div>

## Part 2: Generating Types with kysely-codegen

After changing your schema with migrations, you need to regenerate the TypeScript types so Kysely knows about your new tables and columns.

**Run the codegen:**

```bash
cd packages/database
pnpm db:generate
```

Now open `schema.d.ts` in the `src` folder. You should see a new `SudokuPuzzles` interface alongside `Players`:

```typescript
export interface SudokuPuzzles {
  puzzle_id: Generated<number>;
  difficulty: number;
  starting_board: string;
  solution_board: string;
}

export interface Players {
  display_name: string;
  player_id: string;
}

export interface DB {
  sudoku_puzzles: SudokuPuzzles;
  players: Players;
}
```

<div class="primer-spec-callout danger" markdown="1">
**Never edit `schema.d.ts` manually!** It is auto-generated and your changes will be overwritten. If you need different types, create them in your database layer files by transforming the generated types.
</div>

### The Workflow

Whenever you need to change your database schema, follow this workflow:

1. **Create a migration** - Create a new, sequentially numbered migration file.
2. **Write the `up` and `down` functions** - Define the changes to apply and how to revert them.
3. **Run the migration** - `pnpm db:migrate`
4. **Regenerate types** - `pnpm db:generate`
5. **Update your database layer** - Add or modify functions in your layer files.

## Part 3: Kysely's Fluent Builder Interface

Kysely uses a **fluent builder pattern** where you chain method calls to construct queries. Each method returns a new query builder, allowing you to compose complex queries step by step.

### SELECT Queries

```typescript
// Basic select
const allPlayers = await DATABASE.selectFrom('players')
  .selectAll()
  .execute();

// Select specific columns
const playerNames = await DATABASE.selectFrom('players')
  .select(['player_id', 'display_name'])
  .execute();

// With a WHERE clause
const player = await DATABASE.selectFrom('players')
  .selectAll()
  .where('player_id', '=', 'alice123')
  .executeTakeFirst();  // Returns single row or undefined
```

### INSERT Queries

```typescript
await DATABASE.insertInto('players')
  .values({
    player_id: 'bob456',
    display_name: 'Bob'
  })
  .execute();
```

### UPDATE Queries

```typescript
await DATABASE.updateTable('players')
  .set({ display_name: 'Robert' })
  .where('player_id', '=', 'bob456')
  .execute();
```

### DELETE Queries

```typescript
await DATABASE.deleteFrom('players')
  .where('player_id', '=', 'bob456')
  .execute();
```

### JOINs

```typescript
// If we had a table tracking which players have completed which puzzles...
const completedPuzzles = await DATABASE.selectFrom('puzzle_completions')
  .innerJoin('sudoku_puzzles', 'puzzle_completions.puzzle_id', 'sudoku_puzzles.puzzle_id')
  .innerJoin('players', 'puzzle_completions.player_id', 'players.player_id')
  .select([
    'players.display_name',
    'sudoku_puzzles.difficulty',
    'puzzle_completions.completion_time'
  ])
  .execute();
```

**Hey** - if we're being honest, AI-based autocomplete tools are pretty good at writing Kysely queries for us (and indeed, often they are even better here than with SQL given more feedback from the type system). But it's still important to understand the underlying concepts so you can verify correctness and debug issues when they arise. And, given the declarative nature of these queries, just make sure you take some time to earnestly read and think through what it's doing.



## Part 4: Type Safety with Selectable, Insertable, and Updateable

Kysely provides utility types that help you write type-safe database layer functions. These types come from Kysely and are applied to your generated schema types. The table below summarizes the main ones, and you can follow examples in the starter code.

| Type | Purpose | Example Use |
|------|---------|-------------|
| `Selectable<T>` | Represents a row as returned from a SELECT query |
| `Insertable<T>` | Represents data for an INSERT (excludes auto-generated columns) |
| `Updateable<T>` | Represents data for an UPDATE (all columns optional) |
| `UpdateableByPK<T, K>` | We actually added this one. Like UPDATE, but doesn't allow the primary key K to be optional |


### Exercise 4.1: Create the Sudoku Puzzles Database Layer

Create a new file `sudoku_puzzles.ts` in the `src` folder:

```typescript
import { Insertable } from 'kysely';
import { DATABASE } from './database';
import { DB as Schema } from './schema';

/**
 * Get a puzzle by its ID.
 */
export async function getPuzzleById(puzzle_id: number) {
  return DATABASE.selectFrom('sudoku_puzzles')
    .selectAll()
    .where('puzzle_id', '=', puzzle_id)
    .executeTakeFirst();
}

/**
 * Get all puzzles of a specific difficulty.
 */
export async function getPuzzlesByDifficulty(difficulty: number) {
  return DATABASE.selectFrom('sudoku_puzzles')
    .selectAll()
    .where('difficulty', '=', difficulty)
    .execute();
}

/**
 * Get a random puzzle, optionally filtered by difficulty.
 */
export async function getRandomPuzzle(difficulty?: number) {
  let query = DATABASE.selectFrom('sudoku_puzzles').selectAll();
  
  if (difficulty !== undefined) {
    query = query.where('difficulty', '=', difficulty);
  }
  
  // SQLite's RANDOM() function for random ordering
  return query.orderBy(sql`RANDOM()`).executeTakeFirst();
}

/**
 * Insert a new puzzle into the database.
 */
export async function insertPuzzle(puzzle: Insertable<Schema['sudoku_puzzles']>) {
  return DATABASE.insertInto('sudoku_puzzles')
    .values(puzzle)
    .execute();
}

/**
 * Get the count of puzzles by difficulty level.
 */
export async function getPuzzleCountByDifficulty() {
  return DATABASE.selectFrom('sudoku_puzzles')
    .select(['difficulty'])
    .select(db => db.fn.count<number>('puzzle_id').as('count'))
    .groupBy('difficulty')
    .orderBy('difficulty')
    .execute();
}
```

Don't forget to export these functions from your package! Add to `package.json` in the database package:

```json
{
  "exports": {
    "./players": "./src/players.ts",
    "./sudoku_puzzles": "./src/sudoku_puzzles.ts"
  }
}
```

### Exercise 4.2: Load Puzzles Using a Seed File

Now let's load the puzzles from `sudoku_puzzles.txt` into the database. Kysely supports **seed files**—scripts that populate your database with initial data. Seeds are similar to migrations but are meant for data rather than schema changes.

**Step 1:** First, enable seeds in `kysely.config.ts` by uncommenting and updating the seeds configuration:

```typescript
import { SqliteDialect } from 'kysely'
import { defineConfig } from 'kysely-ctl'
import SQLite from 'better-sqlite3'

export default defineConfig({
  dialect: new SqliteDialect({
    database: new SQLite('database.sqlite'),
  }),
  migrations: {
    migrationFolder: "src/migrations",
  },
  seeds: {
    seedFolder: "src/seeds",
  }
})
```

**Step 2:** Create the seeds folder and a seed file `src/seeds/001_sudoku_puzzles.ts`:

```typescript
import { Kysely } from 'kysely';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function seed(db: Kysely<unknown>): Promise<void> {
  // Read the puzzles file
  const filePath = join(__dirname, '..', '..', '..', '..', 'sudoku_puzzles.txt');
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');

  console.log(`Loading ${lines.length} puzzles...`);

  // Build all puzzle objects
  const puzzles = lines.map(line => {
    const [difficultyStr, starting_board, solution_board] = line.split(' ');
    return {
      difficulty: parseInt(difficultyStr, 10),
      starting_board,
      solution_board,
    };
  });

  // Insert in batches for better performance
  const BATCH_SIZE = 100;
  for (let i = 0; i < puzzles.length; i += BATCH_SIZE) {
    const batch = puzzles.slice(i, i + BATCH_SIZE);
    await db.insertInto('sudoku_puzzles')
      .values(batch)
      .execute();
  }

  console.log('Done loading puzzles!');
}
```

**Step 3:** Add a script to `package.json` in the database package:

```json
{
  "scripts": {
    "db:migrate": "kysely migrate:latest",
    "db:generate": "kysely-codegen",
    "db:seed": "kysely seed:run"
  }
}
```

**Step 4:** Run the seed:

```bash
cd packages/database
pnpm db:seed
```

<div class="primer-spec-callout info" markdown="1">
**Note:** Unlike migrations, seeds don't track whether they've been run before. Running `db:seed` again would insert duplicate puzzles. In a real application, you might add logic to check if data already exists, or clear the table first. For this lab, just run the seed once after running your migrations.
</div>

You should see output indicating the puzzles were loaded!

## Part 5: Serializing and Deserializing JSON Data

Sometimes you need to store complex, structured data in a database column. While some databases have native JSON column types, SQLite stores JSON as text. This means you need to manually **serialize** (convert to string with `JSON.stringify()`) when inserting and **deserialize** (parse with `JSON.parse()`) when selecting. You might also notice that the generated type for such a column is just `string`.

Also note that the `JSON.parse()` approach uses a type assertion (`as SudokuBoard`), which means TypeScript trusts you that the data matches the type. If someone manually edited the database with invalid JSON, you'd get a runtime error, or if your game changed and is no longer compatible with structure previously encoded as JSON, you might encounter issues. This is yet another place where validation and error handling could be added for robustness, but you don't need to worry that here for now.

