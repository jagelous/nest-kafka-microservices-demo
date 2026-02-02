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
    ├── kafka.module.ts          # @Global() module: provides producer/consumer to all modules
    ├── kafka-producer.service.ts  # Produces events to Kafka topic
    └── kafka-consumer.service.ts  # Consumes events from Kafka topic
```

---

## Detailed Explanation

### 1. NestJS and TypeScript

- **NestJS** uses **modules** to group controllers and services. Each feature (e.g. products, kafka) lives in its own module.
  - `ProductsModule`: Contains product-related controllers and services
  - `KafkaModule`: Global module (`@Global()`) that provides Kafka producer/consumer services to all modules
  - `AppModule`: Root module that imports all feature modules

- **Controllers** (`ProductsController`): 
  - Define HTTP routes (GET, POST, PATCH, DELETE)
  - Handle request/response
  - Call services for business logic
  - Use DTOs for request validation

- **Services** (`ProductsService`): 
  - Contain business logic
  - Handle data operations (CRUD)
  - Inject dependencies (like `KafkaProducerService`)
  - Emit events to Kafka after operations

- **DTOs** (Data Transfer Objects): 
  - `CreateProductDto`: Validates incoming data for creating products (all fields required)
  - `UpdateProductDto`: Validates incoming data for updating products (all fields optional)
  - Use `class-validator` decorators (`@IsString()`, `@IsNumber()`, `@Min()`, etc.) for validation
  - `ValidationPipe` (in `main.ts`) automatically validates requests against DTOs

- **Entities**: 
  - `Product` interface: Internal domain model with `id`, `name`, `description`, `price`, `createdAt`, `updatedAt`
  - Different from DTOs - entities include server-generated fields (id, timestamps)

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

- **Producer** (`KafkaProducerService`): 
  - Connects to Kafka on app startup (`OnModuleInit`)
  - Sends messages to topic `product-events` (configurable via `KAFKA_TOPIC`)
  - Message structure: `key` = event type (e.g., `product.created`), `value` = JSON `{ type, payload, timestamp }`
  - Client ID configurable via `KAFKA_PRODUCER_CLIENT_ID`
  
- **Consumer** (`KafkaConsumerService`): 
  - Subscribes to `product-events` topic on app startup
  - Uses consumer group ID (configurable via `KAFKA_CONSUMER_GROUP_ID`) for load balancing
  - Reads from beginning (`fromBeginning: true`) - processes all existing messages
  - For each message, logs the event (simulating a downstream microservice that could update search index, send notifications, etc.)
  - Client ID configurable via `KAFKA_CONSUMER_CLIENT_ID`

- **KafkaModule**: 
  - Marked as `@Global()` - imported once in `AppModule`, available everywhere
  - Exports `KafkaProducerService` for use in other modules (like `ProductsModule`)
  - Automatically starts producer and consumer connections when app starts

- **Brokers**: Configurable via `KAFKA_BROKERS` environment variable (default `localhost:9092`). Supports comma-separated list for multiple brokers. Topic is auto-created if the broker allows it (`KAFKA_AUTO_CREATE_TOPICS_ENABLE=true` in docker-compose).

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
# or
yarn install
```

### 2. Configure Environment Variables (Optional)

