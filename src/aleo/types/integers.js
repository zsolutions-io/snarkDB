import { randBetween } from 'bigint-crypto-utils'


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

