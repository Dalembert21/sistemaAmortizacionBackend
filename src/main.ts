import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Permitir conexiones locales, dalpasoft.tech (con cualquier subdominio como financiero.dalpasoft.tech) y clientes directos
      if (
        !origin ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.includes('dalpasoft.tech') ||
        origin === 'https://sistemafinancierodb.netlify.app'
      ) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true
  }); 
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
