import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';

const TOPIC = process.env.KAFKA_TOPIC || 'product-events';
const GROUP_ID = process.env.KAFKA_CONSUMER_GROUP_ID || 'nest-kafka-crud-consumer';
const BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const CLIENT_ID = process.env.KAFKA_CONSUMER_CLIENT_ID || 'nest-kafka-crud-consumer';

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private consumer: Consumer;

  constructor() {
    this.kafka = new Kafka({
      clientId: CLIENT_ID,
      brokers: BROKERS,
    });
    this.consumer = this.kafka.consumer({ groupId: GROUP_ID });
  }

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: TOPIC, fromBeginning: true });
    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.handleMessage(payload);
      },
    });
    console.log(`Kafka consumer subscribed to topic: ${TOPIC}`);
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
  }

  private async handleMessage({ topic, partition, message }: EachMessagePayload) {
    const value = message.value?.toString();
    if (!value) return;
    try {
      const event = JSON.parse(value);
      console.log(
        `[Kafka] ${topic}/${partition} | ${event.type} | ${event.timestamp}`,
      );
      console.log('  Payload:', JSON.stringify(event.payload, null, 2));
      // In a real microservice you might: update search index, send email, sync DB, etc.
    } catch (e) {
      console.error('Failed to process Kafka message:', e);
    }
  }
}
