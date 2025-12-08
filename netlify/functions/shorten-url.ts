// netlify/functions/shorten-url.ts
// Function សម្រាប់បង្រួម URL ដោយប្រើ is.gd

import type { Handler, HandlerEvent } from '@netlify/functions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const handler: Handler = async (event: HandlerEvent) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { url } = JSON.parse(event.body || '{}');

    if (!url) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'URL is required' }),
      };
    }

    // Call is.gd API
    const isGdUrl = `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`;
    
    const response = await fetch(isGdUrl);
    const shortUrl = await response.text();

    // Check if response is an error
    if (shortUrl.includes('Error') || !response.ok) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Failed to shorten URL',
          details: shortUrl 
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        shortUrl: shortUrl.trim(),
        originalUrl: url 
      }),
    };

  } catch (error) {
    console.error('Error in shorten-url function:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};
