import knex from 'knex'

export default knex({
  client: 'pg',
  connection: {
    port: 5432,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  },
  pool: { min: 0, max: 10 },
  acquireConnectionTimeout: 5000,
})
