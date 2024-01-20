import table2.aleo; // FROM table

program select.aleo; 


// SELECT col_2_1 as col FROM aleo1386l43hhduwmh7jdpnsfg7twwnkhzmjfp2zg89qadqq5al2d8sgsw96584.table2 WHERE col_2_3 = true;
// Request reciever : aleo1l96m5aqndzqm6253xee2j887xxh4c6w6h9ksdaknst9mq3xrfv8senek7g


// SELECT close
struct Desc_select:
    col as field;


record Row_select:
    owner as address.private;
    data as Desc_select.private;
    decoy as boolean.private;
    psk as scalar.private;


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
    ternary r0.decoy 0field r7 into r8;// To add
    add r2 r8 into r9; // new state
    commit.bhp256 r9 r1 into r10 as field; // new commit

    cast r0.data.col_2_1 into r11 as Desc_select; // SELECT close | r11 is selected columns
    is.eq r0.data.col_2_3 true into r12; // WHERE close | r12 is where condition
    
    not r0.decoy into r13; // Not decoy
    and r13 r12 into r14; // Is result data relevant
    not r14 into r15;

    // Empty result creation if result data not relevant 
    ternary r14 r11.col 0field into r16;
    // ... for each selected column

    cast r16 into r17 as Desc_select;
    cast aleo1l96m5aqndzqm6253xee2j887xxh4c6w6h9ksdaknst9mq3xrfv8senek7g r17 r15 r5 into r18 as Row_select.record; // new row

    commit.bhp256 r17 r5 into r19 as field; // output process commit
    // commit.bhp256 r0.data r0.psk into v_0000_0001 as field; // input process commit FOR

    output r9 as field.private; // new state
    output r10 as field.public; // new commit
    output r18 as Row_select.record; // encrypted result
    output r19 as field.public; // output process commit
    // output v_0000_0001 as field.public; // input process commit

