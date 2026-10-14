import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function main() {
  console.log('🌿 Starting Luxury, Eco-Friendly & Handcrafted Database Reset & Seeding...');

  // -------------------------------------------------------------
  // 1. CLEANUP ALL EXISTING ITEMS FROM DATABASE
  // -------------------------------------------------------------
  console.log('🧹 Purging old catalog, variants, and dependent transactions...');
  await prisma.cartItem.deleteMany({});
  await prisma.wishlistItem.deleteMany({});
  await prisma.stockReservation.deleteMany({});
  await prisma.paymentTransaction.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.productImage.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  console.log('✨ All old items purged successfully from database.');

  // -------------------------------------------------------------
  // 2. SEED SYSTEM ADMIN & VERIFIED ARTISAN SELLERS
  // -------------------------------------------------------------
  const adminPasswordHash = await hashPassword('AdminSecure2026!');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ecommerce.example.in' },
    update: {
      role: Role.ADMIN,
      firstName: 'Maison',
      lastName: 'Curator',
    },
    create: {
      email: 'admin@ecommerce.example.in',
      passwordHash: adminPasswordHash,
      firstName: 'Maison',
      lastName: 'Curator',
      role: Role.ADMIN,
      phoneNumber: '+919876543200',
    },
  });
  console.log(`👤 Admin user verified: ${admin.email}`);

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

  const sellerPasswordHash = await hashPassword('SellerSecure2026!');

  // Seller 1: Kashmir Artisans Guild
  const seller1User = await prisma.user.upsert({
    where: { email: 'seller.kashmir@ecommerce.example.in' },
    update: { role: Role.SELLER, firstName: 'Tariq', lastName: 'Ahmad' },
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
      storeName: 'Kashmir Master Weavers Guild',
      storeSlug: 'kashmir-master-weavers',
      description: 'Certified GI-tagged Kashmiri Pashmina, hand-needle Sozni embroidery, and organic Himalayan cashmere.',
      gstin: '01ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      bankAccount: '9876543210123',
      bankIfsc: 'SBIN0001234',
      commissionRate: 10.0,
      isVerified: true,
    },
    create: {
      userId: seller1User.id,
      storeName: 'Kashmir Master Weavers Guild',
      storeSlug: 'kashmir-master-weavers',
      description: 'Certified GI-tagged Kashmiri Pashmina, hand-needle Sozni embroidery, and organic Himalayan cashmere.',
      gstin: '01ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      bankAccount: '9876543210123',
      bankIfsc: 'SBIN0001234',
      commissionRate: 10.0,
      isVerified: true,
    },
  });

  // Seller 2: Jaipur Heritage Handlooms
  const seller2User = await prisma.user.upsert({
    where: { email: 'seller.jaipur@ecommerce.example.in' },
    update: { role: Role.SELLER, firstName: 'Rajesh', lastName: 'Meena' },
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
      storeName: 'Jaipur Eco Heritage Atelier',
      storeSlug: 'jaipur-eco-atelier',
      description: 'Organic natural plant-dyed Dabu block prints, cruelty-free Ahimsa silks, and hand-beaten bronze tableware.',
      gstin: '08FGHIJ5678K1Z2',
      pan: 'FGHIJ5678K',
      bankAccount: '1234567890987',
      bankIfsc: 'HDFC0005678',
      commissionRate: 10.0,
      isVerified: true,
    },
    create: {
      userId: seller2User.id,
      storeName: 'Jaipur Eco Heritage Atelier',
      storeSlug: 'jaipur-eco-atelier',
      description: 'Organic natural plant-dyed Dabu block prints, cruelty-free Ahimsa silks, and hand-beaten bronze tableware.',
      gstin: '08FGHIJ5678K1Z2',
      pan: 'FGHIJ5678K',
      bankAccount: '1234567890987',
      bankIfsc: 'HDFC0005678',
      commissionRate: 10.0,
      isVerified: true,
    },
  });

  // -------------------------------------------------------------
  // 3. SEED 6 ECO-FRIENDLY & LUXURY HANDCRAFTED CATEGORIES
  // -------------------------------------------------------------
  const categoriesData = [
    {
      name: 'Artisanal Handlooms & Silks',
      slug: 'artisanal-handlooms',
      imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=80',
      sortOrder: 1,
    },
    {
      name: 'Eco Cashmere & Pashmina',
      slug: 'pashmina-shawls',
      imageUrl: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&w=1200&q=80',
      sortOrder: 2,
    },
    {
      name: 'Heritage Handcrafted Jewellery',
      slug: 'handcrafted-jewellery',
      imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1200&q=80',
      sortOrder: 3,
    },
    {
      name: 'Organic Khadi & Ahimsa Cotton',
      slug: 'organic-khadi',
      imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=80',
      sortOrder: 4,
    },
    {
      name: 'Sustainable Living & Decor',
      slug: 'sustainable-decor',
      imageUrl: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1200&q=80',
      sortOrder: 5,
    },
    {
      name: 'Botanical Wellness & Pure Aromas',
      slug: 'botanical-wellness',
      imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=1200&q=80',
      sortOrder: 6,
    },
  ];

  const categoryMap: Record<string, string> = {};
  for (const catData of categoriesData) {
    const category = await prisma.category.create({
      data: catData,
    });
    categoryMap[catData.slug] = category.id;
  }
  console.log(`📁 6 luxury handcrafted categories created.`);

  // -------------------------------------------------------------
  // 4. SEED 18 AUTHENTIC, HANDCRAFTED, ECO-FRIENDLY LUXURY PRODUCTS
  // -------------------------------------------------------------
  const productsData = [
    // --- Category 1: Artisanal Handlooms & Silks ---
    {
      categorySlug: 'artisanal-handlooms',
      name: 'Imperial Banarasi Katan Silk Saree',
      slug: 'imperial-banarasi-katan-silk-saree',
      description: 'Handwoven over 65 days by master weavers in Varanasi using the ancient Kadwa technique. Crafted from 100% pure Mulberry silk and certified pure silver electro-refined zari. Naturally dyed using pomegranate peels and madder root extracts. An heirloom treasure that breathes royal Indian heritage.',
      basePrice: 48500.0,
      isPublished: true,
      isFeatured: true,
      sellerId: seller2Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'BAN-KAT-GLD', name: 'Royal Gold Zari Border', stock: 6, color: 'Gold Amber', priceOverride: 48500.0 },
        { sku: 'BAN-KAT-SLV', name: 'Moonlit Silver Zari Border', stock: 4, color: 'Moonlit Silver', priceOverride: 52000.0 },
        { sku: 'BAN-KAT-RBY', name: 'Imperial Ruby & Gold Zari', stock: 5, color: 'Deep Ruby', priceOverride: 54500.0 },
      ],
    },
    {
      categorySlug: 'artisanal-handlooms',
      name: 'Chanderi Silk-Cotton Royal Angrakha',
      slug: 'chanderi-silk-cotton-royal-angrakha',
      description: 'Handwoven Chanderi weave with hand-block Ajrakh motifs from Kachchh artisans. Crafted from organic wild tussar silk and handspun rainfed cotton. Naturally dyed in fermented indigo vats with 100% natural coconut-shell fastenings. Completely chemical-free and skin-nourishing.',
      basePrice: 18900.0,
      isPublished: true,
      isFeatured: true,
      sellerId: seller2Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'CHN-ANG-S', name: 'Small / Indigo Dabu', stock: 8, size: 'S', color: 'Indigo Blue' },
        { sku: 'CHN-ANG-M', name: 'Medium / Indigo Dabu', stock: 12, size: 'M', color: 'Indigo Blue' },
        { sku: 'CHN-ANG-L', name: 'Large / Indigo Dabu', stock: 9, size: 'L', color: 'Indigo Blue' },
      ],
    },
    {
      categorySlug: 'artisanal-handlooms',
      name: 'Patan Patola Double-Ikat Heritage Scarf',
      slug: 'patan-patola-double-ikat-scarf',
      description: 'An exquisite museum-grade textile crafted by the surviving Master Salvi weavers of Gujarat. Features mathematical warp and weft alignment with natural plant dyes of marigold, catechu, and turmeric. Soft, lightweight, and completely identical on both sides.',
      basePrice: 32000.0,
      isPublished: true,
      isFeatured: false,
      sellerId: seller2Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'PAT-PAT-STD', name: 'Standard Heritage Weave (180cm x 60cm)', stock: 5, size: 'Standard' },
        { sku: 'PAT-PAT-ZAR', name: 'Collector Gold Zari Trim (200cm x 70cm)', stock: 3, size: 'Grand', priceOverride: 36500.0 },
      ],
    },

    // --- Category 2: Eco Cashmere & Pashmina ---
    {
      categorySlug: 'pashmina-shawls',
      name: 'Master Artisan Sozni Needle Pashmina',
      slug: 'master-artisan-sozni-pashmina',
      description: 'GI-certified authentic Kashmiri Pashmina requiring over 600 hours of continuous needle Sozni craftsmanship. Harvested ethically from the underfleece of high-altitude Changthangi goats in Ladakh. Unbleached, chemical-free, and feathery soft with unmatched natural thermal insulation.',
      basePrice: 74500.0,
      isPublished: true,
      isFeatured: true,
      sellerId: seller1Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'PAS-SOZ-IVY', name: 'Natural Ivory / Fine Needle Sozni', stock: 4, color: 'Natural Ivory', priceOverride: 74500.0 },
        { sku: 'PAS-SOZ-WAL', name: 'Raw Walnut Bark Charcoal Needle Sozni', stock: 3, color: 'Walnut Charcoal', priceOverride: 79000.0 },
      ],
    },
    {
      categorySlug: 'pashmina-shawls',
      name: 'Hand-Spun Reversible Kani Shawl',
      slug: 'hand-spun-reversible-kani-shawl',
      description: 'Woven with miniature wooden eyeless bobbins (Tujis) on traditional Kashmiri wooden pit looms. The artisan memorizes mathematical notations (Talim) to create intricately woven floral tapestry patterns. Natural untreated cashmere fiber with zero synthetic sizing.',
      basePrice: 58000.0,
      isPublished: true,
      isFeatured: true,
      sellerId: seller1Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'PAS-KAN-FLR', name: 'Mughal Chinar Floral Motif', stock: 5, color: 'Pashmina Ecru' },
        { sku: 'PAS-KAN-CHV', name: 'Artisan Heritage Paisley Motif', stock: 4, color: 'Antique Saffron', priceOverride: 62000.0 },
      ],
    },
    {
      categorySlug: 'pashmina-shawls',
      name: 'Undyed Himalayan Cashmere Blanket Throw',
      slug: 'undyed-himalayan-cashmere-throw',
      description: 'Pure, organic, un-dyed Changthangi cashmere woven in a refined herringbone twill with hand-twisted artisanal fringes. Completely biodegradable, zero dyes, zero artificial bleaches. Delivers sublime warmth and cloud-like tactile luxury for discerning living spaces.',
      basePrice: 24500.0,
      isPublished: true,
      isFeatured: false,
      sellerId: seller1Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1580301762395-21ce84d00bc6?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'PAS-THR-CLD', name: 'Cloud Grey (140cm x 200cm)', stock: 7, color: 'Cloud Grey' },
        { sku: 'PAS-THR-OAT', name: 'Dune Oatmeal (140cm x 200cm)', stock: 6, color: 'Dune Oatmeal' },
      ],
    },

    // --- Category 3: Heritage Handcrafted Jewellery ---
    {
      categorySlug: 'handcrafted-jewellery',
      name: 'Recycled Temple Silver Hasli Choker',
      slug: 'recycled-temple-silver-hasli-choker',
      description: 'Solid 92.5 sterling silver hand-beaten by hereditary silversmiths using the ancient repoussé embossing technique. Crafted entirely from 100% recycled hallmarked silver to prevent mining exploitation. Coated with natural beeswax for lasting antique patina.',
      basePrice: 29800.0,
      isPublished: true,
      isFeatured: true,
      sellerId: seller2Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'JWL-HAS-ANT', name: 'Antique Patina Finish (92.5 Silver)', stock: 5, priceOverride: 29800.0 },
        { sku: 'JWL-HAS-MIR', name: 'Hand-Burnished High Luster', stock: 4, priceOverride: 31500.0 },
      ],
    },
    {
      categorySlug: 'handcrafted-jewellery',
      name: 'Bidriware Hand-Inlaid Silver Cuff',
      slug: 'bidriware-hand-inlaid-silver-cuff',
      description: 'A 500-year-old metallic craft from Bidar, Karnataka. Pure 99.9% fine silver wire is hand-hammered into engraved grooves of a zinc-copper alloy, then oxidized black using unique soil from historic Bidar fort. Non-electroplated, non-toxic, and truly one-of-a-kind.',
      basePrice: 14200.0,
      isPublished: true,
      isFeatured: false,
      sellerId: seller2Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1611591475878-5a2a97576571?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'JWL-BID-S', name: 'Small (Wrist 5.5 - 6.0 in)', stock: 6, size: 'S' },
        { sku: 'JWL-BID-M', name: 'Medium (Wrist 6.0 - 6.5 in)', stock: 8, size: 'M' },
        { sku: 'JWL-BID-L', name: 'Large (Wrist 6.5 - 7.2 in)', stock: 5, size: 'L' },
      ],
    },
    {
      categorySlug: 'handcrafted-jewellery',
      name: 'Raw Tourmaline & Hand-Carved Brass Ring',
      slug: 'uncut-tourmaline-handcrafted-brass-ring',
      description: 'Cast in 100% recycled architectural brass using the ancient lost-wax technique. Features an uncut, conflict-free raw green tourmaline set in organic sculpted prongs. Lead-free, nickel-free, and ethically certified.',
      basePrice: 8900.0,
      isPublished: true,
      isFeatured: false,
      sellerId: seller2Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'JWL-RNG-SZ6', name: 'Size 6 / Verdant Green Tourmaline', stock: 7, size: '6' },
        { sku: 'JWL-RNG-SZ7', name: 'Size 7 / Verdant Green Tourmaline', stock: 10, size: '7' },
        { sku: 'JWL-RNG-SZ8', name: 'Size 8 / Verdant Green Tourmaline', stock: 6, size: '8' },
      ],
    },

    // --- Category 4: Organic Khadi & Ahimsa Cotton ---
    {
      categorySlug: 'organic-khadi',
      name: 'Solar-Spun Ahimsa Silk & Khadi Tunic',
      slug: 'handspun-ahimsa-silk-khadi-tunic',
      description: 'Woven from handspun organic rainfed cotton blended with peace (Ahimsa) silk, where silkworms are allowed to hatch naturally without harm. Woven on traditional wooden handlooms in Wardha. Breathable, hypoallergenic, and finished with mother-of-pearl buttons.',
      basePrice: 16500.0,
      isPublished: true,
      isFeatured: true,
      sellerId: seller2Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'KHA-TUN-S', name: 'Small / Organic Unbleached Ivory', stock: 8, size: 'S', color: 'Ivory' },
        { sku: 'KHA-TUN-M', name: 'Medium / Organic Unbleached Ivory', stock: 12, size: 'M', color: 'Ivory' },
        { sku: 'KHA-TUN-L', name: 'Large / Organic Unbleached Ivory', stock: 7, size: 'L', color: 'Ivory' },
      ],
    },
    {
      categorySlug: 'organic-khadi',
      name: 'Indigo Dabu Hand-Block Trench Robe',
      slug: 'indigo-dabu-hand-block-trench-robe',
      description: 'Crafted with mud-resist Dabu hand-block printing by 5th-generation Chippa artisan families in Bagru. Dyed through multiple dips in 15-year-old living indigo fermentation pits. Tailored from heavy 100% organic cotton twill with relaxed kimono sleeves.',
      basePrice: 19800.0,
      isPublished: true,
      isFeatured: true,
      sellerId: seller2Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'KHA-ROB-SM', name: 'Size 1 (Fits US 4 - 8 / S-M)', stock: 9, size: 'S-M', color: 'Living Indigo' },
        { sku: 'KHA-ROB-LXL', name: 'Size 2 (Fits US 10 - 14 / L-XL)', stock: 6, size: 'L-XL', color: 'Living Indigo' },
      ],
    },
    {
      categorySlug: 'organic-khadi',
      name: 'Handwoven Jamdani Muslin Overlay',
      slug: 'handwoven-jamdani-muslin-overlay',
      description: 'A celebration of Bengal 200-count sheer organic muslin handwoven with delicate Jamdani geometric motifs. Takes over 45 days of rhythmic shuttle work on pit looms. Incredibly lightweight, semi-sheer, and luxuriously soft against sensitive skin.',
      basePrice: 22400.0,
      isPublished: true,
      isFeatured: false,
      sellerId: seller2Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'KHA-JAM-BTI', name: 'Geometric Buti Motif (Free Size)', stock: 5, size: 'One Size' },
        { sku: 'KHA-JAM-JAL', name: 'Intricate Floral Jaal Weave', stock: 4, size: 'One Size', priceOverride: 24800.0 },
      ],
    },

    // --- Category 5: Sustainable Living & Decor ---
    {
      categorySlug: 'sustainable-decor',
      name: 'Reclaimed Teak & Brass Inlay Tray',
      slug: 'reclaimed-teakwood-brass-inlay-tray',
      description: 'Hand-chiseled by Saharanpur woodcraft artisans from salvaged 80-year-old structural teakwood beams. Inlaid with solid recycled brass geometric motifs and finished with food-grade cold-pressed walnut oil and natural carnauba wax. Zero trees cut.',
      basePrice: 12500.0,
      isPublished: true,
      isFeatured: true,
      sellerId: seller1Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'DEC-TRY-STD', name: 'Standard Platter (16 x 11 in)', stock: 8, size: '16x11 in' },
        { sku: 'DEC-TRY-GRD', name: 'Grande Banquet Tray (20 x 14 in)', stock: 5, size: '20x14 in', priceOverride: 15200.0 },
      ],
    },
    {
      categorySlug: 'sustainable-decor',
      name: 'Hand-Hammered Kansa Bronze Dining Thali',
      slug: 'hand-hammered-kansa-dining-set',
      description: 'Hand-forged by Kansara bell-metal artisans using the ancient 78% Copper & 22% Tin alloy documented in Ayurvedic texts for its alkalizing and wellness properties. Each piece is heated over charcoal embers and hand-beaten thousands of times to produce a resonant golden gleam.',
      basePrice: 21000.0,
      isPublished: true,
      isFeatured: true,
      sellerId: seller2Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'DEC-KAN-4PC', name: '4-Piece Individual Banquet Service', stock: 7, size: '4-Piece Set', priceOverride: 21000.0 },
        { sku: 'DEC-KAN-6PC', name: '6-Piece Royal Feast Collection', stock: 4, size: '6-Piece Set', priceOverride: 28500.0 },
      ],
    },
    {
      categorySlug: 'sustainable-decor',
      name: 'Jaipur Blue Pottery Botanical Amphora',
      slug: 'jaipur-blue-pottery-botanical-vessel',
      description: 'Distinctive Jaipur Blue Pottery made without clay using quartz stone powder, raw fuller earth, and natural gum. Hand-painted with cobalt oxide botanical motifs and glazed in low-fire wood kilns. Clay-free construction prevents agricultural soil depletion.',
      basePrice: 9400.0,
      isPublished: true,
      isFeatured: false,
      sellerId: seller2Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'DEC-POT-10', name: '10-inch Fluted Urn / Cobalt', stock: 6, size: '10 inch' },
        { sku: 'DEC-POT-14', name: '14-inch Master Amphora / Persian Blue', stock: 4, size: '14 inch', priceOverride: 11800.0 },
      ],
    },

    // --- Category 6: Botanical Wellness & Pure Aromas ---
    {
      categorySlug: 'botanical-wellness',
      name: 'Kannauj Mitti Attar (Scent of Monsoon Earth)',
      slug: 'kannauj-mitti-attar-monsoon-earth',
      description: 'The ancient art of capturing the fragrance of wet baked earth (petrichor). Riverbed alluvial clay discs are baked, then hydro-distilled into pure sandalwood oil in copper cauldrons (Degs & Bhapkas) over slow wood fire in Kannauj, UP. 100% natural, alcohol-free, and vegan.',
      basePrice: 7800.0,
      isPublished: true,
      isFeatured: true,
      sellerId: seller1Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'WEL-MIT-10ML', name: '10ml Handcrafted Cut-Crystal Flacon', stock: 15, size: '10ml', priceOverride: 7800.0 },
        { sku: 'WEL-MIT-25ML', name: '25ml Heritage Brass Casket Edition', stock: 8, size: '25ml', priceOverride: 14500.0 },
      ],
    },
    {
      categorySlug: 'botanical-wellness',
      name: 'Wild Kashmir Saffron & Rosehip Facial Elixir',
      slug: 'wild-kashmir-saffron-rose-elixir',
      description: 'A slow-infused botanical facial oil featuring hand-harvested Grade-A Mongra saffron stigmas from Pampore, Kashmir and wild-foraged Himalayan rosehip oil. Cold-pressed, unrefined, and packed in biophotonic ultraviolet glass to preserve enzymatic vitality.',
      basePrice: 6500.0,
      isPublished: true,
      isFeatured: false,
      sellerId: seller1Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'WEL-SAF-30ML', name: '30ml Dropper Flacon', stock: 14, size: '30ml' },
        { sku: 'WEL-SAF-50ML', name: '50ml Apothecary Reserve', stock: 9, size: '50ml', priceOverride: 9200.0 },
      ],
    },
    {
      categorySlug: 'botanical-wellness',
      name: 'Temple Sacred Flower Charcoal-Free Dhoop',
      slug: 'temple-flower-recycled-sacred-dhoop',
      description: 'Eco-conscious ceremonial incense made from sacred temple flowers collected from river banks, blended with wild loban (frankincense) and sandalwood powder. 100% charcoal-free, non-toxic, clean burning, and packaged in seed-paper boxes that can be planted after use.',
      basePrice: 2400.0,
      isPublished: true,
      isFeatured: false,
      sellerId: seller2Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1602928321679-560bb453f190?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'WEL-DHP-30', name: 'Box of 30 Cones with Pure Brass Holder', stock: 20, size: '30 Cones' },
        { sku: 'WEL-DHP-60', name: 'Artisan Wood Chest (60 Cones)', stock: 12, size: '60 Cones', priceOverride: 3900.0 },
      ],
    },
  ];

  let seededCount = 0;
  for (const item of productsData) {
    const categoryId = categoryMap[item.categorySlug];
    if (!categoryId) {
      console.warn(`Category slug not found for product: ${item.slug}`);
      continue;
    }

    const product = await prisma.product.create({
      data: {
        name: item.name,
        slug: item.slug,
        description: item.description,
        basePrice: item.basePrice,
        isPublished: item.isPublished,
        isFeatured: item.isFeatured,
        categoryId,
        sellerId: item.sellerId,
        images: {
          create: [
            {
              url: item.imageUrl,
              altText: `${item.name} artisanal craft photo`,
              sortOrder: 0,
            },
          ],
        },
      },
    });

    // Seed variants for this product
    for (const v of item.variants) {
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: v.sku,
          name: v.name,
          stockQuantity: v.stock,
          priceOverride: (v as any).priceOverride || null,
          attributes: {
            ...((v as any).size ? { size: (v as any).size } : {}),
            ...((v as any).color ? { color: (v as any).color } : {}),
          },
          weightGrams: 350,
        },
      });
    }

    seededCount++;
  }

  console.log(`📦 ${seededCount} bespoke luxury & eco-friendly products seeded across 6 categories.`);
  console.log('✅ Handcrafted & Sustainable Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
