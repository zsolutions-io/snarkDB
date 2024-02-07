import { DataSource } from "typeorm";


// Configure your DataSource
const AppDataSource = new DataSource({
  type: "mysql", // or your database type: postgres, sqlite, etc.
  host: "localhost",
  port: 3306,
  username: "your_username",
  password: "your_password",
  database: "your_database",
  // other options...
});


async function connectAndStreamRows(tableName) {
  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
    throw new Error("Invalid table name");
  }

  await AppDataSource.initialize()
    .then(() => {
      console.log("Data Source has been initialized!");
    })
    .catch((err) => {
      console.error("Error during Data Source initialization:", err);
    });

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  // Using a variable for the table name
  const sqlQuery = `SELECT * FROM ${tableName}`;
  const stream = queryRunner.stream(sqlQuery);

  stream.on("data", (row) => {
    console.log(row);
  });

  stream.on("end", () => {
    console.log("Finished streaming rows.");
    queryRunner.release();
  });

  stream.on("error", (err) => {
    console.error("Error during streaming:", err);
    queryRunner.release();
  });
}

// Example usage
const tableName = "your_table_name"; // The variable holding your table name
connectAndStreamRows(tableName);