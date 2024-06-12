export type Configuration = {
  ENV: string;
  PORT: number;

  JWT_SECRET: string;

  ES_DB_HOST: string;
  ES_DB_PASSWORD: string;

  MS_GRAPH_CLIENT_ID: string;
  MS_GRAPH_CLIENT_SECRET: string;
  MS_GRAPH_REDIRECT_URI: string;
  MS_GRAPH_TENANT_ID: string;
};

export function configuration(): Configuration {
  const MS_GRAPH_CLIENT_ID = process.env.MS_GRAPH_CLIENT_ID;
  const MS_GRAPH_CLIENT_SECRET = process.env.MS_GRAPH_CLIENT_SECRET;
  const MS_GRAPH_REDIRECT_URI = process.env.MS_GRAPH_REDIRECT_URI;
  const MS_GRAPH_TENANT_ID = process.env.MS_GRAPH_TENANT_ID;

  if (
    !MS_GRAPH_CLIENT_ID ||
    !MS_GRAPH_CLIENT_SECRET ||
    !MS_GRAPH_REDIRECT_URI ||
    !MS_GRAPH_TENANT_ID
  ) {
    throw new Error('Microsoft Graph API credentials must be provided');
  }

  return {
    ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT as string),

    ES_DB_HOST: process.env.ES_DB_HOST || 'http://localhost:9200',
    ES_DB_PASSWORD: process.env.ES_DB_PASSWORD || 'password',

    JWT_SECRET: process.env.JWT_SECRET || 'jwt-secret',

    MS_GRAPH_CLIENT_ID,
    MS_GRAPH_CLIENT_SECRET,
    MS_GRAPH_REDIRECT_URI,
    MS_GRAPH_TENANT_ID,
  };
}
