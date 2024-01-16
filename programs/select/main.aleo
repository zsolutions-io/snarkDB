import table2.aleo;

program select.aleo;

// SELECT col_2_1 as col FROM aleo1jkj7v80w3t5e6rtafhqs5x03jpe7p68prvpyvna8g0ftzfcur5gq77uu2j.table2 WHERE col_2_3 = true;


struct Desc_select:
    col as field;

record Row_select:
    owner as address.private;
    data as Desc_select.private;


// OFFCHAIN FUNCTIONS

function process_select:
    input r0 as table2.aleo/Row_table2.record; // data
    input r1 as field.private; // former state
    input r2 as scalar.private; // rng

    hash.bhp256 r0.data into r3 as field;
    add r1 r3 into r4;
    commit.bhp256 r4 r2 into r5 as field;

    cast r0.data.col_2_1 into r6 as Desc_select;
    cast aleo1jkj7v80w3t5e6rtafhqs5x03jpe7p68prvpyvna8g0ftzfcur5gq77uu2j r6 into r7 as bool;

    output r4 as field.private; // new state
    output r5 as field.public; // new state commitment
    output r7 as Row_table2.record; // encrypted row
