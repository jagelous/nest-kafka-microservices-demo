import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { KafkaProducerService } from '../kafka/kafka-producer.service';

/** Kafka event types for product lifecycle */
export const PRODUCT_EVENTS = {
  CREATED: 'product.created',
  UPDATED: 'product.updated',
  DELETED: 'product.deleted',
} as const;

@Injectable()
export class ProductsService {
  /** In-memory store (replace with DB in production) */
  private readonly products = new Map<string, Product>();

  constructor(private readonly kafkaProducer: KafkaProducerService) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const now = new Date();
    const product: Product = {
      id: uuidv4(),
      name: dto.name,
      description: dto.description,
      price: dto.price,
      createdAt: now,
      updatedAt: now,
    };
    this.products.set(product.id, product);

    await this.kafkaProducer.emit(PRODUCT_EVENTS.CREATED, product);
    return product;
  }

  async findAll(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async findOne(id: string): Promise<Product> {
    const product = this.products.get(id);
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const existing = await this.findOne(id);
    const updated: Product = {
      ...existing,
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.price !== undefined && { price: dto.price }),
      updatedAt: new Date(),
    };
    this.products.set(id, updated);
    await this.kafkaProducer.emit(PRODUCT_EVENTS.UPDATED, updated);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    this.products.delete(id);
    await this.kafkaProducer.emit(PRODUCT_EVENTS.DELETED, product);
  }
}
