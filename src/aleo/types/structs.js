import JSONbig from 'json-bigint';
import { replace_between } from 'utils/index.js';
const JSONBIG = JSONbig({ useNativeBigInt: true });


function aleo_object_to_js(aleo_obj) {
  aleo_obj = aleo_obj.replace(/\s/g, '');
  if (aleo_obj.startsWith("[") && aleo_obj.endsWith("]")) {
    let array = aleo_obj.slice(1, aleo_obj.length - 1).split(",");
    let res = array.map((x) => aleo_object_to_js(x));
    return "[" + res.join(", ") + "]";
  }
  const intPattern = /(\-*\d+)((i|u)(\d+)|field|scalar|group)/;

  const matches_int = aleo_obj.match(intPattern);
  if (matches_int) {
    const [, number1, type, number2] = matches_int;
    return BigInt(number1, 10).toString();
  }

  if (aleo_obj === "true") return "true"
  if (aleo_obj === "false") return "false"
  return '"' + String(aleo_obj) + '"'
}


export function aleo_struct_to_js_object(snarkos_struct) {
  if (snarkos_struct.startsWith("aleo1"))
    return snarkos_struct;
  let snarkos_struct_r = snarkos_struct.replace(/\s/g, '');
  let regexp = /(\:|\ )[\-a-zA-Z0-9\,\[\]]+(\,|\ |\})/g;

  let matches = [...snarkos_struct_r.matchAll(regexp)];
  let match_indexes = matches.map((match) => {
    const i_beg = match.index + 1;
    const i_end = match.index + match[0].length - 1;
    return ([i_beg, i_end, match[0].slice(1, match[0].length - 1)])
  });
  match_indexes.sort((a, b) => b[0] - a[0])
  for (const [beg, end, match] of match_indexes) {
    let rep = match.split(".")[0];

    snarkos_struct_r = replace_between(snarkos_struct_r, beg, end, aleo_object_to_js(rep))
  }
  const json_record = snarkos_struct_r.replace(/(['"])?([a-z0-9A-Z_]+)(['"])?:/g, '"$2": ');


  const parsed = JSONBIG.parse(json_record);

  delete parsed['_nonce'];

  return parsed;
}

