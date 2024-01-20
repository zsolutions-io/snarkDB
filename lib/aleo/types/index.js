
export * from './integers.js';
export * from './address.js';
export * from './arrays.js';
export * from './records.js';
import { is_valid_array, parse_array } from './arrays.js';
import { integer_types } from './integers.js';


export function is_valid_type(str) {
  const basicTypePattern = /^((?:[a-zA-Z_]{1}[a-zA-Z0-9_]*\.aleo\/)?(?:[a-zA-Z_]{1}[a-zA-Z0-9_]*))$/;

  if (basicTypePattern.test(str)) {
    return true;
  }

  return is_valid_array(str);
}


export function parse_type_with_visibility(str) {
  const regex = /((?:[_a-zA-Z0-9\[\ \;\]\/]|(?:\.(?=aleo))|aleo)+)(\.(private|public|record|future))?\s*/;
  const match = str.match(regex);
  if (match) {
    return {
      ...parse_type(match[1]),
      visibility: match[3]
    }
  } else {
    return null;
  }
}


export function parse_type(str) {
  const base_type = parse_base_type(str);
  if (base_type)
    return base_type;
  return parse_array(str);
}


export function parse_base_type(str) {
  const basicTypePattern = /^(?:([a-zA-Z_]{1}[a-zA-Z0-9_]*)\.aleo\/)?([a-zA-Z_]{1}[a-zA-Z0-9_]*)$/;
  const match = str.match(basicTypePattern);
  if (match) {
    const [_, program_name, type_name] = match;
    return {
      ...type_to_category_content(type_name),
      from_program: program_name || null,
    };
  }
  return null;
}


function type_to_category_content(type_name) {
  let category = "custom";

  if (type_name === "address")
    category = "address";
  else if (integer_types.includes(type_name))
    category = "integer";

  return { category, value: type_name };
}


export const null_value_from_type = (type, visibility) => {
  if (visibility == null) visibility = null;
  const { category, value } = type;
  const visibility_str = (visibility === null) ? "" : `.${visibility}`;

  if (category === "integer") {
    return `0${value}${visibility_str}`;
  }
  if (category === "array") {
    const size = sizePart.split("u")[0];
    return (`[` +
      Array(size)
        .fill(null)
        .map(() => null_value_from_type(value.element_type, visibility))
        .join(",")
      + `]`);
  }
  if (value === "boolean") {
    return `false${visibility_str}`;
  }
  console.log({ type, visibility });
  throw `Not implemented yet.`;
}

