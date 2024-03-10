export const hexToBytes = (hex) => {
  var bytes = [];

  for (var c = 0; c < hex.length; c += 2) {
    bytes.push(parseInt(hex.substr(c, 2), 16));
  }

  return bytes;
};

export const bytesToHex = (byteArray) => (
  Array.from(byteArray, function (byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('')
);

export const remove_comments = (string) => {
  return string.replace(/\/\*[\s\S]*?\*\/|(?<=[^:])\/\/.*|^\/\/.*/g, '').trim();
}


export const separate_semi_colons_lines = (s) => {
  let depth = 0;
  let result = '';

  for (let i = 0; i < s.length; i++) {
    if (s[i] === '[') {
      depth++;
      result += s[i];
    } else if (s[i] === ']') {
      depth--;
      result += s[i];
    } else if (s[i] === ';' && depth === 0) {
      result += ';\n';
    } else {
      result += s[i];
    }
  }

  return result;
}


export function package_version_as_integer(version) {
  const [major, minor, patch] = version.split(".").map((n) => parseInt(n));
  return major * 10000 + minor * 100 + patch;
}


export function int_version_to_string(version) {
  return (
    Math.floor(version / 10000)
    + '.' + Math.floor((version % 10000) / 100)
    + '.' + (version % 100)
  );
}

export function replace_between(str, start, end, what) {
  return str.substring(0, start) + what + str.substring(end);
};