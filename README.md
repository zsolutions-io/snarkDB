# zkSQL interpreter based on Aleo

## Install

```bash
npm install
```

## Environment variables

Duplicate `.env.local.example` file and rename it to `.env.local`.
Update it with your own Aleo private key.

## Create Table

```bash
node . execute "\
CREATE TABLE first_table \
  (column1 INT, column2 BOOLEAN) \
"
```

## Insert row

```bash
node . execute "\
INSERT INTO first_table \
  (column1, column2) \
VALUES \
  (\
    1,\
    true
  )\
"
```

## Select request

```bash
node . execute "\
SELECT column1 as col1 \
FROM aleo103nyxgwktwavyv4l06mns6cqze3s9l6dwu7w8hvfkasrzrs4k5pscv370h.first_table
"
```

## Table name format rules

- 25 characters maximum
- First character : lowercase letter
- Other characters : lowercase letter | underscore | digit

## Implemented

- CREATE TABLE
- INSERT
- JOIN
- Single table WHERE

## Left to implement

- DELETE
- JOIN
- UPDATE
- INSERT TABLE
- Multiple table WHERE
- JOIN

## Ideas

### Fake insertions

To prevent requester from knowing how many rows requested table has,
introduce fake insert (row record will have a fake boolean).
The total amount of rows inserted between every commit push on chain will be a constant
(fake + net reals (insertion - deletions)). The throughput of data hence has a maximum.

Fake rows cannot be selected as they are always rejected on select request
(sent to aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc).
