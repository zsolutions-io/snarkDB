import table2.aleo; // FROM table

program select.aleo; 


// SELECT col_2_1 as col FROM aleo1q6zgvkre2d2thyjhx3aqk4ac42ll259je3gztsvvdrlpmd65fyxq0dkrtv.table2 WHERE col_2_3 = true;
// Request reciever : aleo1rsraxa4ywh3yqrywmg5te6ymy4g9e3u5u305y9jrd78cmh45zg8selrqus


// SELECT close
struct Desc_select:
    col as field;


record Row_select:
    owner as address.private;
    data as Desc_select.private;


struct Desc_table2:
    col_2_1 as field;
    col_2_2 as field;
    col_2_3 as boolean;


function process_select:
    input r0 as table2.aleo/Row_table2.record; // row record
    input r1 as scalar.private; // cpk
    input r2 as field.private; // previous state
    input r3 as scalar.private; // previous cpk
    input r4 as field.public; // previous commit

    commit.bhp256 r2 r3 into r5 as field;
    assert.eq r4 r5;

    hash.bhp256 r0.data into r6 as field;
    add r2 r6 into r7; // new state
    commit.bhp256 r7 r1 into r8 as field; // new commit

    cast r0.data.col_2_1 into r9 as Desc_select; // SELECT close | r9 is selected columns
    is.eq r0.data.col_2_3 true into r10; // WHERE close | r10 is where condition
    
    ternary r10 aleo1rsraxa4ywh3yqrywmg5te6ymy4g9e3u5u305y9jrd78cmh45zg8selrqus aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc into r11; // Request emitter
    cast r11 r9 into r12 as Row_select.record; // new row

    output r7 as field.private; // new state
    output r8 as field.public; // new commit
    output r12 as Row_select.record; // encrypted result


function commit_null_state: // Prove a commit represents a null state
    input r0 as scalar.private; // commit private key (cpk)
    commit.bhp256 0field r0 into r1 as field;
    output r1 as field.public;
