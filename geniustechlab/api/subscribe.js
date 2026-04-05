// Email subscription API endpoint
const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { email } = JSON.parse(event.body);
    
    if (!email || !email.includes('@')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid email required' })
      };
    }

    // Read existing subscribers
    const dataPath = path.join(__dirname, '..', 'data', 'subscribers.json');
    let subscribers = [];
    
    try {
      if (fs.existsSync(dataPath)) {
        subscribers = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      }
    } catch (e) {
      // File doesn't exist yet, that's OK
    }

    // Check for duplicate
    if (subscribers.find(s => s.email === email)) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Already subscribed' })
      };
    }

    // Add new subscriber
    subscribers.push({
      email,
      date: new Date().toISOString(),
      source: event.headers.referer || 'direct'
    });

    // Ensure data directory exists
    const dataDir = path.dirname(dataPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Save updated list
    fs.writeFileSync(dataPath, JSON.stringify(subscribers, null, 2));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Successfully subscribed!' })
    };
  } catch (error) {
    console.error('Subscription error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
