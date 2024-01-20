import table2.aleo; // FROM table

program select.aleo; 


// SELECT col_2_1 as col FROM aleo1q6zgvkre2d2thyjhx3aqk4ac42ll259je3gztsvvdrlpmd65fyxq0dkrtv.table2 WHERE col_2_3 = true;
// Request reciever : aleo1rsraxa4ywh3yqrywmg5te6ymy4g9e3u5u305y9jrd78cmh45zg8selrqus


// SELECT close
struct Desc_select:
    col as field;


record Row_select:
    owner as address.private;
    psk as scalar.private;
    data as Desc_select.private;


struct Desc_table2:
    col_2_1 as field;
    col_2_2 as field;
    col_2_3 as boolean;


function process_select:
    input r0 as table2.aleo/Row_table2.record; // row record
    input r1 as scalar.private; // csk
    input r2 as field.private; // previous state
    input r3 as scalar.private; // previous csk
    input r4 as field.public; // previous commit
    input r5 as scalar.private; // out psk

    commit.bhp256 r2 r3 into r6 as field;
    assert.eq r4 r6;

    hash.bhp256 r0.data into r7 as field;
    add r2 r7 into r8; // new state
    commit.bhp256 r8 r1 into r9 as field; // new commit

    cast r0.data.col_2_1 into r10 as Desc_select; // SELECT close | r10 is selected columns
    is.eq r0.data.col_2_3 true into r11; // WHERE close | r11 is where condition
    
    ternary r11 aleo1rsraxa4ywh3yqrywmg5te6ymy4g9e3u5u305y9jrd78cmh45zg8selrqus aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc into r12; // Request emitter
    cast r12 r5 r10 into r13 as Row_select.record; // new row

    commit.bhp256 r10 r5 into r14 as field; // output process commit
    // commit.bhp256 r0.data r0.psk into r15 as field; // input process commit FOR

    output r8 as field.private; // new state
    output r9 as field.public; // new commit
    output r13 as Row_select.record; // encrypted result
    output r14 as field.public; // output process commit
    // output r15 as field.public; // input process commit

