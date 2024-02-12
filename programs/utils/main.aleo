program utils.aleo;


function sk_to_pk:
    input r0 as scalar.private; // secret key (sk)
    mul r0 group::GEN into r1;
    output r1 as group.public; // public key (pk)


function commit_state:
    input r0 as field.private; // state
    input r1 as scalar.private; // commit private key (csk)
    commit.bhp256 r0 r1 into r2 as field;
    output r2 as field.public; // new commit


function commit_multi_state:
    input r0 as field.private; // data state
    input r1 as field.private; // dsk state
    input r2 as scalar.private; // csk
    commit.bhp256 r0 r2 into r3 as field;
    commit.bhp256 r1 r2 into r4 as field;
    output r3 as field.public;
    output r4 as field.public;


function commit_null_state:
    input r0 as scalar.private; // commit private key (csk)
    commit.bhp256 0field r0 into r1 as field;
    output r1 as field.public;