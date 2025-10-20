import { Store } from 'generated/prisma';

const stores: Store[] = [
  {
    id: 1,
    name: 'Fresh Market Central',
    description:
      'Your one-stop shop for fresh groceries, organic produce, and daily essentials. We pride ourselves on quality and freshness.',
    createdAt: new Date('2024-01-15T08:00:00Z'),
    verificationStatus: 'VERIFIED',
  },
  {
    id: 2,
    name: 'TechGear Hub',
    description:
      'Latest electronics, gadgets, and tech accessories. From smartphones to laptops, we have everything tech enthusiasts need.',
    createdAt: new Date('2024-02-20T10:30:00Z'),
    verificationStatus: 'VERIFIED',
  },
  {
    id: 3,
    name: 'Fashion Forward Boutique',
    description:
      'Trendy clothing and accessories for men and women. Stay stylish with our curated collection of fashion items.',
    createdAt: new Date('2024-03-10T09:15:00Z'),
    verificationStatus: 'VERIFIED',
  },
  {
    id: 4,
    name: 'Home & Garden Paradise',
    description:
      'Everything you need for your home and garden. Furniture, decor, plants, and gardening tools all in one place.',
    createdAt: new Date('2024-04-05T11:00:00Z'),
    verificationStatus: 'UNVERIFIED',
  },
  {
    id: 5,
    name: 'Sports & Fitness Pro',
    description:
      'Professional sports equipment, fitness gear, and athletic apparel. Get fit with quality products.',
    createdAt: new Date('2024-05-12T07:45:00Z'),
    verificationStatus: 'VERIFIED',
  },
  {
    id: 6,
    name: 'Book Haven',
    description:
      'A paradise for book lovers. Wide selection of books across all genres, stationery, and educational materials.',
    createdAt: new Date('2024-06-18T14:20:00Z'),
    verificationStatus: 'UNVERIFIED',
  },
];

export default stores;
