
import { insert_function_name, description_struct_name, dsk_struct_name } from "./table.js";


export const table_insert_function = (table_name) => {
  return {
    name: insert_function_name(table_name),
    inputs: [
      {
        name: "r0",
        type: {
          category: "custom",
          value: description_struct_name(table_name),
          visibility: "private",
        },
      },
      {
        name: "r1",
        type: {
          category: "integer",
          value: "field",
          visibility: "private",
        },
      },
      {
        name: "r2",
        type: {
          category: "custom",
          value: dsk_struct_name(table_name),
          visibility: "private",
        },
      },
      {
        name: "r3",
        type: {
          category: "integer",
          value: "field",
          visibility: "private",
        },
      },
    ],
    body: [
      {
        opcode: "hash.bhp256",
        inputs: [
          {
            name: "r0",
          },
        ],
        outputs: [{
          name: "r4",
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
            name: "r1",
          },
          {
            name: "r4",
          },
        ],
        outputs: [{
          name: "r5",
        }],
      },
      {
        opcode: "hash.bhp256",
        inputs: [
          {
            name: "r2",
          },
        ],
        outputs: [{
          name: "r6",
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
            name: "r3",
          },
          {
            name: "r6",
          },
        ],
        outputs: [{
          name: "r7",
        }],
      },
    ],
    outputs: [
      {
        name: "r5",
        type: {
          category: "integer",
          value: "field",
          visibility: "private",
        },
      },
      {
        name: "r7",
        type: {
          category: "integer",
          value: "field",
          visibility: "private",
        },
      },
    ],
  };
}