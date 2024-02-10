const name = "start";
const description = "Start the continuous syncronisation job between your exposed tables and their datasource.";
const arg_name = "query";
const pattern = `${name} <${arg_name}> [OPTIONS]`;

const entrypoint = async ({ query }) => {
  await execute_query(query);
};


export default {
  name,
  description,
  pattern,
  entrypoint
}