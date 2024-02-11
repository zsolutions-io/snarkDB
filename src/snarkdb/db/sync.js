import {
  initThreadPool
} from "@aleohq/sdk";

import {
  get_address_tables
} from "tables/index.js";

const period = 1000;


export const continuous_sync = async () => {
  await initThreadPool();
  console.log("Starting syncronisation...");
  while (true) {
    await sync();
    await new Promise((resolve) => setTimeout(resolve, period));
  }
}


export const sync = async () => {
  const tables = await get_address_tables(global.context.account.address().to_string());
  if (tables.length === 0) {
    return;
  }
  for (const table of tables) {
    await table.sync();
  }
}