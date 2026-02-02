import { Module } from '@nestjs/common';
import { ProductsModule } from './products/products.module';
import { KafkaModule } from './kafka/kafka.module';

@Module({
  imports: [ProductsModule, KafkaModule],
})
export class AppModule {}
