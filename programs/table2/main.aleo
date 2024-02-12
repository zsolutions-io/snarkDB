program table2.aleo;


struct Desc_table2:
    col_2_1 as field;
    col_2_2 as field;
    col_2_3 as boolean;


record Row_table2:
    owner as address.private;
    data as Desc_table2.private;
    decoy as boolean.private;


record State_table2:
    owner as address.public;
    state as field.private;
    commit as field.public;


function insert:
    input r0 as Desc_table2.private; // data
    input r1 as field.private; // former state

    hash.bhp256 r0 into r3 as field;
    add r1 r3 into r4;

    output r4 as field.private; // new state

