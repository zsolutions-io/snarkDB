import { continuous_sync } from "snarkdb/db/index.js";

const name = "start";
const start_args = [
  {
    name: "port",
    description: "Port of the IPFS node.",
    required: false,
  },
];
const description = "Start the continuous syncronisation loop.";
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