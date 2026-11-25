/**
 * Vercel entry point. The browser still sends every computation to POST /api/execute;
 * this function only hands the request to the same Express app used locally.
 */
import app from '../server/index.js';

export default function handler(request, response) {
  return app(request, response);
}
