let reportedTemperatures = [];

exports.handler = async function(event, context) {
  if (event.httpMethod === 'POST') {
    const report = JSON.parse(event.body);
    reportedTemperatures.push(report);
    
    if (reportedTemperatures.length > 100) {
      reportedTemperatures.shift();
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  }
  return { statusCode: 405 };
}; 