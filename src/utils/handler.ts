import type * as AWS from 'aws-lambda'
import connectDB from '../db'
import type Knex from 'knex'

type HandlerType = AWS.APIGatewayEvent | AWS.SNSEvent | AWS.S3Event

type LambdaHandler<T extends HandlerType> = AWS.Handler<T>
type Handler<T extends HandlerType> = (
  db: Knex,
  ...args: Parameters<LambdaHandler<T>>
) => ReturnType<LambdaHandler<T>>

export default function <T extends HandlerType = HandlerType>(
  handler: Handler<T>
): LambdaHandler<T> {
  return async (...[event, ...args]: Parameters<LambdaHandler<T>>) => {
    const db = connectDB()
    try {
      const res = await handler(db, event, ...args)
      if ('Records' in event) return
      return typeof res === 'object' && 'statusCode' in res
        ? res
        : { statusCode: 200 }
    } catch (e) {
      console.error(e)
      if ('Records' in event) throw e
      if (!['number'].includes(typeof e))
        e = JSON.stringify({ message: e?.toString?.() ?? e })

      return {
        statusCode: 500,
        [typeof e === 'number' ? 'statusCode' : 'body']: e,
      }
    } finally {
      await db.destroy()
    }
  }
}
