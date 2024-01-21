import select.aleo;

program nested_select.aleo; 


// SELECT 2*col FROM aleo1l96m5aqndzqm6253xee2j887xxh4c6w6h9ksdaknst9mq3xrfv8senek7g.select;
// Request reciever : aleo15wktn0yr8vhxfzh9td7zhnrge9u6hra8tg4qtv2p9dumwc9mwgzqq63rlg


struct Desc_nested_select:
    exp_2_t_col as field;


struct Desc_select:
    col as field;

record Row_nested_select:
    owner as address.private;
    data as Desc_nested_select.private;
    decoy as boolean.private;
    psk as scalar.private;



function process_select:
    input r0 as select.aleo/Row_select.record; // row record
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

    mul 2field r0.data.col into r11;
    
    cast r11 into r12 as Desc_nested_select; // SELECT close
    is.eq true true into r13; // WHERE close | r13 is where condition
    
    not r0.decoy into r14; // Not decoy
    and r14 r13 into r15; // Is result data relevant
    not r15 into r16;

    // Empty result creation if result data not relevant 
    ternary r15 r12.exp_2_t_col 0field into r17;
    // ... for each selected column

    cast r17 into r18 as Desc_nested_select;
    cast aleo15wktn0yr8vhxfzh9td7zhnrge9u6hra8tg4qtv2p9dumwc9mwgzqq63rlg r18 r16 r5 into r19 as Row_nested_select.record; // new row

    commit.bhp256 r18 r5 into r20 as field; // output process commit
    commit.bhp256 r0.data r0.psk into r21 as field; // input process commit FOR

    output r9 as field.private; // new state
    output r10 as field.public; // new commit
    output r19 as Row_nested_select.record; // encrypted result
    output r20 as field.public; // output process commit
    output r21 as field.public; // input process commit

