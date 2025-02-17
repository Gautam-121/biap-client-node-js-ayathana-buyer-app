import { Client , Transport} from '@elastic/elasticsearch';
import loadEnvVariables from '../utils/envHelper.js';
// Load environment variables
loadEnvVariables();

// Validate Elasticsearch URL
if (!process.env.ELASTIC_SEARCH_URL) {
  throw new Error('ELASTIC_SEARCH_URL environment variable is not set.');
}

// Custom Transport class to log queries
class CustomTransport extends Transport {
  request(params, options, callback) {
    console.info('Elasticsearch Query:', { query: params });
    return super.request(params, options, callback);
  }
}

// Create Elasticsearch client
const client = new Client({
  node: process.env.ELASTIC_SEARCH_URL,
  Transport: CustomTransport,
  log: {
    info: (message) => console.log('INFO:', message),
    warn: (message) => console.warn('WARN:', message),
    error: (message) => console.error('ERROR:', message),
  },
  maxRetries: 5, // Retry up to 5 times on failure
  requestTimeout: 30000, // Timeout after 30 seconds
  sniffOnStart: true, // Discover cluster nodes on startup
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME || '',
    password: process.env.ELASTICSEARCH_PASSWORD || '',
  },
  ssl: {
    rejectUnauthorized: false, // Set to true in production if using self-signed certificates
  },
});

// Test Elasticsearch connection
const testConnection = async () => {
  try {
    const response = await client.info();
    console.info('Connected to Elasticsearch:', { response });
  } catch (error) {
    console.error('Failed to connect to Elasticsearch:', { error });
    throw new Error('Elasticsearch connection failed');
  }
};

testConnection();

export default client;