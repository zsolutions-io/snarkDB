program snarkdb.aleo;


record Commit:
    owner as address.public;
    table_id as field.public;
    commit_id as field.public;


function push_commit:
    input r0 as field.public; // New commit id
    input r1 as field.public; // New Table id
    cast self.caller r0 r1 into r2 as State.record;
    output r2 as State.record;