Create a `.env` file in the root directory (see [Environment Variables](#environment-variables) section for details). The app will work with defaults, but you can customize Kafka brokers, topic names, client IDs, etc.

### 3. Start Kafka (Docker)

```bash
docker-compose up -d
```

This starts:
- **Zookeeper** (port 2181) - Required for Kafka coordination
- **Kafka** (port 9092) - Message broker

Wait 10-15 seconds for Kafka to be ready. You can check if it's running:

```bash
docker-compose ps
```

**Note**: The topic `product-events` will be auto-created when the first message is sent (because `KAFKA_AUTO_CREATE_TOPICS_ENABLE=true` in docker-compose). If you want to create it manually:

```bash
docker-compose exec kafka kafka-topics --create --topic product-events --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
```

### 4. Start the NestJS app

```bash
npm run start:dev
```

The API runs at **http://localhost:3000/api**.

**What happens on startup:**
1. NestJS loads environment variables from `.env` (via `ConfigModule`)
2. `KafkaProducerService` connects to Kafka broker
3. `KafkaConsumerService` connects to Kafka and subscribes to `product-events` topic
4. HTTP server starts listening on port 3000 (or `PORT` from `.env`)
5. You'll see console logs confirming Kafka connections and consumer subscription

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

## Troubleshooting

### Kafka Connection Issues

**Error**: `ECONNREFUSED` or `Connection timeout`
- **Solution**: Make sure Kafka is running: `docker-compose ps`
- Start Kafka: `docker-compose up -d`
- Wait 10-15 seconds for Kafka to fully start
- Check Kafka logs: `docker-compose logs kafka`

**Error**: `Topic does not exist`
- **Solution**: The topic should auto-create. If not, create manually:
  ```bash
  docker-compose exec kafka kafka-topics --create --topic product-events --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
  ```

### Port Already in Use

**Error**: `Port 3000 is already in use`
- **Solution**: Change `PORT` in `.env` file or stop the process using port 3000

### Validation Errors

**Error**: `400 Bad Request` with validation messages
- **Solution**: Check that request body matches DTO requirements:
  - `name`: Required string, min length 1
  - `description`: Required string
  - `price`: Required number, minimum 0

### Module Import Errors

**Error**: `Nest can't resolve dependencies`
- **Solution**: Make sure `KafkaModule` is imported in `AppModule` (it's `@Global()` so it only needs to be imported once)

---

## Environment Variables

The application uses a `.env` file for configuration. Create one in the root directory with the following variables:

### Kafka Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `KAFKA_BROKERS` | `localhost:9092` | Comma-separated list of Kafka broker addresses (e.g., `localhost:9092,localhost:9093`) |
| `KAFKA_TOPIC` | `product-events` | Kafka topic name where product events are published |
| `KAFKA_PRODUCER_CLIENT_ID` | `nest-kafka-crud-producer` | Client identifier for the Kafka producer (appears in Kafka logs/metrics) |
| `KAFKA_CONSUMER_CLIENT_ID` | `nest-kafka-crud-consumer` | Client identifier for the Kafka consumer (appears in Kafka logs/metrics) |
| `KAFKA_CONSUMER_GROUP_ID` | `nest-kafka-crud-consumer` | Consumer group ID for load balancing and offset tracking |

### Application Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port where the NestJS application listens |
| `NODE_ENV` | `development` | Environment mode (`development` or `production`) |

### Example `.env` File

```env
# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_TOPIC=product-events

# Kafka Producer Configuration
KAFKA_PRODUCER_CLIENT_ID=nest-kafka-crud-producer

# Kafka Consumer Configuration
KAFKA_CONSUMER_CLIENT_ID=nest-kafka-crud-consumer
KAFKA_CONSUMER_GROUP_ID=nest-kafka-crud-consumer

# Application Configuration
PORT=3000
NODE_ENV=development
```

**Note**: All environment variables have defaults in the code, so the `.env` file is optional but recommended for easy configuration.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to `dist/` directory |
| `npm run start` | Run compiled app from `dist/` (must run `build` first) |
| `npm run start:dev` | Run with watch mode - auto-restarts on file changes (recommended for development) |
| `npm run start:debug` | Run with debug mode - enables debugging with breakpoints |
| `npm run start:prod` | Run production build (`node dist/main`) - optimized for production |

**Development workflow:**
```bash
npm run start:dev  # Use this during development
```

---

## Extending the Demo

### Database Integration
- Replace the in-memory `Map` in `ProductsService` with a real database:
  - **TypeORM**: `npm install @nestjs/typeorm typeorm pg` (PostgreSQL)
  - **Prisma**: `npm install prisma @prisma/client` + `npx prisma init`
  - Update `ProductsService` to use repository/Prisma client instead of `Map`

### Separate Microservices
- Create a second NestJS app that only consumes Kafka events:
  - Copy `KafkaModule` and `KafkaConsumerService`
  - Remove `ProductsModule` (no REST API needed)
  - Consumer could update a search index (Elasticsearch), send emails, sync to another database, etc.

### Enhanced Validation
- Already implemented: `class-validator` decorators on DTOs + `ValidationPipe` in `main.ts`
- Add more validators: `@IsEmail()`, `@MaxLength()`, `@Matches()` for regex patterns
- Custom validators: Create your own validation classes

### Kafka Advanced Features
- **Partition key**: Use product `id` as message key for ordered per-product processing
- **Multiple topics**: Create separate topics for different event types
- **Error handling**: Add retry logic, dead letter queue for failed messages
- **Schema registry**: Use Avro/JSON Schema for message validation (Confluent Schema Registry)

### Authentication & Authorization
- Add JWT authentication: `npm install @nestjs/jwt @nestjs/passport passport passport-jwt`
- Protect routes with guards: `@UseGuards(JwtAuthGuard)`

### Testing
- Unit tests: `npm install --save-dev @nestjs/testing`
- E2E tests: Test API endpoints with `supertest`
- Kafka tests: Use `kafkajs` test utilities or mock Kafka

---

## License

MIT (or your choice). Use and modify freely for learning and demos.
