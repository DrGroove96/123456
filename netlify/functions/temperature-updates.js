let reportedTemperatures = [];

exports.handler = async function(event, context) {
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
      body: `data: ${JSON.stringify(reportedTemperatures)}\n\n`
    };
  }
  return { statusCode: 405 };
}; 