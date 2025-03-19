import { Sequelize } from "sequelize"
require("dotenv").config()

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not defined")
}

export const sequelize = new Sequelize(databaseUrl, {
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  logging: false,
})

export const testConnection = async () => {
  try {
    await sequelize.authenticate()
    console.log("Connection to the database has been established successfully.")
  } catch (error) {
    console.error("Unable to connect to the database:", error)
  }
}
