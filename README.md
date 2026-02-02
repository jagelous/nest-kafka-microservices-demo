# NestJS + TypeScript + Kafka Microservices Demo (CRUD)

A demo application showing **Node.js**, **NestJS**, **TypeScript**, and **Apache Kafka** in a microservices-style setup with full **CRUD** (Create, Read, Update, Delete) and event streaming.

---

## What This Demo Covers

| Area | Description |
|------|-------------|
| **Node.js** | Runtime for the application |
| **NestJS** | Modular backend framework (controllers, services, modules) |
| **TypeScript** | Typed JavaScript with DTOs and interfaces |
| **Kafka** | Event streaming: producer emits product events; consumer logs them |
| **CRUD** | REST API for Products: create, list, get one, update, delete |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     NestJS Application                           │
│  ┌─────────────────┐    ┌──────────────────┐                   │
│  │ ProductsModule  │───▶│ KafkaProducer     │───▶ Kafka Topic   │
│  │ (CRUD + REST)   │    │ (product.created  │     product-events │
│  └─────────────────┘    │  .updated/.deleted)                   │
│           │              └──────────────────┘         │         │
│           │                                            ▼         │
│           │              ┌──────────────────┐    ┌───────────┐   │
│           │              │ KafkaConsumer    │◀───│  Kafka    │   │
│           │              │ (logs events)    │    │  Broker   │   │
│           │              └──────────────────┘    └───────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

- **REST API** (`/api/products`) handles CRUD. Each create/update/delete also **produces** an event to Kafka.
- **Kafka consumer** in the same app subscribes to `product-events` and logs each event (in a real system it could update a search index, notify other services, etc.).

---

## Project Structure

```
src/
├── main.ts                 # Bootstrap NestJS app, global prefix /api
├── app.module.ts           # Imports ProductsModule + KafkaModule
├── products/
│   ├── products.module.ts
│   ├── products.controller.ts   # REST: POST/GET/PATCH/DELETE /products
│   ├── products.service.ts      # CRUD logic + Kafka emit on create/update/delete
│   ├── entities/
│   │   └── product.entity.ts    # Product interface
│   └── dto/
│       ├── create-product.dto.ts
│       └── update-product.dto.ts
└── kafka/
    ├── kafka.module.ts          # Global module: producer + consumer
    ├── kafka-producer.service.ts
    └── kafka-consumer.service.ts
```

---

## Detailed Explanation

### 1. NestJS and TypeScript

- **NestJS** uses **modules** to group controllers and services. Each feature (e.g. products, kafka) lives in its own module.
- **Controllers** define HTTP routes and call **services** for business logic.
- **DTOs** (Data Transfer Objects) describe the shape of request bodies (`CreateProductDto`, `UpdateProductDto`).
- **Entities** describe domain models (e.g. `Product` with `id`, `name`, `description`, `price`, timestamps).

### 2. CRUD Flow

| Method | Route | Description |
|--------|--------|-------------|
| `POST` | `/api/products` | Create product → store in memory → emit `product.created` to Kafka |
| `GET` | `/api/products` | List all products |
| `GET` | `/api/products/:id` | Get one product by ID (UUID) |
| `PATCH` | `/api/products/:id` | Update product → emit `product.updated` |
| `DELETE` | `/api/products/:id` | Delete product → emit `product.deleted` |

Data is kept in an in-memory `Map` for simplicity. In production you would use a database (e.g. TypeORM + PostgreSQL).

### 3. Kafka Integration

- **Producer** (`KafkaProducerService`): Connects on app startup, sends messages to topic `product-events`. Message key = event type; value = JSON `{ type, payload, timestamp }`.
- **Consumer** (`KafkaConsumerService`): Subscribes to `product-events` with group `nest-kafka-crud-consumer`, and for each message logs the event (simulating a downstream microservice).
- **Brokers**: Configurable via `KAFKA_BROKERS` (default `localhost:9092`). Topic is auto-created if the broker allows it (`KAFKA_AUTO_CREATE_TOPICS_ENABLE=true` in docker-compose).

### 4. Why This Is “Microservices-Style”

- **Event-driven**: Changes in the “product” service are published as events. Other services can subscribe without being called via HTTP.
- **Decoupling**: A search service or analytics service could consume the same topic without the API knowing.
- In this demo, producer and consumer run in one process; in production you’d often split them into separate services (each with its own NestJS app or Node process).

---

## Prerequisites

- **Node.js** 18+
- **Docker** and **Docker Compose** (for Kafka)
- **npm** or **yarn**

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Start Kafka (Docker)

```bash
docker-compose up -d
```

Wait a few seconds for Kafka to be ready. Optional: create topic manually if auto-create is disabled:

```bash
docker-compose exec kafka kafka-topics --create --topic product-events --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
```

### 3. Start the NestJS app

```bash
npm run start:dev
```

The API runs at **http://localhost:3000/api**.

---

## API Examples (CRUD)

### Create a product

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Laptop\",\"description\":\"Gaming laptop\",\"price\":999.99}"
```

Response: product object with `id`, `name`, `description`, `price`, `createdAt`, `updatedAt`.  
In the app logs you should see the Kafka consumer logging a `product.created` event.

### List all products

```bash
curl http://localhost:3000/api/products
```

### Get one product (use ID from create response)

```bash
curl http://localhost:3000/api/products/<product-id>
```

### Update a product

```bash
curl -X PATCH http://localhost:3000/api/products/<product-id> \
  -H "Content-Type: application/json" \
  -d "{\"price\":899.99}"
```

Consumer logs `product.updated`.

### Delete a product

```bash
curl -X DELETE http://localhost:3000/api/products/<product-id>
```

Consumer logs `product.deleted`.

---

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `KAFKA_BROKERS` | `localhost:9092` | Comma-separated Kafka broker list |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run compiled app |
| `npm run start:dev` | Run with watch mode (recommended for development) |
| `npm run start:prod` | Run production build (`node dist/main`) |

---

## Extending the Demo

- **Database**: Add TypeORM or Prisma, replace the in-memory `Map` in `ProductsService` with repository calls.
- **Second microservice**: Create another NestJS app that only runs `KafkaConsumerService` (and maybe its own API), consuming `product-events` and building a search index or analytics.
- **Validation**: Use `class-validator` and `class-transformer` on DTOs and enable `ValidationPipe` in `main.ts`.
- **Kafka partition key**: Use product `id` as key for ordered per-product processing.

---

## License

MIT (or your choice). Use and modify freely for learning and demos.
