import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

const TOPIC = process.env.KAFKA_TOPIC || 'product-events';
const BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const CLIENT_ID = process.env.KAFKA_PRODUCER_CLIENT_ID || 'nest-kafka-crud-producer';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;

  constructor() {
    this.kafka = new Kafka({
      clientId: CLIENT_ID,
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
