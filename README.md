# snarkDB

snarkDB is a tool for exposing any RDBMS to zero knowledge SQL queries. Allowing a wide range of usecases such as private set intersection, proof of data origin or proof of conform processing over saved data.

## Install

```bash
npm install
```

## Getting started

Generate your mnemonic:

```bash
node . account new | sed -n '4p' | sed 's/^.\{16\}//' | awk '{print "MNEMONIC="$0}' > .env.local
```

Verify it was generated correctly:

```bash
node . account test
```

## Datasources

### Options

Supported RDBMS are:

- mysql
- postgres
- cockroachdb
- sap
- spanner
- mariadb
- sqlite
- cordova
- react-native
- nativescript
- sqljs
- oracle
- mssql
- mongodb
- aurora-mysql
- aurora-postgres
- expo
- better-sqlite3
- capacitor

For more information, see [typeorm datasources documentation](https://github.com/typeorm/typeorm/blob/master/docs/data-source-options.md#what-is-datasourceoptions).

### Add a datasource

### Expose a table

## Select request

```bash
node . execute "\
SELECT column1 as col1 \
FROM peer_name.first_table
"
```

## Accounts

-

  SnarkDB
    Mnemonic
      fire enough truck lumber dice truly canoe midnight unit life flip quantum
    SnarkDB Id
      db1khfg47e43q476ylueukzx9t7t37ssn9v7g2ut0qtaq39afwaugrqqfqgqyfzpjqac0rjk9qqwtaq8sgq5pc7wdgw0rar6n76kwxzpertjm42rnnsl306ed

  IPFS
    Peer Id
      12D3KooWPHY2qU2WspL3WnUXqAWkHP8UY6tWEMjjsYMTzuEME4r3
    Pirivate Key
      23jhTcAkwKrPYiqbxUPELzGTbcbZKbymLVC6SHviqpY9E51bGvcSJEXofcNFJiHNYvBjnRxcdJ29fWDmjHTikxyAUoTSX

  SnarkVM
    Pirivate Key
      APrivateKey1zkp6W6AkPZ7jXUbvsuUmqL9opDvvxtR1Saok82ajQaE1KL1
    View Key
      AViewKey1eDB5kB7yyCgcY45vnNAf7DFEpRHyK9UkdRR7ZLTYMN5Q
    Address
      aleo1khfg47e43q476ylueukzx9t7t37ssn9v7g2ut0qtaq39afwaugrqsfg0w6

-

  SnarkDB
    Mnemonic
      misery tape betray sunset light barely slush mind juice crowd awake art
    SnarkDB Id
      db1wmn963nrnu0pmjamh85snqfqa7v700hjczfnpawf757cn7cc6cpqqfqgqyfzp6jgndhj2mpl6hk6unktqwguyzz3s4dlp70g3yj60yxxrejdr3fg2tkjan

  IPFS
    Peer Id
      12D3KooWRaunSQYH73pt2WM4EoHmsbQPwc5Ef6usiJFfutyK1y2o
    Pirivate Key
      23jhTbRxEwJ4erbDinAVYN7EyGyty6pRxETvKdbcyUkiKsKx3tFjpkhiu2sBN9zUM1S6cb6EmAnTNhFvH4XYk6ZQNLzTR

  SnarkVM
    Pirivate Key
      APrivateKey1zkp41zfhD3QBjgBm2VRpJtgNgTjY7ikfoFC1jLsjRgd5E5F
    View Key
      AViewKey1tFQ2UvMDzwMLNm69A3ZkJStp1XUdCVLscUrrS3h3STnX
    Address
      aleo1wmn963nrnu0pmjamh85snqfqa7v700hjczfnpawf757cn7cc6cpqdgdfjx

table2 owner :
  Private Key  APrivateKey1zkp8ynLk3wcRb4XzZ3C72mnt5fe8bNcpJ9MVxuBH4kqcvVf
      Address  aleo15wktn0yr8vhxfzh9td7zhnrge9u6hra8tg4qtv2p9dumwc9mwgzqq63rlg

select owner :
  Private Key  APrivateKey1zkpEUzXebwrhENw2EpDwvfW1Y6n42HUpwpDnD65jGx3aQ2r
      Address  aleo1l96m5aqndzqm6253xee2j887xxh4c6w6h9ksdaknst9mq3xrfv8senek7g

nested_select owner :
  Private Key  APrivateKey1zkpHkJ47qxn8FjHgYhKotRv9cJxeGCLg42tezqhd6xZNWYD
      Address  aleo1386l43hhduwmh7jdpnsfg7twwnkhzmjfp2zg89qadqq5al2d8sgsw96584

## Todo

- Save table on end of sync
- Query proof verification
- Query proof verification load capacity
- String support
- Nested query (proof + verification)
- JOIN
- Expressions for selected columns (Arithemtics + String manipulation)
