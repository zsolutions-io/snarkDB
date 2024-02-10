import command_info from './command_info.js';

const {
  program_name,
  usage_description,
  optional_args
} = command_info;

export const get_help_message = (
  actions,
  pattern,
  description,
  other_optional_args
) => {
  other_optional_args = other_optional_args || [];
  const all_optional_args = [...other_optional_args, ...optional_args];
  const intro = (
    `${usage_description}\n  ${program_name} ${pattern}\n\n${"Description:".yellow.bold}\n  ${description}`
  );
  const is_actions = ((actions?.length || 0) > 0);
  const ml1 = is_actions ? Math.max(...actions.map(({ name }) => (name?.length || 0))) : 0;
  const commands_help = is_actions ? actions.map(
    ({ name, description }) => (
      `  ${name.bold.green}${tabulate(name.length, ml1, 2)}${description}`
    )
  ).join('\n') : null;
  const ml2 = Math.max(...all_optional_args.map(({ name }) => (name?.length || 0)))
  const options_help = all_optional_args.map(
    ({ name, description, type, required }) => (
      `  ${("--" + name)}${tabulate(name.length, ml2, 4)}${required ? '[required] ' : ''}${description}`
    )
  ).join('\n');

  const commands_help_str = is_actions ? `${"Commands:".yellow.bold}\n` + `${commands_help}\n\n` : ``;

  return (
    `${intro}\n\n${commands_help_str}${"Options:".yellow.bold}\n${options_help}`
  );
};


function tabulate(l, ml, prefixl) {
  const tab_char = '\t';
  let space_per_tab = 8;
  let max_tot_l = ml + prefixl;
  let max_start_pos = max_tot_l;
  let max_spaces = 0
  while (Math.floor(max_start_pos / space_per_tab) * space_per_tab !== max_start_pos) {
    max_spaces += 1;
    max_start_pos += 1;
  }
  if (max_spaces === 0)
    max_start_pos += space_per_tab;

  const tabs_to_add = Math.ceil((max_start_pos - (l + prefixl)) / space_per_tab)

  let ret = "";
  for (let i = 0; i < tabs_to_add; i++) {
    ret += tab_char;
  }
  return ret;
}