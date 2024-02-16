function replaceBetween(str, start, end, what) {
  return str.substring(0, start) + what + str.substring(end);
};

function aleo_object_to_js(aleo_obj) {
  /*
  const intPattern = /(\-*\d+)(i|u)(\d+)/;

  const matches_int = aleo_obj.match(intPattern);
  if (matches_int) {
    const [, number1, type, number2] = matches_int;
    return BigInt(number1, 10).toString();
  }
  */
  if (aleo_obj === "true") return "true"
  if (aleo_obj === "false") return "false"

  return '"' + String(aleo_obj) + '"'
}

export function parse_record(snarkos_struct) {
  let snarkos_struct_r = snarkos_struct.replace(/\s/g, '');
  let regexp = /\-*[0-9a-z]*\.(private|public)/g;

  let matches = [...snarkos_struct_r.matchAll(regexp)];
  let match_indexes = matches.map((match) => {
    const i_beg = match.index;
    const i_end = match.index + match[0].length;
    return ([i_beg, i_end, match[0]])
  });
  match_indexes.sort((a, b) => b[0] - a[0])
  for (const [beg, end, match] of match_indexes) {
    let rep = match.split(".")[0];

    snarkos_struct_r = replaceBetween(snarkos_struct_r, beg, end, aleo_object_to_js(rep))
  }
  const json_record = snarkos_struct_r.replace(/(['"])?([a-z0-9A-Z_]+)(['"])?:/g, '"$2": ');

  return JSON.parse(json_record);
}

