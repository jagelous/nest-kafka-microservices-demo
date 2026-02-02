import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

const TOPIC = 'product-events';
const BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'nest-kafka-crud-producer',
      brokers: BROKERS,
    });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    await this.producer.connect();
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }

  /**
   * Emit an event to Kafka topic.
   * Event type is used as message key for partitioning; payload is JSON.
   */
  async emit(eventType: string, payload: object): Promise<void> {
    await this.producer.send({
      topic: TOPIC,
      messages: [
        {
          key: eventType,
          value: JSON.stringify({
            type: eventType,
            payload,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });
  }
}
