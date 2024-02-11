import { continuous_sync } from "snarkdb/db/index.js";

const name = "start";
const description = "Start the continuous syncronisation job between your exposed tables and their datasource.";
const pattern = `${name} [OPTIONS]`;

const entrypoint = async ({ query }) => {
  await continuous_sync(query);
};


export default {
  name,
  description,
  pattern,
  entrypoint
}