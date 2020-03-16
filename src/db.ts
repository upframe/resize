import knex from 'knex'

export default (env = 'PROD') =>
  knex({
    client: 'pg',
    connection: {
      port: 5432,
      host: process.env[`${env}_DB_HOST`],
      user: process.env[`${env}_DB_USER`],
      password: process.env[`${env}_DB_PASS`],
      database: process.env[`${env}_DB_NAME`],
    },
    pool: { min: 0, max: 10 },
    acquireConnectionTimeout: 5000,
  })
