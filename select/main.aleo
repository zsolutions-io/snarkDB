import table2.aleo;

program select.aleo;

// SELECT * FROM aleo1mgfq6g40l6zkhsm063n3uhr43qk5e0zsua5aszeq5080dsvlcvxsn0rrau.table2 WHERE col_2_3 = true;

struct Desc_select:
    col_2_1 as field;
    col_2_2 as field;
    col_2_3 as boolean;


record State_select:
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
    input r2 as field.public; // New commitment
    cast self.caller r1 r2 into r3 as State_table2.record;
    output r3 as State_table2.record;

function delete_table_state:
    input r0 as State_table2.record;


// OFFCHAIN FUNCTIONS

function process_select:
    input r0 as table2.aleo/Desc_table2.private; // data
    input r1 as field.private; // last state
    input r2 as scalar.private; // rng
    assert.eq self.caller aleo1mgfq6g40l6zkhsm063n3uhr43qk5e0zsua5aszeq5080dsvlcvxsn0rrau;
    hash.bhp256 r0 into r3 as field;
    add r1 r3 into r4;
    commit.bhp256 r4 r2 into r5 as field;
    output r4 as field.private; // new state
    output r5 as field.public; // new commitment

