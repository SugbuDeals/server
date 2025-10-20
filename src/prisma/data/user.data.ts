import { User } from 'generated/prisma';

const users: User[] = [
  {
    id: 1,
    email: 'admin@email.com',
    password: '$2a$12$IXmlF8plEl3Nh.FXlcdMhuD5d2mjBcOcVSNMrQcPh7bhnyQiRXVhq',
    name: 'Admin',
    createdAt: new Date('2024-01-15T08:00:00Z'),
    role: 'ADMIN',
    storeId: null,
  },
  {
    id: 2,
    email: 'consumer@email.com',
    password: '$2a$12$IXmlF8plEl3Nh.FXlcdMhuD5d2mjBcOcVSNMrQcPh7bhnyQiRXVhq',
    name: 'Admin',
    createdAt: new Date('2024-01-15T08:00:00Z'),
    role: 'CONSUMER',
    storeId: null,
  },
  {
    id: 3,
    email: 'retailer@email.com',
    password: '$2a$12$IXmlF8plEl3Nh.FXlcdMhuD5d2mjBcOcVSNMrQcPh7bhnyQiRXVhq',
    name: 'Admin',
    createdAt: new Date('2024-01-15T08:00:00Z'),
    role: 'RETAILER',
    storeId: null,
  },
];
export default users;
