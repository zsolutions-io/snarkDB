import { Program, function_to_code } from "./lib/aleo/program.js";
import fs from 'fs/promises';


const var_prefix = "v";
const var_places = 4;


const aleo_var_prefix = "r";


const main = async () => {
  let args = process.argv.slice(2);
  if (args.length !== 1) {
    console.log("Usage: node aleo_template_to_aleo.js <program_name>");
    return;
  }
  const program_name = args[0];
  const in_path = `${process.cwd()}/programs/${program_name}/main.template.aleo`;
  const out_path = `${process.cwd()}/programs/${program_name}/main.aleo`;

  try {
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
  } catch (e) {
    console.log("" + e);
  }
}

const zeroPad = (num, places) => String(num).padStart(places, '0')

await main();

