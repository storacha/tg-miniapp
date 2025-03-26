import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { configurationSchema } from './config/configuration.schema';
import { AuthModule } from './auth/auth.module';
import { BackupsModule } from './backups/backups.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: (config: Record<string, unknown>) => {
        return configurationSchema.parse(config);
      },
      validationOptions: {
        allowUnknown: false,
        abortEarly: true,
      },
    }),
    DatabaseModule,
    AuthModule,
    BackupsModule,
  ],
})
export class AppModule {}
