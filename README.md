<h1 align="center">
    <picture>
        <source media="(prefers-color-scheme: dark)" srcset="./logo-dark.png" width="350">
        <source media="(prefers-color-scheme: light)" srcset="./logo.png" width="350">
        <img alt="snarkDB logo" src="./logo.png" width="350">
    </picture>
</h1>

<p align="center">
SnarkDB is a CLI for exposing any RDBMS to zero knowledge SQL queries. Allowing a wide range of usecases such as private set intersection, proof of data origin or proof of conform processing over saved data.
</p>

## Table of Contents

- [1. Getting started](#1-getting-started)
  - [1.1 Install](#11-install)
  - [1.2 Set up account](#12-set-up-account)
  - [1.3 Start instance](#13-start-instance)
- [2. Datasources](#2-datasources)
  - [2.1 Available datasources](#21-available-datasources)
  - [2.2 Add a datasource](#22-add-a-datasource)
  - [2.3 List datasources](#23-list-datasources)
- [3. Tables](#3-tables)
  - [3.1 Expose a table](#31-expose-a-table)
  - [3.2 List tables](#32-list-tables)
- [4. Peers](#4-peers)
  - [4.1 Add a peer](#41-add-a-peer)
  - [4.2 List peers](#42-list-peers)
  - [4.3 List peer tables](#43-list-peer-tables)
- [5. Queries](#5-queries)
  - [5.1 Initiate a query](#51-initiate-a-query)
  - [5.2 List queries](#52-list-queries)
  - [5.3 Approve a query](#53-approve-a-query)
  - [5.4 Get a query results](#54-get-a-query-results)
- [6. Build](#6-build)
  - [6.1 Build for production](#61-build-for-production)
  - [6.1 Build during development](#62-build-during-development)
- [7. Roadmap](#7-roadmap)

## 1. Getting started

### 1.1 Install

Clone and install dependencies:

```bash
git clone https://github.com/bandersnatch-io/snarkdb && cd snarkdb && npm install
```

Add `snarkdb` alias:

```bash
echo "alias snarkdb='node $(pwd)'" >> ~/.bashrc && source ~/.bashrc
echo "alias snarkdb='node $(pwd)'" >> ~/.bash_profile && source ~/.bash_profile
```

Or use `node .` instead of `snarkdb` for all the following commands.

*Node 18 or higher is required.*

### 1.2 Set up account

Generate and save a new account:

```bash
snarkdb account new --save
```

Use `--overwrite` optional argument to overwrite an existing environement account.

Verify it was generated correctly:

```bash
snarkdb account test
```

### 1.3 Start instance

To syncronise tables or initiate, approve and verify queries, you will need to have a snarkDB instance running.

```bash
snarkdb start
```

### 1.4 Use the CLI

You are all set. Now in a new terminal:

```bash
snarkdb
```

## 2. Datasources

A datasource is a RDBMS connected to your snarkDB instance so you can expose its tables to ZK queries.

### 2.1 Available datasources

Supported RDBMS are:

| RDBMS | SELECT | JOIN | INSERT |
| :- | :-: |  :-: |  :-: |
| [mysql](./DATASOURCES.MD#mysql--mariadb-data-source-options) | ✅ | 🕑 | 🕑 |
| [postgres](./DATASOURCES.MD#postgres--cockroachdb-data-source-options) | ✅ | 🕑 | 🕑 |
| [oracle](./DATASOURCES.MD#oracle-data-source-options) | ✅ | 🕑 | 🕑 |
| [mongodb](./DATASOURCES.MD#mongodb-data-source-options) | ✅ | 🕑 | 🕑 |
| [sqlite](./DATASOURCES.MD#sqlite-data-source-options) | ✅ | 🕑 | 🕑 |
| [sap](./DATASOURCES.MD#) | ✅ | 🕑 | 🕑 |
| [mssql](./DATASOURCES.MD#mssql-data-source-options) | ✅ | 🕑 | 🕑 |
| [mariadb](./DATASOURCES.MD#mysql--mariadb-data-source-options) | ✅ | 🕑 | 🕑 |
| [cockroachdb](./DATASOURCES.MD#postgres--cockroachdb-data-source-options) | ✅ | 🕑 | 🕑 |
| [spanner](./DATASOURCES.MD#) | ✅ | 🕑 | 🕑 |
| [cordova](./DATASOURCES.MD#cordova-data-source-options) | ✅ | 🕑 | 🕑 |
| [react-native](./DATASOURCES.MD#react-native-data-source-options) | ✅ | 🕑 | 🕑 |
| [nativescript](./DATASOURCES.MD#nativescript-data-source-options) | ✅ | 🕑 | 🕑 |
| [sqljs](./DATASOURCES.MD#sqljs-data-source-options) | ✅ | 🕑 | 🕑 |
| [aurora-mysql](./DATASOURCES.MD#mysql--mariadb-data-source-options) | ✅ | 🕑 | 🕑 |
| [aurora-postgres](./DATASOURCES.MD#postgres--cockroachdb-data-source-options) | ✅ | 🕑 | 🕑 |
| [expo](./DATASOURCES.MD#expo-data-source-options) | ✅ | 🕑 | 🕑 |
| [better-sqlite3](./DATASOURCES.MD#better-sqlite3-data-source-options) | ✅ | 🕑 | 🕑 |
| [capacitor](./DATASOURCES.MD#capacitor-data-source-options) | ✅ | 🕑 | 🕑 |

### 2.2 Add a datasource

To connect a RDBMS to your snarkDB instance:

```bash
snarkdb datasource add \
  --identifier mysql_database \
  --datasourceJson '{
    "type": "mysql",
    "host": "127.0.0.1",
    "port": 3306,
    "username": "username",
    "password": "password",
    "database": "mysql_database"
  }'
```

For all available options for each datasource type, see [datasources documentation](./DATASOURCES.MD).

### 2.3 List datasources

Check the datasource was correctly added:

```bash
snarkdb datasource list
```

## 3. Tables

### 3.1 Expose a table

In snarkDB, exposing a table means sharing a subset of its columns names and types to a defined set of users (snarkDB IDs).

Exposed table can then be queried by those users. Those SQL queries are then accepted or not by from(s) table(s) owner(s).

Table data (its rows) **are NOT shared** when a table is exposed, only after a query is accepted. **Only query result is divulgated to querier, not intermediate results or origin table data.**

To expose a table:

```bash
snarkdb table expose \
  --datasource mysql_database \
  --sourceTable consumers \
  --destinationTable users \
  --visibility 'public' \
  --capacity 10 #\
  # --syncPeriod 3600 \
  # --columnsMapping 'user_id:id,age,is_activated' \
```

- `datasource` - Identifier of the datasource where table is located.
This option is **required**.

- `sourceTable` - Name of the table within this datasource.
This option is **required**.

- `destinationTable` - Identifier of the table within snarkDB.
This option is **required**.

- `visibility` - Who the table is exposed to, (ie: users who can see the exposed table column name and types) **They cannot see database content**.
Either `'public'` or a list of comma separated  snarkDB IDs (or peer identifiers) as: `'steve,db1l67vf81v2d78dc23hsk'`.
This option is **required**.

- `capacity` - Maximum amount of element in the table. It allows to obfuscate the amount of elements in source table.
This option is **required**.

- `syncPeriod` - Table state is commited publicly every period (in seconds).
Default is `3600`.

- `columnsMapping` - Optional filter on exposed columns formatted as list of comma separated mappings `source_column:exposed_column`. For instance, `'user_id:id,age,is_activated'` means source column with name `user_id` is exposed as `id`, and `age` as well as `is_activated` are exposed with the same name.
When not specified, all columns are exposed by default with the same name as in source.

### 3.2 List tables

Check the table was correctly exposed:

```bash
snarkdb table list
```

## 4. Peers

Peers are other snarkDB instances you can connect to in order to query their exposed tables.

### 4.1 Add a peer

```bash
snarkdb peer add \
  --identifier 'steve' \
  --snarkdbId 'db1f2jcvdca2tl8d7e8fdmpxarscrscxqx6gm277s6d9gepdx3pd58qqfqgqyfzq7hjngl6j93qte6uwurn2g9yeu07l06phpkjqmt9r9n4tt80ev8h366r0h' \
  --host '192.168.1.12' #\
  # --port 3020
```

### 4.2 List peers

Check the peer was correctly added:

```bash
snarkdb peer list
```

### 4.3 List peer tables

To list tables exposed to your snarkDB account of a specific peer:

```bash
snarkdb peer tables --peerId steve
```

## 5. Queries

### 5.1 Initiate a query

To initiate a SQL query to any peer:

```bash
snarkdb query execute \
  --query '
    SELECT id as uid
    FROM peer_name.first_table
  '
```

### 5.2 List queries

To get incoming queries:

```bash
snarkdb query list --incoming
```

To get outgoing queries:

```bash
snarkdb query list --outgoing
```

### 5.3 Approve a query

To approve an incoming query with status as `Pending your approval`.

```bash
node . query approve --queryId ki217izn80a9gekcw47nldc00
```

### 5.4 Get a query results

Initiator can access those results once the request has been processed by all involved peers:

```bash
snarkdb query result --queryId ki217izn80a9gekcw47nldc00
```

Output:

```bash
┌─────────┬─────────┬─────────┐
│ (index) │ col_2_1 │ col_2_3 │
├─────────┼─────────┼─────────┤
│ 0       │ 4       │ true    │
│ 1       │ 2       │ false   │
│ 2       │ 3       │ true    │
│ 3       │ 1       │ true    │
└─────────┴─────────┴─────────┘
```

Query results are records encrypted with initiator public key.

Results execution proof are verified uppon reception.

Also, it is not implemented in the CLI yet but anyone who has access to both a request raw SQL query and its execution proof can verify the request. There is no need to have the plain text result for verifying.

## 6. Build

### 6.1 Build for production

```bash
npm run build
```

### 6.2 Build during development

```bash
npm run dev
```

## 7. Roadmap

- Nested query (ready to be integrated - proof + verification)
- JOIN (ready to be integrated -  proof + verification)
- Transpile expressions as aleo instructions for selected columns (Arithemtics + String manipulation)
- INSERT query results INTO datasource table support
- String data support
- Add peer filter to query list
