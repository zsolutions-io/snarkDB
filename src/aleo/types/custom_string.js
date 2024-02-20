
const field_bit_length = 252;
const encoding_fields_amount = 32;

export function encode_string_to_fields(
  str,
  _encoding_fields_amount,
) {
  if (_encoding_fields_amount == null) _encoding_fields_amount = encoding_fields_amount;
  return (
    encodeStringToBigIntList(str, _encoding_fields_amount, field_bit_length)
      .map(field => `${field}field`)
  );
}


export function decode_fields_to_string(
  fields,
) {
  return decode_bigint_fields_to_string(
    fields.map(field => BigInt(field.slice(0, -5))),
  );
}


export function decode_bigint_fields_to_string(
  fields,
) {
  return decodeBigIntListToString(
    fields,
    field_bit_length
  )
}



function encodeStringToBigIntList(str, N, B) {
  let bitString = '';
  // Convert string to binary representation
  for (const char of str) {
    const binary = char.charCodeAt(0).toString(2).padStart(8, '0');
    bitString += binary;
  }

  // Calculate the required padding
  const totalBits = N * B;
  const paddingLength = totalBits - bitString.length;
  if (paddingLength < 0) {
    console.error('String too long for the specified N and B.');
    return;
  }
  bitString = bitString.padEnd(totalBits, '0');

  const result = [];
  for (let i = 0; i < N; i++) {
    const segment = bitString.substring(i * B, (i + 1) * B);
    result.push(BigInt('0b' + segment));
  }
  return result;
}

function decodeBigIntListToString(list, B) {
  let bitString = '';
  for (const bigint of list) {
    // Ensure leading zeros are preserved by padding each bigint conversion to B bits
    const binary = bigint.toString(2).padStart(B, '0');
    bitString += binary;
  }

  let str = '';
  for (let i = 0; i < bitString.length; i += 8) {
    const byte = bitString.substring(i, i + 8);
    // Stop decoding if we reach padding zeros added during encoding
    if (byte === '00000000') break;
    const charCode = parseInt(byte, 2);
    str += String.fromCharCode(charCode);
  }
  return str;
}