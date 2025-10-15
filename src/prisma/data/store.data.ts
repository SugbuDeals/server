import { Store } from 'generated/prisma';

const stores = [
  {
    id: 1,
    name: 'TechHub Electronics',
    description:
      'Your one-stop shop for the latest gadgets, smartphones, laptops, and tech accessories. We offer competitive prices and excellent customer service.',
    verificationStatus: 'VERIFIED' as const,
  },
  {
    id: 2,
    name: "Bella's Fashion Boutique",
    description:
      'Trendy clothing and accessories for women. From casual wear to elegant evening dresses, find your perfect style here.',
    verificationStatus: 'VERIFIED' as const,
  },
  {
    id: 3,
    name: 'Green Garden Supplies',
    description:
      'Everything you need for your garden - seeds, tools, fertilizers, and outdoor furniture. Making gardening accessible to everyone.',
    verificationStatus: 'UNVERIFIED' as const,
  },
  {
    id: 4,
    name: 'Fitness Zone',
    description:
      'Premium gym equipment, workout supplements, and athletic wear. Achieve your fitness goals with our quality products.',
    verificationStatus: 'VERIFIED' as const,
  },
  {
    id: 5,
    name: 'BookWorm Haven',
    description:
      'A paradise for book lovers featuring bestsellers, rare finds, and educational materials across all genres.',
    verificationStatus: 'VERIFIED' as const,
  },
  {
    id: 6,
    name: 'Pet Paradise',
    description:
      'Complete pet care solutions including food, toys, grooming supplies, and accessories for dogs, cats, and small animals.',
    verificationStatus: 'UNVERIFIED' as const,
  },
  {
    id: 7,
    name: 'HomeCraft Essentials',
    description:
      'Quality home improvement tools, furniture, and decor items to transform your living space.',
    verificationStatus: 'PENDING' as const,
  },
  {
    id: 8,
    name: 'Gourmet Delights',
    description:
      'Artisanal food products, organic ingredients, and specialty items from around the world for food enthusiasts.',
    verificationStatus: 'VERIFIED' as const,
  },
  {
    id: 9,
    name: 'Kids Kingdom',
    description:
      "Educational toys, children's clothing, and baby products. Safe, fun, and developmental items for your little ones.",
    verificationStatus: 'UNVERIFIED' as const,
  },
  {
    id: 10,
    name: 'Auto Parts Pro',
    description:
      'Genuine and aftermarket car parts, accessories, and maintenance supplies for all vehicle makes and models.',
    verificationStatus: 'PENDING' as const,
  },
  {
    id: 11,
    name: 'Beauty Bliss',
    description:
      'Premium cosmetics, skincare products, and beauty tools. Cruelty-free and organic options available.',
    verificationStatus: 'VERIFIED' as const,
  },
  {
    id: 12,
    name: 'Office Supplies Plus',
    description:
      'Everything for your workspace - stationery, office furniture, printers, and organizational solutions.',
    verificationStatus: 'UNVERIFIED' as const,
  },
  {
    id: 13,
    name: 'Sports Arena',
    description:
      'Sports equipment and gear for basketball, football, tennis, swimming, and more. Quality brands at affordable prices.',
    verificationStatus: 'VERIFIED' as const,
  },
  {
    id: 14,
    name: 'Music Masters',
    description:
      'Musical instruments, sound equipment, and accessories for beginners and professionals alike.',
    verificationStatus: 'PENDING' as const,
  },
  {
    id: 15,
    name: 'Craft Corner',
    description:
      'Art supplies, crafting materials, and DIY kits for creative projects. Inspire your artistic side.',
    verificationStatus: 'UNVERIFIED' as const,
  },
];

export default stores;
