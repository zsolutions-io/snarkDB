program table2.aleo;


struct Desc_table2:
    col_2_1 as field;
    col_2_2 as field;
    col_2_3 as boolean;


record Row_table2:
    owner as address.private;
    data as Desc_table2.private;


record State_table2:
    owner as address.public;
    state as field.private;
    commit as field.public;


// ---------- ONCHAIN FUNCTIONS ----------


function commit_state:
    input r0 as field.private; // New state field
    input r1 as field.public; // New state commit
    cast self.caller r0 r1 into r2 as State_table2.record;
    output r2 as State_table2.record;


// ---------- OFFCHAIN FUNCTIONS ----------


function insert:
    input r0 as Desc_table2.private; // data
    input r1 as field.private; // former state
    input r2 as scalar.private; // rng

    hash.bhp256 r0 into r3 as field;
    add r1 r3 into r4;
    commit.bhp256 r4 r2 into r5 as field;
    cast self.caller r0 into r6 as Row_table2.record;

    output r3 as field.private; // hashed data
    output r4 as field.private; // new state
    output r5 as field.public; // new commit
    output r6 as Row_table2.record; // encrypted row


function delete:
    input r0 as Desc_table2.private; // data
    input r1 as field.private; // former state
    input r2 as scalar.private; // commit private key (cpk)

    hash.bhp256 r0 into r3 as field;
    sub r1 r3 into r4;
    commit.bhp256 r4 r2 into r5 as field;

    output r3 as field.private; // hashed data
    output r4 as field.private; // new state
    output r5 as field.public; // new commit



function commit_null_state: // Prove a commit represents a null state
    input r0 as scalar.private; // commit private key (cpk)
    commit.bhp256 0field r0 into r1 as field;
    output r1 as field.public;

