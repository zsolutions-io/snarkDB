import { Program, function_to_code } from "./lib/aleo/program.js";
import fs from 'fs/promises';


const program_name = "select";

const var_prefix = "v";
const var_places = 4;


const in_path = `${process.cwd()}/programs/${program_name}/main.template.aleo`;
const out_path = `${process.cwd()}/programs/${program_name}/main.aleo`;
const aleo_var_prefix = "r";


const main = async () => {
  let program_code = await fs.readFile(in_path, 'utf8');
  const program = Program.from_code(program_code);
  const vars = {};

  for (let i = 0; i < program.functions.length; i++) {
    let j = 0;
    const fct = program.functions[i];

    const var_definitions = fct.inputs.concat(
      fct.body.reduce(
        (lines, line) => lines.concat(line.outputs),
        []
      )
    );
    for (const var_definition of var_definitions) {
      vars[var_definition.name] = `${aleo_var_prefix}${j}`;;
      j++;
    }

    for (const [name, aleo_name] of Object.entries(vars)) {
      program_code = program_code.replaceAll(name, aleo_name);
    }
  }

  await fs.writeFile(out_path, program_code);
}

const zeroPad = (num, places) => String(num).padStart(places, '0')

main();

