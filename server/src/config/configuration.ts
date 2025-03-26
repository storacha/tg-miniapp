export default () => ({
  port: process.env.PORT || 3000,
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost/my-enterprise-db',
  },
  swagger: {
    path: process.env.SWAGGER_PATH || 'api',
  },
});
