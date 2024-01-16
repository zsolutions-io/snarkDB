import {
    ProgramManager
} from '@aleohq/sdk';


import {
    Execution,
    initThreadPool,
    PrivateKey,
    verifyFunctionExecution,
    ProvingKey,
    VerifyingKey,
} from '@aleohq/wasm';


import fs from 'fs/promises';
import fsExists from 'fs.promises.exists'

await initThreadPool();
const defaultHost = "https://api.explorer.aleo.org/v1";
const programManager = new ProgramManager(defaultHost, undefined, undefined);


export async function execute_offline(
    localProgram,
    aleoFunction,
    inputs,
    privateKey,
    provingKey,
    verifyingKey,
    proveExecution = false,
    offlineQuery = undefined
) {
    try {
        const imports = await programManager.networkClient.getProgramImports(
            localProgram
        );
        if (imports instanceof Error) {
            throw "Error getting program imports";
        }

        const response = await programManager.run(
            localProgram,
            aleoFunction,
            inputs,
            proveExecution,
            imports,
            undefined,
            provingKey.copy(),
            verifyingKey.copy(),
            PrivateKey.from_string(privateKey),
            offlineQuery
        );
        const outputs = response.getOutputs();
        const executionObj = response.getExecution();
        let execution = executionObj ? executionObj.toString() : "";

        return { outputs, execution };
    }
    catch (error) {
        console.error(error);
        return error ? error.toString() : "Unknown error";
    }
}


export async function verify_execution(
    execution,
    verifyingKey,
    localProgram,
    aleoFunction,
) {
    try {
        const program = programManager.createProgramFromSource(localProgram);
        if (program instanceof Error) {
            throw "Error creating program from source";
        }

        const valid_proof = verifyFunctionExecution(
            Execution.fromString(execution),
            verifyingKey.copy(),
            program,
            aleoFunction
        );

        return valid_proof;
    }
    catch (error) {
        console.error(error);
        return error ? error.toString() : "Unknown error";
    }
}



export async function generate_and_save_program_keys(
    program_source,
    function_name,
    inputs,
    proving_private_key,
    program_dir_path,
) {
    const prover_dir_path = `${program_dir_path}`
    const prover_dir_exists = await fsExists(prover_dir_path);
    if (!prover_dir_exists)
        await fs.mkdir(prover_dir_path, { recursive: true });

    const prover_path = `${prover_dir_path}/${function_name}.prover`;
    const verifyier_path = `${prover_dir_path}/${function_name}.verifier`;

    const [proving_key, verifying_key] = await generate_program_keys(
        program_source,
        function_name,
        inputs,
        proving_private_key
    );

    await fs.writeFile(prover_path, proving_key.toBytes());
    await fs.writeFile(verifyier_path, verifying_key.toBytes());

    return [proving_key, verifying_key];
}


export async function generate_program_keys(
    program_source,
    function_name,
    inputs,
    private_key,
) {
    return await programManager.synthesizeKeys(
        program_source,
        function_name,
        inputs,
        PrivateKey.from_string(private_key)
    );
}


export async function load_program_keys(
    function_name,
    program_dir_path,
) {
    const proving_path = `${program_dir_path}/${function_name}.prover`;
    const verifying_path = `${program_dir_path}/${function_name}.verifier`;

    const proving_key = ProvingKey.fromBytes(
        new Uint8Array(await fs.readFile(proving_path))
    );
    const verifying_key = VerifyingKey.fromBytes(
        new Uint8Array(await fs.readFile(verifying_path))
    );

    return [proving_key, verifying_key];
}