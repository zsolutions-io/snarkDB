program table2.aleo;

struct Data_table2:
    col_2_1 as u128;
    col_2_2 as u128;
    col_2_3 as boolean;

struct Dsk_table2:
    col_2_1 as field;
    col_2_2 as field;
    col_2_3 as field;

record Row_table2:
    owner as address.private;
    data as Data_table2.private;
    decoy as boolean.private;

function insert_table2:
    input r0 as Data_table2.private;
    input r1 as field.private;
    input r2 as Dsk_table2.private;
    input r3 as field.private;
    hash.bhp256 r0 into r4 as field;
    add r1 r4 into r5;
    hash.bhp256 r2 into r6 as field;
    add r3 r6 into r7;
    encrypt r0 r2 into r8;
    output r5 as field.private;
    output r7 as field.private;
    output r8 as Dsk_table2.private;

closure encrypt:
    input r0 as Data_table2;
    input r1 as Dsk_table2;

    cast r0.col_2_1 into r2 as field;
    sum r2 r1.col_2_1 into r3;

    cast r0.col_2_2 into r4 as field;
    sum r4 r1.col_2_2 into r5;

    cast r0.col_2_3 into r6 as field;
    sum r6 r1.col_2_3 into r7;

    cast r3 r5 r7 into r8 as Dsk_table2;

    output r as Dsk_table2;