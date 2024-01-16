import {
    execute_offline,
    verify_execution,
    generate_and_save_program_keys,
    load_program_keys,
    generate_program_keys,
    load_or_generate_and_save_program_keys
} from '../../aleo/proof.js';

import fs from 'fs/promises';

import { random_from_type } from '../../aleo/types/integers.js';

// Initial rng: 422271187840597715341529748386652405183627566447972188081801553289951392873scalar
// Initial commitment: 8338965318581003516007686279766915927417249036022424026390103256267907857322field
// Initial state: 0field

export const retrieve_query_result = async (query_id) => {
    const private_key = "APrivateKey1zkpAZAjaJJvPS7EJ7zvk5fb3QcZDCDxMSHSN5ap7ep4FAD7";

    const program_code = `program table2.aleo;

    struct Desc_table2:
        col_2_1 as field;
        col_2_2 as field;
        col_2_3 as boolean;
    
    record Row_table2:
        owner as address.public;
        data as Desc_table2.private;
    
    record State_table2:
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
        input r2 as field.public; // New state commitment
        cast self.caller r1 r2 into r3 as State_table2.record;
        output r3 as State_table2.record;
    
    function delete_table_state:
        input r0 as State_table2.record;
    
    // OFFCHAIN FUNCTIONS
    
    function insert_table2:
        input r0 as Desc_table2.private; // data
        input r1 as field.private; // former state
        input r2 as scalar.private; // rng
    
        hash.bhp256 r0 into r3 as field;
        add r1 r3 into r4;
        commit.bhp256 r4 r2 into r5 as field;
        cast self.caller r0 into r6 as Row_table2.record;
    
        output r4 as field.private; // new state
        output r5 as field.public; // new state commitment
        output r6 as Row_table2.record; // encrypted row
    
    function delete_table2:
        input r0 as Desc_table2.private; // data
        input r1 as field.private; // former state
        input r2 as scalar.private; // rng
    
        hash.bhp256 r0 into r3 as field;
        sub r1 r3 into r4;
        commit.bhp256 r4 r2 into r5 as field;
    
        output r4 as field.private; // new state
        output r5 as field.public; // new state commitment
    
    function update_table2:
        input r0 as Desc_table2.private; // former data
        input r1 as Desc_table2.private; // new data
        input r2 as field.private; // former state
        input r3 as scalar.private; // rng
    
        hash.bhp256 r0 into r4 as field;
        sub r2 r4 into r5;
        hash.bhp256 r1 into r6 as field;
        add r2 r6 into r7;
        commit.bhp256 r6 r3 into r8 as field;
        cast self.caller r1 into r9 as Row_table2.record;
    
        output r7 as field.private; // new state
        output r8 as field.public; // new state commitment
        output r9 as Row_table2.record; // encrypted row
    `;

    const initial_rng = "422271187840597715341529748386652405183627566447972188081801553289951392873scalar";
    const initial_state = "0field";
    const initial_commit = "8338965318581003516007686279766915927417249036022424026390103256267907857322field";

    const function_name = "insert_table2";
    const rng = random_from_type("scalar");
    const function_inputs = ["{col_2_1: 1field, col_2_2: 2field, col_2_3: true}", initial_state, rng];

    const prover_files_dir = `${process.cwd()}/resources/builds/table2`;

    let res = null;

    const [proving_key, verifying_key] = await load_or_generate_and_save_program_keys(
        program_code,
        function_name,
        function_inputs,
        private_key,
        prover_files_dir,
    );
    console.log({ function_inputs });
    res = await execute_offline(
        program_code,   // localProgram
        function_name,         // aleoFunction
        function_inputs,      // inputs
        private_key,          // privateKey
        proving_key,  // provingKey
        verifying_key,  // verifyingKey
        true            // proveExecution
    );
    const i = 0;

    const commit = {
        inputs: function_inputs,
        outputs: res.outputs,
        execution: JSON.parse(res.execution),
        rng: rng,
    }
    await fs.writeFile(
        `${process.cwd()}/resources/tables/table2/commits/${i}.json`,
        JSON.stringify(commit, null, 2)
    );
    /*
    res = await verify_execution(
        execution,
        verifying_key,
        program_code,
        function_name,
    );
    */
    console.log({ res })


    return;

};