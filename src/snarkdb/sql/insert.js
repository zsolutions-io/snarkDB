
import {
  insert_function_name,
  description_struct_name,
  dsk_struct_name,
  encrypt_closure_name,
} from "./table.js";
import { VariableManager } from "aleo/program.js";


export const table_insert_function = (table_name) => {
  const vars = new VariableManager();

  return {
    name: insert_function_name(table_name),
    inputs: [
      {
        name: vars.let("data"),
        type: {
          category: "custom",
          value: description_struct_name(table_name),
          visibility: "private",
        },
      },
      {
        name: vars.let("prev_data_state"),
        type: {
          category: "integer",
          value: "field",
          visibility: "private",
        },
      },
      {
        name: vars.let("dsk"),
        type: {
          category: "custom",
          value: dsk_struct_name(table_name),
          visibility: "private",
        },
      },
      {
        name: vars.let("prev_dsk_state"),
        type: {
          category: "integer",
          value: "field",
          visibility: "private",
        },
      },
      {
        name: vars.let("decoy"),
        type: {
          category: "boolean",
          value: "boolean",
          visibility: "private",
        },
      },
    ],
    body: [
      {
        opcode: "hash.bhp256",
        inputs: [
          {
            name: vars.get("data"),
          },
        ],
        outputs: [{
          name: vars.let("data_hash"),
          type: {
            category: "integer",
            value: "field",
          },
        }],
      },
      {
        opcode: "ternary",
        inputs: [
          {
            name: vars.get("decoy"),
          },
          {
            name: "0field",
          },
          {
            name: vars.get("data_hash"),
          },
        ],
        outputs: [{
          name: vars.let("state_to_add"),
        }],
      },
      {
        opcode: "add",
        inputs: [
          {
            name: vars.get("prev_data_state"),
          },
          {
            name: vars.get("state_to_add"),
          },
        ],
        outputs: [{
          name: vars.let("new_data_state"),
        }],
      },
      {
        opcode: "hash.bhp256",
        inputs: [
          {
            name: vars.get("dsk"),
          },
        ],
        outputs: [{
          name: vars.let("dsk_hash"),
          type: {
            category: "integer",
            value: "field",
          },
        }],
      },
      {
        opcode: "add",
        inputs: [
          {
            name: vars.get("prev_dsk_state"),
          },
          {
            name: vars.get("dsk_hash"),
          },
        ],
        outputs: [{
          name: vars.let("new_dsk_state"),
        }],
      },
      {
        opcode: "call",
        inputs: [
          {
            name: "encrypt",
          },
          {
            name: vars.get("data"),
          },
          {
            name: vars.get("dsk"),
          },
        ],
        outputs: [{
          name: vars.let("encrypted_data"),
        }],
      },
    ],
    outputs: [
      {
        name: vars.get("new_data_state"),
        type: {
          category: "integer",
          value: "field",
          visibility: "private",
        },
      },
      {
        name: vars.get("new_dsk_state"),
        type: {
          category: "integer",
          value: "field",
          visibility: "private",
        },
      },
      {
        name: vars.get("encrypted_data"),
        type: {
          category: "custom",
          value: dsk_struct_name(table_name),
          visibility: "private",
        },
      },
    ],
  };
}



export const table_encrypt_closure = (table_name, columns) => {
  const attribute_names = columns.map(column => column.snarkdb.name);
  const vars = new VariableManager();

  const closure = {
    name: encrypt_closure_name(table_name),
    inputs: [
      {
        name: vars.let("data"),
        type: {
          category: "custom",
          value: description_struct_name(table_name),
        },
      },
      {
        name: vars.let("dsk"),
        type: {
          category: "custom",
          value: dsk_struct_name(table_name),
        },
      },
    ],
    body: [],
    outputs: [],
  };
  closure.body = attribute_names.reduce(
    (body, attribute_name, index) => {
      return body.concat([
        {
          opcode: "cast",
          inputs: [
            {
              name: `${vars.get("data")}.${attribute_name}`,
            },
          ],
          outputs: [
            {
              name: vars.let(`casted_attribute_${index}`),
              type: {
                category: "integer",
                value: "field",
              },
            },
          ],
        },
        {
          opcode: "add",
          inputs: [
            {
              name: `${vars.get("dsk")}.${attribute_name}`,
            },
            {
              name: `${vars.get(`casted_attribute_${index}`)}`,
            },
          ],
          outputs: [
            {
              name: vars.let(`encrypted_attribute_${index}`),
            },
          ],
        },
      ]);
    },
    []
  );
  closure.body.push({
    opcode: "cast",
    inputs: attribute_names.map(
      (attribute_name, index) => (
        {
          name: vars.get(`encrypted_attribute_${index}`),
        }
      )
    ),
    outputs: [
      {
        name: vars.let("encrypted_data"),
        type: {
          category: "custom",
          value: dsk_struct_name(table_name),
        },
      },
    ],
  });
  closure.outputs.push({
    name: vars.get("encrypted_data"),
    type: {
      category: "custom",
      value: dsk_struct_name(table_name),
    },
  });
  return closure;
}
