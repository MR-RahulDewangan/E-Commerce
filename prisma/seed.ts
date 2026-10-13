import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function main() {
  console.log('🌱 Starting comprehensive database seed for India-Focused E-Commerce Store...');

  // 1. Seed Administrative and Test Customer Users
  const adminPasswordHash = await hashPassword('AdminSecure2026!');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ecommerce.example.in' },
    update: {
      role: Role.ADMIN,
      firstName: 'System',
      lastName: 'Administrator',
    },
    create: {
      email: 'admin@ecommerce.example.in',
      passwordHash: adminPasswordHash,
      firstName: 'System',
      lastName: 'Administrator',
      role: Role.ADMIN,
      phoneNumber: '+919876543200',
    },
  });
  console.log(`👤 Admin user seeded: ${admin.email} (ID: ${admin.id})`);

  const customerPasswordHash = await hashPassword('CustomerPass123!');
  const customer = await prisma.user.upsert({
    where: { email: 'customer@ecommerce.example.in' },
    update: {
      firstName: 'Pooja',
      lastName: 'Sharma',
    },
    create: {
      email: 'customer@ecommerce.example.in',
      passwordHash: customerPasswordHash,
      firstName: 'Pooja',
      lastName: 'Sharma',
      role: Role.CUSTOMER,
      phoneNumber: '+919876543210',
    },
  });
  console.log(`👤 Customer user seeded: ${customer.email} (ID: ${customer.id})`);

  // Default Customer Address
  await prisma.address.deleteMany({ where: { userId: customer.id } });
  await prisma.address.create({
    data: {
      userId: customer.id,
      recipientName: 'Pooja Sharma',
      phoneNumber: '+919876543210',
      streetLine1: 'Flat 402, Lotus Towers, 100ft Road',
      streetLine2: 'Indiranagar',
      city: 'Bengaluru',
      stateProvince: 'Karnataka',
      postalCode: '560038',
      countryCode: 'IN',
      isDefault: true,
    },
  });

  // 1b. Seed 2 Dummy Marketplace Sellers
  const sellerPasswordHash = await hashPassword('SellerSecure2026!');

  const seller1User = await prisma.user.upsert({
    where: { email: 'seller.kashmir@ecommerce.example.in' },
    update: {
      role: Role.SELLER,
      firstName: 'Tariq',
      lastName: 'Ahmad',
    },
    create: {
      email: 'seller.kashmir@ecommerce.example.in',
      passwordHash: sellerPasswordHash,
      firstName: 'Tariq',
      lastName: 'Ahmad',
      role: Role.SELLER,
      phoneNumber: '+919876543221',
    },
  });

  const seller1Profile = await prisma.sellerProfile.upsert({
    where: { userId: seller1User.id },
    update: {
      storeName: 'Kashmir Pashmina & Crafts',
      storeSlug: 'kashmir-crafts',
      description: 'Authentic handcrafted Kashmiri pashmina shawls, walnut wood carvings, and saffron.',
      gstin: '01ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      bankAccount: '9876543210123',
      bankIfsc: 'SBIN0001234',
      commissionRate: 10.0,
      isVerified: true,
    },
    create: {
      userId: seller1User.id,
      storeName: 'Kashmir Pashmina & Crafts',
      storeSlug: 'kashmir-crafts',
      description: 'Authentic handcrafted Kashmiri pashmina shawls, walnut wood carvings, and saffron.',
      gstin: '01ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      bankAccount: '9876543210123',
      bankIfsc: 'SBIN0001234',
      commissionRate: 10.0,
      isVerified: true,
    },
  });
  console.log(`🏪 Seller 1 seeded: ${seller1User.email} (Store: ${seller1Profile.storeName})`);

  const seller2User = await prisma.user.upsert({
    where: { email: 'seller.jaipur@ecommerce.example.in' },
    update: {
      role: Role.SELLER,
      firstName: 'Rajesh',
      lastName: 'Meena',
    },
    create: {
      email: 'seller.jaipur@ecommerce.example.in',
      passwordHash: sellerPasswordHash,
      firstName: 'Rajesh',
      lastName: 'Meena',
      role: Role.SELLER,
      phoneNumber: '+919876543222',
    },
  });

  const seller2Profile = await prisma.sellerProfile.upsert({
    where: { userId: seller2User.id },
    update: {
      storeName: 'Jaipur Heritage Textiles',
      storeSlug: 'jaipur-textiles',
      description: 'Traditional Rajasthani block printed textiles, handcrafted quilts, and ethnic apparel.',
      gstin: '08FGHIJ5678K1Z2',
      pan: 'FGHIJ5678K',
      bankAccount: '1234567890987',
      bankIfsc: 'HDFC0005678',
      commissionRate: 10.0,
      isVerified: true,
    },
    create: {
      userId: seller2User.id,
      storeName: 'Jaipur Heritage Textiles',
      storeSlug: 'jaipur-textiles',
      description: 'Traditional Rajasthani block printed textiles, handcrafted quilts, and ethnic apparel.',
      gstin: '08FGHIJ5678K1Z2',
      pan: 'FGHIJ5678K',
      bankAccount: '1234567890987',
      bankIfsc: 'HDFC0005678',
      commissionRate: 10.0,
      isVerified: true,
    },
  });
  console.log(`🏪 Seller 2 seeded: ${seller2User.email} (Store: ${seller2Profile.storeName})`);

  // 2. Seed 10 Categories
  const categoriesData = [
    {
      name: 'Ethnic Wear',
      slug: 'ethnic-wear',
      imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
      sortOrder: 1,
    },
    {
      name: 'Western Wear',
      slug: 'western-wear',
      imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
      sortOrder: 2,
    },
    {
      name: 'Sarees',
      slug: 'sarees',
      imageUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80',
      sortOrder: 3,
    },
    {
      name: 'Footwear',
      slug: 'footwear',
      imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80',
      sortOrder: 4,
    },
    {
      name: 'Jewellery & Accessories',
      slug: 'jewellery-accessories',
      imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80',
      sortOrder: 5,
    },
    {
      name: 'Home & Living',
      slug: 'home-living',
      imageUrl: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80',
      sortOrder: 6,
    },
    {
      name: 'Beauty & Personal Care',
      slug: 'beauty-personal-care',
      imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
      sortOrder: 7,
    },
    {
      name: 'Kitchen & Dining',
      slug: 'kitchen-dining',
      imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
      sortOrder: 8,
    },
    {
      name: 'Handcrafted Decor',
      slug: 'handcrafted-decor',
      imageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
      sortOrder: 9,
    },
    {
      name: 'Menswear Essentials',
      slug: 'menswear-essentials',
      imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
      sortOrder: 10,
    },
  ];

  const categoryMap: Record<string, string> = {};
  for (const catData of categoriesData) {
    const category = await prisma.category.upsert({
      where: { slug: catData.slug },
      update: {
        name: catData.name,
        imageUrl: catData.imageUrl,
        sortOrder: catData.sortOrder,
      },
      create: catData,
    });
    categoryMap[catData.slug] = category.id;
  }
  console.log(`📁 10 categories created/updated.`);

  // 3. Define 30 Multi-Variant Products (3 per category)
  const productsData = [
    // --- Category 1: Ethnic Wear ---
    {
      categorySlug: 'ethnic-wear',
      name: 'Pure Handloom Cotton Kurta',
      slug: 'pure-handloom-cotton-kurta',
      description: 'Crafted from 100% breathable natural cotton with intricate Lucknowi chikan hand-embroidery. Perfect for festive celebrations and everyday elegance.',
      basePrice: 1499.0,
      isPublished: true,
      isFeatured: true,
      imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'ETH-KUR-S', name: 'Small / Beige', stock: 15, size: 'S', color: 'Beige' },
        { sku: 'ETH-KUR-M', name: 'Medium / Beige', stock: 25, size: 'M', color: 'Beige' },
        { sku: 'ETH-KUR-L', name: 'Large / Beige', stock: 18, size: 'L', color: 'Beige' },
        { sku: 'ETH-KUR-XL', name: 'XL / Beige', stock: 10, size: 'XL', color: 'Beige', priceOverride: 1699.0 },
      ],
    },
    {
      categorySlug: 'ethnic-wear',
      name: 'Embroidered Anarkali Suit Set',
      slug: 'embroidered-anarkali-suit-set',
      description: 'Royal maroon floor-length Georgette Anarkali suit set with heavy zari work, paired with matching santoon churidar and netted dupatta.',
      basePrice: 3499.0,
      isPublished: true,
      isFeatured: true,
      imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'ETH-ANA-M', name: 'Medium / Maroon', stock: 8, size: 'M', color: 'Maroon' },
        { sku: 'ETH-ANA-L', name: 'Large / Maroon', stock: 12, size: 'L', color: 'Maroon' },
        { sku: 'ETH-ANA-XL', name: 'XL / Maroon', stock: 0, size: 'XL', color: 'Maroon' }, // Out of stock variant
      ],
    },
    {
      categorySlug: 'ethnic-wear',
      name: 'Festive Jacquard Silk Nehru Jacket',
      slug: 'festive-jacquard-silk-nehru-jacket',
      description: 'Mandarin collar woven silk-blend Nehru jacket in golden mustard. Tailored fit designed to layer seamlessly over classic kurtas.',
      basePrice: 2199.0,
      isPublished: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'ETH-NJ-38', name: 'Size 38 / Gold', stock: 14, size: '38', color: 'Gold' },
        { sku: 'ETH-NJ-40', name: 'Size 40 / Gold', stock: 16, size: '40', color: 'Gold' },
        { sku: 'ETH-NJ-42', name: 'Size 42 / Gold', stock: 8, size: '42', color: 'Gold' },
      ],
    },

    // --- Category 2: Western Wear ---
    {
      categorySlug: 'western-wear',
      name: 'Structured Linen Blend Blazer',
      slug: 'structured-linen-blend-blazer',
      description: 'Contemporary double-breasted relaxed blazer crafted from Italian linen blend. Ideal for smart-casual office styling and weekend brunches.',
      basePrice: 2899.0,
      isPublished: true,
      isFeatured: true,
      imageUrl: 'https://images.unsplash.com/photo-1584273143981-41c073dfe8f8?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'WES-BLZ-S', name: 'Small / Oatmeal', stock: 10, size: 'S', color: 'Oatmeal' },
        { sku: 'WES-BLZ-M', name: 'Medium / Oatmeal', stock: 15, size: 'M', color: 'Oatmeal' },
        { sku: 'WES-BLZ-L', name: 'Large / Oatmeal', stock: 12, size: 'L', color: 'Oatmeal' },
      ],
    },
    {
      categorySlug: 'western-wear',
      name: 'High-Rise Relaxed Wide-Leg Trousers',
      slug: 'high-rise-relaxed-wide-leg-trousers',
      description: 'Tailored high-waisted pleated trousers in fluid crepe. Elasticated back waistband ensures all-day comfort without sacrificing silhouette.',
      basePrice: 1799.0,
      isPublished: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'WES-TR-28', name: '28 / Black', stock: 12, size: '28', color: 'Black' },
        { sku: 'WES-TR-30', name: '30 / Black', stock: 20, size: '30', color: 'Black' },
        { sku: 'WES-TR-32', name: '32 / Black', stock: 15, size: '32', color: 'Black' },
      ],
    },
    {
      categorySlug: 'western-wear',
      name: 'Floral Print Tiered Maxi Dress',
      slug: 'floral-print-tiered-maxi-dress',
      description: 'Airy chiffon floral maxi dress featuring sweetheart neckline, smocked bodice, and graceful tiered ruffles.',
      basePrice: 2299.0,
      isPublished: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'WES-DRS-S', name: 'Small / Sage', stock: 10, size: 'S', color: 'Sage Green' },
        { sku: 'WES-DRS-M', name: 'Medium / Sage', stock: 14, size: 'M', color: 'Sage Green' },
        { sku: 'WES-DRS-L', name: 'Large / Sage', stock: 8, size: 'L', color: 'Sage Green' },
      ],
    },

    // --- Category 3: Sarees ---
    {
      categorySlug: 'sarees',
      name: 'Pure Kanjeevaram Silk Saree',
      slug: 'pure-kanjeevaram-silk-saree',
      description: 'Handwoven pure mulberry silk saree featuring traditional temple borders and heavy 2-gram gold zari pallu. Comes with unstitched blouse piece.',
      basePrice: 7999.0,
      isPublished: true,
      isFeatured: true,
      imageUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'SAR-KAN-RED', name: 'Crimson Red & Gold', stock: 6, size: 'Free Size', color: 'Crimson Red' },
        { sku: 'SAR-KAN-GRN', name: 'Emerald Green & Gold', stock: 5, size: 'Free Size', color: 'Emerald Green' },
      ],
    },
    {
      categorySlug: 'sarees',
      name: 'Handloom Banarasi Georgette Saree',
      slug: 'handloom-banarasi-georgette-saree',
      description: 'Lightweight Khaddi Georgette woven with intricate floral jaal motifs and scalloped silver zari border.',
      basePrice: 4899.0,
      isPublished: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'SAR-BAN-PNK', name: 'Baby Pink / Silver', stock: 8, size: 'Free Size', color: 'Pink' },
        { sku: 'SAR-BAN-BLU', name: 'Sky Blue / Silver', stock: 7, size: 'Free Size', color: 'Blue' },
      ],
    },
    {
      categorySlug: 'sarees',
      name: 'Chanderi Silk Cotton Saree',
      slug: 'chanderi-silk-cotton-saree',
      description: 'Subtle sheer Chanderi weave with traditional hand-block printed bagru motifs and gold tissue border.',
      basePrice: 2499.0,
      isPublished: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'SAR-CHN-IND', name: 'Indigo Blue', stock: 12, size: 'Free Size', color: 'Indigo' },
        { sku: 'SAR-CHN-MUST', name: 'Mustard Yellow', stock: 10, size: 'Free Size', color: 'Mustard' },
      ],
    },

    // --- Category 4: Footwear ---
    {
      categorySlug: 'footwear',
      name: 'Handcrafted Leather Kolhapuri Chappals',
      slug: 'handcrafted-leather-kolhapuri-chappals',
      description: 'Authentic vegetable-tanned handcrafted buffalo leather Kolhapuris with hand-braided straps and durable cord sole.',
      basePrice: 1299.0,
      isPublished: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'FTW-KOL-7', name: 'Size UK 7 / Tan', stock: 10, size: 'UK 7', color: 'Tan' },
        { sku: 'FTW-KOL-8', name: 'Size UK 8 / Tan', stock: 14, size: 'UK 8', color: 'Tan' },
        { sku: 'FTW-KOL-9', name: 'Size UK 9 / Tan', stock: 12, size: 'UK 9', color: 'Tan' },
      ],
    },
    {
      categorySlug: 'footwear',
      name: 'Embroidered Velvet Juttis',
      slug: 'embroidered-velvet-juttis',
      description: 'Handcrafted Punjabi mojaris with plush memory foam insole and delicate zari pearl embroidery on midnight black velvet.',
      basePrice: 1699.0,
      isPublished: true,
      isFeatured: true,
      imageUrl: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'FTW-JUT-36', name: 'EU 36 / Black', stock: 8, size: 'EU 36', color: 'Black' },
        { sku: 'FTW-JUT-38', name: 'EU 38 / Black', stock: 12, size: 'EU 38', color: 'Black' },
        { sku: 'FTW-JUT-40', name: 'EU 40 / Black', stock: 6, size: 'EU 40', color: 'Black' },
      ],
    },
    {
      categorySlug: 'footwear',
      name: 'Casual Canvas Low-Top Sneakers',
      slug: 'casual-canvas-low-top-sneakers',
      description: 'Everyday vulcanized rubber sole sneakers with breathable organic canvas upper and cushioned arch support.',
      basePrice: 1899.0,
      isPublished: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'FTW-SNK-8', name: 'UK 8 / White', stock: 15, size: 'UK 8', color: 'White' },
        { sku: 'FTW-SNK-9', name: 'UK 9 / White', stock: 18, size: 'UK 9', color: 'White' },
        { sku: 'FTW-SNK-10', name: 'UK 10 / White', stock: 10, size: 'UK 10', color: 'White' },
      ],
    },

    // --- Category 5: Jewellery & Accessories ---
    {
      categorySlug: 'jewellery-accessories',
      name: 'Kundan Meenakari Choker Necklace Set',
      slug: 'kundan-meenakari-choker-necklace-set',
      description: 'Traditional 22K gold-plated bridal choker necklace set studded with uncut glass polki stones, emerald beads, and matching jhumki earrings.',
      basePrice: 3899.0,
      isPublished: true,
      isFeatured: true,
      imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'JWL-KUN-EM', name: 'Emerald Green', stock: 8, size: 'Adjustable', color: 'Green' },
        { sku: 'JWL-KUN-RU', name: 'Ruby Red', stock: 7, size: 'Adjustable', color: 'Red' },
      ],
    },
    {
      categorySlug: 'jewellery-accessories',
      name: 'Silver Oxide Tribal Statement Jhumkas',
      slug: 'silver-oxide-tribal-statement-jhumkas',
      description: '925 sterling silver antique-finish chandelier dome jhumkas featuring delicate hanging ghungroos.',
      basePrice: 1199.0,
      isPublished: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'JWL-JHM-SIL', name: 'Oxidized Silver', stock: 20, size: 'Standard', color: 'Silver' },
      ],
    },
    {
      categorySlug: 'jewellery-accessories',
      name: 'Top-Grain Leather Minimalist Wallet',
      slug: 'top-grain-leather-minimalist-wallet',
      description: 'RFID-protected bi-fold wallet made from premium full-grain Indian leather with 8 card slots and currency compartment.',
      basePrice: 899.0,
      isPublished: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'ACC-WLT-BRN', name: 'Cognac Brown', stock: 25, size: 'Compact', color: 'Brown' },
        { sku: 'ACC-WLT-BLK', name: 'Charcoal Black', stock: 20, size: 'Compact', color: 'Black' },
      ],
    },

    // --- Category 6: Home & Living ---
    {
      categorySlug: 'home-living',
      name: '300 TC Organic Cotton King Bedsheet Set',
      slug: '300-tc-organic-cotton-king-bedsheet-set',
      description: 'Crisp percale weave 100% long-staple Indian organic cotton sheet set. Includes 1 King flat sheet and 2 matching pillow covers.',
      basePrice: 1999.0,
      isPublished: true,
      isFeatured: true,
      imageUrl: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'HOM-BED-WHT', name: 'King / Ivory White', stock: 15, size: 'King', color: 'Ivory' },
        { sku: 'HOM-BED-BLU', name: 'King / Slate Blue', stock: 12, size: 'King', color: 'Slate Blue' },
      ],
    },
    {
      categorySlug: 'home-living',
      name: 'Hand-Tufted Woollen Geometric Rug',
      slug: 'hand-tufted-woollen-geometric-rug',
      description: 'Artisan-crafted 4x6 feet heavy pile area rug woven from New Zealand wool with Scandinavian geometric patterns.',
      basePrice: 5499.0,
      isPublished: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'HOM-RUG-46', name: '4x6 Feet / Monochrome', stock: 5, size: '4x6 ft', color: 'Grey' },
      ],
    },
    {
      categorySlug: 'home-living',
      name: 'Woven Cotton Macrame Cushion Covers (Set of 2)',
      slug: 'woven-cotton-macrame-cushion-covers-set-of-2',
      description: 'Bohemian 16x16 inch handmade cotton macrame textured cushion covers with hidden zipper closures.',
      basePrice: 799.0,
      isPublished: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'HOM-CUS-NAT', name: 'Natural Beige', stock: 30, size: '16x16 in', color: 'Beige' },
      ],
    },

    // --- Category 7: Beauty & Personal Care ---
    {
      categorySlug: 'beauty-personal-care',
      name: 'Kumkumadi Ayurvedic Miracle Night Serum',
      slug: 'kumkumadi-ayurvedic-miracle-night-serum',
      description: 'Cold-pressed authentic Ayurvedic facial oil infused with Kashmiri saffron, sandalwood, and lotus pollen for natural radiance.',
      basePrice: 1299.0,
      isPublished: true,
      isFeatured: true,
      imageUrl: 'https://images.unsplash.com/photo-1608248597359-5f257bbdb597?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'BTY-KUM-30', name: '30ml Bottle', stock: 40, size: '30ml', color: 'Saffron' },
      ],
    },
    {
      categorySlug: 'beauty-personal-care',
      name: 'Pure Cold-Pressed Virgin Coconut Oil',
      slug: 'pure-cold-pressed-virgin-coconut-oil',
      description: '100% edible-grade wood-pressed virgin coconut oil extracted from sun-dried Kerala coconuts.',
      basePrice: 499.0,
      isPublished: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'BTY-COC-500', name: '500ml Glass Jar', stock: 50, size: '500ml', color: 'Clear' },
      ],
    },
    {
      categorySlug: 'beauty-personal-care',
      name: 'Handcrafted Neem & Tea Tree Bathing Soap (Pack of 3)',
      slug: 'handcrafted-neem-tea-tree-bathing-soap-pack-of-3',
      description: 'Sulfate and paraben-free artisanal cold-process herbal soap enriched with pure essential oils.',
      basePrice: 399.0,
      isPublished: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1607006314144-8cb3897d2e5d?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'BTY-SOP-3X', name: 'Pack of 3 (125g each)', stock: 60, size: '3 x 125g', color: 'Green' },
      ],
    },

    // --- Category 8: Kitchen & Dining ---
    {
      categorySlug: 'kitchen-dining',
      name: 'Heavy Pre-Seasoned Cast Iron Kadai',
      slug: 'heavy-pre-seasoned-cast-iron-kadai',
      description: 'Traditional 2.5-liter deep wok pre-seasoned with 100% natural vegetable oil for lifetime non-stick cooking without toxic coatings.',
      basePrice: 1599.0,
      isPublished: true,
      isFeatured: true,
      imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'KIT-KAD-25', name: '2.5 Litre (26cm)', stock: 20, size: '2.5L', color: 'Black' },
        { sku: 'KIT-KAD-35', name: '3.5 Litre (30cm)', stock: 15, size: '3.5L', color: 'Black', priceOverride: 1899.0 },
      ],
    },
    {
      categorySlug: 'kitchen-dining',
      name: 'Pure Brass Hammered Dinner Thali Set (6-Piece)',
      slug: 'pure-brass-hammered-dinner-thali-set-6-piece',
      description: 'Hand-hammered authentic Kansa-finish brass dinner set. Includes 1 large thali, 2 katoris, 1 halwa plate, 1 glass, and 1 brass spoon.',
      basePrice: 3299.0,
      isPublished: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'KIT-THL-6P', name: '6-Piece Set / Golden', stock: 10, size: 'Standard Set', color: 'Brass Gold' },
      ],
    },
    {
      categorySlug: 'kitchen-dining',
      name: 'Glazed Ceramic Dinner Plates (Set of 4)',
      slug: 'glazed-ceramic-dinner-plates-set-of-4',
      description: 'Microwave and dishwasher-safe handcrafted stoneware studio pottery dinner plates in speckled terracotta finish.',
      basePrice: 1499.0,
      isPublished: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'KIT-PLT-4P', name: 'Set of 4 (10 inch)', stock: 18, size: '10 inch', color: 'Terracotta' },
      ],
    },

    // --- Category 9: Handcrafted Decor ---
    {
      categorySlug: 'handcrafted-decor',
      name: 'Brass Dhokra Tribal Art Figurine',
      slug: 'brass-dhokra-tribal-art-figurine',
      description: 'Lost-wax casting non-ferrous metal folk art sculpture handcrafted by indigenous Bastar artisans.',
      basePrice: 1799.0,
      isPublished: true,
      isFeatured: true,
      imageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'DEC-DHK-HOR', name: 'Tribal Horse (8 inch)', stock: 12, size: '8 inch', color: 'Antique Brass' },
      ],
    },
    {
      categorySlug: 'handcrafted-decor',
      name: 'Hand-Painted Blue Pottery Ceramic Vase',
      slug: 'hand-painted-blue-pottery-ceramic-vase',
      description: 'Traditional Jaipur blue pottery quartz-clay flower vase with cobalt blue and turquoise Mughal floral motifs.',
      basePrice: 1099.0,
      isPublished: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'DEC-POT-10', name: '10 inch Flower Vase', stock: 16, size: '10 inch', color: 'Cobalt Blue' },
      ],
    },
    {
      categorySlug: 'handcrafted-decor',
      name: 'Carved Sheesham Wood Jharokha Mirror',
      slug: 'carved-sheesham-wood-jharokha-mirror',
      description: 'Rajasthani arched palace window style hand-carved solid Indian rosewood wall mirror with distressed brass accents.',
      basePrice: 2699.0,
      isPublished: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'DEC-JHR-24', name: '18x24 inch / Walnut', stock: 8, size: '18x24 in', color: 'Walnut Brown' },
      ],
    },

    // --- Category 10: Menswear Essentials ---
    {
      categorySlug: 'menswear-essentials',
      name: 'Classic Oxford Cotton Button-Down Shirt',
      slug: 'classic-oxford-cotton-button-down-shirt',
      description: 'Tailored fit heavyweight Oxford weave formal/casual shirt featuring mother-of-pearl buttons and curved hemline.',
      basePrice: 1599.0,
      isPublished: true,
      isFeatured: true,
      imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'MEN-SHT-39', name: 'Size 39 / Sky Blue', stock: 15, size: '39', color: 'Sky Blue' },
        { sku: 'MEN-SHT-40', name: 'Size 40 / Sky Blue', stock: 20, size: '40', color: 'Sky Blue' },
        { sku: 'MEN-SHT-42', name: 'Size 42 / Sky Blue', stock: 14, size: '42', color: 'Sky Blue' },
      ],
    },
    {
      categorySlug: 'menswear-essentials',
      name: 'Slim Tapered Stretch Chino Trousers',
      slug: 'slim-tapered-stretch-chino-trousers',
      description: 'Mid-rise flat-front chinos crafted from 98% cotton and 2% elastane for unrestricted stretch and sharp tailoring.',
      basePrice: 1799.0,
      isPublished: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'MEN-CHN-32', name: '32 Waist / Khaki', stock: 18, size: '32', color: 'Khaki' },
        { sku: 'MEN-CHN-34', name: '34 Waist / Khaki', stock: 22, size: '34', color: 'Khaki' },
        { sku: 'MEN-CHN-36', name: '36 Waist / Khaki', stock: 12, size: '36', color: 'Khaki' },
      ],
    },
    {
      categorySlug: 'menswear-essentials',
      name: 'Heavyweight Supima Cotton Crewneck T-Shirt',
      slug: 'heavyweight-supima-cotton-crewneck-t-shirt',
      description: '220 GSM American Supima extra-long staple cotton t-shirt with ribbed collar that resists sagging wash after wash.',
      basePrice: 999.0,
      isPublished: true,
      isFeatured: false,
      imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
      variants: [
        { sku: 'MEN-TEE-M', name: 'Medium / Navy', stock: 25, size: 'M', color: 'Navy Blue' },
        { sku: 'MEN-TEE-L', name: 'Large / Navy', stock: 30, size: 'L', color: 'Navy Blue' },
        { sku: 'MEN-TEE-XL', name: 'XL / Navy', stock: 15, size: 'XL', color: 'Navy Blue' },
      ],
    },
  ];

  let seededCount = 0;
  for (const item of productsData) {
    const categoryId = categoryMap[item.categorySlug];
    if (!categoryId) {
      console.warn(`Category not found for slug: ${item.categorySlug}`);
      continue;
    }

    let sellerId: string | null = null;
    if (['ethnic-wear', 'sarees', 'handcrafted-decor'].includes(item.categorySlug)) {
      sellerId = seller1Profile.id;
    } else if (['western-wear', 'home-living', 'kitchen-dining'].includes(item.categorySlug)) {
      sellerId = seller2Profile.id;
    }

    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        description: item.description,
        basePrice: item.basePrice,
        isPublished: item.isPublished,
        isFeatured: item.isFeatured,
        categoryId,
        sellerId,
      },
      create: {
        name: item.name,
        slug: item.slug,
        description: item.description,
        basePrice: item.basePrice,
        isPublished: item.isPublished,
        isFeatured: item.isFeatured,
        categoryId,
        sellerId,
        images: {
          create: [
            {
              url: item.imageUrl,
              altText: `${item.name} primary photo`,
              sortOrder: 0,
            },
          ],
        },
      },
    });

    // Seed variants for this product
    for (const v of item.variants) {
      await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {
          name: v.name,
          stockQuantity: v.stock,
          priceOverride: (v as any).priceOverride || null,
          attributes: { size: v.size, color: v.color },
        },
        create: {
          productId: product.id,
          sku: v.sku,
          name: v.name,
          stockQuantity: v.stock,
          priceOverride: (v as any).priceOverride || null,
          attributes: { size: v.size, color: v.color },
          weightGrams: 300,
        },
      });
    }

    seededCount++;
  }

  console.log(`📦 ${seededCount} multi-variant products seeded across 10 categories.`);
  console.log('✅ Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
