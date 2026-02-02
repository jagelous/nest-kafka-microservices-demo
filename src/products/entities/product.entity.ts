/**
 * Product entity - in-memory representation of a product.
 * In a real app you'd use TypeORM/Prisma with a database.
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}
