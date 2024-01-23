
export const display_error = (e) => {
  if (global.context.verbosity > 2) {
    return console.log("Invalid verbosity level.");
  }
  if (global.context.verbosity === 2) {
    return console.log(e)
  }
  if (global.context.verbosity === 1) {
    return console.log(e?.message || e);
  }
  return console.log("Use --verbosity 1 to see the full error message.");
}