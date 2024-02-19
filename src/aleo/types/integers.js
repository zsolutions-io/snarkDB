import { randBetween } from 'bigint-crypto-utils'
import { bech32m } from "bech32";
import { Account } from "@aleohq/sdk";
export const constant_type_ranges = {
  scalar: {
    min: BigInt("0"), // included
    max: BigInt("2111115437357092606062206234695386632838870926408408195193685246394721360382"),  // included
  },
  field: {
    min: BigInt("0"), // included
    max: BigInt("8444461749428370424248824938781546531375899335154063827935233455917409239040"), // included
  },
}


export const type_ranges = (type) => {
  const constant_type_range = constant_type_ranges[type];
  if (constant_type_range) {
    return constant_type_range;
  }
  if (type.startsWith("u")) {
    const bits = type.slice(1);
    return {
      min: BigInt("0"),
      max: BigInt("2") ** BigInt(bits) - BigInt("1"),
    }
  }
  if (type.startsWith("i")) {
    const bits = parseInt(type.slice(1));
    return {
      min: BigInt("-2") ** BigInt(String(bits - 1)),
      max: BigInt("2") ** BigInt(String(bits - 1)) - BigInt("1"),
    }
  }
  return null;
}


export const random_from_type = (type) => {
  if (type === "address") {
    return new Account().address().to_string();
  }
  const range = type_ranges(type);
  if (!range) {
    throw new Error(`Cannot take random value of type '${type}'.`);
  }
  const randval = randBetween(range.max, range.min);
  return format_type(randval, type);
}


export const format_type = (int_val, type_str) => {
  return `${int_val}${type_str}`;
}



export function integer_to_bech32(inputStr) {
  // Adjust the regex to capture any ending alphanumeric sequence as the type
  const matches = inputStr.match(/(\d+)(\w+)$/);
  if (!matches) {
    throw new Error("Invalid input format.");
  }

  const integerPart = matches[1];
  const typePart = matches[2];

  // Convert the integer part to a byte array (8-bit unsigned integers)
  const byteArray = BigInt(integerPart).toString(16).padStart(64, '0'); // Ensure 256 bits
  const bytes = [];
  for (let i = 0; i < byteArray.length; i += 2) {
    bytes.push(parseInt(byteArray.substr(i, 2), 16));
  }

  // Encode to bech32m
  const encoded = bech32m.encode(typePart, bech32m.toWords(new Uint8Array(bytes)));

  return encoded;
}


export function bech32_to_integer(inputStr) {
  // Adjust the regex to capture any ending alphanumeric sequence as the type
  const matches = inputStr.match(/(\d+)(\w+)$/);
  if (!matches) {
    throw new Error("Invalid input format.");
  }

  const integerPart = matches[1];
  const typePart = matches[2];

  // Convert the integer part to a byte array (8-bit unsigned integers)
  const byteArray = BigInt(integerPart).toString(16).padStart(64, '0'); // Ensure 256 bits
  const bytes = [];
  for (let i = 0; i < byteArray.length; i += 2) {
    bytes.push(parseInt(byteArray.substr(i, 2), 16));
  }

  // Encode to bech32m
  const encoded = bech32m.encode(typePart, bech32m.toWords(new Uint8Array(bytes)));

  return encoded;
}





export const integer_types = [
  "i8",
  "i16",
  "i32",
  "i64",
  "i128",
  "u8",
  "u16",
  "u32",
  "u64",
  "u128",
  "field",
  "scalar",
  "group",
];

