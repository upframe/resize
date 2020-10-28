import type * as AWS from 'aws-lambda'

type Handler = AWS.Handler<AWS.APIGatewayEvent | AWS.SNSEvent>

export default function (handler: Handler): Handler {
  return async (...[event, ...args]: Parameters<Handler>) => {
    try {
      const res = await handler(event, ...args)
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
    }
  }
}
