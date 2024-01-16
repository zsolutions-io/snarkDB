program table2.aleo;


struct Desc_table2:
    col_2_1 as field;
    col_2_2 as field;
    col_2_3 as boolean;

record Row_table2:
    owner as address.public;
    data as Desc_table2.private;

record State_table2:
    owner as address.public;
    state as field.private;
    commitment as field.public;


// ONCHAIN FUNCTIONS

function create_table_state:
    input r0 as scalar.private; // rng
    commit.bhp256 0field r0 into r1 as field;
    cast self.caller 0field r1 into r2 as State_table2.record;
    output r2 as State_table2.record;

function update_table_state:
    input r0 as State_table2.record; // Previous state
    input r1 as field.private; // New state field
    input r2 as field.public; // New state commitment
    cast self.caller r1 r2 into r3 as State_table2.record;
    output r3 as State_table2.record;

function delete_table_state:
    input r0 as State_table2.record;


// OFFCHAIN FUNCTIONS

function insert_table2:
    input r0 as Desc_table2.private; // data
    input r1 as field.private; // former state
    input r2 as scalar.private; // rng

    // assert.eq self.caller aleo1mgfq6g40l6zkhsm063n3uhr43qk5e0zsua5aszeq5080dsvlcvxsn0rrau;
    hash.bhp256 r0 into r3 as field;
    add r1 r3 into r4;
    commit.bhp256 r4 r2 into r5 as field;
    cast self.caller r0 into r6 as Row_table2.record;

    output r4 as field.private; // new state
    output r5 as field.public; // new state commitment
    output r6 as Row_table2.record; // encrypted row
    

function delete_table2:
    input r0 as Desc_table2.private; // data
    input r1 as field.private; // former state
    input r2 as scalar.private; // rng

    // assert.eq self.caller aleo1mgfq6g40l6zkhsm063n3uhr43qk5e0zsua5aszeq5080dsvlcvxsn0rrau;
    hash.bhp256 r0 into r3 as field;
    sub r1 r3 into r4;
    commit.bhp256 r4 r2 into r5 as field;

    output r4 as field.private; // new state
    output r5 as field.public; // new state commitment


function update_table2:
    input r0 as Desc_table2.private; // former data
    input r1 as Desc_table2.private; // new data
    input r2 as field.private; // former state
    input r3 as scalar.private; // rng

    // assert.eq self.caller aleo1mgfq6g40l6zkhsm063n3uhr43qk5e0zsua5aszeq5080dsvlcvxsn0rrau;
    hash.bhp256 r0 into r4 as field;
    sub r2 r4 into r5;
    hash.bhp256 r1 into r6 as field;
    add r2 r6 into r7;
    commit.bhp256 r6 r3 into r8 as field;
    cast self.caller r1 into r9 as Row_table2.record;

    output r7 as field.private; // new state
    output r8 as field.public; // new state commitment
    output r9 as Row_table2.record; // encrypted row
