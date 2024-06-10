export type Configuration = {
  ENV: string;
  PORT: number;

  JWT_SECRET: string;

  ES_DB_HOST: string;
  ES_DB_PASSWORD: string;
};

export function configuration(): Configuration {
  return {
    ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT as string),

    ES_DB_HOST: process.env.ES_DB_HOST || 'http://localhost:9200',
    ES_DB_PASSWORD: process.env.ES_DB_PASSWORD || 'password',

    JWT_SECRET: process.env.JWT_SECRET || 'jwt-secret',
  };
}
