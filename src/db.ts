import knex from 'knex'

export default knex({
  client: 'pg',
  connection: {
    port: parseInt(process.env.DB_PORT),
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  pool: { min: 0, max: 10 },
  acquireConnectionTimeout: 5000,
})
